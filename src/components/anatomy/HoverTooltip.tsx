import { createPortal } from 'react-dom'

interface Props {
  name:    string | null
  x:       number
  y:       number
  visible: boolean
}

export function HoverTooltip({ name, x, y, visible }: Props) {
  if (!visible || !name) return null
  return createPortal(
    <div style={{
      position: 'fixed',
      left: x + 12, top: y - 8,
      background: 'rgba(10,10,15,0.92)',
      border: '0.5px solid rgba(56,224,195,0.4)',
      borderRadius: '6px',
      padding: '4px 10px',
      color: 'rgba(255,255,255,0.9)',
      fontSize: '12px',
      fontWeight: 500,
      pointerEvents: 'none',
      zIndex: 9000,
      opacity: visible ? 1 : 0,
      transition: 'opacity 200ms ease',
      whiteSpace: 'nowrap',
    }}>
      {name}
    </div>,
    document.body
  )
}
