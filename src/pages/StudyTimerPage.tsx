import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, X, Timer, BookOpen, FileText, ChevronRight } from '@/lib/icons';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNotebooks } from '@/hooks/useNotebook';
import { useNotebookStore } from '@/stores/notebookStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { FloatingChat } from '@/components/notebook/FloatingChat';
import { useSourceFormatter } from '@/hooks/useSourceFormatter';

// ── Types ──────────────────────────────────────────────────────────────────
type SetupPhase = 'duration' | 'material';

// Store raw JSONB + type so each renderer gets structured data, not flat text
type MaterialChoice =
  | { kind: 'output'; type: string; label: string; icon: string; rawContent: Record<string, unknown> }
  | { kind: 'source'; sourceId: string; title: string; content: string };

const DURATIONS = [
  { label: '5 min', value: 5 }, { label: '10 min', value: 10 },
  { label: '15 min', value: 15 }, { label: '25 min', value: 25 },
  { label: '45 min', value: 45 }, { label: '60 min', value: 60 },
];

const OUTPUT_META: Record<string, { label: string; icon: string }> = {
  summary:     { label: 'Summary',      icon: '📝' },
  studyguide:  { label: 'Study Guide',  icon: '📖' },
  keyconcepts: { label: 'Key Concepts', icon: '💡' },
  podcast:     { label: 'Podcast',      icon: '🎙️' },
  flashcards:  { label: 'Flashcards',   icon: '🃏' },
  quiz:        { label: 'Quiz',         icon: '❓' },
};

// ── Shared prose styles ───────────────────────────────────────────────────
const BODY_COLOR   = 'rgba(255,255,255,0.82)';
const MUTED_COLOR  = 'rgba(255,255,255,0.45)';
const HEADING_COLOR = '#fff';
const MINT         = '#38E0C3';
const BORDER       = 'rgba(255,255,255,0.08)';
const CARD_BG      = 'rgba(255,255,255,0.04)';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: MUTED_COLOR, marginBottom: 6 }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: '0.5px', background: BORDER, margin: '20px 0' }} />;
}

// ── Quiz reader ───────────────────────────────────────────────────────────
interface QuizQ { question: string; options: string[]; correct_index: number; explanation?: string }

function QuizReader({ questions }: { questions: QuizQ[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>❓</span>
        <div>
          <p style={{ color: HEADING_COLOR, fontSize: 15, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif' }}>Quiz</p>
          <p style={{ color: MUTED_COLOR, fontSize: 12 }}>{questions.length} question{questions.length !== 1 ? 's' : ''} · answers shown below each question</p>
        </div>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} style={{ borderRadius: 14, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
          {/* Question header */}
          <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderBottom: `0.5px solid ${BORDER}` }}>
            <SectionLabel>Question {qi + 1}</SectionLabel>
            <p style={{ color: HEADING_COLOR, fontSize: 14.5, lineHeight: 1.65, fontWeight: 500 }}>{q.question}</p>
          </div>

          {/* Options */}
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options.map((opt, oi) => {
              const correct = oi === q.correct_index;
              return (
                <div
                  key={oi}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: correct ? 'rgba(56,224,195,0.08)' : 'transparent',
                    border: `0.5px solid ${correct ? 'rgba(56,224,195,0.28)' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
                      background: correct ? MINT : 'rgba(255,255,255,0.07)',
                      color: correct ? '#0a1628' : MUTED_COLOR,
                    }}
                  >
                    {correct ? '✓' : ['A','B','C','D'][oi] ?? oi + 1}
                  </span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.6, color: correct ? 'rgba(255,255,255,0.9)' : BODY_COLOR }}>
                    {opt}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          {q.explanation && (
            <div style={{ margin: '0 18px 14px', padding: '10px 14px', borderRadius: 10, background: 'rgba(56,224,195,0.04)', borderLeft: `2px solid rgba(56,224,195,0.35)` }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: MINT, marginBottom: 4 }}>Why?</p>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: MUTED_COLOR }}>{q.explanation}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Flashcard reader ──────────────────────────────────────────────────────
interface FC { front: string; back: string; difficulty?: 'easy' | 'medium' | 'hard' }

const DIFF_STYLES: Record<string, { bg: string; color: string }> = {
  easy:   { bg: 'rgba(34,197,94,0.1)',  color: 'rgba(34,197,94,0.9)'  },
  medium: { bg: 'rgba(251,191,36,0.1)', color: 'rgba(251,191,36,0.9)' },
  hard:   { bg: 'rgba(239,68,68,0.1)',  color: 'rgba(239,68,68,0.8)'  },
};

function FlashcardsReader({ cards }: { cards: FC[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>🃏</span>
        <div>
          <p style={{ color: HEADING_COLOR, fontSize: 15, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif' }}>Flashcards</p>
          <p style={{ color: MUTED_COLOR, fontSize: 12 }}>{cards.length} card{cards.length !== 1 ? 's' : ''} · review all at once</p>
        </div>
      </div>

      {cards.map((card, i) => (
        <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: `0.5px solid ${BORDER}` }}>
          {/* Front */}
          <div style={{ padding: '14px 18px', background: 'rgba(56,224,195,0.04)', borderBottom: `0.5px solid rgba(56,224,195,0.1)`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <SectionLabel>Card {i + 1} · Question</SectionLabel>
              <p style={{ color: HEADING_COLOR, fontSize: 14.5, lineHeight: 1.6, fontWeight: 500 }}>{card.front}</p>
            </div>
            {card.difficulty && DIFF_STYLES[card.difficulty] && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, flexShrink: 0, background: DIFF_STYLES[card.difficulty].bg, color: DIFF_STYLES[card.difficulty].color }}>
                {card.difficulty}
              </span>
            )}
          </div>
          {/* Back */}
          <div style={{ padding: '14px 18px' }}>
            <SectionLabel>Answer</SectionLabel>
            <p style={{ color: BODY_COLOR, fontSize: 13.5, lineHeight: 1.72 }}>{card.back}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Key Concepts reader ───────────────────────────────────────────────────
interface KC { term: string; definition: string; example?: string; importance?: 'high' | 'medium' | 'low' }

const IMP_COLOR: Record<string, string> = { high: MINT, medium: 'rgba(251,191,36,0.85)', low: MUTED_COLOR };

function KeyConceptsReader({ concepts }: { concepts: KC[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div>
          <p style={{ color: HEADING_COLOR, fontSize: 15, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif' }}>Key Concepts</p>
          <p style={{ color: MUTED_COLOR, fontSize: 12 }}>{concepts.length} term{concepts.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {concepts.map((c, i) => (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <p style={{ color: MINT, fontSize: 14.5, fontWeight: 500, flex: 1 }}>{c.term}</p>
            {c.importance && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: `${IMP_COLOR[c.importance]}1a`, color: IMP_COLOR[c.importance], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {c.importance}
              </span>
            )}
          </div>
          <p style={{ color: BODY_COLOR, fontSize: 13.5, lineHeight: 1.72 }}>{c.definition}</p>
          {c.example && (
            <p style={{ color: MUTED_COLOR, fontSize: 12.5, fontStyle: 'italic', marginTop: 6, paddingLeft: 12, borderLeft: `2px solid rgba(255,255,255,0.1)` }}>
              {c.example}
            </p>
          )}
          {i < concepts.length - 1 && <Divider />}
        </div>
      ))}
    </div>
  );
}

// ── Study Guide reader ────────────────────────────────────────────────────
interface SGSection { heading: string; body: string; bullets?: string[] }

function StudyGuideReader({ sections }: { sections: SGSection[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>📖</span>
        <div>
          <p style={{ color: HEADING_COLOR, fontSize: 15, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif' }}>Study Guide</p>
          <p style={{ color: MUTED_COLOR, fontSize: 12 }}>{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {sections.map((s, i) => (
        <div key={i}>
          <h2 style={{ color: HEADING_COLOR, fontSize: 15.5, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif', borderBottom: `0.5px solid ${BORDER}`, paddingBottom: 8, marginBottom: 12 }}>
            {s.heading}
          </h2>
          <p style={{ color: BODY_COLOR, fontSize: 14, lineHeight: 1.82 }}>{s.body}</p>
          {s.bullets && s.bullets.length > 0 && (
            <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.bullets.map((b, j) => (
                <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: MINT, fontSize: 12, marginTop: 3, flexShrink: 0 }}>▸</span>
                  <span style={{ color: BODY_COLOR, fontSize: 13.5, lineHeight: 1.65 }}>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Podcast reader ────────────────────────────────────────────────────────
function PodcastReader({ script }: { script: string }) {
  // Detect speaker labels like "HOST:", "GUEST:", "NARRATOR:" etc.
  const lines = script.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 20 }}>🎙️</span>
        <div>
          <p style={{ color: HEADING_COLOR, fontSize: 15, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif' }}>Podcast Script</p>
          <p style={{ color: MUTED_COLOR, fontSize: 12 }}>Dialogue-format study material</p>
        </div>
      </div>

      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: 10 }} />;

        // Speaker label: "HOST: ..." or "GUEST: ..."
        const speakerMatch = trimmed.match(/^([A-Z][A-Z0-9 _-]{0,14}):\s*(.+)$/);
        if (speakerMatch) {
          const [, speaker, rest] = speakerMatch;
          const isHost = /HOST|NARRATOR|INTRO/.test(speaker);
          return (
            <div key={i} style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: isHost ? MINT : 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 3 }}>
                {speaker}
              </span>
              <p style={{ color: BODY_COLOR, fontSize: 14, lineHeight: 1.75 }}>{rest}</p>
            </div>
          );
        }

        return <p key={i} style={{ color: BODY_COLOR, fontSize: 14, lineHeight: 1.75, marginBottom: 10 }}>{trimmed}</p>;
      })}
    </div>
  );
}

// ── Markdown summary reader ───────────────────────────────────────────────
const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => <h1 style={{ color: HEADING_COLOR, fontSize: 19, fontWeight: 500, marginTop: 28, marginBottom: 12, fontFamily: 'Space Grotesk, sans-serif', borderBottom: `0.5px solid ${BORDER}`, paddingBottom: 8 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ color: HEADING_COLOR, fontSize: 16, fontWeight: 500, marginTop: 24, marginBottom: 8, borderBottom: `0.5px solid ${BORDER}`, paddingBottom: 6 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14.5, fontWeight: 500, marginTop: 18, marginBottom: 6 }}>{children}</h3>,
  p: ({ children }) => <p style={{ color: BODY_COLOR, fontSize: 14, lineHeight: 1.85, marginBottom: 14 }}>{children}</p>,
  ul: ({ children }) => <ul style={{ paddingLeft: 0, marginBottom: 14, listStyle: 'none' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 14 }}>{children}</ol>,
  li: ({ children }) => (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
      <span style={{ color: MINT, fontSize: 12, marginTop: 4, flexShrink: 0 }}>▸</span>
      <span style={{ color: BODY_COLOR, fontSize: 13.5, lineHeight: 1.65 }}>{children}</span>
    </li>
  ),
  strong: ({ children }) => <strong style={{ color: HEADING_COLOR, fontWeight: 500 }}>{children}</strong>,
  em: ({ children }) => <em style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{children}</em>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: `2px solid rgba(56,224,195,0.4)`, paddingLeft: 16, margin: '16px 0', color: MUTED_COLOR, fontStyle: 'italic', fontSize: 13.5 }}>{children}</blockquote>
  ),
  hr: () => <div style={{ height: '0.5px', background: BORDER, margin: '20px 0' }} />,
  code: ({ children }) => <code style={{ background: 'rgba(56,224,195,0.08)', color: MINT, padding: '1px 5px', borderRadius: 4, fontSize: 12.5 }}>{children}</code>,
};

// ── Document reader — AI-formatted markdown ───────────────────────────────
function FormattedDocumentReader({ sourceId, rawText }: { sourceId: string; rawText: string }) {
  const { formatted, loading } = useSourceFormatter(sourceId, rawText);

  if (loading || !formatted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 60 }}>
        <div style={{ width: 26, height: 26, border: `2px solid rgba(56,224,195,0.25)`, borderTopColor: MINT, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: MUTED_COLOR, fontSize: 13 }}>Formatting document with AI…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{formatted}</ReactMarkdown>;
}

// ── Content router ────────────────────────────────────────────────────────
function FocusModeContent({ material }: { material: MaterialChoice }) {
  if (material.kind === 'source') {
    return <FormattedDocumentReader sourceId={material.sourceId} rawText={material.content} />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = material.rawContent as any;

  switch (material.type) {
    case 'summary':    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 20 }}>📝</span>
          <div>
            <p style={{ color: HEADING_COLOR, fontSize: 15, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif' }}>Summary</p>
            <p style={{ color: MUTED_COLOR, fontSize: 12 }}>AI-generated overview</p>
          </div>
        </div>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{c.text ?? ''}</ReactMarkdown>
      </div>
    );
    case 'studyguide':  return <StudyGuideReader  sections={c.sections  ?? []} />;
    case 'keyconcepts': return <KeyConceptsReader concepts={c.concepts  ?? []} />;
    case 'flashcards':  return <FlashcardsReader  cards={c.cards        ?? []} />;
    case 'quiz':        return <QuizReader         questions={c.questions ?? []} />;
    case 'podcast':     return <PodcastReader      script={c.script      ?? ''} />;
    default: return <p style={{ color: MUTED_COLOR, fontSize: 14 }}>No content to display.</p>;
  }
}

// ── Timer utilities ───────────────────────────────────────────────────────
function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function playChime() {
  try {
    const ctx = new AudioContext();
    [[528, 0], [660, 0.18], [792, 0.36]].forEach(([freq, when]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.9);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + 0.9);
    });
  } catch {}
}

// ── Timer pill in focus bar ───────────────────────────────────────────────
function TimerPill({ secondsLeft, total, paused }: { secondsLeft: number; total: number; paused: boolean }) {
  const pct  = total > 0 ? secondsLeft / total : 0;
  const r    = 13;
  const circ = 2 * Math.PI * r;
  const low  = secondsLeft <= 60;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={34} height={34} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={17} cy={17} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle cx={17} cy={17} r={r} fill="none" stroke={low ? '#ef4444' : MINT} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: low ? '#ef4444' : 'rgba(255,255,255,0.75)' }}>
        {formatTime(secondsLeft)}{paused ? ' ⏸' : ''}
      </span>
    </div>
  );
}

// ── Dialogs ───────────────────────────────────────────────────────────────
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}>
      <motion.div initial={{ scale: 0.92, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'rgba(14,24,42,0.99)', border: '0.5px solid rgba(255,255,255,0.12)' }}>
        {children}
      </motion.div>
    </div>
  );
}

function ExitWarning({ secondsLeft, onExit, onStay }: { secondsLeft: number; onExit: () => void; onStay: () => void }) {
  return (
    <Overlay>
      <p className="text-3xl text-center mb-3">⏳</p>
      <h2 className="text-base font-semibold text-center mb-2" style={{ color: HEADING_COLOR }}>Timer still running</h2>
      <p className="text-sm text-center mb-6" style={{ color: MUTED_COLOR }}>
        You have <span style={{ color: '#ef4444', fontWeight: 500 }}>{formatTime(secondsLeft)}</span> remaining. Exit anyway?
      </p>
      <div className="flex gap-3">
        <button onClick={onStay} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,224,195,0.12)', border: `0.5px solid rgba(56,224,195,0.3)`, color: MINT }}>
          Keep reading
        </button>
        <button onClick={onExit} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${BORDER}`, color: MUTED_COLOR }}>
          Exit anyway
        </button>
      </div>
    </Overlay>
  );
}

function TimerDoneDialog({ material, onExtend, onStop }: { material: string; onExtend: (m: number) => void; onStop: () => void }) {
  return (
    <Overlay>
      <p className="text-5xl text-center mb-4">🎉</p>
      <h2 className="text-lg font-semibold text-center mb-1" style={{ color: HEADING_COLOR }}>Session complete!</h2>
      <p className="text-sm text-center mb-5" style={{ color: MUTED_COLOR }}>
        Great focus on <span style={{ color: 'rgba(255,255,255,0.8)' }}>{material}</span>
      </p>
      <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Extend or finish?</p>
      <div className="flex gap-2 mb-3">
        {[5, 10, 15].map((m) => (
          <button key={m} onClick={() => onExtend(m)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,224,195,0.1)', border: `0.5px solid rgba(56,224,195,0.28)`, color: MINT }}>
            +{m}m
          </button>
        ))}
      </div>
      <button onClick={onStop} className="w-full py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${BORDER}`, color: MUTED_COLOR }}>
        I'm done reading
      </button>
    </Overlay>
  );
}

// ── Focus Mode (full-screen reading overlay) ──────────────────────────────
function FocusMode({ material, durationMinutes, onExit }: {
  material: MaterialChoice;
  durationMinutes: number;
  onExit: () => void;
}) {
  const total = durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(total);
  const [paused, setPaused]           = useState(false);
  const [showExitWarn, setShowExitWarn] = useState(false);
  const [timerDone, setTimerDone]     = useState(false);
  const [highlightPos, setHighlightPos] = useState<{ top: number; left: number } | null>(null);
  const [chatQuery, setChatQuery]     = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userId = useAuthStore((s) => s.profile?.id);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startTick = useCallback(() => {
    stopTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopTimer();
          setTimerDone(true);
          playChime();
          if (userId) (async () => { try { await supabase.rpc('record_activity', { p_user_id: userId }); } catch {} })();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [stopTimer, userId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { startTick(); return stopTimer; }, []);

  const togglePause = () => {
    if (paused) { startTick(); setPaused(false); }
    else { stopTimer(); setPaused(true); }
  };

  const handleExit = () => {
    if (secondsLeft > 30 && !timerDone) setShowExitWarn(true);
    else { stopTimer(); onExit(); }
  };

  const handleExtend = (mins: number) => {
    setTimerDone(false);
    setSecondsLeft(mins * 60);
    startTick();
  };

  const handleTextUp = useCallback(() => {
    const sel  = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length < 10) { setHighlightPos(null); return; }
    const rect = sel?.getRangeAt(0).getBoundingClientRect();
    if (!rect) return;
    setHighlightPos({ top: rect.top + window.scrollY, left: rect.left + rect.width / 2 });
  }, []);

  const title = material.kind === 'output' ? material.label : material.title;
  // For FloatingChat context, derive a readable string
  const contextText = material.kind === 'source'
    ? material.content.slice(0, 5000)
    : material.kind === 'output' && material.type === 'summary'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((material.rawContent as any).text ?? '').slice(0, 5000)
    : '';

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: '#0a1628' }}>
      {/* Shine line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(56,224,195,0.35), rgba(255,255,255,0.2), transparent)', zIndex: 10, pointerEvents: 'none' }} />

      {/* Focus bar */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ height: 52, background: 'rgba(17,29,48,0.96)', borderBottom: `0.5px solid ${BORDER}`, zIndex: 10 }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
            {material.kind === 'output' ? material.icon : '📄'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: HEADING_COLOR }}>{title}</p>
            <p className="text-[10px]" style={{ color: MUTED_COLOR }}>Focus Mode</p>
          </div>
        </div>

        <TimerPill secondsLeft={secondsLeft} total={total} paused={paused} />

        <button onClick={togglePause}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${BORDER}`, color: MUTED_COLOR }}
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        <button onClick={handleExit}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${BORDER}`, color: 'rgba(255,255,255,0.35)' }}
          title="Exit focus mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Reading area — PDFs fill the full area; text content gets scrollable padded container */}
      {material.kind === 'file' ? (
        <div className="flex-1 overflow-hidden">
          <FocusModeContent material={material} />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto scrollbar-thin" onMouseUp={handleTextUp} onTouchEnd={handleTextUp} style={{ paddingBottom: 100 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px 0' }}>
          <FocusModeContent material={material} />
        </div>
      </div>
      )}

      {/* Highlight → Ask AI (not shown for PDFs since selection doesn't work in iframes) */}
      {material.kind !== 'pdf' && highlightPos && (
        <div
          className="fixed z-[205] px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none"
          style={{ top: highlightPos.top - 44, left: highlightPos.left, transform: 'translateX(-50%)', background: 'rgba(56,224,195,0.18)', border: `0.5px solid rgba(56,224,195,0.4)`, color: MINT, backdropFilter: 'blur(12px)' }}
          onMouseDown={(e) => {
            e.preventDefault();
            const text = window.getSelection()?.toString().trim() ?? '';
            if (text) {
              setHighlightPos(null);
              window.getSelection()?.removeAllRanges();
              setChatQuery(`Explain this: "${text}"`);
            }
          }}
        >
          Ask AI ✨
        </div>
      )}

      <FloatingChat contextLabel={title} contextContent={contextText} initialQuery={chatQuery || undefined} onInitialQueryConsumed={() => setChatQuery('')} />

      {showExitWarn && <ExitWarning secondsLeft={secondsLeft} onExit={() => { stopTimer(); onExit(); }} onStay={() => setShowExitWarn(false)} />}
      {timerDone && <TimerDoneDialog material={title} onExtend={handleExtend} onStop={() => { stopTimer(); onExit(); }} />}
    </div>,
    document.body
  );
}

// ── Setup wizard ──────────────────────────────────────────────────────────
export default function StudyTimerPage() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const { notebooks } = useNotebookStore();
  useNotebooks();

  const preselect = searchParams.get('notebook');
  const [setupPhase, setSetupPhase]             = useState<SetupPhase>('duration');
  const [duration, setDuration]                 = useState(25);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(preselect);
  const [focusMaterial, setFocusMaterial]       = useState<MaterialChoice | null>(null);

  const selectedNotebook = notebooks.find((n) => n.id === selectedNotebookId);

  const { data: outputs = [], isLoading: outputsLoading } = useQuery({
    queryKey: ['focus-outputs', selectedNotebookId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_outputs').select('type, content, updated_at')
        .eq('notebook_id', selectedNotebookId!).order('updated_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!selectedNotebookId && setupPhase === 'material',
  });

  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ['focus-sources', selectedNotebookId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sources').select('id, title, type, content, word_count, file_url')
        .eq('notebook_id', selectedNotebookId!).order('created_at');
      return data ?? [];
    },
    enabled: !!selectedNotebookId && setupPhase === 'material',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePickOutput = (o: { type: string; content: any }) => {
    const meta = OUTPUT_META[o.type];
    if (!meta || !o.content) return;
    setFocusMaterial({ kind: 'output', type: o.type, label: meta.label, icon: meta.icon, rawContent: o.content });
  };

  const handlePickSource = async (s: { id: string; title: string; type: string; content: string | null; file_url: string | null }) => {
    let text = s.content ?? '';
    if (!text) {
      const { data } = await supabase.from('source_chunks').select('content, chunk_index').eq('source_id', s.id).order('chunk_index');
      text = (data ?? []).map((c: { content: string }) => c.content).join('\n\n');
    }
    if (!text) return;
    setFocusMaterial({ kind: 'source', sourceId: s.id, title: s.title, content: text });
  };

  if (focusMaterial) {
    return <FocusMode material={focusMaterial} durationMinutes={duration} onExit={() => setFocusMaterial(null)} />;
  }

  const loading = outputsLoading || sourcesLoading;

  return (
    <div className="relative px-5 sm:px-8 py-6 max-w-lg mx-auto pb-28 md:pb-8">
      {/* Back */}
      <button
        onClick={() => setupPhase === 'duration' ? navigate(-1) : setSetupPhase('duration')}
        className="flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-70"
        style={{ color: MUTED_COLOR }}
      >
        <ArrowLeft className="w-4 h-4" /> {setupPhase === 'duration' ? 'Back' : `Back · ${duration} min`}
      </button>

      {/* Page header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: 'rgba(56,224,195,0.1)', border: '0.5px solid rgba(56,224,195,0.25)' }}>
          <Timer className="w-5 h-5" style={{ color: MINT }} />
        </div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: HEADING_COLOR }}>
            {setupPhase === 'duration' ? 'Focus Mode' : 'Choose material'}
          </h1>
          <p className="text-xs" style={{ color: MUTED_COLOR }}>
            {setupPhase === 'duration' ? 'Set a timer and enter distraction-free reading' : `${duration} min · ${selectedNotebook?.title ?? ''}`}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Duration + Notebook ── */}
        {setupPhase === 'duration' && (
          <motion.div key="dur" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: MUTED_COLOR }}>Duration</p>
            <div className="grid grid-cols-3 gap-2 mb-7">
              {DURATIONS.map(({ label, value }) => (
                <button key={value} onClick={() => setDuration(value)}
                  className="py-3 rounded-xl text-sm font-medium transition-all"
                  style={duration === value
                    ? { background: 'rgba(56,224,195,0.14)', border: '0.5px solid rgba(56,224,195,0.4)', color: MINT }
                    : { background: CARD_BG, border: `0.5px solid ${BORDER}`, color: MUTED_COLOR }}>
                  {label}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED_COLOR }}>Notebook</p>
            {notebooks.length === 0 ? (
              <div className="rounded-xl py-8 text-center mb-7" style={{ background: CARD_BG, border: `0.5px solid ${BORDER}` }}>
                <p className="text-3xl mb-2">📚</p>
                <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>No notebooks yet</p>
                <p className="text-xs mb-4" style={{ color: MUTED_COLOR }}>Create a notebook first, then come back to start a focus session.</p>
                <Link to="/notebooks?create=1" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(56,224,195,0.12)', border: '0.5px solid rgba(56,224,195,0.3)', color: MINT }}>
                  + New notebook
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5 mb-7 max-h-52 overflow-y-auto scrollbar-thin">
                {notebooks.map((nb) => (
                  <button key={nb.id}
                    onClick={() => setSelectedNotebookId((p) => p === nb.id ? null : nb.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={selectedNotebookId === nb.id
                      ? { background: 'rgba(56,224,195,0.08)', border: '0.5px solid rgba(56,224,195,0.28)', color: 'rgba(255,255,255,0.9)' }
                      : { background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${BORDER}`, color: MUTED_COLOR }}>
                    <span className="text-base">{(nb as { emoji?: string }).emoji || '📚'}</span>
                    <span className="flex-1 text-sm truncate">{nb.title}</span>
                    {selectedNotebookId === nb.id && <span className="text-xs" style={{ color: MINT }}>✓</span>}
                  </button>
                ))}
              </div>
            )}

            {!selectedNotebookId && notebooks.length > 0 && (
              <p className="text-xs text-center mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Select a notebook to continue</p>
            )}

            <button
              onClick={() => { if (selectedNotebookId) setSetupPhase('material'); }}
              disabled={!selectedNotebookId}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={selectedNotebookId
                ? { background: 'rgba(56,224,195,0.14)', border: '0.5px solid rgba(56,224,195,0.38)', color: MINT, cursor: 'pointer' }
                : { background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${BORDER}`, color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}
            >
              <ChevronRight className="w-4 h-4" /> Choose material
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Material picker ── */}
        {setupPhase === 'material' && (
          <motion.div key="mat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            {loading && (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl" style={{ background: CARD_BG }} />)}
              </div>
            )}

            {!loading && (
              <>
                {/* AI outputs */}
                {outputs.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: MUTED_COLOR }}>AI Generated</p>
                    <div className="space-y-2">
                      {outputs.map((o) => {
                        const meta = OUTPUT_META[o.type];
                        if (!meta) return null;
                        return (
                          <button key={o.type} onClick={() => handlePickOutput(o)}
                            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-all group"
                            style={{ background: CARD_BG, border: `0.5px solid ${BORDER}` }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(56,224,195,0.3)'; e.currentTarget.style.background = 'rgba(56,224,195,0.04)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = CARD_BG; }}>
                            <span className="text-xl leading-none">{meta.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.88)' }}>{meta.label}</p>
                              <p className="text-[11px] mt-0.5" style={{ color: MUTED_COLOR }}>Tap to read in Focus Mode</p>
                            </div>
                            <Play className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: MINT }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Source documents */}
                {sources.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: MUTED_COLOR }}>Source Documents</p>
                    <div className="space-y-2">
                      {sources.map((s) => (
                        <button key={s.id} onClick={() => handlePickSource(s)}
                          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-all group"
                          style={{ background: CARD_BG, border: `0.5px solid ${BORDER}` }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(56,224,195,0.3)'; e.currentTarget.style.background = 'rgba(56,224,195,0.04)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = CARD_BG; }}>
                          <FileText className="w-4 h-4 shrink-0" style={{ color: 'rgba(56,224,195,0.55)' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>{s.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: MUTED_COLOR }}>
                              {s.word_count ? `~${Math.ceil(s.word_count / 250)} min read · ` : ''}{s.type.toUpperCase()}
                            </p>
                          </div>
                          <Play className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: MINT }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {outputs.length === 0 && sources.length === 0 && (
                  <div className="text-center py-14">
                    <p className="text-4xl mb-3">📚</p>
                    <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>No readable material yet</p>
                    <p className="text-xs mb-5" style={{ color: MUTED_COLOR }}>Upload sources or generate a Summary / Study Guide first</p>
                    <Link to={`/notebooks/${selectedNotebookId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(56,224,195,0.12)', border: '0.5px solid rgba(56,224,195,0.3)', color: MINT }}>
                      <BookOpen className="w-3.5 h-3.5" /> Open notebook
                    </Link>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
