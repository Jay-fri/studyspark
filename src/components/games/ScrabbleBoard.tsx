import { getSquareType } from "@/hooks/useScrabble";
import type { ScrabbleTile, PlacedTile } from "@/hooks/useScrabble";

interface ScrabbleBoardProps {
  board: (ScrabbleTile | null)[][];
  placedThisTurn: PlacedTile[];
  onSquareClick: (row: number, col: number) => void;
  onTileRecall: (row: number, col: number) => void;
  selectedTileId: string | null;
}

const SQUARE_LABELS: Record<string, string> = {
  TW: "TW",
  DW: "DW",
  TL: "TL",
  DL: "DL",
};

function squareStyle(type: string | null): React.CSSProperties {
  switch (type) {
    case "TW":
      return {
        background: "rgba(239,68,68,0.28)",
        border: "0.5px solid rgba(239,68,68,0.3)",
        color: "rgba(252,165,165,0.9)",
      };
    case "DW":
      return {
        background: "rgba(236,72,153,0.22)",
        border: "0.5px solid rgba(236,72,153,0.25)",
        color: "rgba(249,168,212,0.9)",
      };
    case "TL":
      return {
        background: "rgba(59,130,246,0.28)",
        border: "0.5px solid rgba(59,130,246,0.3)",
        color: "rgba(147,197,253,0.9)",
      };
    case "DL":
      return {
        background: "rgba(14,165,233,0.22)",
        border: "0.5px solid rgba(14,165,233,0.25)",
        color: "rgba(186,230,253,0.9)",
      };
    case "star":
      return {
        background: "rgba(56,224,195,0.15)",
        border: "0.5px solid rgba(56,224,195,0.3)",
        color: "#38E0C3",
      };
    default:
      return {
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        color: "transparent",
      };
  }
}

export function ScrabbleBoard({
  board,
  placedThisTurn,
  onSquareClick,
  onTileRecall,
  selectedTileId,
}: ScrabbleBoardProps) {
  const placedSet = new Set(placedThisTurn.map((p) => `${p.row},${p.col}`));
  const hasTileSelected = !!selectedTileId;

  return (
    <div className="w-full overflow-auto">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(15, 1fr)",
          gap: "1px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "10px",
          overflow: "hidden",
          maxWidth: "min(100%, 525px)",
          margin: "0 auto",
        }}
      >
        {Array.from({ length: 15 }, (_, row) =>
          Array.from({ length: 15 }, (_, col) => {
            const tile = board[row][col];
            const isTentative = placedSet.has(`${row},${col}`);
            const sqType = getSquareType(row, col);
            const baseStyle = squareStyle(sqType);
            const label =
              sqType && sqType !== "star"
                ? SQUARE_LABELS[sqType]
                : sqType === "star"
                ? "★"
                : "";

            const cellStyle: React.CSSProperties = tile
              ? {
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.06)",
                }
              : isTentative
              ? {
                  background: "rgba(56,224,195,0.12)",
                  border: "0.5px solid rgba(56,224,195,0.4)",
                }
              : baseStyle;

            return (
              <div
                key={`${row}-${col}`}
                style={{
                  ...cellStyle,
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor:
                    tile && isTentative
                      ? "pointer"
                      : !tile && hasTileSelected
                      ? "pointer"
                      : "default",
                  position: "relative",
                  userSelect: "none",
                }}
                onClick={() => {
                  if (tile && isTentative) {
                    onTileRecall(row, col);
                  } else if (!tile) {
                    onSquareClick(row, col);
                  }
                }}
              >
                {tile ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      background: isTentative
                        ? "rgba(56,224,195,0.25)"
                        : "rgba(251,191,36,0.9)",
                      border: isTentative
                        ? "0.5px solid rgba(56,224,195,0.5)"
                        : "0.5px solid rgba(251,191,36,0.5)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        lineHeight: 1,
                        color: isTentative ? "#38E0C3" : "#1a1a1a",
                      }}
                    >
                      {tile.letter === "_" ? "?" : tile.letter}
                    </span>
                    <span
                      style={{
                        position: "absolute",
                        bottom: "1px",
                        right: "2px",
                        fontSize: "6px",
                        lineHeight: 1,
                        color: isTentative
                          ? "rgba(56,224,195,0.6)"
                          : "rgba(0,0,0,0.4)",
                      }}
                    >
                      {tile.value}
                    </span>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: "7px",
                      fontWeight: 600,
                      lineHeight: 1,
                      color: baseStyle.color,
                      opacity: 0.75,
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
