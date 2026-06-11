import type { ScrabbleTile } from "@/hooks/useScrabble";

interface ScrabbleTileRackProps {
  rack: ScrabbleTile[];
  selectedTileId: string | null;
  onTileSelect: (id: string) => void;
  onShuffle: () => void;
  onRecallAll: () => void;
  onPlay: () => void;
  tentativeScore: number;
  validationError: string | null;
  isPlaying?: boolean;
  isDictLoading?: boolean;
  tilesPlaced: number;
}

export function ScrabbleTileRack({
  rack,
  selectedTileId,
  onTileSelect,
  onShuffle,
  onRecallAll,
  onPlay,
  tentativeScore,
  validationError,
  isPlaying,
  isDictLoading,
  tilesPlaced,
}: ScrabbleTileRackProps) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "0.5px solid rgba(255,255,255,0.09)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Tile slots */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {Array.from({ length: 7 }, (_, i) => {
          const tile = rack[i];
          if (!tile) {
            return (
              <div
                key={`empty-${i}`}
                className="rounded-lg flex items-center justify-center shrink-0"
                style={{
                  width: "40px",
                  height: "46px",
                  background: "rgba(255,255,255,0.02)",
                  border: "0.5px dashed rgba(255,255,255,0.1)",
                }}
              />
            );
          }

          const isSelected = selectedTileId === tile.id;

          return (
            <button
              key={tile.id}
              onClick={() => onTileSelect(tile.id)}
              className="relative rounded-lg flex items-center justify-center shrink-0 select-none transition-all"
              style={{
                width: "40px",
                height: "46px",
                background: isSelected ? "rgba(56,224,195,0.9)" : "rgba(251,191,36,0.9)",
                border: isSelected
                  ? "1px solid rgba(56,224,195,1)"
                  : "0.5px solid rgba(251,191,36,0.6)",
                transform: isSelected ? "translateY(-5px)" : "none",
                boxShadow: isSelected ? "0 6px 16px rgba(56,224,195,0.25)" : "none",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: isSelected ? "#0a1628" : "#1a1a1a",
                }}
              >
                {tile.letter === "_" ? "?" : tile.letter}
              </span>
              <span
                style={{
                  position: "absolute",
                  bottom: "2px",
                  right: "3px",
                  fontSize: "8px",
                  lineHeight: 1,
                  color: isSelected ? "rgba(10,22,40,0.55)" : "rgba(0,0,0,0.4)",
                }}
              >
                {tile.value}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      <div className="min-h-[18px] mb-3 text-center">
        {validationError ? (
          <p className="text-xs" style={{ color: "rgba(239,68,68,0.8)" }}>
            {validationError}
          </p>
        ) : tentativeScore > 0 ? (
          <p className="text-xs font-medium" style={{ color: "rgba(56,224,195,0.8)" }}>
            +{tentativeScore} points
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onShuffle}
          className="flex-1 py-2 rounded-xl text-xs transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        >
          Shuffle
        </button>

        {tilesPlaced > 0 && (
          <button
            onClick={onRecallAll}
            className="flex-1 py-2 rounded-xl text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            Recall
          </button>
        )}

        <button
          onClick={onPlay}
          disabled={tilesPlaced === 0 || isPlaying || isDictLoading}
          className="flex-1 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
          style={{
            background: "rgba(56,224,195,0.15)",
            border: "0.5px solid rgba(56,224,195,0.3)",
            color: "#38E0C3",
          }}
          onMouseEnter={(e) => {
            if (!isPlaying && !isDictLoading && tilesPlaced > 0) {
              e.currentTarget.style.background = "rgba(56,224,195,0.22)";
            }
          }}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(56,224,195,0.15)")}
        >
          {isPlaying ? "Playing…" : isDictLoading ? "Loading…" : "Play Word"}
        </button>
      </div>
    </div>
  );
}
