import { useDrag } from '@use-gesture/react'
import { ControlPanel } from './ControlPanel'
import type { AnatomyPart } from '@/data/anatomyData'
import type { AnatomySession } from '@/hooks/useAnatomyHistory'

interface Props {
  isOpen:          boolean
  onClose:         () => void
  visibleGroups:   Set<string>
  loadingGroups:   Set<string>
  opacity:         number
  onToggleGroup:   (key: string) => void
  onOpacityChange: (v: number) => void
  onResetView:     () => void
  onPartSelect:    (part: AnatomyPart) => void
  onHistoryLoad?:  (session: AnatomySession) => void
}

export function Drawer({
  isOpen, onClose,
  visibleGroups, loadingGroups, opacity,
  onToggleGroup, onOpacityChange, onResetView, onPartSelect, onHistoryLoad,
}: Props) {
  const bind = useDrag(({ movement: [mx], last, velocity: [vx] }) => {
    if (!last) return
    if (mx < -40 || vx < -0.5) {
      onClose()
    }
  }, { axis: 'x' })

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        {...bind()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(85vw, 320px)',
          zIndex: 201,
          background: 'rgba(10,10,15,0.97)',
          borderRight: '0.5px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 200ms ease-out',
          touchAction: 'pan-y',
        }}
      >
        <ControlPanel
          bp="mobile"
          visibleGroups={visibleGroups}
          loadingGroups={loadingGroups}
          opacity={opacity}
          onToggleGroup={onToggleGroup}
          onOpacityChange={onOpacityChange}
          onResetView={() => { onResetView(); onClose() }}
          onPartSelect={(part) => { onPartSelect(part); onClose() }}
          onHistoryLoad={(session) => { onHistoryLoad?.(session); onClose() }}
        />
      </div>
    </>
  )
}
