import type { ScrabbleMove } from "@/hooks/useScrabble";

interface ScrabbleMoveHistoryProps {
  moves: ScrabbleMove[];
  totalScore: number;
}

export function ScrabbleMoveHistory({ moves, totalScore }: ScrabbleMoveHistoryProps) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "0.5px solid rgba(255,255,255,0.09)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
          Words Played
        </h3>
        <span className="text-sm font-medium" style={{ color: "#38E0C3" }}>
          {totalScore} pts
        </span>
      </div>

      {moves.length === 0 ? (
        <p
          className="text-xs py-3 text-center"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          No words played yet
        </p>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-none">
          {[...moves].reverse().map((move, i) => (
            <div
              key={`${move.turnNumber}-${i}`}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "0.5px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                className="text-xs font-medium truncate mr-2"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {move.word}
              </span>
              <span
                className="text-xs font-medium shrink-0"
                style={{ color: "#38E0C3" }}
              >
                +{move.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
