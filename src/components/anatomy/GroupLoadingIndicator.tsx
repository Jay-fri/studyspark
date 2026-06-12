import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { groupKey: string }

export function GroupLoadingIndicator({ groupKey: _groupKey }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.5
  })
  return (
    <mesh ref={meshRef} position={[0, 1, 0]}>
      <boxGeometry args={[0.5, 1.8, 0.3]} />
      <meshBasicMaterial color="#38E0C3" wireframe />
    </mesh>
  )
}
