import { format } from "date-fns";
import type { ChessGameRecord } from "@/hooks/useChess";

interface ChessAIReviewProps {
  gameRecord: ChessGameRecord | null;
  onRequestReview: () => void;
  isRequesting?: boolean;
}

export function ChessAIReview({
  gameRecord,
  onRequestReview,
  isRequesting,
}: ChessAIReviewProps) {
  if (gameRecord?.ai_review) {
    const review = gameRecord.ai_review as {
      overall?: string;
      key_moments?: { move_number: number; comment: string }[];
      suggestions?: string[];
      rating?: string;
    };

    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "0.5px solid rgba(56,224,195,0.2)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: "#38E0C3" }} className="text-sm">
            ✦ AI Review
          </span>
          {gameRecord.ai_reviewed_at && (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              {format(new Date(gameRecord.ai_reviewed_at), "MMM d")}
            </span>
          )}
          {review.rating && (
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(56,224,195,0.1)",
                color: "#38E0C3",
                border: "0.5px solid rgba(56,224,195,0.2)",
              }}
            >
              {review.rating}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {review.overall && (
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
              {review.overall}
            </p>
          )}

          {(review.key_moments?.length ?? 0) > 0 && (
            <div>
              <p
                className="text-[10px] uppercase tracking-wider mb-2"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Key Moments
              </p>
              {review.key_moments!.map((m, i) => (
                <div key={i} className="flex gap-2 text-xs mb-1">
                  <span className="font-mono shrink-0" style={{ color: "rgba(56,224,195,0.6)" }}>
                    {m.move_number}.
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>{m.comment}</span>
                </div>
              ))}
            </div>
          )}

          {(review.suggestions?.length ?? 0) > 0 && (
            <div>
              <p
                className="text-[10px] uppercase tracking-wider mb-2"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Suggestions
              </p>
              {review.suggestions!.map((s, i) => (
                <p key={i} className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  • {s}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const canReview =
    gameRecord?.status === "completed" && (gameRecord.moves_count ?? 0) > 4;

  return (
    <button
      onClick={onRequestReview}
      disabled={!canReview || isRequesting}
      className="w-full rounded-2xl p-4 text-left transition-all disabled:opacity-40"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "0.5px solid rgba(255,255,255,0.09)",
        backdropFilter: "blur(16px)",
      }}
      onMouseEnter={(e) => {
        if (canReview && !isRequesting) {
          e.currentTarget.style.borderColor = "rgba(56,224,195,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.75)" }}>
            {isRequesting ? "Analysing game…" : "Get AI Review"}
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {canReview
              ? "Analyse your game, key mistakes & improvements"
              : gameRecord?.status === "active"
              ? "Finish the game to unlock AI review"
              : "Play at least 5 moves to get a review"}
          </p>
        </div>
        {canReview && !isRequesting && (
          <div
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 ml-3"
            style={{
              background: "rgba(56,224,195,0.1)",
              border: "0.5px solid rgba(56,224,195,0.2)",
              color: "#38E0C3",
            }}
          >
            ⚡ 20
          </div>
        )}
      </div>
    </button>
  );
}
