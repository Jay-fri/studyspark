import { useRef, useCallback } from 'react'
import type * as THREE from 'three'

const IS_TOUCH = typeof window !== 'undefined'
  ? window.matchMedia('(pointer: coarse)').matches
  : false

export function useBodyInteraction(
  onSelect: (obj: THREE.Object3D | null) => void,
  onHover:  (obj: THREE.Object3D | null) => void,
) {
  const downPosRef = useRef<{ x: number; y: number } | null>(null)
  const isTouch = IS_TOUCH

  const handlePointerDown = useCallback((e: { clientX: number; clientY: number }) => {
    downPosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerUp = useCallback((
    e: { clientX: number; clientY: number; object: THREE.Object3D }
  ) => {
    if (!downPosRef.current) return
    const dx = Math.abs(e.clientX - downPosRef.current.x)
    const dy = Math.abs(e.clientY - downPosRef.current.y)
    if (dx < 8 && dy < 8) onSelect(e.object)
    downPosRef.current = null
  }, [onSelect])

  const handlePointerMove = useCallback((
    e: { object: THREE.Object3D }
  ) => {
    if (!isTouch) onHover(e.object)
  }, [isTouch, onHover])

  const handlePointerOut = useCallback(() => {
    if (!isTouch) onHover(null)
  }, [isTouch, onHover])

  return {
    isTouch,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handlePointerOut,
  }
}
