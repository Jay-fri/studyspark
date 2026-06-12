import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LAYER_GROUP_KEYS } from '@/config/anatomyModels'
import { BodyLayerGroup } from './BodyLayerGroup'
import type { Breakpoint } from '@/hooks/useBreakpoint'

interface Props {
  visibleGroups:    Set<string>
  opacity:          number
  bp:               Breakpoint
  selectedMeshName: string | null
  hoveredMeshName:  string | null
  isLowEndGpu:      boolean
  onMeshSelect:     (obj: THREE.Object3D) => void
  onMeshHover:      (obj: THREE.Object3D | null) => void
  onFlyToMesh:      (worldPos: THREE.Vector3, zoomDist: number) => void
}

const AUTO_ROTATE_SPEED: Record<Breakpoint, number> = {
  desktop: 0.003,
  tablet: 0.002,
  mobile: 0,
}

const _box    = new THREE.Box3()
const _sphere = new THREE.Sphere()

function computeZoomDist(obj: THREE.Object3D, bp: Breakpoint): number {
  _box.setFromObject(obj)
  _box.getBoundingSphere(_sphere)
  const fovYDeg  = bp === 'mobile' ? 65 : bp === 'tablet' ? 60 : 55
  const halfFov  = (fovYDeg / 2) * (Math.PI / 180)
  // Distance to fill ~95% of the vertical FOV with the part's bounding sphere
  const dist = (_sphere.radius / Math.tan(halfFov)) * 1.05
  return Math.max(dist, 0.06)
}

export function BodyModel({
  visibleGroups, opacity, bp,
  selectedMeshName, hoveredMeshName, isLowEndGpu,
  onMeshSelect, onMeshHover, onFlyToMesh,
}: Props) {
  const groupRef    = useRef<THREE.Group>(null)
  const downPosRef  = useRef<{ x: number; y: number } | null>(null)

  useFrame((_, delta) => {
    if (!groupRef.current || selectedMeshName) return
    const speed = AUTO_ROTATE_SPEED[bp] ?? 0
    if (speed > 0) groupRef.current.rotation.y += delta * speed
  })

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation()
    downPosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerUp = useCallback((e: any) => {
    e.stopPropagation()
    if (!downPosRef.current) return
    const dx = Math.abs(e.clientX - downPosRef.current.x)
    const dy = Math.abs(e.clientY - downPosRef.current.y)
    if (dx < 8 && dy < 8) {
      onMeshSelect(e.object)
      // e.point = exact surface hit in world space (more accurate than mesh pivot)
      const zoomDist = computeZoomDist(e.object, bp)
      onFlyToMesh(e.point.clone(), zoomDist)
    }
    downPosRef.current = null
  }, [onMeshSelect, onFlyToMesh, bp])

  const handlePointerMove = useCallback((e: any) => {
    e.stopPropagation()
    if (bp !== 'desktop') return
    onMeshHover(e.object)
  }, [bp, onMeshHover])

  const handlePointerOut = useCallback((e: any) => {
    e.stopPropagation()
    onMeshHover(null)
  }, [onMeshHover])

  return (
    <group ref={groupRef}>
      {LAYER_GROUP_KEYS
        .filter(key => visibleGroups.has(key))
        .map(groupKey => (
          <BodyLayerGroup
            key={groupKey}
            groupKey={groupKey}
            visible={visibleGroups.has(groupKey)}
            opacity={opacity}
            selectedMeshName={selectedMeshName}
            hoveredMeshName={hoveredMeshName}
            isLowEndGpu={isLowEndGpu}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
          />
        ))
      }
    </group>
  )
}
