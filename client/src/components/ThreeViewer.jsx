import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

function GeometryObject({ obj, selected, onClick }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const pos = obj.position || { x: 0, y: 0, z: 0 };
  const dim = obj.dimensions || { width: 100, height: 50, depth: 80 };
  const rot = obj.rotation || { x: 0, y: 0, z: 0 };

  const color = obj.color || '#8aa0b0';
  const isSubtract = obj.operation === 'subtract';

  if (isSubtract) return null; // subtractive ops shown differently

  let geometry;
  switch (obj.type) {
    case 'cylinder':
      geometry = (
        <cylinderGeometry
          args={[
            (dim.width || 50) / 2,
            (dim.width || 50) / 2,
            dim.height || 100,
            32,
          ]}
        />
      );
      break;
    case 'sphere':
      geometry = <sphereGeometry args={[(dim.width || 50) / 2, 32, 32]} />;
      break;
    case 'cone':
      geometry = (
        <coneGeometry
          args={[(dim.width || 50) / 2, dim.height || 100, 32]}
        />
      );
      break;
    case 'torus':
      geometry = (
        <torusGeometry
          args={[(dim.width || 60) / 2, (dim.depth || 15) / 2, 16, 64]}
        />
      );
      break;
    case 'wedge': {
      // Use a custom shape for wedge (triangular prism)
      const shape = new THREE.Shape();
      const w = dim.width || 100;
      const d = dim.depth || 80;
      shape.moveTo(-w / 2, -d / 2);
      shape.lineTo(w / 2, -d / 2);
      shape.lineTo(-w / 2, d / 2);
      shape.closePath();
      geometry = (
        <extrudeGeometry
          args={[shape, { depth: dim.height || 50, bevelEnabled: false }]}
        />
      );
      break;
    }
    default: // box
      geometry = (
        <boxGeometry
          args={[dim.width || 100, dim.height || 50, dim.depth || 80]}
        />
      );
  }

  return (
    <mesh
      ref={meshRef}
      position={[pos.x, pos.y, pos.z]}
      rotation={[
        (rot.x * Math.PI) / 180,
        (rot.y * Math.PI) / 180,
        (rot.z * Math.PI) / 180,
      ]}
      onClick={(e) => { e.stopPropagation(); onClick(obj); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      {geometry}
      <meshStandardMaterial
        color={hovered || selected ? '#4a90d9' : color}
        metalness={0.3}
        roughness={0.6}
        transparent={hovered || selected}
        opacity={hovered || selected ? 0.85 : 1}
        wireframe={false}
      />
      {selected && (
        <lineSegments>
          <edgesGeometry
            args={[
              obj.type === 'cylinder'
                ? new THREE.CylinderGeometry((dim.width || 50) / 2, (dim.width || 50) / 2, dim.height || 100, 32)
                : new THREE.BoxGeometry(dim.width || 100, dim.height || 50, dim.depth || 80),
            ]}
          />
          <lineBasicMaterial color="#ffffff" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}

function Scene({ geometry, selectedId, onSelect }) {
  if (!geometry || !geometry.objects) return null;

  return (
    <>
      {geometry.objects.map((obj) => (
        <GeometryObject
          key={obj.id}
          obj={obj}
          selected={selectedId === obj.id}
          onClick={onSelect}
        />
      ))}
    </>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="text-white text-sm">Loading 3D viewer…</div>
    </Html>
  );
}

export default function ThreeViewer({ geometry }) {
  const [selectedObj, setSelectedObj] = useState(null);

  const handleSelect = (obj) => {
    setSelectedObj(prev => prev?.id === obj.id ? null : obj);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [200, 200, 300], fov: 45 }}
        gl={{ antialias: true }}
        style={{ background: '#1a1f2e' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[300, 400, 200]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-200, 200, -200]} intensity={0.4} />
          <pointLight position={[0, 300, 0]} intensity={0.3} />

          <Scene
            geometry={geometry}
            selectedId={selectedObj?.id}
            onSelect={handleSelect}
          />

          <Grid
            args={[2000, 2000]}
            cellSize={50}
            cellThickness={0.5}
            cellColor="#2a3040"
            sectionSize={200}
            sectionThickness={1}
            sectionColor="#3a4060"
            fadeDistance={1500}
            position={[0, -5, 0]}
          />

          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minDistance={50}
            maxDistance={2000}
          />
        </Suspense>
      </Canvas>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 text-xs text-gray-400 bg-black/40 px-3 py-2 rounded-lg space-y-0.5">
        <div>Left drag: Rotate</div>
        <div>Right drag: Pan</div>
        <div>Scroll: Zoom</div>
        <div>Click object: Select</div>
      </div>

      {/* Selected object info */}
      {selectedObj && (
        <div className="absolute top-3 right-3 bg-gray-900/90 text-white text-xs px-4 py-3 rounded-lg border border-gray-600 max-w-xs">
          <div className="font-semibold text-blue-400 mb-1">{selectedObj.name}</div>
          <div className="text-gray-300 mb-2">{selectedObj.type}</div>
          {selectedObj.dimensions && (
            <div className="space-y-1 text-gray-400">
              {Object.entries(selectedObj.dimensions).map(([k, v]) => (
                <div key={k}>{k}: <span className="text-white">{v} {geometry?.unit || 'mm'}</span></div>
              ))}
            </div>
          )}
          {selectedObj.notes && (
            <div className="mt-2 text-gray-400 italic">{selectedObj.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}
