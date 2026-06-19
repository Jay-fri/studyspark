import { useState, useCallback, useEffect } from 'react';
import { DocumentViewer } from '@/components/viewer/DocumentViewer';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Clock, Copy } from '@/lib/icons';
import { supabase } from '@/services/supabase';
import { FloatingChat } from '@/components/notebook/FloatingChat';
import type { Source } from '@/types';
import toast from 'react-hot-toast';

export default function SourceViewerPage() {
  const { id: _notebookId, sourceId } = useParams<{ id: string; sourceId: string }>();
  const navigate = useNavigate();

  const [view, setView] = useState<'file' | 'jots'>('file');
  const [jotText, setJotText] = useState('');
  const [savedJots, setSavedJots] = useState<Array<{ id: string; text: string; timestamp: string }>>([]);
  const [chatQuery, setChatQuery] = useState('');

  const { data: source, isLoading } = useQuery<Source>({
    queryKey: ['source', sourceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('sources').select('*').eq('id', sourceId!).single();
      if (error) throw error;
      return data as Source;
    },
    enabled: !!sourceId,
  });

  const fileUrl  = source?.file_url ?? null;
  const hasFile  = !!fileUrl;

  useEffect(() => { if (source && !hasFile) setView('jots'); }, [source, hasFile]);

  useEffect(() => {
    if (!sourceId) return;
    const saved = localStorage.getItem(`jots-${sourceId}`);
    if (saved) {
      try {
        setSavedJots(JSON.parse(saved));
      } catch {}
    }
  }, [sourceId]);

  const saveJot = useCallback(() => {
    if (!jotText.trim() || !sourceId) return;
    const newJot = {
      id: crypto.randomUUID(),
      text: jotText.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newJot, ...savedJots];
    setSavedJots(updated);
    localStorage.setItem(`jots-${sourceId}`, JSON.stringify(updated));
    setJotText('');
    toast.success('Jot saved!');
  }, [jotText, savedJots, sourceId]);

  const deleteJot = useCallback((id: string) => {
    const updated = savedJots.filter((j) => j.id !== id);
    setSavedJots(updated);
    localStorage.setItem(`jots-${sourceId}`, JSON.stringify(updated));
  }, [savedJots, sourceId]);

  const copyJot = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  }, []);

  const readMinutes = source?.word_count ? Math.ceil(source.word_count / 250) : null;
  const fileType = source?.type ?? 'pdf';

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)' }}>
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-3 shrink-0"
        style={{ minHeight: 52, background: 'var(--surface-1)', borderBottom: '0.5px solid var(--border)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <FileText className="w-4 h-4 shrink-0" style={{ color: '#38E0C3' }} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {source?.title ?? 'Loading…'}
          </p>
          {readMinutes && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Clock className="w-2.5 h-2.5" /> ~{readMinutes} min read
            </span>
          )}
        </div>

        {hasFile && (
          <div
            className="flex items-center rounded-lg p-0.5 shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}
          >
            {(['file', 'jots'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                style={view === v
                  ? { background: 'rgba(56,224,195,0.15)', color: '#38E0C3', border: '0.5px solid rgba(56,224,195,0.3)' }
                  : { color: 'rgba(255,255,255,0.35)', border: '0.5px solid transparent' }}
              >
                {v === 'file' ? '📄 Document' : '📝 Jots'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid rgba(56,224,195,0.2)', borderTop: '2.5px solid #38E0C3', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!isLoading && view === 'file' && source && (
        <div className="flex-1 overflow-hidden">
          <DocumentViewer
            sourceId={source.id}
            fileType={fileType}
            title={source.title}
          />
        </div>
      )}

      {!isLoading && view === 'jots' && (
        <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ paddingBottom: 100 }}>
          <div className="px-5 py-6 max-w-2xl mx-auto lg:px-8">
            <div className="mb-6">
              <textarea
                value={jotText}
                onChange={(e) => setJotText(e.target.value)}
                placeholder="Write your notes, copy important excerpts, or jot down ideas..."
                className="w-full p-4 rounded-xl resize-none focus:outline-none focus:ring-1 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.9)',
                  minHeight: 120,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    saveJot();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {jotText.length} characters • Cmd+Enter to save
                </p>
                <button
                  onClick={saveJot}
                  disabled={!jotText.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: jotText.trim() ? 'rgba(56,224,195,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `0.5px solid ${jotText.trim() ? 'rgba(56,224,195,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: jotText.trim() ? '#38E0C3' : 'rgba(255,255,255,0.35)',
                    cursor: jotText.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Save Jot
                </button>
              </div>
            </div>

            {savedJots.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {savedJots.length} saved {savedJots.length === 1 ? 'jot' : 'jots'}
                </p>
                {savedJots.map((jot) => (
                  <div
                    key={jot.id}
                    className="p-4 rounded-xl group"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(jot.timestamp).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyJot(jot.text)}
                          className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                        </button>
                        <button
                          onClick={() => deleteJot(jot.id)}
                          className="p-1.5 rounded-md hover:bg-[rgba(255,0,0,0.1)] transition-colors"
                          title="Delete"
                        >
                          <span style={{ color: 'rgba(255,100,100,0.7)', fontSize: 14 }}>×</span>
                        </button>
                      </div>
                    </div>
                    <p
                      className="whitespace-pre-wrap"
                      style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.7 }}
                    >
                      {jot.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p style={{ fontSize: 48, marginBottom: 12 }}>📝</p>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  No jots yet
                </p>
                <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: 280 }}>
                  Write notes, save important parts from the document, or capture your thoughts
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <FloatingChat
        contextLabel={source?.title}
        contextContent=""
        initialQuery={chatQuery || undefined}
        onInitialQueryConsumed={() => setChatQuery('')}
      />
    </div>
  );
}
