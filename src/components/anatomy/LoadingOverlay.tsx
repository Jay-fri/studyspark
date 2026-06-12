interface Props {
  progress: number
  label?:   string
}

export function LoadingOverlay({ progress, label }: Props) {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 500,
      background: '#0A0A0F',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
    }}>
      {/* Pulsing ring */}
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <style>{`
          @keyframes anatomy-pulse-ring {
            0%   { transform: scale(0.8); opacity: 0.8; }
            50%  { transform: scale(1.1); opacity: 0.3; }
            100% { transform: scale(0.8); opacity: 0.8; }
          }
          @keyframes anatomy-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
        {/* Outer pulsing ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1.5px solid rgba(56,224,195,0.25)',
          animation: 'anatomy-pulse-ring 2s ease-in-out infinite',
        }} />
        {/* Spinning arc */}
        <div style={{
          position: 'absolute',
          inset: '6px',
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#38E0C3',
          borderRightColor: 'rgba(56,224,195,0.4)',
          animation: 'anatomy-spin 1s linear infinite',
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#38E0C3',
          opacity: 0.8,
        }} />
      </div>

      {/* Label + percentage */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '4px',
          letterSpacing: '0.01em',
        }}>
          {label ?? 'Loading 3D Models…'}
        </p>
        <p style={{
          color: '#38E0C3',
          fontSize: '22px',
          fontWeight: 500,
          letterSpacing: '-0.02em',
        }}>
          {clampedProgress}%
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '200px',
        height: '3px',
        background: 'rgba(255,255,255,0.07)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${clampedProgress}%`,
          background: 'linear-gradient(90deg, rgba(56,224,195,0.6), #38E0C3)',
          borderRadius: '2px',
          transition: 'width 300ms ease',
        }} />
      </div>

      <p style={{
        color: 'rgba(255,255,255,0.25)',
        fontSize: '11px',
        letterSpacing: '0.04em',
        marginTop: '-8px',
      }}>
        ANATOMY EXPLORER
      </p>
    </div>
  )
}
