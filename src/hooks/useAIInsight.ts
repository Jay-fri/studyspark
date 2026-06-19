import { useState, useEffect, useRef } from 'react';
import { groqStream, GROQ_MODELS } from '@/services/groq';

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

interface InsightParams {
  name: string;
  notebookTitles: string[];
  recentOutputTypes: string[];
  streak: number;
  enabled?: boolean;
}

export function useAIInsight({ name, notebookTitles, recentOutputTypes, streak, enabled = true }: InsightParams) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled || !name || notebookTitles.length === 0 || fired.current) return;
    fired.current = true;

    const cacheKey = `studylm_insight_${name}_${notebookTitles.length}_${streak}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const { text, ts } = JSON.parse(raw) as { text: string; ts: number };
        if (Date.now() - ts < CACHE_TTL && text) {
          setInsight(text);
          return;
        }
      }
    } catch { /* ignore bad cache */ }

    const controller = new AbortController();
    setLoading(true);

    const topicsStr = notebookTitles.slice(0, 4).join(', ');
    const recentStr = [...new Set(recentOutputTypes)].slice(0, 3).join(', ');
    const streakStr = streak > 1 ? ` on a ${streak}-day streak` : '';

    const messages = [
      {
        role: 'user' as const,
        content: `You are a warm study coach. Write one specific, actionable study tip for ${name}${streakStr} who is studying: ${topicsStr}.${recentStr ? ` They recently made: ${recentStr}.` : ''} Max 25 words. Do not greet them or use their name. Just the tip:`,
      },
    ];

    let accumulated = '';
    (async () => {
      try {
        for await (const chunk of groqStream(messages, GROQ_MODELS.fast, controller.signal)) {
          if (controller.signal.aborted) return;
          accumulated += chunk;
          setInsight(accumulated);
        }
        localStorage.setItem(cacheKey, JSON.stringify({ text: accumulated, ts: Date.now() }));
      } catch { /* silently skip — insight is nice-to-have */ }
      finally { setLoading(false); }
    })();

    return () => controller.abort();
  }, [enabled, name, notebookTitles.length, streak]); // eslint-disable-line react-hooks/exhaustive-deps

  return { insight, loading };
}
