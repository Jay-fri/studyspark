import { useState, useEffect } from 'react';
import { formatDocumentText } from '@/services/groq';

const CACHE_PREFIX = 'studylm_fmt_';
const MIN_LENGTH   = 300; // don't bother formatting short content

export function useSourceFormatter(sourceId: string, rawText: string) {
  const [formatted, setFormatted] = useState<string>('');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (!rawText) return;

    // Short text — heuristic formatting is fine, no AI needed
    if (rawText.length < MIN_LENGTH) {
      setFormatted(rawText);
      return;
    }

    const key    = CACHE_PREFIX + sourceId;
    const cached = localStorage.getItem(key);
    if (cached) {
      setFormatted(cached);
      return;
    }

    let cancelled = false;
    const ctrl    = new AbortController();
    setLoading(true);

    formatDocumentText(rawText, ctrl.signal)
      .then((result) => {
        if (cancelled) return;
        try { localStorage.setItem(key, result); } catch { /* quota full — skip cache */ }
        setFormatted(result);
      })
      .catch(() => {
        if (!cancelled) setFormatted(rawText);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [sourceId, rawText]);

  return { formatted, loading };
}
