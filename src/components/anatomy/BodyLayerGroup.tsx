import { Component, Suspense, type ReactNode } from 'react'
import { LAYER_GROUPS } from '@/config/anatomyModels'
import { SystemLayer } from './SystemLayer'
import { GroupLoadingIndicator } from './GroupLoadingIndicator'
import type { ModelKey } from '@/config/anatomyModels'

// Per-model error boundary: a CORS/404 on one GLB silently hides that layer
// instead of crashing the whole Canvas.
class SceneErrorBoundary extends Component<
  { children: ReactNode; modelKey: string },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return null  // hide silently; Canvas stays alive
    return this.props.children
  }
}

interface Props {
  groupKey:         string
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

export function BodyLayerGroup({
  groupKey, visible, opacity,
  selectedMeshName, hoveredMeshName, isLowEndGpu,
  onPointerDown, onPointerUp, onPointerMove, onPointerOut,
}: Props) {
  const group = LAYER_GROUPS[groupKey]
  if (!group) return null

  return (
    <>
      {group.models.map((modelKey: ModelKey) => (
        <SceneErrorBoundary key={modelKey} modelKey={modelKey}>
          <Suspense fallback={<GroupLoadingIndicator groupKey={groupKey} />}>
            <SystemLayer
              modelKey={modelKey}
              visible={visible}
              opacity={opacity}
              selectedMeshName={selectedMeshName}
              hoveredMeshName={hoveredMeshName}
              isLowEndGpu={isLowEndGpu}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerMove={onPointerMove}
              onPointerOut={onPointerOut}
            />
          </Suspense>
        </SceneErrorBoundary>
      ))}
    </>
  )
}
