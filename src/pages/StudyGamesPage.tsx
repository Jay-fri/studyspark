import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap } from '@/lib/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useNotebooks } from '@/hooks/useNotebook';
import { useNotebookStore } from '@/stores/notebookStore';
import { useAuthStore } from '@/stores/authStore';
import type { Flashcard, QuizQuestion, KeyConcept } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────

type GameMode = 'flash-sprint' | 'quick-quiz' | 'word-scramble';
type Phase = 'pick-notebook' | 'pick-game' | 'playing' | 'results';

interface GameConfig {
  mode: GameMode;
  notebookId: string;
  notebookTitle: string;
}

interface Results {
  score: number;
  total: number;
  timeTaken?: number;
}

const GAMES: { mode: GameMode; icon: string; title: string; desc: string; needs: string }[] = [
  { mode: 'flash-sprint', icon: '⚡', title: 'Flash Sprint', desc: 'Flip through flashcards as fast as you can. 60 seconds.', needs: 'flashcards' },
  { mode: 'quick-quiz',   icon: '🎯', title: 'Quick Quiz',   desc: 'Beat the clock — 15 seconds per question.', needs: 'quiz' },
  { mode: 'word-scramble',icon: '🔀', title: 'Word Scramble', desc: 'Unscramble key concept terms. Type the answer.', needs: 'keyconcepts' },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word: string): string {
  if (word.length <= 2) return word;
  const letters = word.split('');
  let scrambled: string;
  let attempts = 0;
  do {
    scrambled = shuffle(letters).join('');
    attempts++;
  } while (scrambled === word && attempts < 20);
  return scrambled;
}

// ── Countdown Ring ────────────────────────────────────────────────────────

function CountdownRing({ seconds, max }: { seconds: number; max: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const progress = seconds / max;
  const danger = seconds <= 5;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
      <svg width={48} height={48} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={24} cy={24} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
        <circle
          cx={24} cy={24} r={r}
          fill="none"
          stroke={danger ? '#ef4444' : '#38E0C3'}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="absolute text-xs font-semibold" style={{ color: danger ? '#ef4444' : '#fff' }}>{seconds}</span>
    </div>
  );
}

// ── Flash Sprint ──────────────────────────────────────────────────────────

function FlashSprintGame({ cards, onDone }: { cards: Flashcard[]; onDone: (r: Results) => void }) {
  const deck = useRef(shuffle(cards).slice(0, 20));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); setDone(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (done) onDone({ score: known, total: index, timeTaken: 60 - timeLeft });
  }, [done, known, index, timeLeft, onDone]);

  const advance = useCallback((didKnow: boolean) => {
    if (done) return;
    if (didKnow) setKnown((k) => k + 1);
    setFlipped(false);
    setTimeout(() => {
      if (index + 1 >= deck.current.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    }, 120);
  }, [done, index]);

  const card = deck.current[index];
  if (!card) return null;

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between w-full">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {index + 1} / {deck.current.length} · {known} known
        </p>
        <CountdownRing seconds={timeLeft} max={60} />
      </div>

      {/* Flip card */}
      <div
        className="w-full rounded-2xl p-8 cursor-pointer select-none text-center min-h-[180px] flex flex-col items-center justify-center gap-3 transition-all"
        style={{ background: flipped ? 'rgba(56,224,195,0.07)' : 'rgba(255,255,255,0.04)', border: `0.5px solid ${flipped ? 'rgba(56,224,195,0.25)' : 'rgba(255,255,255,0.09)'}` }}
        onClick={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          <>
            <p className="text-sm font-semibold" style={{ color: '#fff' }}>{card.front}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>tap to reveal</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold mb-1" style={{ color: '#38E0C3' }}>Answer</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>{card.back}</p>
          </>
        )}
      </div>

      {flipped && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 w-full">
          <button
            onClick={() => advance(false)}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.8)' }}
          >
            ✗ Missed it
          </button>
          <button
            onClick={() => advance(true)}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(56,224,195,0.1)', border: '0.5px solid rgba(56,224,195,0.35)', color: '#38E0C3' }}
          >
            ✓ Got it
          </button>
        </motion.div>
      )}

      <button
        onClick={() => onDone({ score: known, total: index })}
        className="text-xs"
        style={{ color: 'rgba(255,255,255,0.28)' }}
      >
        End early
      </button>
    </div>
  );
}

// ── Quick Quiz ────────────────────────────────────────────────────────────

function QuickQuizGame({ questions, onDone }: { questions: QuizQuestion[]; onDone: (r: Results) => void }) {
  const deck = useRef(shuffle(questions).slice(0, 10));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const q = deck.current[index];
  const answered = selected !== null;

  const next = useCallback(() => {
    setSelected(null);
    setTimeLeft(15);
    if (index + 1 >= deck.current.length) {
      onDone({ score, total: deck.current.length });
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, score, onDone]);

  const handleSelect = useCallback((idx: number) => {
    if (answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    if (idx === q.correct_index) setScore((s) => s + 1);
  }, [answered, q]);

  useEffect(() => {
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setSelected(-1); // timeout — no answer
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index]);

  if (!q) return null;

  return (
    <div className="flex flex-col gap-5 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Q {index + 1} / {deck.current.length} · Score: {score}
        </p>
        <CountdownRing seconds={timeLeft} max={15} />
      </div>

      <div
        className="rounded-2xl px-5 py-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)' }}
      >
        <p className="text-sm font-semibold leading-relaxed" style={{ color: '#fff' }}>{q.question}</p>
      </div>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let style: React.CSSProperties = {
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.09)',
            color: 'rgba(255,255,255,0.75)',
          };
          if (answered) {
            if (i === q.correct_index) style = { background: 'rgba(56,224,195,0.12)', border: '0.5px solid rgba(56,224,195,0.4)', color: '#38E0C3' };
            else if (i === selected) style = { background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.8)' };
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
              style={style}
            >
              <span className="mr-2 opacity-40">{['A', 'B', 'C', 'D'][i]}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {q.explanation && (
            <p className="text-xs leading-relaxed px-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {q.explanation}
            </p>
          )}
          <button
            onClick={next}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(56,224,195,0.12)', border: '0.5px solid rgba(56,224,195,0.3)', color: '#38E0C3' }}
          >
            {index + 1 < deck.current.length ? 'Next →' : 'Finish'}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── Word Scramble ─────────────────────────────────────────────────────────

function WordScrambleGame({ concepts, onDone }: { concepts: KeyConcept[]; onDone: (r: Results) => void }) {
  const deck = useRef(shuffle(concepts.filter((c) => c.term.split(' ').length <= 4)).slice(0, 8));
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const concept = deck.current[index];
  const scrambled = useRef('');
  if (!scrambled.current || status === 'idle') {
    // Compute only when needed
  }
  const [currentScramble, setCurrentScramble] = useState(() => scrambleWord(deck.current[0]?.term ?? ''));

  const nextWord = useCallback(() => {
    const nextIndex = index + 1;
    if (nextIndex >= deck.current.length) {
      onDone({ score, total: deck.current.length });
    } else {
      setIndex(nextIndex);
      setCurrentScramble(scrambleWord(deck.current[nextIndex].term));
      setInput('');
      setStatus('idle');
      setTimeLeft(30);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [index, score, onDone]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('wrong');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index]);

  const handleSubmit = () => {
    if (status !== 'idle') return;
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = input.trim().toLowerCase() === concept.term.toLowerCase();
    setStatus(correct ? 'correct' : 'wrong');
    if (correct) setScore((s) => s + 1);
  };

  if (!concept) return null;

  return (
    <div className="flex flex-col gap-5 px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Word {index + 1} / {deck.current.length} · Score: {score}
        </p>
        <CountdownRing seconds={timeLeft} max={30} />
      </div>

      {/* Definition hint */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Definition</p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>{concept.definition}</p>
      </div>

      {/* Scrambled word */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Unscramble</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {currentScramble.split('').map((ch, i) => (
            <div
              key={i}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: 'rgba(56,224,195,0.08)', border: '0.5px solid rgba(56,224,195,0.2)', color: '#38E0C3', letterSpacing: '0.04em' }}
            >
              {ch === ' ' ? '·' : ch.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      {status === 'idle' ? (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Type the term…"
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', color: '#fff' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(56,224,195,0.3)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(56,224,195,0.12)', border: '0.5px solid rgba(56,224,195,0.3)', color: '#38E0C3' }}
          >
            Check
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div
            className="px-4 py-3 rounded-xl text-center text-sm font-medium"
            style={
              status === 'correct'
                ? { background: 'rgba(56,224,195,0.1)', border: '0.5px solid rgba(56,224,195,0.3)', color: '#38E0C3' }
                : { background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.8)' }
            }
          >
            {status === 'correct' ? '✓ Correct!' : `✗ Answer: ${concept.term}`}
          </div>
          {concept.example && (
            <p className="text-xs leading-relaxed px-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Example: {concept.example}
            </p>
          )}
          <button
            onClick={nextWord}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            {index + 1 < deck.current.length ? 'Next word →' : 'See results'}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────

function ResultsScreen({ results, config, onPlay, onBack }: {
  results: Results;
  config: GameConfig;
  onPlay: () => void;
  onBack: () => void;
}) {
  const pct = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 px-4 py-8 max-w-sm mx-auto text-center"
    >
      <div className="text-5xl">{emoji}</div>
      <div>
        <p className="text-2xl font-semibold" style={{ color: '#fff', letterSpacing: '-0.02em' }}>
          {results.score} / {results.total}
        </p>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {pct}% correct · {config.notebookTitle}
        </p>
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onPlay}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(56,224,195,0.12)', border: '0.5px solid rgba(56,224,195,0.3)', color: '#38E0C3' }}
        >
          <Zap className="w-3.5 h-3.5" /> Play again
        </button>
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)' }}
        >
          Change game
        </button>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function StudyGamesPage() {
  const navigate = useNavigate();
  const { notebooks } = useNotebookStore();
  useNotebooks();
  const userId = useAuthStore((s) => s.profile?.id);

  const [phase, setPhase] = useState<Phase>('pick-notebook');
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [playKey, setPlayKey] = useState(0);

  // Fetch AI outputs for selected notebook
  const { data: outputs = [] } = useQuery({
    queryKey: ['game-outputs', config?.notebookId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_outputs')
        .select('type, content')
        .eq('notebook_id', config!.notebookId)
        .in('type', ['flashcards', 'quiz', 'keyconcepts']);
      return data ?? [];
    },
    enabled: !!config?.notebookId && phase === 'pick-game',
  });

  const getOutput = (type: string) => outputs.find((o) => o.type === type)?.content;

  const flashcards = (getOutput('flashcards') as { cards: Flashcard[] } | undefined)?.cards ?? [];
  const questions  = (getOutput('quiz') as { questions: QuizQuestion[] } | undefined)?.questions ?? [];
  const concepts   = (getOutput('keyconcepts') as { concepts: KeyConcept[] } | undefined)?.concepts ?? [];

  const hasData: Record<GameMode, boolean> = {
    'flash-sprint':   flashcards.length >= 2,
    'quick-quiz':     questions.length >= 2,
    'word-scramble':  concepts.length >= 2,
  };

  const handleSelectNotebook = (nb: { id: string; title: string }) => {
    setConfig({ mode: 'flash-sprint', notebookId: nb.id, notebookTitle: nb.title });
    setPhase('pick-game');
  };

  const handleSelectGame = (mode: GameMode) => {
    if (!hasData[mode] || !config) return;
    setConfig((c) => c ? { ...c, mode } : c);
    setResults(null);
    setPlayKey((k) => k + 1);
    setPhase('playing');
  };

  const handleDone = (r: Results) => {
    setResults(r);
    if (userId) supabase.rpc('record_activity', { p_user_id: userId }).catch(() => {});
    setPhase('results');
  };

  return (
    <div className="relative px-4 sm:px-6 py-6 max-w-lg mx-auto pb-28 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => phase === 'pick-notebook' ? navigate('/break') : setPhase(phase === 'playing' ? 'pick-game' : 'pick-notebook')}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#fff' }}>
            {phase === 'pick-notebook' && 'Study Games'}
            {phase === 'pick-game' && config?.notebookTitle}
            {phase === 'playing' && GAMES.find((g) => g.mode === config?.mode)?.title}
            {phase === 'results' && 'Results'}
          </h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {phase === 'pick-notebook' && 'Choose a notebook to play from'}
            {phase === 'pick-game' && 'Pick a game mode'}
            {phase === 'playing' && config?.notebookTitle}
            {phase === 'results' && GAMES.find((g) => g.mode === config?.mode)?.title}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Pick notebook ── */}
        {phase === 'pick-notebook' && (
          <motion.div key="nb" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {notebooks.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl">📚</span>
                <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.45)' }}>No notebooks yet — create one first</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notebooks.map((nb) => (
                  <button
                    key={nb.id}
                    onClick={() => handleSelectNotebook(nb)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all group"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(56,224,195,0.25)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    <span className="text-xl">{(nb as { emoji?: string }).emoji || '📚'}</span>
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.82)' }}>{nb.title}</span>
                    <span className="text-[10px]" style={{ color: 'rgba(56,224,195,0.5)' }}>Play →</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Pick game ── */}
        {phase === 'pick-game' && (
          <motion.div key="game" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {GAMES.map((g) => {
              const ready = hasData[g.mode];
              return (
                <button
                  key={g.mode}
                  onClick={() => handleSelectGame(g.mode)}
                  disabled={!ready}
                  className="w-full flex items-start gap-4 px-5 py-4 rounded-2xl text-left transition-all"
                  style={
                    ready
                      ? { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)' }
                      : { background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', opacity: 0.5 }
                  }
                  onMouseEnter={(e) => ready && (e.currentTarget.style.borderColor = 'rgba(56,224,195,0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = ready ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)')}
                >
                  <span className="text-3xl leading-none mt-0.5">{g.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: ready ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                      {g.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{g.desc}</p>
                    {!ready && (
                      <p className="text-[10px] mt-1.5" style={{ color: 'rgba(56,224,195,0.5)' }}>
                        Generate {g.needs} for this notebook first →
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ── Playing ── */}
        {phase === 'playing' && config && (
          <motion.div key={`play-${playKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {config.mode === 'flash-sprint' && (
              <FlashSprintGame key={playKey} cards={flashcards} onDone={handleDone} />
            )}
            {config.mode === 'quick-quiz' && (
              <QuickQuizGame key={playKey} questions={questions} onDone={handleDone} />
            )}
            {config.mode === 'word-scramble' && (
              <WordScrambleGame key={playKey} concepts={concepts} onDone={handleDone} />
            )}
          </motion.div>
        )}

        {/* ── Results ── */}
        {phase === 'results' && config && results && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultsScreen
              results={results}
              config={config}
              onPlay={() => handleSelectGame(config.mode)}
              onBack={() => setPhase('pick-game')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
