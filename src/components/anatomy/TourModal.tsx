interface Props {
  isOpen:  boolean
  onClose: () => void
  onStart: (tourName: string) => void
}

const TOURS = [
  {
    name: 'Full Body Overview',
    description: 'Explore all major systems in a guided walkthrough of the entire human body.',
    tokens: 20,
    icon: '🫀',
  },
  {
    name: 'Cardiovascular System',
    description: 'Heart, arteries, veins — trace the full path of blood through the body.',
    tokens: 10,
    icon: '❤️',
  },
  {
    name: 'Nervous System',
    description: 'Brain, spinal cord, and peripheral nerves — the body\'s communication network.',
    tokens: 10,
    icon: '🧠',
  },
]

export function TourModal({ isOpen, onClose, onStart }: Props) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9000,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'rgba(17,29,48,0.98)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <div>
            <h3 style={{
              color: '#fff',
              fontSize: '15px',
              fontWeight: 500,
              margin: '0 0 3px',
            }}>
              Guided Tours
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '11px',
              margin: 0,
            }}>
              AI-narrated anatomy walkthroughs
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>

        {/* Tour list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {TOURS.map(tour => (
            <button
              key={tour.name}
              onClick={() => { onStart(tour.name); onClose() }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '22px', flexShrink: 0 }}>{tour.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  margin: '0 0 4px',
                }}>
                  {tour.name}
                </p>
                <p style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: '11.5px',
                  lineHeight: 1.5,
                  margin: '0 0 8px',
                }}>
                  {tour.description}
                </p>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(56,224,195,0.1)',
                  border: '0.5px solid rgba(56,224,195,0.2)',
                  borderRadius: '4px',
                  padding: '2px 7px',
                  color: '#38E0C3',
                  fontSize: '10.5px',
                  fontWeight: 500,
                }}>
                  ✦ {tour.tokens} tokens
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
