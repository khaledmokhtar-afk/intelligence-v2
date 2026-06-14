import * as THREE from 'three'
import { GLTFExporter } from 'three-stdlib'
import { uploadToS3 }  from '@/lib/s3'
import type { NormalizedGeometry } from '@/types'

const MM = 0.001

export async function generate3D(jobId: string, geo: NormalizedGeometry): Promise<string> {
  const scene = new THREE.Scene()

  const materials = {
    concrete:  new THREE.MeshLambertMaterial({ color: 0x999999 }),
    partition: new THREE.MeshLambertMaterial({ color: 0xE8E4DC }),
    glazing:   new THREE.MeshLambertMaterial({ color: 0x88CCEE, transparent: true, opacity: 0.35 }),
    floor:     new THREE.MeshLambertMaterial({ color: 0xD4CFC7 }),
    furniture: new THREE.MeshLambertMaterial({ color: 0x8B6914 }),
    phoneBooth:new THREE.MeshLambertMaterial({ color: 0x4A4A6A }),
    column:    new THREE.MeshLambertMaterial({ color: 0x888888 }),
    coreArea:  new THREE.MeshLambertMaterial({ color: 0x777777, transparent: true, opacity: 0.8 }),
    grid:      new THREE.LineBasicMaterial({ color: 0x334455, opacity: 0.3, transparent: true }),
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const sun = new THREE.DirectionalLight(0xffffff, 0.6)
  sun.position.set(30, 50, 20)
  scene.add(sun)

  const bounds    = geo.bounds ?? { minX: 0, minY: 0, maxX: 60000, maxY: 34500, width: 60000, depth: 34500 }
  const defHeight = geo.defaults?.ceilingHeight ?? 3000

  // Floor slab
  const floorGeo = new THREE.PlaneGeometry((bounds.maxX - bounds.minX) * MM, (bounds.maxY - bounds.minY) * MM)
  const floor    = new THREE.Mesh(floorGeo, materials.floor)
  floor.rotation.x  = -Math.PI / 2
  floor.position.set((bounds.maxX - bounds.minX) / 2 * MM, 0, (bounds.maxY - bounds.minY) / 2 * MM)
  scene.add(floor)

  // Structural columns
  for (const col of geo.columns ?? []) {
    const w = (col.width ?? 400) * MM
    const d = (col.depth ?? 400) * MM
    const h = (col.height ?? defHeight) * MM
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.column)
    mesh.position.set(col.position[0] * MM, h / 2, col.position[1] * MM)
    mesh.name = `col_${col.id}`
    scene.add(mesh)
  }

  // Walls
  for (const wall of geo.walls ?? []) {
    const [x1, y1] = wall.start
    const [x2, y2] = wall.end
    const h        = (wall.height ?? defHeight) * MM
    const t        = (wall.thickness ?? 150) * MM
    const length   = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * MM
    if (length < 0.01) continue
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const mat   = wall.isStructural ? materials.concrete : materials.partition
    const mesh  = new THREE.Mesh(new THREE.BoxGeometry(length, h, t), mat)
    mesh.position.set(((x1 + x2) / 2) * MM, h / 2, ((y1 + y2) / 2) * MM)
    mesh.rotation.y = -angle
    mesh.name = `wall_${wall.id}`
    scene.add(mesh)
  }

  // Glazing
  for (const gl of geo.glazing ?? []) {
    const [x1, y1] = gl.start
    const [x2, y2] = gl.end
    const h        = (gl.height ?? defHeight) * MM
    const t        = (gl.thickness ?? 50) * MM
    const length   = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * MM
    if (length < 0.01) continue
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const mesh  = new THREE.Mesh(new THREE.BoxGeometry(length, h, t), materials.glazing)
    mesh.position.set(((x1 + x2) / 2) * MM, h / 2, ((y1 + y2) / 2) * MM)
    mesh.rotation.y = -angle
    mesh.name = `glazing_${gl.id}`
    scene.add(mesh)
  }

  // Pods (phone booths etc)
  for (const pod of geo.pods ?? []) {
    const w = (pod.width ?? 1000) * MM
    const d = (pod.depth ?? 1000) * MM
    const h = (pod.height ?? 2400) * MM
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials.phoneBooth)
    mesh.position.set((pod.position[0] + pod.width / 2) * MM, h / 2, (pod.position[1] + pod.depth / 2) * MM)
    mesh.name = `pod_${pod.id}`
    scene.add(mesh)
  }

  // Furniture
  for (const f of geo.furniture ?? []) {
    if (!f.width || !f.depth || !f.height) continue
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(f.width * MM, f.height * MM, f.depth * MM),
      materials.furniture
    )
    const rad = ((f.rotation ?? 0) * Math.PI) / 180
    mesh.position.set((f.position[0] + f.width / 2) * MM, f.height * MM / 2, (f.position[1] + f.depth / 2) * MM)
    mesh.rotation.y = -rad
    mesh.name = `furn_${f.id}`
    scene.add(mesh)
  }

  // Core areas (extruded)
  for (const core of geo.coreAreas ?? []) {
    if (!core.boundary?.length) continue
    const shape = new THREE.Shape()
    shape.moveTo(core.boundary[0][0] * MM, core.boundary[0][1] * MM)
    for (let i = 1; i < core.boundary.length; i++) {
      shape.lineTo(core.boundary[i][0] * MM, core.boundary[i][1] * MM)
    }
    shape.closePath()
    const extGeo = new THREE.ExtrudeGeometry(shape, { depth: (core.height ?? defHeight) * MM, bevelEnabled: false })
    const mesh   = new THREE.Mesh(extGeo, materials.coreArea)
    mesh.rotation.x = -Math.PI / 2
    mesh.name = `core_${core.id}`
    scene.add(mesh)
  }

  const exporter = new GLTFExporter()
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      async (gltf) => {
        try {
          const buf = gltf instanceof ArrayBuffer ? Buffer.from(gltf) : Buffer.from(JSON.stringify(gltf))
          const key = `outputs/${jobId}/model.glb`
          await uploadToS3(key, buf, 'model/gltf-binary')
          console.log(`[Stage3] GLTF written: ${key}`)
          resolve(key)
        } catch (e) { reject(e) }
      },
      (err) => reject(err),
      { binary: true }
    )
  })
}
