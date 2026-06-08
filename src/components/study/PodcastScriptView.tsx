import { useState, useRef, useCallback } from "react";
import { Play, Pause, Square, Copy } from "lucide-react";
import toast from "react-hot-toast";

interface PodcastScriptViewProps {
  script: string;
}

interface Line {
  host: "Alex" | "Jamie" | string;
  text: string;
}

function parseScript(script: string): Line[] {
  return script
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(Alex|Jamie|Host [AB]):\s*/i);
      if (match) {
        return { host: match[1], text: line.slice(match[0].length) };
      }
      return { host: "", text: line };
    });
}

const HOST_STYLES: Record<string, string> = {
  alex:   "bg-indigo-500/10 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300",
  jamie:  "bg-violet-500/10 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300",
};

const BADGE_STYLES: Record<string, string> = {
  alex:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300",
  jamie: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
};

export function PodcastScriptView({ script }: PodcastScriptViewProps) {
  const lines = parseScript(script);
  const [playing, setPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setCurrentLine(-1);
  }, []);

  const playFrom = useCallback(
    (startIdx: number) => {
      if (!("speechSynthesis" in window)) {
        toast.error("Text-to-speech is not supported in your browser.");
        return;
      }
      window.speechSynthesis.cancel();
      setPlaying(true);

      const speak = (idx: number) => {
        if (idx >= lines.length) { setPlaying(false); setCurrentLine(-1); return; }
        const line = lines[idx];
        if (!line.text) { speak(idx + 1); return; }

        setCurrentLine(idx);
        const utter     = new SpeechSynthesisUtterance(line.text);
        utterRef.current = utter;

        const voices = window.speechSynthesis.getVoices();
        const isJamie = line.host.toLowerCase() === "jamie";
        const pref    = voices.find((v) => isJamie ? v.name.includes("Female") || v.lang === "en-GB" : v.name.includes("Male") || v.lang === "en-US");
        if (pref) utter.voice = pref;
        utter.pitch = isJamie ? 1.2 : 0.9;
        utter.rate  = 1.0;

        utter.onend = () => speak(idx + 1);
        utter.onerror = () => { setPlaying(false); setCurrentLine(-1); };
        window.speechSynthesis.speak(utter);
      };

      speak(startIdx);
    },
    [lines]
  );

  const togglePlay = () => {
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
    } else {
      playFrom(0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(script).then(() => toast.success("Script copied to clipboard"));
  };

  return (
    <div className="flex flex-col h-full">
      {/* controls */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0">
        <button
          onClick={togglePlay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {playing ? "Pause" : "Play"}
        </button>
        {(playing || currentLine >= 0) && (
          <button
            onClick={stop}
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex items-center gap-3 ml-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Alex
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />Jamie
          </span>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Copy script"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* script */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {lines.map((line, i) => {
          const key   = line.host.toLowerCase();
          const style = HOST_STYLES[key] ?? "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]";
          const badge = BADGE_STYLES[key] ?? "bg-[var(--surface-3)] text-[var(--text-muted)]";
          const isActive = currentLine === i;

          return (
            <div
              key={i}
              onClick={() => playFrom(i)}
              className={[
                "flex gap-3 cursor-pointer group rounded-xl p-3 border transition-all duration-150",
                style,
                isActive ? "ring-2 ring-[var(--brand-primary)] ring-offset-1" : "hover:opacity-80",
                line.host.toLowerCase() === "jamie" ? "flex-row-reverse" : "",
              ].join(" ")}
            >
              {line.host && (
                <span className={`self-start px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0 ${badge}`}>
                  {line.host}
                </span>
              )}
              <p className="text-sm leading-relaxed flex-1">{line.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
