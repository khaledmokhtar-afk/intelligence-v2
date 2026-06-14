'use client'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'

type ViewMode   = 'solid' | 'wireframe'
type CameraView = 'perspective' | 'top' | 'front' | 'side'

export function ThreeViewer({ gltfUrl }: { gltfUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef  = useRef<OrbitControls | null>(null)
  const frameRef     = useRef<number>(0)
  const meshesRef    = useRef<THREE.Mesh[]>([])

  const [viewMode,    setViewMode]    = useState<ViewMode>('solid')
  const [cameraView,  setCameraView]  = useState<CameraView>('perspective')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x0B1628, 1)
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0B1628)
    const grid = new THREE.GridHelper(100, 50, 0x1A3050, 0x0F2040)
    scene.add(grid)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 2000)
    camera.position.set(30, 25, 30)
    cameraRef.current = camera

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const sun = new THREE.DirectionalLight(0x00C8E8, 0.8)
    sun.position.set(20, 40, 20)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x8B5CF6, 0.3)
    fill.position.set(-20, 10, -20)
    scene.add(fill)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance   = 0.5
    controls.maxDistance   = 500
    controlsRef.current    = controls

    // Load GLTF
    const loader = new GLTFLoader()
    loader.load(
      gltfUrl,
      (gltf) => {
        const model = gltf.scene
        const box   = new THREE.Box3().setFromObject(model)
        const size  = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        model.position.sub(center)
        model.position.y += size.y / 2

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshesRef.current.push(child)
            child.material = new THREE.MeshPhongMaterial({
              color:     0xE2EEF8,
              specular:  0x00C8E8,
              shininess: 30,
            })
          }
        })

        scene.add(model)

        const maxDim = Math.max(size.x, size.y, size.z)
        camera.position.set(maxDim * 1.5, maxDim * 0.8, maxDim * 1.5)
        controls.target.set(0, size.y / 2, 0)
        controls.update()

        setLoading(false)
      },
      undefined,
      (err) => {
        console.error('[ThreeViewer] GLTF load error:', err)
        setLoading(false)
      }
    )

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      meshesRef.current = []
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [gltfUrl])

  // Wireframe toggle
  useEffect(() => {
    meshesRef.current.forEach(mesh => {
      if (mesh.material instanceof THREE.Material) {
        (mesh.material as THREE.MeshPhongMaterial).wireframe = viewMode === 'wireframe'
      }
    })
  }, [viewMode])

  const setCameraPreset = (view: CameraView) => {
    const camera   = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    const d = 40
    const presets: Record<CameraView, [number, number, number]> = {
      perspective: [30, 25, 30],
      top:         [0, d, 0.001],
      front:       [0, 8, d],
      side:        [d, 8, 0],
    }
    const [x, y, z] = presets[view]
    camera.position.set(x, y, z)
    controls.update()
    setCameraView(view)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 480 }} />

      {/* Loading overlay */}
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,22,40,0.85)', backdropFilter: 'blur(4px)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '2px solid var(--color-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>Loading 3D model…</p>
          </div>
        </div>
      )}

      {/* View controls */}
      {!loading && (
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Solid / Wireframe */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(3,7,15,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,200,232,0.15)', borderRadius: 10, padding: 4 }}>
            {(['solid', 'wireframe'] as ViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: viewMode === mode ? 'var(--color-cyan)' : 'transparent',
                color: viewMode === mode ? 'var(--color-void)' : 'var(--color-text-muted)',
              }}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Camera presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(3,7,15,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,200,232,0.15)', borderRadius: 10, padding: 4 }}>
            {(['perspective', 'top', 'front', 'side'] as CameraView[]).map(view => (
              <button key={view} onClick={() => setCameraPreset(view)} style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                background: cameraView === view ? 'var(--color-surface)' : 'transparent',
                color: cameraView === view ? 'var(--color-cyan)' : 'var(--color-text-muted)',
              }}>
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {!loading && (
        <div style={{ position: 'absolute', bottom: 12, left: 12, color: 'var(--color-text-dim)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
          Drag to rotate · Scroll to zoom · Right-drag to pan
        </div>
      )}
    </div>
  )
}
