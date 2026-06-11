import { motion, AnimatePresence } from "framer-motion";

export interface GameOverInfo {
  result: "win" | "loss" | "draw";
  reason:
    | "checkmate"
    | "stalemate"
    | "resignation"
    | "timeout"
    | "insufficient"
    | "repetition"
    | "fifty_moves";
  movesCount: number;
}

interface ChessResultModalProps {
  info: GameOverInfo | null;
  onNewGame: () => void;
  onReview: () => void;
  onGoHome?: () => void;
  eloChange?: number;
}

const REASON_LABELS: Record<GameOverInfo["reason"], string> = {
  checkmate: "by Checkmate",
  stalemate: "by Stalemate",
  resignation: "by Resignation",
  timeout: "on Time",
  insufficient: "Insufficient Material",
  repetition: "by Repetition",
  fifty_moves: "50-Move Rule",
};

const ICONS: Record<GameOverInfo["result"], string> = {
  win: "🏆",
  loss: "😔",
  draw: "🤝",
};

const TITLES: Record<GameOverInfo["result"], string> = {
  win: "Victory!",
  loss: "Defeat",
  draw: "Draw",
};

const RESULT_COLORS: Record<GameOverInfo["result"], string> = {
  win: "#38E0C3",
  loss: "rgba(239,68,68,0.85)",
  draw: "rgba(255,255,255,0.65)",
};

const BORDER_COLORS: Record<GameOverInfo["result"], string> = {
  win: "rgba(56,224,195,0.3)",
  loss: "rgba(239,68,68,0.2)",
  draw: "rgba(255,255,255,0.12)",
};

export function ChessResultModal({ info, onNewGame, onReview, onGoHome, eloChange }: ChessResultModalProps) {
  return (
    <AnimatePresence>
      {info && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ background: "rgba(10,22,40,0.88)", backdropFilter: "blur(14px)" }}
        >
          <motion.div
            className="w-full max-w-xs rounded-2xl p-8 text-center"
            style={{
              background: "rgba(17,29,48,0.98)",
              border: `0.5px solid ${BORDER_COLORS[info.result]}`,
              backdropFilter: "blur(20px)",
            }}
            initial={{ scale: 0.82, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 22, stiffness: 280, delay: 0.05 }}
          >
            {/* Icon */}
            <motion.div
              className="text-6xl mb-4 select-none"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.18, type: "spring", damping: 10, stiffness: 180 }}
            >
              {ICONS[info.result]}
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-3xl font-medium mb-1.5"
              style={{
                color: RESULT_COLORS[info.result],
                letterSpacing: "-0.025em",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {TITLES[info.result]}
            </motion.h2>

            {/* Reason */}
            <motion.p
              className="text-sm mb-6"
              style={{ color: "rgba(255,255,255,0.38)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
            >
              {REASON_LABELS[info.reason]}
            </motion.p>

            {/* Stats */}
            <motion.div
              className="flex items-center justify-center gap-6 mb-8 py-4 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.07)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
            >
              <div>
                <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Total Moves
                </p>
                <p
                  className="text-2xl font-medium"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  {info.movesCount}
                </p>
              </div>
              {eloChange !== undefined && eloChange !== 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                    ELO
                  </p>
                  <p
                    className="text-2xl font-medium"
                    style={{ color: eloChange > 0 ? "#38E0C3" : "rgba(239,68,68,0.85)" }}
                  >
                    {eloChange > 0 ? `+${eloChange}` : eloChange}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Buttons */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44 }}
            >
              <div className="flex gap-2">
                <button
                  onClick={onReview}
                  className="flex-1 py-3 rounded-xl text-sm transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "0.5px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                >
                  Review
                </button>
                <button
                  onClick={onNewGame}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: "rgba(56,224,195,0.14)",
                    border: "0.5px solid rgba(56,224,195,0.35)",
                    color: "#38E0C3",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(56,224,195,0.22)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(56,224,195,0.14)";
                  }}
                >
                  New Game
                </button>
              </div>
              {onGoHome && (
                <button
                  onClick={onGoHome}
                  className="w-full py-2.5 rounded-xl text-xs transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "0.5px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.35)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.35)";
                  }}
                >
                  Go Home
                </button>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
