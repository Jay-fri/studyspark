import { useRef, useCallback, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Breakpoint } from './useBreakpoint'

interface FlyTarget {
  cameraPos: THREE.Vector3
  lookAt:    THREE.Vector3
}

export function useAnatomyCamera(bp: Breakpoint, controlsRef: RefObject<any>) {
  const { camera, invalidate } = useThree()
  const targetRef  = useRef<FlyTarget | null>(null)
  const isAnimRef  = useRef(false)
  const onDoneRef  = useRef<(() => void) | null>(null)

  useFrame(() => {
    if (!isAnimRef.current || !targetRef.current) return

    invalidate()
    if (controlsRef.current) controlsRef.current.enabled = false

    const t = targetRef.current
    camera.position.lerp(t.cameraPos, 0.06)

    if (controlsRef.current) {
      controlsRef.current.target.lerp(t.lookAt, 0.06)
      controlsRef.current.update()
    }

    if (camera.position.distanceTo(t.cameraPos) < 0.008) {
      camera.position.copy(t.cameraPos)
      if (controlsRef.current) {
        controlsRef.current.target.copy(t.lookAt)
        controlsRef.current.update()
        controlsRef.current.enabled = true
      }
      isAnimRef.current = false
      onDoneRef.current?.()
      onDoneRef.current = null
    }
  })

  // zoomDist: how far to park the camera from worldPos (computed from bounding sphere)
  const flyTo = useCallback((
    worldPos: THREE.Vector3,
    zoomDist?: number,
    onComplete?: () => void,
  ) => {
    // Direction: from the tapped surface point toward current camera (keeps same viewing side)
    const dir = camera.position.clone().sub(worldPos)
    const len = dir.length()
    if (len > 0.0001) dir.divideScalar(len)

    const dist = zoomDist ?? (bp === 'mobile' ? 1.4 : bp === 'tablet' ? 1.1 : 1.0)

    targetRef.current = {
      cameraPos: worldPos.clone().add(dir.multiplyScalar(dist)),
      lookAt:    worldPos.clone(),
    }
    isAnimRef.current = true
    onDoneRef.current = onComplete ?? null
  }, [bp]) // camera is a stable ref — not needed in deps

  const resetView = useCallback((breakpoint: Breakpoint) => {
    const defaults: Record<Breakpoint, FlyTarget> = {
      mobile:  { cameraPos: new THREE.Vector3(0, 1, 5.5), lookAt: new THREE.Vector3(0, 1, 0) },
      tablet:  { cameraPos: new THREE.Vector3(0, 1, 5.0), lookAt: new THREE.Vector3(0, 1, 0) },
      desktop: { cameraPos: new THREE.Vector3(0, 1, 4.5), lookAt: new THREE.Vector3(0, 1, 0) },
    }
    targetRef.current = defaults[breakpoint]
    isAnimRef.current = true
    if (controlsRef.current) controlsRef.current.enabled = true
  }, [])

  return { flyTo, resetView }
}
