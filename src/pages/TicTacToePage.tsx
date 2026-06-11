import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBackGuard, QuitGameModal } from "@/hooks/useBackGuard";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import type { Profile } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TttGame {
  id: string;
  player_x_id: string | null;
  player_o_id: string | null;
  board: string[];
  current_player: string;
  winner: string | null;
  status: "waiting" | "active" | "completed" | "declined";
  created_at: string;
  updated_at: string;
}

interface FriendEntry {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// ─── Logic helpers ─────────────────────────────────────────────────────────────

function checkWinner(board: string[]): {
  winner: "X" | "O" | "draw" | null;
  line: number[] | null;
} {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as "X" | "O", line };
    }
  }
  if (board.every((c) => c !== "")) return { winner: "draw", line: null };
  return { winner: null, line: null };
}

type AIDifficulty = "easy" | "medium" | "hard";

function getAIMoveEasy(board: string[]): number {
  const empty = board.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)] ?? -1;
}

function getAIMoveMedium(board: string[]): number {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, b, c] of wins) {
    if (board[a] === "O" && board[b] === "O" && board[c] === "") return c;
    if (board[a] === "O" && board[c] === "O" && board[b] === "") return b;
    if (board[b] === "O" && board[c] === "O" && board[a] === "") return a;
  }
  for (const [a, b, c] of wins) {
    if (board[a] === "X" && board[b] === "X" && board[c] === "") return c;
    if (board[a] === "X" && board[c] === "X" && board[b] === "") return b;
    if (board[b] === "X" && board[c] === "X" && board[a] === "") return a;
  }
  const pref = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  return pref.find((i) => board[i] === "") ?? -1;
}

function minimaxTtt(board: string[], isMax: boolean): number {
  const { winner } = checkWinner(board);
  if (winner === "O") return 10;
  if (winner === "X") return -10;
  if (winner === "draw") return 0;
  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") { board[i] = "O"; best = Math.max(best, minimaxTtt(board, false)); board[i] = ""; }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") { board[i] = "X"; best = Math.min(best, minimaxTtt(board, true)); board[i] = ""; }
    }
    return best;
  }
}

function getAIMoveHard(board: string[]): number {
  let bestScore = -Infinity, bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === "") {
      board[i] = "O";
      const score = minimaxTtt(board, false);
      board[i] = "";
      if (score > bestScore) { bestScore = score; bestMove = i; }
    }
  }
  return bestMove;
}

function getAIMove(board: string[], difficulty: AIDifficulty = "medium"): number {
  if (difficulty === "easy") return getAIMoveEasy(board);
  if (difficulty === "hard") return getAIMoveHard([...board]);
  return getAIMoveMedium(board);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function AvatarCircle({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(56,224,195,0.12)",
        border: "0.5px solid rgba(56,224,195,0.2)",
        color: "#38E0C3",
        fontSize: size * 0.38,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function PlayerPanel({
  label,
  symbol,
  isActive,
  isBottom,
}: {
  label: string;
  symbol: "X" | "O";
  isActive: boolean;
  isBottom?: boolean;
}) {
  const symbolColor = symbol === "X" ? "#38E0C3" : "rgba(239,68,68,0.85)";
  return (
    <div
      className="px-4 py-3 rounded-xl flex items-center justify-between transition-all"
      style={{
        background: isActive ? "rgba(56,224,195,0.08)" : "rgba(255,255,255,0.04)",
        border: `0.5px solid ${isActive ? "rgba(56,224,195,0.22)" : "rgba(255,255,255,0.09)"}`,
      }}
    >
      <div className="flex items-center gap-3">
        <AvatarCircle name={label} size={32} />
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.75)", letterSpacing: "-0.01em" }}
          >
            {isBottom ? "You" : label}
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
            {isBottom ? label : "Opponent"}
          </p>
        </div>
      </div>
      <div
        className="flex items-center gap-2"
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: symbolColor,
          background: symbol === "X" ? "rgba(56,224,195,0.08)" : "rgba(239,68,68,0.08)",
          border: `0.5px solid ${symbol === "X" ? "rgba(56,224,195,0.2)" : "rgba(239,68,68,0.2)"}`,
          borderRadius: 6,
          padding: "2px 8px",
        }}
      >
        {symbol === "X" ? "✕" : "○"} {symbol}
      </div>
    </div>
  );
}

function Cell({
  value,
  index,
  winLine,
  onClick,
  disabled,
}: {
  value: string;
  index: number;
  winLine: number[] | null;
  onClick: () => void;
  disabled: boolean;
}) {
  const isWinCell = winLine?.includes(index) ?? false;
  const isXCell = value === "X";
  const isOCell = value === "O";

  let bg = "rgba(255,255,255,0.04)";
  let borderColor = "rgba(255,255,255,0.09)";

  if (isXCell) {
    bg = "rgba(56,224,195,0.08)";
    borderColor = isWinCell ? "rgba(56,224,195,0.45)" : "rgba(56,224,195,0.18)";
  } else if (isOCell) {
    bg = "rgba(239,68,68,0.07)";
    borderColor = isWinCell ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.18)";
  }

  const textColor = isXCell ? "#38E0C3" : isOCell ? "rgba(239,68,68,0.85)" : "transparent";

  return (
    <button
      onClick={onClick}
      disabled={disabled || !!value}
      className="flex items-center justify-center rounded-xl transition-all"
      style={{
        minHeight: 100,
        background: bg,
        border: `0.5px solid ${borderColor}`,
        cursor: disabled || value ? "default" : "pointer",
        fontSize: 42,
        fontWeight: 400,
        color: textColor,
        lineHeight: 1,
        fontFamily: "Space Grotesk, Inter, sans-serif",
      }}
      onMouseEnter={(e) => {
        if (!value && !disabled)
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,224,195,0.2)";
      }}
      onMouseLeave={(e) => {
        if (!value && !disabled)
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.09)";
      }}
    >
      {value === "X" ? "✕" : value === "O" ? "○" : ""}
    </button>
  );
}

function ResultOverlay({
  winner,
  mySymbol,
  onPlayAgain,
  onLeave,
}: {
  winner: "X" | "O" | "draw";
  mySymbol: "X" | "O";
  onPlayAgain: () => void;
  onLeave: () => void;
}) {
  let emoji = "🤝";
  let message = "It's a draw!";
  if (winner !== "draw") {
    const iWon = winner === mySymbol;
    emoji = iWon ? "🎉" : "😔";
    message = iWon ? "You win!" : "You lose!";
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,40,0.85)", backdropFilter: "blur(14px)", zIndex: 9999 }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-8 flex flex-col items-center gap-5"
        style={{ background: "rgba(17,29,48,0.99)", border: "0.5px solid rgba(56,224,195,0.22)" }}
      >
        <span style={{ fontSize: 52, lineHeight: 1 }}>{emoji}</span>
        <p
          className="text-xl font-medium text-center"
          style={{ color: "#fff", fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.025em" }}
        >
          {message}
        </p>
        <div className="flex gap-3 w-full pt-1">
          <button
            onClick={onLeave}
            className="flex-1 py-3 rounded-xl text-sm transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          >
            ← Back
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(56,224,195,0.15)", border: "0.5px solid rgba(56,224,195,0.4)", color: "#38E0C3" }}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Friend Search Panel ───────────────────────────────────────────────────────

function FriendSearchPanel({
  profile,
  onInvite,
}: {
  profile: Profile | null;
  onInvite: (friend: FriendEntry) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    supabase
      .rpc("get_friends", { p_user_id: profile.id })
      .then(({ data }) => {
        setFriends(
          (data ?? []).map((f: any) => ({
            id: f.friend_id,
            username: f.username,
            full_name: f.full_name,
            avatar_url: f.avatar_url,
          })),
        );
        setLoading(false);
      }, () => setLoading(false));
  }, [profile?.id]);

  const filtered = friends.filter(
    (f) =>
      !query.trim() ||
      f.username?.toLowerCase().includes(query.toLowerCase()) ||
      (f.full_name?.toLowerCase().includes(query.toLowerCase()) ?? false),
  );

  const handleInvite = async (friend: FriendEntry) => {
    setInvitingId(friend.id);
    try {
      await onInvite(friend);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search friends…"
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "0.5px solid rgba(255,255,255,0.09)",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.3)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
      />

      {loading ? (
        <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.28)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.28)" }}>
          {friends.length === 0 ? "No friends yet" : "No matches"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between px-3 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)" }}
            >
              <div className="flex items-center gap-3">
                <AvatarCircle name={friend.username || friend.full_name || "?"} size={32} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
                    @{friend.username}
                  </p>
                  {friend.full_name && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>{friend.full_name}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleInvite(friend)}
                disabled={invitingId === friend.id}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                style={{
                  background: "rgba(56,224,195,0.12)",
                  border: "0.5px solid rgba(56,224,195,0.3)",
                  color: "#38E0C3",
                  minWidth: 70,
                }}
              >
                {invitingId === friend.id ? "…" : "Invite"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Landing page ──────────────────────────────────────────────────────────────

function LandingView({
  profile,
  onStartLocal,
  onStartFriend,
}: {
  profile: Profile | null;
  onStartLocal: (difficulty: AIDifficulty) => void;
  onStartFriend: (friend: FriendEntry) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"none" | "ai" | "friend">("none");
  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");

  return (
    <div className="min-h-screen" style={{ background: "#0a1628", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-md mx-auto px-5 py-8 space-y-6" style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/break")}
            className="flex items-center justify-center rounded-xl transition-all"
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.55)", fontSize: 16 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,224,195,0.2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.09)"; }}
          >
            ←
          </button>
          <h1
            className="text-2xl font-medium"
            style={{ fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.025em" }}
          >
            Tic-tac-toe
          </h1>
        </div>

        {/* Mode cards */}
        {mode === "none" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("ai")}
              className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,224,195,0.2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.09)"; }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>🤖</span>
              <div>
                <p className="text-sm font-medium text-center" style={{ color: "#fff", letterSpacing: "-0.01em" }}>vs AI</p>
                <p className="text-xs text-center mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>Play solo</p>
              </div>
            </button>

            <button
              onClick={() => setMode("friend")}
              className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,224,195,0.2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.09)"; }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>👥</span>
              <div>
                <p className="text-sm font-medium text-center" style={{ color: "#fff", letterSpacing: "-0.01em" }}>vs Friend</p>
                <p className="text-xs text-center mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>Multiplayer</p>
              </div>
            </button>
          </div>
        )}

        {/* AI difficulty picker */}
        {mode === "ai" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setMode("none")} className="text-xs transition-all" style={{ color: "rgba(255,255,255,0.28)" }}>← Back</button>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.28)" }}>Select difficulty</p>
            </div>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as AIDifficulty[]).map((d) => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className="flex-1 py-3 rounded-xl text-center transition-all capitalize"
                  style={{ background: difficulty === d ? "rgba(56,224,195,0.1)" : "rgba(255,255,255,0.03)", border: `0.5px solid ${difficulty === d ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`, color: difficulty === d ? "#38E0C3" : "rgba(255,255,255,0.4)" }}
                >
                  <p className="text-sm font-medium">{d}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: difficulty === d ? "rgba(56,224,195,0.65)" : "rgba(255,255,255,0.25)" }}>
                    {d === "easy" ? "Random" : d === "medium" ? "Tactical" : "Unbeatable"}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={() => onStartLocal(difficulty)}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(56,224,195,0.14)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
            >
              Start Game
            </button>
          </div>
        )}

        {/* Friend search */}
        {mode === "friend" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setMode("none")} className="text-xs transition-all" style={{ color: "rgba(255,255,255,0.28)" }}>
                ← Back
              </button>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.28)" }}>
                Challenge a friend
              </p>
            </div>
            <FriendSearchPanel profile={profile} onInvite={onStartFriend} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Board view (shared for local and multiplayer) ────────────────────────────

function BoardView({
  board,
  mySymbol,
  opponentLabel,
  myLabel,
  winLine,
  winner,
  onCellClick,
  isMyTurn,
  isWaiting,
  onCancelWaiting,
  onPlayAgain,
  onLeave,
}: {
  board: string[];
  mySymbol: "X" | "O";
  opponentLabel: string;
  myLabel: string;
  winLine: number[] | null;
  winner: "X" | "O" | "draw" | null;
  onCellClick: (index: number) => void;
  isMyTurn: boolean;
  isWaiting: boolean;
  onCancelWaiting?: () => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}) {
  const navigate = useNavigate();
  const opponentSymbol: "X" | "O" = mySymbol === "X" ? "O" : "X";

  let statusText = "";
  if (winner === "draw") statusText = "It's a draw!";
  else if (winner === "X") statusText = mySymbol === "X" ? "You win! 🎉" : "X wins!";
  else if (winner === "O") statusText = mySymbol === "O" ? "You win! 🎉" : "O wins!";
  else if (isWaiting) statusText = "Waiting for opponent to accept…";
  else statusText = isMyTurn ? "Your turn" : "Opponent's turn…";

  return (
    <div className="min-h-screen" style={{ background: "#0a1628", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-md mx-auto px-5 py-8 space-y-5" style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/break/ttt")}
            className="flex items-center justify-center rounded-xl transition-all"
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.55)", fontSize: 16 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,224,195,0.2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.09)"; }}
          >
            ←
          </button>
          <h1 className="text-xl font-medium" style={{ fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.025em" }}>
            Tic-tac-toe
          </h1>
        </div>

        {/* Opponent panel */}
        <PlayerPanel label={opponentLabel} symbol={opponentSymbol} isActive={!isMyTurn && !winner && !isWaiting} isBottom={false} />

        {/* Status */}
        <p
          className="text-center text-sm"
          style={{
            color: winner ? "#38E0C3" : isWaiting ? "rgba(255,255,255,0.28)" : isMyTurn ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.28)",
            fontStyle: isWaiting || (!isMyTurn && !winner) ? "italic" : "normal",
          }}
        >
          {statusText}
        </p>

        {/* Waiting screen */}
        {isWaiting ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="animate-spin"
              style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(56,224,195,0.15)", borderTopColor: "#38E0C3" }}
            />
            {onCancelWaiting && (
              <button
                onClick={onCancelWaiting}
                className="px-5 py-2.5 rounded-xl text-sm transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div
            className="mx-auto"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxWidth: 320 }}
          >
            {board.map((cell, i) => (
              <Cell
                key={i}
                value={cell}
                index={i}
                winLine={winLine}
                onClick={() => onCellClick(i)}
                disabled={!isMyTurn || !!winner}
              />
            ))}
          </div>
        )}

        {/* My panel */}
        <PlayerPanel label={myLabel} symbol={mySymbol} isActive={isMyTurn && !winner && !isWaiting} isBottom />
      </div>

      {winner && (
        <ResultOverlay winner={winner} mySymbol={mySymbol} onPlayAgain={onPlayAgain} onLeave={onLeave} />
      )}
    </div>
  );
}

// ─── Local AI game ─────────────────────────────────────────────────────────────

function LocalGame({ onLeave, difficulty = "medium" }: { onLeave: () => void; difficulty?: AIDifficulty }) {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [winner, setWinner] = useState<"X" | "O" | "draw" | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { showQuit, setShowQuit } = useBackGuard(!winner);

  useEffect(() => {
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, []);

  const handleCellClick = (index: number) => {
    if (!isPlayerTurn || board[index] || winner) return;
    const newBoard = [...board];
    newBoard[index] = "X";
    const result = checkWinner(newBoard);
    setBoard(newBoard);
    if (result.winner) { setWinner(result.winner); setWinLine(result.line); return; }
    setIsPlayerTurn(false);
    const delay = difficulty === "hard" ? 300 : 500 + Math.random() * 300;
    aiTimerRef.current = setTimeout(() => {
      const aiIndex = getAIMove(newBoard, difficulty);
      if (aiIndex === -1) return;
      const afterAI = [...newBoard];
      afterAI[aiIndex] = "O";
      const aiResult = checkWinner(afterAI);
      setBoard(afterAI);
      if (aiResult.winner) { setWinner(aiResult.winner); setWinLine(aiResult.line); }
      else setIsPlayerTurn(true);
    }, delay);
  };

  const handlePlayAgain = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setBoard(Array(9).fill(""));
    setIsPlayerTurn(true);
    setWinLine(null);
    setWinner(null);
  };

  return (
    <>
      {showQuit && (
        <QuitGameModal
          onConfirm={() => { setShowQuit(false); onLeave(); }}
          onCancel={() => setShowQuit(false)}
        />
      )}
      <BoardView
        board={board}
        mySymbol="X"
        opponentLabel="AI"
        myLabel="You"
        winLine={winLine}
        winner={winner}
        onCellClick={handleCellClick}
        isMyTurn={isPlayerTurn}
        isWaiting={false}
        onPlayAgain={handlePlayAgain}
        onLeave={() => setShowQuit(true)}
      />
    </>
  );
}

// ─── Multiplayer game ─────────────────────────────────────────────────────────

function MultiplayerGame({
  gameId,
  profile,
  onLeave,
}: {
  gameId: string;
  profile: Profile | null;
  onLeave: () => void;
}) {
  const navigate = useNavigate();
  const [gameRecord, setGameRecord] = useState<TttGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [winLine, setWinLine] = useState<number[] | null>(null);

  const mySymbol: "X" | "O" | null = gameRecord
    ? gameRecord.player_x_id === profile?.id ? "X" : "O"
    : null;

  const isMyTurn =
    !!gameRecord && gameRecord.status === "active" && gameRecord.current_player === mySymbol;

  // Load game on mount
  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    supabase
      .from("ttt_games")
      .select("*")
      .eq("id", gameId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Game not found");
          navigate("/break/ttt");
        } else {
          const rec = data as TttGame;
          setGameRecord(rec);
          const { line } = checkWinner(rec.board);
          setWinLine(line);
        }
        setLoading(false);
      }, () => setLoading(false));
  }, [gameId]);

  // Realtime subscription
  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`ttt-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ttt_games", filter: `id=eq.${gameId}` },
        (payload) => {
          const rec = payload.new as TttGame;
          if (rec.status === "declined") {
            toast("Game cancelled");
            navigate("/break/ttt");
            return;
          }
          setGameRecord(rec);
          const { line } = checkWinner(rec.board);
          setWinLine(line);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  const handleCellClick = async (cellIndex: number) => {
    if (!gameRecord || !mySymbol || !isMyTurn) return;
    if (gameRecord.board[cellIndex]) return;
    if (gameRecord.status !== "active") return;

    const newBoard = [...gameRecord.board];
    newBoard[cellIndex] = mySymbol;
    const { winner: w, line } = checkWinner(newBoard);

    // Optimistic update
    const optimistic: TttGame = {
      ...gameRecord,
      board: newBoard,
      current_player: mySymbol === "X" ? "O" : "X",
      winner: w ?? null,
      status: w ? "completed" : "active",
    };
    setGameRecord(optimistic);
    if (line) setWinLine(line);

    await supabase
      .from("ttt_games")
      .update({
        board: newBoard,
        current_player: mySymbol === "X" ? "O" : "X",
        winner: w ?? null,
        status: w ? "completed" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);
  };

  const handleCancelWaiting = async () => {
    await supabase.from("ttt_games").update({ status: "declined" }).eq("id", gameId);
    navigate("/break/ttt");
  };

  // Hooks MUST be before any early returns
  const { showQuit: showQuitMp, setShowQuit: setShowQuitMp } = useBackGuard(
    gameRecord?.status === "active" && !gameRecord?.winner
  );
  const [disconnectedSecs, setDisconnectedSecs] = useState<number | null>(null);

  const tttForfeit = async () => {
    if (!gameRecord || !profile) return;
    const winner = gameRecord.player_x_id === profile.id ? "O" : "X";
    await supabase.from("ttt_games").update({ status: "completed", winner, updated_at: new Date().toISOString() }).eq("id", gameId);
    onLeave();
  };

  useEffect(() => {
    if (gameRecord?.status !== "active" || gameRecord?.winner) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const handleOffline = () => {
      let secs = 60;
      setDisconnectedSecs(secs);
      interval = setInterval(() => {
        secs -= 1;
        if (secs <= 0) {
          if (interval) clearInterval(interval);
          setDisconnectedSecs(null);
          tttForfeit();
        } else {
          setDisconnectedSecs(secs);
        }
      }, 1000);
    };
    const handleOnline = () => {
      if (interval) clearInterval(interval);
      setDisconnectedSecs(null);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (interval) clearInterval(interval);
    };
  }, [gameRecord?.status, gameRecord?.winner]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a1628" }}>
        <div
          className="animate-spin"
          style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(56,224,195,0.15)", borderTopColor: "#38E0C3" }}
        />
      </div>
    );
  }

  if (!gameRecord || !mySymbol) return null;

  const isPlayerX = mySymbol === "X";
  const opponentId = isPlayerX ? gameRecord.player_o_id : gameRecord.player_x_id;
  const opponentLabel = opponentId ? opponentId.slice(0, 8) : "Opponent";
  const myLabel = profile?.username ?? profile?.full_name ?? "You";
  const winner = (gameRecord.winner as "X" | "O" | "draw" | null) ?? null;
  const isWaiting = gameRecord.status === "waiting";

  return (
    <>
      {showQuitMp && (
        <QuitGameModal
          message="Quitting will end your multiplayer game."
          onConfirm={() => { setShowQuitMp(false); tttForfeit(); }}
          onCancel={() => setShowQuitMp(false)}
        />
      )}
      {disconnectedSecs !== null && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3"
          style={{ background: "rgba(239,68,68,0.15)", border: "0.5px solid rgba(239,68,68,0.3)", color: "rgba(255,255,255,0.85)" }}>
          <span>Connection lost — quitting in {disconnectedSecs}s</span>
          <span className="font-bold text-red-400">{disconnectedSecs}</span>
        </div>
      )}
      <BoardView
        board={gameRecord.board}
        mySymbol={mySymbol}
        opponentLabel={opponentLabel}
        myLabel={myLabel}
        winLine={winLine}
        winner={winner}
        onCellClick={handleCellClick}
        isMyTurn={isMyTurn}
        isWaiting={isWaiting}
        onCancelWaiting={isWaiting && isPlayerX ? handleCancelWaiting : undefined}
        onPlayAgain={() => navigate("/break/ttt")}
        onLeave={() => setShowQuitMp(true)}
      />
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function TicTacToePage() {
  const { id: gameId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const searchParams = new URLSearchParams(window.location.search);
  const difficulty = (searchParams.get("d") as AIDifficulty) ?? "medium";

  const handleStartFriend = async (friend: FriendEntry) => {
    if (!profile) { toast.error("You must be logged in"); return; }
    try {
      const { data, error } = await supabase
        .from("ttt_games")
        .insert({ player_x_id: profile.id, player_o_id: friend.id, status: "waiting" })
        .select("id")
        .single();

      if (error || !data) { toast.error("Couldn't send invite"); return; }
      toast.success(`Invite sent to @${friend.username}`);
      navigate(`/break/ttt/${data.id}`);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleLeave = () => navigate("/break/ttt");

  if (!gameId) {
    return (
      <LandingView
        profile={profile}
        onStartLocal={(d) => navigate(`/break/ttt/local?d=${d}`)}
        onStartFriend={handleStartFriend}
      />
    );
  }

  if (gameId === "local") return <LocalGame onLeave={handleLeave} difficulty={difficulty} />;

  return <MultiplayerGame gameId={gameId} profile={profile} onLeave={handleLeave} />;
}
