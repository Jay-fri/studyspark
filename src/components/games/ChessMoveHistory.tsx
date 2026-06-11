import type { ChessMove } from "@/hooks/useChess";

interface ChessMoveHistoryProps {
  moves: ChessMove[];
  currentIndex: number;
  onGoToMove: (index: number) => void;
}

function MoveChip({
  move,
  isActive,
  onClick,
}: {
  move: ChessMove;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 rounded text-xs transition-all min-w-[40px] text-left"
      style={{
        background: isActive ? "rgba(56,224,195,0.15)" : "transparent",
        color: isActive ? "#38E0C3" : "rgba(255,255,255,0.6)",
        border: `0.5px solid ${isActive ? "rgba(56,224,195,0.3)" : "transparent"}`,
      }}
    >
      {move.san}
    </button>
  );
}

export function ChessMoveHistory({
  moves,
  currentIndex,
  onGoToMove,
}: ChessMoveHistoryProps) {
  const pairs = Math.ceil(moves.length / 2);

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
          Move History
        </h3>
        <span className="text-xs" style={{ color: "rgba(56,224,195,0.5)" }}>
          {moves.length} moves
        </span>
      </div>

      {moves.length === 0 ? (
        <p
          className="text-xs py-4 text-center"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          No moves yet
        </p>
      ) : (
        <div className="overflow-y-auto max-h-52 space-y-0.5 mb-3 scrollbar-none pr-1">
          {Array.from({ length: pairs }, (_, i) => (
            <div key={i} className="flex items-center gap-1">
              <span
                className="text-[10px] w-5 shrink-0 text-right"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                {i + 1}.
              </span>
              <MoveChip
                move={moves[i * 2]}
                isActive={currentIndex === i * 2}
                onClick={() => onGoToMove(i * 2)}
              />
              {moves[i * 2 + 1] && (
                <MoveChip
                  move={moves[i * 2 + 1]}
                  isActive={currentIndex === i * 2 + 1}
                  onClick={() => onGoToMove(i * 2 + 1)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div
        className="flex items-center justify-center gap-1.5 pt-3"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        {[
          {
            label: "⏮",
            action: () => onGoToMove(0),
            title: "First move",
            disabled: moves.length === 0 || currentMoveIndexIsStart(currentIndex, moves),
          },
          {
            label: "◀",
            action: () => onGoToMove(Math.max(0, currentIndex === -1 ? moves.length - 1 : currentIndex - 1)),
            title: "Previous",
            disabled: moves.length === 0,
          },
          {
            label: "▶",
            action: () => onGoToMove(
              currentIndex === -1 ? -1 : Math.min(moves.length - 1, currentIndex + 1)
            ),
            title: "Next",
            disabled: moves.length === 0 || currentIndex === -1,
          },
        ].map(({ label, action, title, disabled }) => (
          <button
            key={label}
            onClick={action}
            title={title}
            disabled={disabled}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all disabled:opacity-30"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)",
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.4)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => onGoToMove(-1)}
          disabled={currentIndex === -1}
          className="px-3 py-1 rounded-lg text-xs ml-1 transition-all disabled:opacity-40"
          style={{
            background: "rgba(56,224,195,0.1)",
            border: "0.5px solid rgba(56,224,195,0.2)",
            color: "#38E0C3",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,224,195,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,224,195,0.1)"; }}
        >
          Live
        </button>
      </div>
    </div>
  );
}

function currentMoveIndexIsStart(index: number, moves: ChessMove[]) {
  return index === 0 || moves.length === 0;
}
