import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useDeviceDetect, useIsSafari } from '@/hooks/useDeviceDetect';
import { supabase } from '@/services/supabase';

// ─── Config ──────────────────────────────────────────────────────────────────

const APK_URL =
  'https://yguqquyvuflcmlhwdzal.supabase.co/storage/v1/object/public/releases/study-spark-v1.0.2.apk';
const APK_VERSION = '1.0.2';
const APK_SIZE = '11.07 MB';
const APP_URL = 'https://studylm.pages.dev/download';

// ─── Shared card shell ────────────────────────────────────────────────────────

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '0.5px solid rgba(255,255,255,0.09)',
        borderRadius: '16px',
        padding: '24px',
      }}
    >
      {children}
    </div>
  );
}

// ─── Step badge ───────────────────────────────────────────────────────────────

function StepBadge({ n, mint = false }: { n: number; mint?: boolean }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: mint ? 'rgba(56,224,195,0.12)' : 'rgba(255,255,255,0.06)',
        border: `0.5px solid ${mint ? 'rgba(56,224,195,0.25)' : 'rgba(255,255,255,0.12)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: mint ? '#38E0C3' : 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {n}
    </div>
  );
}

// ─── iOS flow ─────────────────────────────────────────────────────────────────

function IOSInstallFlow() {
  const isSafari = useIsSafari();

  const steps = [
    { icon: '↑', text: 'Tap the Share button', detail: 'Found at the bottom of Safari' },
    { icon: '+', text: 'Tap "Add to Home Screen"', detail: '' },
    { icon: '✓', text: 'Tap "Add" in the top right', detail: 'StudyLM now lives on your home screen' },
  ];

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>🍎</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>
          Install on iPhone
        </span>
      </div>

      {!isSafari && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(249,115,22,0.08)',
            border: '0.5px solid rgba(249,115,22,0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <p style={{ fontSize: 12, color: 'rgba(253,186,116,0.85)', lineHeight: 1.5, margin: 0 }}>
            Open this page in Safari to install — tap the ⋯ menu and choose "Open in Safari"
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <StepBadge n={i + 1} mint />
            <div style={{ flex: 1, paddingTop: 2 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: 500, margin: '0 0 2px' }}>
                {step.text}
              </p>
              {step.detail && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', margin: 0 }}>
                  {step.detail}
                </p>
              )}
            </div>
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.15)', flexShrink: 0, paddingTop: 2 }}>
              {step.icon}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 20,
          paddingTop: 20,
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5, margin: 0 }}>
          Must be opened in{' '}
          <span style={{ color: 'rgba(255,255,255,0.40)' }}>Safari</span> — Chrome on iOS
          can't install home screen apps
        </p>
      </div>
    </GlassCard>
  );
}

// ─── Android flow ─────────────────────────────────────────────────────────────

function AndroidInstallFlow() {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    window.location.href = APK_URL;
    supabase.from('app_downloads').insert({ platform: 'android', version: APK_VERSION });
    setTimeout(() => { setDownloading(false); setDone(true); }, 1500);
  };

  const steps = [
    'Tap the downloaded file in your notifications to open it',
    'If prompted, tap "Settings" → allow installs from this source',
    'Tap "Install" — done!',
  ];

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>🤖</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>
          Install on Android
        </span>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          marginBottom: 16,
          background: done ? 'rgba(56,224,195,0.08)' : 'rgba(56,224,195,0.12)',
          border: `0.5px solid ${done ? 'rgba(56,224,195,0.25)' : 'rgba(56,224,195,0.30)'}`,
          color: '#38E0C3',
          fontWeight: 500,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: downloading ? 'wait' : 'pointer',
          transition: 'all 150ms ease',
          opacity: downloading ? 0.7 : 1,
        }}
      >
        <span style={{ fontSize: 16 }}>{done ? '✓' : downloading ? '⟳' : '↓'}</span>
        {done
          ? 'Download started — check notifications'
          : downloading
          ? 'Starting download…'
          : `Download APK — v${APK_VERSION} (${APK_SIZE})`}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {steps.map((text, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <StepBadge n={i + 1} />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, margin: '3px 0 0' }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>🛡</span>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', lineHeight: 1.5, margin: 0 }}>
          Android may warn "unknown source" since this isn't from the Play Store — this is
          expected and safe. Tap "Install anyway."
        </p>
      </div>
    </GlassCard>
  );
}

// ─── Desktop fallback ─────────────────────────────────────────────────────────

function DesktopFallback() {
  return (
    <GlassCard>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.2 }}>📱</span>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.60)', margin: '0 0 6px' }}>
          Open this page on your phone
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', margin: '0 0 24px', lineHeight: 1.5 }}>
          Scan the QR code or visit this link on your mobile device
        </p>

        <div
          style={{
            width: 152,
            height: 152,
            margin: '0 auto 16px',
            background: '#fff',
            borderRadius: 12,
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QRCodeSVG
            value={APP_URL}
            size={136}
            bgColor="#ffffff"
            fgColor="#0a1628"
          />
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', margin: '0 0 24px' }}>
          {APP_URL}
        </p>

        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: '0 0 12px' }}>
            Or just use it right here in your browser
          </p>
          <Link
            to="/dashboard"
            style={{ fontSize: 12, color: '#38E0C3', fontWeight: 500, textDecoration: 'none' }}
          >
            Continue to StudyLM →
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Already installed ────────────────────────────────────────────────────────

function AlreadyInstalledState() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0a1628',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            margin: '0 auto 16px',
            background: 'rgba(56,224,195,0.15)',
            border: '0.5px solid rgba(56,224,195,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}
        >
          ✓
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.70)', margin: '0 0 4px' }}>
          You're all set
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', margin: '0 0 20px' }}>
          StudyLM is already installed on this device
        </p>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: 'rgba(56,224,195,0.10)',
            border: '0.5px solid rgba(56,224,195,0.20)',
            color: '#38E0C3',
            textDecoration: 'none',
          }}
        >
          Open StudyLM →
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GetAppPage() {
  const { device, isPWAInstalled } = useDeviceDetect();

  if (isPWAInstalled) {
    return <AlreadyInstalledState />;
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0a1628',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        paddingTop: 'max(48px, calc(env(safe-area-inset-top, 0px) + 24px))',
        paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
      }}
    >
      {/* Orbs */}
      <div
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'rgba(56,224,195,0.10)',
          top: -120,
          left: -80,
          pointerEvents: 'none',
          filter: 'blur(1px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(99,179,255,0.07)',
          bottom: -60,
          right: 40,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              margin: '0 auto 16px',
              background: 'rgba(56,224,195,0.15)',
              border: '0.5px solid rgba(56,224,195,0.30)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img src="/logo.jpg" alt="StudyLM" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#fff',
              letterSpacing: '-0.025em',
              margin: '0 0 8px',
            }}
          >
            Get StudyLM on your phone
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5 }}>
            Study smarter, anywhere — install once, use offline
          </p>
        </div>

        {/* Device-specific content */}
        {device === 'ios'     && <IOSInstallFlow />}
        {device === 'android' && <AndroidInstallFlow />}
        {device === 'desktop' && <DesktopFallback />}

        {/* Footer link back */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link
            to="/dashboard"
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}
          >
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}
