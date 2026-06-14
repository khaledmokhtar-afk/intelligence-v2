import * as THREE from 'three'
import { GLTFExporter } from 'three-stdlib'
import { uploadToS3 }  from '@/lib/s3'
import type { NormalizedGeometry, Wall, StructuralElement } from '@/types'

export async function generate3D(jobId: string, geometry: NormalizedGeometry): Promise<string> {
  const scene = new THREE.Scene()
  scene.background = null

  const { walls, rooms, structuralElements, defaultHeight, units } = geometry

  const scale = units === 'mm'     ? 0.001
              : units === 'cm'     ? 0.01
              : units === 'm'      ? 1
              : units === 'inches' ? 0.0254
              : 0.3048 // feet

  const materials: Record<string, THREE.MeshLambertMaterial> = {
    concrete: new THREE.MeshLambertMaterial({ color: 0xCCCCCC }),
    brick:    new THREE.MeshLambertMaterial({ color: 0xC97B4B }),
    drywall:  new THREE.MeshLambertMaterial({ color: 0xF0EDE8 }),
    glass:    new THREE.MeshLambertMaterial({ color: 0x88CCEE, transparent: true, opacity: 0.4 }),
    floor:    new THREE.MeshLambertMaterial({ color: 0xE8E0D0 }),
    ceiling:  new THREE.MeshLambertMaterial({ color: 0xF5F5F0 }),
    unknown:  new THREE.MeshLambertMaterial({ color: 0xDDDDDD }),
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
  dirLight.position.set(10, 20, 10)
  scene.add(dirLight)

  for (const wall of walls ?? []) {
    addWall(scene, wall, scale, defaultHeight, materials)
  }

  for (const room of rooms ?? []) {
    if (!room.boundary?.length) continue
    addFloor(scene, room.boundary, scale, materials)
  }

  for (const el of structuralElements ?? []) {
    addStructuralElement(scene, el, scale, defaultHeight, materials)
  }

  const exporter = new GLTFExporter()

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      async (gltf) => {
        try {
          const buffer = gltf instanceof ArrayBuffer
            ? Buffer.from(gltf)
            : Buffer.from(JSON.stringify(gltf))

          const key = `outputs/${jobId}/model.glb`
          await uploadToS3(key, buffer, 'model/gltf-binary')
          resolve(key)
        } catch (err) {
          reject(err)
        }
      },
      (err) => reject(err),
      { binary: true, embedImages: false }
    )
  })
}

function addWall(
  scene: THREE.Scene,
  wall: Wall,
  scale: number,
  defaultHeight: number,
  materials: Record<string, THREE.MeshLambertMaterial>
) {
  const [x1, y1] = wall.start
  const [x2, y2] = wall.end
  const height    = (wall.height ?? defaultHeight) * scale
  const thickness = (wall.thickness ?? 200) * scale

  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * scale
  const angle  = Math.atan2(y2 - y1, x2 - x1)

  const geo   = new THREE.BoxGeometry(length, height, thickness)
  const mat   = materials[wall.material ?? 'unknown']
  const mesh  = new THREE.Mesh(geo, mat)

  mesh.position.set(
    ((x1 + x2) / 2) * scale,
    height / 2,
    ((y1 + y2) / 2) * scale
  )
  mesh.rotation.y = -angle
  mesh.name = wall.id

  scene.add(mesh)
}

function addFloor(
  scene: THREE.Scene,
  boundary: [number, number][],
  scale: number,
  materials: Record<string, THREE.MeshLambertMaterial>
) {
  if (boundary.length < 3) return

  const shape = new THREE.Shape()
  shape.moveTo(boundary[0][0] * scale, boundary[0][1] * scale)
  for (let i = 1; i < boundary.length; i++) {
    shape.lineTo(boundary[i][0] * scale, boundary[i][1] * scale)
  }
  shape.closePath()

  const geo  = new THREE.ShapeGeometry(shape)
  const mesh = new THREE.Mesh(geo, materials.floor)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.001

  scene.add(mesh)
}

function addStructuralElement(
  scene: THREE.Scene,
  el: StructuralElement,
  scale: number,
  defaultHeight: number,
  materials: Record<string, THREE.MeshLambertMaterial>
) {
  const g = el.geometry as Record<string, number>

  if (el.type === 'column') {
    const geo  = new THREE.BoxGeometry(
      (g.width ?? 400) * scale,
      (g.height ?? defaultHeight) * scale,
      (g.depth ?? 400) * scale
    )
    const mesh = new THREE.Mesh(geo, materials.concrete)
    mesh.position.set(
      g.x * scale,
      (g.height ?? defaultHeight) * scale / 2,
      g.y * scale
    )
    scene.add(mesh)
  }
}
