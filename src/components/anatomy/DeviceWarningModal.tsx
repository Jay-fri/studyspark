import { useNavigate } from 'react-router-dom'

interface Props {
  onContinue: () => void
}

export function DeviceWarningModal({ onContinue }: Props) {
  const navigate = useNavigate()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'rgba(10,10,18,0.98)',
        border: '0.5px solid rgba(234,179,8,0.35)',
        borderRadius: '16px',
        padding: '32px 26px 26px',
        maxWidth: '380px',
        width: '100%',
      }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'rgba(234,179,8,0.1)',
            border: '0.5px solid rgba(234,179,8,0.3)',
            fontSize: '26px',
          }}>⚠️</div>
        </div>

        <h2 style={{
          color: '#EAB308', fontSize: '17px', fontWeight: 500,
          textAlign: 'center', letterSpacing: '-0.02em',
          margin: '0 0 10px',
        }}>
          Best experienced on desktop
        </h2>

        <p style={{
          color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.65,
          textAlign: 'center', margin: '0 0 20px',
        }}>
          The 3D Anatomy Explorer loads large medical models that require significant GPU and memory. On mobile devices you may experience:
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: '10px', padding: '14px 16px',
          marginBottom: '22px',
        }}>
          {[
            { icon: '🐌', text: 'Slow or choppy 3D rendering' },
            { icon: '🧊', text: 'App freezing during model loads' },
            { icon: '🔋', text: 'Increased battery drain' },
            { icon: '💾', text: 'App crashes if memory is low' },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '5px 0',
              borderBottom: '0.5px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12.5px' }}>{text}</span>
            </div>
          ))}
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.35)', fontSize: '11.5px',
          textAlign: 'center', margin: '0 0 20px',
        }}>
          For the best experience, open StudyLM on a laptop or desktop.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '10px', padding: '13px',
              color: 'rgba(255,255,255,0.75)', fontSize: '13px',
              fontWeight: 500, cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            ← Go Back
          </button>
          <button
            onClick={onContinue}
            style={{
              background: 'rgba(234,179,8,0.12)',
              border: '0.5px solid rgba(234,179,8,0.4)',
              borderRadius: '10px', padding: '13px',
              color: '#EAB308', fontSize: '13px',
              fontWeight: 500, cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            Continue on Mobile →
          </button>
        </div>
      </div>
    </div>
  )
}
