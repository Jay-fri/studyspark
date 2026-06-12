import { useNavigate } from 'react-router-dom'
import { LAYER_GROUPS, LAYER_GROUP_KEYS } from '@/config/anatomyModels'

interface Props {
  bp:             string
  subtitle:       string
  isDrawerOpen:   boolean
  visibleGroups:  Set<string>
  onToggleDrawer: () => void
  onToggleGroup:  (key: string) => void
}

export function TopBar({
  bp, subtitle, isDrawerOpen,
  visibleGroups, onToggleDrawer, onToggleGroup,
}: Props) {
  const navigate = useNavigate()
  const height = bp === 'tablet' ? '60px' : '56px'

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'rgba(10,10,15,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '0.5px solid rgba(255,255,255,0.08)',
    }}>
      {/* Main row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height,
        padding: '0 16px',
        gap: '12px',
      }}>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            padding: '0',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '18px',
            lineHeight: 1,
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Go back"
        >
          ←
        </button>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <p style={{
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Anatomy Explorer
          </p>
          {subtitle && (
            <p style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '10px',
              margin: '1px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Hamburger */}
        <button
          onClick={onToggleDrawer}
          style={{
            background: isDrawerOpen ? 'rgba(56,224,195,0.1)' : 'none',
            border: `0.5px solid ${isDrawerOpen ? 'rgba(56,224,195,0.2)' : 'transparent'}`,
            borderRadius: '8px',
            padding: '0',
            cursor: 'pointer',
            color: isDrawerOpen ? '#38E0C3' : 'rgba(255,255,255,0.5)',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            transition: 'all 150ms ease',
          }}
          aria-label="Toggle menu"
        >
          {isDrawerOpen ? '×' : '☰'}
        </button>
      </div>

      {/* System pills row — tablet only */}
      {bp === 'tablet' && (
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '0 16px 10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {LAYER_GROUP_KEYS.map(key => {
            const group = LAYER_GROUPS[key]
            const isVisible = visibleGroups.has(key)
            return (
              <button
                key={key}
                onClick={() => onToggleGroup(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: isVisible ? `${group.color}18` : 'rgba(255,255,255,0.04)',
                  border: `0.5px solid ${isVisible ? `${group.color}44` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  height: '30px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 150ms ease',
                }}
              >
                <span style={{ fontSize: '12px' }}>{group.icon}</span>
                <span style={{
                  color: isVisible ? group.color : 'rgba(255,255,255,0.4)',
                  fontSize: '11px',
                  fontWeight: isVisible ? 500 : 400,
                }}>
                  {group.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
