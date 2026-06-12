interface Props {
  bp:         string
  partName:   string | null
  response:   string
  isLoading:  boolean
  isOpen:     boolean
  onClose:    () => void
  onDeepDive: () => void
}

export function AIExplainPanel({
  bp, partName, response, isLoading, isOpen, onClose, onDeepDive,
}: Props) {
  if (!isOpen || bp === 'mobile') return null

  const leftOffset = bp === 'desktop' ? '280px' : '0'

  return (
    <div style={{
      position: 'fixed',
      left: leftOffset,
      right: '0',
      bottom: '0',
      zIndex: 60,
      background: 'rgba(10,10,15,0.94)',
      backdropFilter: 'blur(16px)',
      borderTop: '0.5px solid rgba(56,224,195,0.15)',
      padding: '12px 20px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      maxHeight: '180px',
    }}>
      {/* AI icon */}
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: 'rgba(56,224,195,0.1)',
        border: '0.5px solid rgba(56,224,195,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '2px',
      }}>
        <span style={{ fontSize: '14px' }}>✦</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {partName && (
          <p style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: '10px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            {partName}
          </p>
        )}
        <div style={{
          overflowY: 'auto',
          maxHeight: '120px',
          scrollbarWidth: 'none',
        }}>
          {isLoading && !response ? (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#38E0C3',
                    opacity: 0.7,
                    animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                    display: 'inline-block',
                  }}
                />
              ))}
              <style>{`
                @keyframes bounce {
                  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                  40%           { transform: scale(1);   opacity: 1;   }
                }
              `}</style>
            </div>
          ) : (
            <p style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '12.5px',
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}>
              {response}
              {isLoading && <span style={{ color: '#38E0C3' }}>▌</span>}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginTop: '2px' }}>
        <button
          onClick={onDeepDive}
          style={{
            background: 'rgba(56,224,195,0.08)',
            border: '0.5px solid rgba(56,224,195,0.2)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#38E0C3',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Deep dive →
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.09)',
            borderRadius: '6px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '14px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
