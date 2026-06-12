import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { TOUCH } from 'three'
import type { Breakpoint } from '@/hooks/useBreakpoint'
import { BodyModel } from './BodyModel'
import { useAnatomyCamera } from '@/hooks/useAnatomyCamera'

const CAMERA_CONFIG: Record<Breakpoint, { fov: number; position: [number, number, number] }> = {
  mobile:  { fov: 65, position: [0, 1, 5.5] },
  tablet:  { fov: 60, position: [0, 1, 5.0] },
  desktop: { fov: 55, position: [0, 1, 4.5] },
}

const IS_LOW_END_GPU = typeof navigator !== 'undefined'
  ? navigator.hardwareConcurrency <= 4
  : false

type ZoomHandlers = { setDist: (d: number) => void; zoomBy: (f: number) => void }

interface SceneProps {
  bp:               Breakpoint
  visibleGroups:    Set<string>
  opacity:          number
  selectedMeshName: string | null
  hoveredMeshName:  string | null
  onMeshSelect:     (obj: THREE.Object3D) => void
  onMeshHover:      (obj: THREE.Object3D | null) => void
  flyToWorldPos:    THREE.Vector3 | null
  flyToDist:        number
  onFlyComplete:    () => void
  onFlyToMesh:      (worldPos: THREE.Vector3, zoomDist: number) => void
  onZoomRegister:   (h: ZoomHandlers) => void
}

function Scene({
  bp, visibleGroups, opacity,
  selectedMeshName, hoveredMeshName,
  onMeshSelect, onMeshHover,
  flyToWorldPos, flyToDist, onFlyComplete, onFlyToMesh,
  onZoomRegister,
}: SceneProps) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const { flyTo, resetView } = useAnatomyCamera(bp, controlsRef)
  const prevFlyRef = useRef<THREE.Vector3 | null>(null)

  useEffect(() => {
    if (flyToWorldPos && flyToWorldPos !== prevFlyRef.current) {
      prevFlyRef.current = flyToWorldPos
      flyTo(flyToWorldPos, flyToDist, onFlyComplete)
    }
  }, [flyToWorldPos, flyToDist, flyTo, onFlyComplete])

  useEffect(() => {
    resetView(bp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onZoomRegister({
      setDist: (dist: number) => {
        if (!controlsRef.current) return
        const target = (controlsRef.current.target as THREE.Vector3).clone()
        const dir = camera.position.clone().sub(target).normalize()
        camera.position.copy(target.add(dir.multiplyScalar(dist)))
        controlsRef.current.update()
      },
      zoomBy: (factor: number) => {
        if (!controlsRef.current) return
        const target = (controlsRef.current.target as THREE.Vector3).clone()
        const dir = camera.position.clone().sub(target)
        const newDist = Math.max(0.05, Math.min(10, dir.length() * factor))
        camera.position.copy(target.clone().add(dir.normalize().multiplyScalar(newDist)))
        controlsRef.current.update()
      },
    })
  }, [onZoomRegister, camera])

  return (
    <>
      <Environment preset="studio" background={false} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]}  intensity={0.9} castShadow={bp === 'desktop'} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={bp === 'mobile' ? 0.7 : 1.0}
        zoomSpeed={0.9}
        minDistance={0.02}
        maxDistance={10}
        enablePan
        panSpeed={0.6}
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
      />
      <BodyModel
        visibleGroups={visibleGroups}
        opacity={opacity}
        bp={bp}
        selectedMeshName={selectedMeshName}
        hoveredMeshName={hoveredMeshName}
        isLowEndGpu={IS_LOW_END_GPU}
        onMeshSelect={onMeshSelect}
        onMeshHover={onMeshHover}
        onFlyToMesh={onFlyToMesh}
      />
    </>
  )
}

interface CanvasProps extends SceneProps {
  width:  number
  height: number
}

export function BodyCanvas({
  width, height, bp,
  visibleGroups, opacity,
  selectedMeshName, hoveredMeshName,
  onMeshSelect, onMeshHover,
  flyToWorldPos, flyToDist, onFlyComplete, onFlyToMesh,
  onZoomRegister,
}: CanvasProps) {
  const cam = CAMERA_CONFIG[bp]
  const dpr: [number, number] = [1, bp === 'mobile' ? 1.5 : bp === 'tablet' ? 1.75 : 2]

  return (
    <Canvas
      style={{ width, height, display: 'block' }}
      dpr={dpr}
      frameloop={bp === 'mobile' ? 'demand' : 'always'}
      gl={{
        antialias: bp !== 'mobile',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ fov: cam.fov, position: cam.position, near: 0.01, far: 100 }}
      shadows={bp === 'desktop'}
    >
      <Suspense fallback={null}>
        <Scene
          bp={bp}
          visibleGroups={visibleGroups}
          opacity={opacity}
          selectedMeshName={selectedMeshName}
          hoveredMeshName={hoveredMeshName}
          onMeshSelect={onMeshSelect}
          onMeshHover={onMeshHover}
          flyToWorldPos={flyToWorldPos}
          flyToDist={flyToDist}
          onFlyComplete={onFlyComplete}
          onFlyToMesh={onFlyToMesh}
          onZoomRegister={onZoomRegister}
        />
      </Suspense>
    </Canvas>
  )
}
