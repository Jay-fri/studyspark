import { useState, useEffect, useCallback, useRef } from 'react';
import { ExternalLink, RefreshCw } from '@/lib/icons';
import { useDocumentUrl } from '@/hooks/useDocumentUrl';

type Props = {
  sourceId: string;
  fileType: string;
  title: string;
};

function getViewerUrl(fileUrl: string, fileType: string): string {
  if (['docx', 'doc', 'pptx', 'xlsx', 'xls'].includes(fileType)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  }
  return fileUrl;
}

export function DocumentViewer({ sourceId, fileType, title }: Props) {
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { data: fileUrl, isLoading, error, refetch } = useDocumentUrl(sourceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid rgba(56,224,195,0.2)', borderTop: '2.5px solid #38E0C3', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <p style={{ fontSize: 36 }}>⚠️</p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>Could not load document</p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, maxWidth: 260 }}>
          {error?.message || 'The document may be unavailable or your session expired.'}
        </p>
        <button
          onClick={() => { setKey((k) => k + 1); refetch(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(56,224,195,0.1)', border: '0.5px solid rgba(56,224,195,0.3)', color: '#38E0C3', fontSize: 12, cursor: 'pointer' }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const viewerUrl = getViewerUrl(fileUrl, fileType);
  const isOffice  = viewerUrl.includes('officeapps.live.com');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a1628' }}>
      {isOffice ? (
        <iframe
          key={key}
          ref={iframeRef}
          src={viewerUrl}
          title={title}
          style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
        />
      ) : (
        <iframe
          key={key}
          ref={iframeRef}
          src={viewerUrl}
          title={title}
          style={{ flex: 1, width: '100%', border: 'none' }}
        />
      )}
    </div>
  );
}
