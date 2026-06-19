import { useState, useEffect } from 'react';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { isNative } from '@/lib/capacitor';

// ── Web (PWA) update banner ───────────────────────────────────────────────
// Shown when a new service worker build is waiting to activate.
function WebUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    window.addEventListener('sw-update-available', onUpdate);
    return () => window.removeEventListener('sw-update-available', onUpdate);
  }, []);

  if (!visible) return null;

  const reload = () => {
    const swUpdate = (window as any).__swUpdate;
    if (typeof swUpdate === 'function') swUpdate();
    else window.location.reload();
  };

  return (
    <div
      className="flex-shrink-0 px-4 py-3 flex items-center justify-between gap-3"
      style={{
        background: 'rgba(56,224,195,0.1)',
        borderBottom: '0.5px solid rgba(56,224,195,0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span style={{ fontSize: 15, flexShrink: 0 }}>🚀</span>
        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.75)', margin: 0 }}>
          New version available — reload to update
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={reload}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            background: '#38E0C3',
            color: '#0a1628',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'rgba(255,255,255,0.30)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <i className="ti ti-x" style={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  );
}

// ── Native (APK) update banner ────────────────────────────────────────────
function NativeUpdateBanner() {
  const { updateInfo, dismissUpdate } = useAppUpdate();

  if (!updateInfo?.available) return null;

  return (
    <div
      className="flex-shrink-0 px-4 py-3 flex items-center justify-between gap-3"
      style={{
        background: 'rgba(56,224,195,0.1)',
        borderBottom: '0.5px solid rgba(56,224,195,0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <i className="ti ti-download flex-shrink-0" style={{ color: '#38E0C3', fontSize: 15 }} />
        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.75)', margin: 0 }}>
          Update available — v{updateInfo.version}
          {updateInfo.releaseNotes && (
            <span style={{ color: 'rgba(255,255,255,0.35)' }}> · {updateInfo.releaseNotes}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => { window.location.href = updateInfo.apkUrl; }}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            background: '#38E0C3',
            color: '#0a1628',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Update
        </button>
        {!updateInfo.isMandatory && (
          <button
            onClick={dismissUpdate}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'rgba(255,255,255,0.30)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    </div>
  );
}

export function UpdateBanner() {
  // Native app → APK update check; web → SW update check
  return isNative ? <NativeUpdateBanner /> : <WebUpdateBanner />;
}
