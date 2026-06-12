import { useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { GLB_MODELS, type ModelKey } from '@/config/anatomyModels'
import { resolveColor } from '@/config/anatomyColors'

interface Props {
  modelKey:         ModelKey
  visible:          boolean
  opacity:          number
  selectedMeshName: string | null
  hoveredMeshName:  string | null
  isLowEndGpu:      boolean
  onPointerDown:    (e: any) => void
  onPointerUp:      (e: any) => void
  onPointerMove:    (e: any) => void
  onPointerOut:     (e: any) => void
}

const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'

export function SystemLayer({
  modelKey, visible, opacity,
  selectedMeshName, hoveredMeshName,
  isLowEndGpu,
  onPointerDown, onPointerUp, onPointerMove, onPointerOut,
}: Props) {
  const { scene } = useGLTF(GLB_MODELS[modelKey], DRACO_PATH)

  const clonedScene = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      // Stamp the source model on every mesh — read in BodyModel for zoom + PartViewer
      child.userData.modelKey = modelKey

      const cloneMat = (src: THREE.Material): THREE.MeshStandardMaterial => {
        if (src instanceof THREE.MeshStandardMaterial) {
          const m = src.clone()
          m.roughness = 0.68
          m.metalness = 0.08
          return m
        }
        const m = new THREE.MeshStandardMaterial({ name: src.name })
        m.roughness = 0.68
        m.metalness = 0.08
        return m
      }

      child.material = Array.isArray(child.material)
        ? child.material.map(cloneMat)
        : cloneMat(child.material as THREE.Material)
    })
    return root
  }, [scene, modelKey])

  useEffect(() => {
    // ── 1. Remove all outline meshes from previous state ─────────────────
    const outlinesToRemove: THREE.Object3D[] = []
    clonedScene.traverse((c) => {
      if (c.userData.isOutline) outlinesToRemove.push(c)
    })
    outlinesToRemove.forEach((o) => o.parent?.remove(o))

    // ── 2. Apply material colour/emissive/opacity ─────────────────────────
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.isOutline) return

      const isSelected = child.name === selectedMeshName
      const isHovered  = !isLowEndGpu && child.name === hoveredMeshName

      const mats = (
        Array.isArray(child.material) ? child.material : [child.material]
      ) as THREE.MeshStandardMaterial[]

      mats.forEach((mat) => {
        const hasTexture = !!(mat.map || mat.aoMap || mat.normalMap)

        if (isSelected) {
          // Tint color toward mint for clear "selected" distinction
          if (!hasTexture) {
            const base = new THREE.Color(resolveColor(child.name, modelKey))
            base.lerp(new THREE.Color('#38E0C3'), 0.45)
            mat.color.copy(base)
          }
          mat.emissive.set('#38E0C3')
          mat.emissiveIntensity = 0.55
          mat.opacity     = 1
          mat.transparent = false
        } else if (isHovered) {
          if (!hasTexture) mat.color.set(resolveColor(child.name, modelKey))
          mat.emissive.set('#38E0C3')
          mat.emissiveIntensity = 0.22
          mat.opacity     = opacity
          mat.transparent = opacity < 1
        } else {
          if (!hasTexture) mat.color.set(resolveColor(child.name, modelKey))
          mat.emissive.set(0x000000)
          mat.emissiveIntensity = 0
          mat.opacity     = opacity
          mat.transparent = opacity < 1
        }

        mat.needsUpdate = true
      })

      // ── 3. Add BackSide outline to selected mesh ──────────────────────
      if (isSelected) {
        const outlineMat = new THREE.MeshBasicMaterial({
          color: '#38E0C3',
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.7,
        })
        const outline = new THREE.Mesh(child.geometry, outlineMat)
        outline.scale.setScalar(1.08)
        outline.userData.isOutline = true
        child.add(outline)
      }
    })
  }, [clonedScene, modelKey, selectedMeshName, hoveredMeshName, opacity, isLowEndGpu])

  if (!visible) return null

  return (
    <primitive
      object={clonedScene}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    />
  )
}

useGLTF.preload(GLB_MODELS.skeleton, DRACO_PATH)
