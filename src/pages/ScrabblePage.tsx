import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBackGuard, QuitGameModal } from "@/hooks/useBackGuard";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useScrabble } from "@/hooks/useScrabble";
import { ScrabbleBoard } from "@/components/games/ScrabbleBoard";
import { ScrabbleTileRack } from "@/components/games/ScrabbleTileRack";
import { ScrabbleMoveHistory } from "@/components/games/ScrabbleMoveHistory";
import type { ScrabbleTile } from "@/hooks/useScrabble";
import toast from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";
type Mode = "solo" | "multiplayer";
type MpStatus = "lobby" | "active" | "completed";

interface MpGameRow {
  id: string;
  host_id: string;
  player_ids: string[];
  player_usernames: (string | null)[];
  status: MpStatus;
  board: (ScrabbleTile | null)[][];
  racks: Record<string, ScrabbleTile[]>;
  tile_bag: ScrabbleTile[];
  scores: Record<string, number>;
  move_history: { word: string; score: number; player_id: string; player_name: string | null }[];
  current_player_idx: number;
  turn_number: number;
  updated_at: string;
}

interface SearchUser {
  id: string;
  username: string | null;
  full_name: string | null;
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function DiffBtn({
  active,
  label,
  sublabel,
  onClick,
}: {
  active: boolean;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 px-3 rounded-xl text-center transition-all"
      style={{
        background: active ? "rgba(56,224,195,0.1)" : "rgba(255,255,255,0.03)",
        border: `0.5px solid ${active ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`,
        color: active ? "#38E0C3" : "rgba(255,255,255,0.4)",
      }}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-[10px] mt-0.5" style={{ color: active ? "rgba(56,224,195,0.65)" : "rgba(255,255,255,0.25)" }}>
        {sublabel}
      </p>
    </button>
  );
}

// ─── Scrabble Landing ──────────────────────────────────────────────────────────

function ScrabbleLanding({ profile }: { profile: any }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("solo");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<SearchUser[]>([]);
  const [creating, setCreating] = useState(false);

  const qc = useQueryClient();

  const { data: friends = [] } = useQuery<SearchUser[]>({
    queryKey: ["friends-scrabble", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_friends", { p_user_id: profile.id });
      return (data ?? []).map((f: any) => ({ id: f.friend_id, username: f.username, full_name: f.full_name }));
    },
    enabled: !!profile?.id,
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase.rpc("search_users_by_username", {
        p_query: searchQuery.trim(),
        p_user_id: profile?.id,
        p_limit: 8,
      });
      setSearchResults((data ?? []).map((u: any) => ({ id: u.id, username: u.username, full_name: u.full_name })));
    } finally {
      setSearching(false);
    }
  };

  const toggleFriend = (user: SearchUser) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.id === user.id) ? prev.filter((f) => f.id !== user.id) : prev.length < 3 ? [...prev, user] : prev,
    );
  };

  const handleStartSolo = async () => {
    setCreating(true);
    try {
      navigate(`/break/scrabble/new?difficulty=${difficulty}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateMpGame = async () => {
    if (!profile?.id || selectedFriends.length === 0) return;
    setCreating(true);
    try {
      const allPlayerIds = [profile.id, ...selectedFriends.map((f) => f.id)];
      const allUsernames = [
        profile.username ?? profile.full_name ?? "You",
        ...selectedFriends.map((f) => f.username ?? f.full_name ?? "Player"),
      ];
      const { data, error } = await supabase
        .from("scrabble_mp_games")
        .insert({
          host_id: profile.id,
          player_ids: allPlayerIds,
          player_usernames: allUsernames,
          status: "lobby",
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Failed");
      qc.invalidateQueries({ queryKey: ["active-scrabble"] });
      navigate(`/break/scrabble/mp/${data.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't create game");
    } finally {
      setCreating(false);
    }
  };

  const displayList: SearchUser[] = searchResults.length > 0 ? searchResults : friends;

  return (
    <div className="px-5 sm:px-6 py-6 max-w-2xl mx-auto pb-28 md:pb-6">
      {/* Header */}
      <button
        onClick={() => navigate("/break")}
        className="text-xs mb-4 block transition-all"
        style={{ color: "rgba(255,255,255,0.35)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
      >
        ← Break Room
      </button>

      <h1
        className="text-2xl font-medium mb-1"
        style={{ color: "#fff", fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.025em" }}
      >
        Scrabble
      </h1>
      <p className="text-xs mb-7" style={{ color: "rgba(255,255,255,0.35)" }}>
        Build words · Score points · Challenge friends
      </p>

      {/* Mode tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6"
        style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        {(["solo", "multiplayer"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize"
            style={{
              background: mode === m ? "rgba(56,224,195,0.12)" : "transparent",
              border: `0.5px solid ${mode === m ? "rgba(56,224,195,0.3)" : "transparent"}`,
              color: mode === m ? "#38E0C3" : "rgba(255,255,255,0.35)",
            }}
          >
            {m === "solo" ? "Solo" : "With Friends"}
          </button>
        ))}
      </div>

      {mode === "solo" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <p className="text-[9px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>
            Difficulty
          </p>
          <div className="flex gap-2 mb-8">
            <DiffBtn active={difficulty === "easy"} label="Easy" sublabel="No turn timer" onClick={() => setDifficulty("easy")} />
            <DiffBtn active={difficulty === "medium"} label="Medium" sublabel="Standard rules" onClick={() => setDifficulty("medium")} />
            <DiffBtn active={difficulty === "hard"} label="Hard" sublabel="60s per turn" onClick={() => setDifficulty("hard")} />
          </div>

          <button
            onClick={handleStartSolo}
            disabled={creating}
            className="w-full py-3.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "rgba(56,224,195,0.14)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
          >
            {creating ? "Starting…" : "Start Solo Game"}
          </button>
        </motion.div>
      )}

      {mode === "multiplayer" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <p className="text-[9px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>
            Select up to 3 friends to invite
          </p>

          {/* Search */}
          <div className="flex gap-2 mb-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="Search by username…"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "#fff" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.3)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
            >
              {searching ? "…" : "Search"}
            </button>
          </div>

          {/* Friend list */}
          <div className="space-y-1.5 mb-5 max-h-60 overflow-y-auto">
            {displayList.map((u) => {
              const selected = selectedFriends.some((f) => f.id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleFriend(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: selected ? "rgba(56,224,195,0.08)" : "rgba(255,255,255,0.03)",
                    border: `0.5px solid ${selected ? "rgba(56,224,195,0.3)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                    style={{ background: "rgba(56,224,195,0.1)", color: "#38E0C3" }}
                  >
                    {(u.username ?? u.full_name ?? "?")[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs flex-1 truncate" style={{ color: selected ? "#38E0C3" : "rgba(255,255,255,0.7)" }}>
                    @{u.username ?? u.full_name ?? "—"}
                  </span>
                  {selected && (
                    <span className="text-[10px] shrink-0" style={{ color: "#38E0C3" }}>✓</span>
                  )}
                </button>
              );
            })}
            {displayList.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)" }}>
                {friends.length === 0 ? "Add friends from the Break Room to invite them" : "No results"}
              </p>
            )}
          </div>

          {selectedFriends.length > 0 && (
            <div className="mb-4 px-3 py-2.5 rounded-xl" style={{ background: "rgba(56,224,195,0.05)", border: "0.5px solid rgba(56,224,195,0.15)" }}>
              <p className="text-[10px] mb-1.5" style={{ color: "rgba(56,224,195,0.7)" }}>
                Inviting {selectedFriends.length} friend{selectedFriends.length > 1 ? "s" : ""}:
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {selectedFriends.map((f) => (
                  <span
                    key={f.id}
                    className="text-[10px] px-2 py-0.5 rounded-lg cursor-pointer"
                    style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.25)", color: "#38E0C3" }}
                    onClick={() => toggleFriend(f)}
                  >
                    @{f.username ?? f.full_name} ✕
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCreateMpGame}
            disabled={creating || selectedFriends.length === 0}
            className="w-full py-3.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: "rgba(56,224,195,0.14)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
          >
            {creating ? "Creating…" : `Create Game (${selectedFriends.length + 1} players)`}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Blank tile letter picker ──────────────────────────────────────────────────

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function BlankTilePicker({
  onChoose,
  onCancel,
}: {
  onChoose: (letter: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,40,0.75)", backdropFilter: "blur(10px)" }}
      onClick={onCancel}
    >
      <motion.div
        className="rounded-2xl p-5 w-full max-w-xs"
        style={{ background: "rgba(17,29,48,0.98)", border: "0.5px solid rgba(56,224,195,0.25)" }}
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium" style={{ color: "#fff", fontFamily: "Space Grotesk, sans-serif" }}>
              Choose a letter
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              Blank tile — scores 0 points
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}
          >
            ✕
          </button>
        </div>

        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
        >
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => onChoose(letter)}
              className="rounded-lg flex items-center justify-center text-xs font-bold select-none transition-all"
              style={{
                height: 34,
                background: "rgba(251,191,36,0.85)",
                border: "0.5px solid rgba(251,191,36,0.5)",
                color: "#1a1a1a",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,224,195,0.9)"; e.currentTarget.style.color = "#0a1628"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(251,191,36,0.85)"; e.currentTarget.style.color = "#1a1a1a"; }}
            >
              {letter}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Solo Scrabble Game ────────────────────────────────────────────────────────

function SoloScrabbleGame({ gameId, difficulty }: { gameId?: string; difficulty: Difficulty }) {
  const navigate = useNavigate();
  const [isCommitting, setIsCommitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(difficulty === "hard" ? 60 : null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pendingBlankSquare, setPendingBlankSquare] = useState<{ row: number; col: number } | null>(null);

  const {
    gameState, gameRecord, selectedTileId, validationError,
    tentativeScore, isLoadingGame, isDictLoading,
    selectTile, placeTile, placeTileWithLetter, recallTile, recallAll, shuffleRack, commitWord, initGame,
  } = useScrabble(gameId);

  const handleSquareClick = (row: number, col: number) => {
    if (!selectedTileId) return;
    const selectedTile = gameState.playerRack.find((t) => t.id === selectedTileId);
    if (selectedTile?.letter === "_") {
      setPendingBlankSquare({ row, col });
    } else {
      placeTile(row, col);
    }
  };

  const { showQuit, setShowQuit } = useBackGuard(!gameState.isGameOver);

  useEffect(() => {
    if (!gameId) {
      initGame().then((record) => {
        if (record?.id) navigate(`/break/scrabble/${record.id}`, { replace: true });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hard mode: 60s timer per turn, resets when a word is played
  useEffect(() => {
    if (difficulty !== "hard" || gameState.isGameOver) return;
    setTimeLeft(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          recallAll();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.turnNumber, difficulty, gameState.isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = async () => {
    setIsCommitting(true);
    try {
      const success = await commitWord();
      if (success) {
        const last = gameState.moveHistory[gameState.moveHistory.length - 1];
        if (last) {
          const bingo = last.score > 50 ? " 🎉 Bingo!" : "";
          toast.success(`${last.word} — +${last.score} pts!${bingo}`);
        }
      }
    } finally {
      setIsCommitting(false);
    }
  };

  if (isLoadingGame || (!gameId && !gameRecord)) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#38E0C3" }} />
      </div>
    );
  }

  const urgentTimer = timeLeft !== null && timeLeft <= 15;

  return (
    <>
      {showQuit && (
        <QuitGameModal
          onConfirm={() => { setShowQuit(false); navigate("/break/scrabble"); }}
          onCancel={() => setShowQuit(false)}
        />
      )}
    <div className="relative px-4 sm:px-6 py-6 max-w-6xl mx-auto pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <button
            onClick={() => navigate("/break/scrabble")}
            className="text-xs mb-1 block transition-all"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            ← Scrabble
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium" style={{ color: "var(--text-primary)" }}>
              Scrabble
            </h1>
            <span
              className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-lg capitalize"
              style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.35)" }}
            >
              {difficulty}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
            {gameState.tileBag.length} tiles in bag · Turn {gameState.turnNumber}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Hard mode timer */}
          {timeLeft !== null && (
            <div
              className="text-center px-3 py-1.5 rounded-xl min-w-[52px]"
              style={{
                background: urgentTimer ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                border: `0.5px solid ${urgentTimer ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.09)"}`,
              }}
            >
              <p className="text-sm font-medium leading-none" style={{ color: urgentTimer ? "rgba(239,68,68,0.9)" : "#fff" }}>
                {timeLeft}s
              </p>
            </div>
          )}
          <div>
            <p className="text-2xl font-medium leading-none" style={{ color: "#38E0C3" }}>
              {gameState.score}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(56,224,195,0.5)" }}>pts</p>
          </div>
          <button
            onClick={() => navigate("/break/scrabble")}
            className="px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            New Game
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0">
          <ScrabbleBoard
            board={gameState.board}
            placedThisTurn={gameState.placedThisTurn}
            onSquareClick={handleSquareClick}
            onTileRecall={recallTile}
            selectedTileId={selectedTileId}
          />
          <div className="mt-4">
            <ScrabbleTileRack
              rack={gameState.playerRack}
              selectedTileId={selectedTileId}
              onTileSelect={selectTile}
              onShuffle={shuffleRack}
              onRecallAll={recallAll}
              onPlay={handlePlay}
              tentativeScore={tentativeScore}
              validationError={validationError}
              isPlaying={isCommitting}
              isDictLoading={isDictLoading}
              tilesPlaced={gameState.placedThisTurn.length}
            />
          </div>
          {gameState.playerRack.length > 0 && gameState.placedThisTurn.length === 0 && (
            <p className="text-xs text-center mt-3" style={{ color: "rgba(255,255,255,0.2)" }}>
              Tap a tile to select, then tap a board square to place it
            </p>
          )}
        </div>

        <div className="lg:w-60 space-y-3">
          <ScrabbleMoveHistory moves={gameState.moveHistory} totalScore={gameState.score} />

          {gameState.isGameOver && (
            <div className="p-4 rounded-2xl text-center" style={{ background: "rgba(56,224,195,0.06)", border: "0.5px solid rgba(56,224,195,0.2)" }}>
              <p className="text-sm font-medium" style={{ color: "#38E0C3" }}>Game Over!</p>
              <p className="text-xs mt-1 mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Final score: {gameState.score} pts</p>
              <button
                onClick={() => navigate("/break/scrabble")}
                className="w-full py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
              >
                Play Again
              </button>
            </div>
          )}

          <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Tiles in bag</span>
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{gameState.tileBag.length}</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pendingBlankSquare && (
          <BlankTilePicker
            onChoose={(letter) => {
              placeTileWithLetter(pendingBlankSquare.row, pendingBlankSquare.col, letter);
              setPendingBlankSquare(null);
            }}
            onCancel={() => setPendingBlankSquare(null)}
          />
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

// ─── Multiplayer Scrabble Game ─────────────────────────────────────────────────

function MultiplayerScrabbleGame({ gameId: gameIdProp }: { gameId?: string }) {
  const { id: paramId } = useParams<{ id?: string }>();
  const gameId = gameIdProp ?? paramId ?? "";
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [isCommitting, setIsCommitting] = useState(false);
  const [gameRow, setGameRow] = useState<MpGameRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [placedThisTurn, setPlacedThisTurn] = useState<{ row: number; col: number; tileId: string }[]>([]);

  const isDictRef = useRef<Set<string> | null>(null);
  const [isDictLoading, setIsDictLoading] = useState(false);

  // Load dictionary (shared with solo mode logic)
  const DICT_CACHE_KEY = "scrabble_dict_v2";
  const loadDict = async (): Promise<Set<string>> => {
    if (isDictRef.current) return isDictRef.current;
    const cached = sessionStorage.getItem(DICT_CACHE_KEY);
    if (cached) {
      const set = new Set(JSON.parse(cached) as string[]);
      isDictRef.current = set;
      return set;
    }
    setIsDictLoading(true);
    const resp = await fetch("https://raw.githubusercontent.com/dolph/dictionary/master/sowpods.txt");
    const text = await resp.text();
    const words = text.split("\n").map((w) => w.trim().toUpperCase()).filter(Boolean);
    sessionStorage.setItem(DICT_CACHE_KEY, JSON.stringify(words));
    const set = new Set(words);
    isDictRef.current = set;
    setIsDictLoading(false);
    return set;
  };

  const fetchGame = async () => {
    const { data } = await supabase.from("scrabble_mp_games").select("*").eq("id", gameId).single();
    if (data) setGameRow(data as MpGameRow);
    setLoading(false);
  };

  useEffect(() => {
    fetchGame();
    loadDict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel(`scrabble-mp-${gameId}`)
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "scrabble_mp_games", filter: `id=eq.${gameId}` }, (payload: any) => {
        setGameRow(payload.new as MpGameRow);
        setPlacedThisTurn([]);
        setSelectedTileId(null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [gameId]);

  const { showQuit: showQuitMp, setShowQuit: setShowQuitMp } = useBackGuard(!loading && gameRow?.status === "active");

  if (loading || !gameRow) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#38E0C3" }} />
      </div>
    );
  }

  const myIdx = gameRow.player_ids.indexOf(profile?.id ?? "");
  const isMyTurn = gameRow.status === "active" && gameRow.current_player_idx === myIdx;
  const currentPlayerName = gameRow.player_usernames[gameRow.current_player_idx] ?? "Player";
  const myRack: ScrabbleTile[] = myIdx >= 0 ? (gameRow.racks[profile!.id] ?? []) : [];

  // Merge placed tiles onto board for display
  const displayBoard = gameRow.board.map((row) => [...row]);
  for (const p of placedThisTurn) {
    const tile = myRack.find((t) => t.id === p.tileId);
    if (tile) displayBoard[p.row][p.col] = tile;
  }
  const displayRack = myRack.filter((t) => !placedThisTurn.some((p) => p.tileId === t.id));

  const handlePlaceTile = (row: number, col: number) => {
    if (!isMyTurn || !selectedTileId) return;
    if (gameRow.board[row][col]) return;
    if (placedThisTurn.some((p) => p.row === row && p.col === col)) return;
    setPlacedThisTurn((prev) => [...prev, { row, col, tileId: selectedTileId }]);
    setSelectedTileId(null);
  };

  const handleRecallTile = (row: number, col: number) => {
    setPlacedThisTurn((prev) => prev.filter((p) => !(p.row === row && p.col === col)));
  };

  const handleRecallAll = () => setPlacedThisTurn([]);

  const handleCommitWord = async () => {
    if (!isMyTurn || placedThisTurn.length === 0) return;
    setIsCommitting(true);
    try {
      const dict = await loadDict();

      // Collect placed tile letters for word validation
      const newBoard = gameRow.board.map((row) => [...row]);
      const placed: { row: number; col: number; tile: ScrabbleTile }[] = [];
      for (const p of placedThisTurn) {
        const tile = myRack.find((t) => t.id === p.tileId);
        if (tile) {
          newBoard[p.row][p.col] = tile;
          placed.push({ row: p.row, col: p.col, tile });
        }
      }

      // Simple validation: check all new tiles are in a line
      const rows = [...new Set(placed.map((p) => p.row))];
      const cols = [...new Set(placed.map((p) => p.col))];
      if (rows.length > 1 && cols.length > 1) {
        toast.error("Tiles must be in a straight line");
        setIsCommitting(false);
        return;
      }

      // Extract word(s)
      const extractWord = (board: (ScrabbleTile | null)[][], r: number, c: number, vertical: boolean): string => {
        let word = "";
        if (vertical) {
          let start = r;
          while (start > 0 && board[start - 1][c]) start--;
          for (let i = start; i < 15 && board[i][c]; i++) word += board[i][c]!.letter;
        } else {
          let start = c;
          while (start > 0 && board[r][start - 1]) start--;
          for (let i = start; i < 15 && board[r][i]; i++) word += board[r][i]!.letter;
        }
        return word;
      };

      const isVertical = rows.length > 1;
      const anchorPlaced = placed[0];
      const mainWord = extractWord(newBoard, anchorPlaced.row, anchorPlaced.col, isVertical);

      if (mainWord.length < 2) {
        toast.error("Word must be at least 2 letters");
        setIsCommitting(false);
        return;
      }
      if (!dict.has(mainWord.toUpperCase())) {
        toast.error(`"${mainWord}" is not a valid word`);
        setIsCommitting(false);
        return;
      }

      // Calculate simple score (letter values, no multipliers for brevity)
      const score = placed.reduce((sum, p) => sum + (p.tile.value ?? 0), 0) + mainWord.length;

      // Draw replacement tiles from bag
      const bagCopy = [...gameRow.tile_bag];
      const newTiles: ScrabbleTile[] = [];
      for (let i = 0; i < placed.length && bagCopy.length > 0; i++) {
        newTiles.push(bagCopy.shift()!);
      }

      const newRack = [...displayRack, ...newTiles];
      const newRacks = { ...gameRow.racks, [profile!.id]: newRack };
      const newScores = { ...gameRow.scores, [profile!.id]: (gameRow.scores[profile!.id] ?? 0) + score };
      const newHistory = [
        ...gameRow.move_history,
        { word: mainWord, score, player_id: profile!.id, player_name: profile?.username ?? null },
      ];
      const nextIdx = (gameRow.current_player_idx + 1) % gameRow.player_ids.length;
      const isOver = bagCopy.length === 0 && newRack.length === 0;

      await supabase.from("scrabble_mp_games").update({
        board: newBoard,
        racks: newRacks,
        tile_bag: bagCopy,
        scores: newScores,
        move_history: newHistory,
        current_player_idx: nextIdx,
        turn_number: gameRow.turn_number + 1,
        status: isOver ? "completed" : "active",
        updated_at: new Date().toISOString(),
      }).eq("id", gameId);

      toast.success(`${mainWord} — +${score} pts!`);
      setPlacedThisTurn([]);
    } finally {
      setIsCommitting(false);
    }
  };

  // Start game (host only, while in lobby)
  const handleStartGame = async () => {
    if (!profile?.id || gameRow.host_id !== profile.id) return;
    // Initialize tile bag and racks
    const TILE_DIST: Record<string, number> = { A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,N:6,O:8,P:2,Q:1,R:6,S:4,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1,_:2 };
    const TILE_VALS: Record<string, number> = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,_:0 };
    const bag: ScrabbleTile[] = [];
    let id = 0;
    for (const [letter, count] of Object.entries(TILE_DIST)) {
      for (let i = 0; i < count; i++) {
        bag.push({ id: `t${id++}`, letter, value: TILE_VALS[letter] ?? 0 });
      }
    }
    // Shuffle
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    const racks: Record<string, ScrabbleTile[]> = {};
    const scores: Record<string, number> = {};
    for (const pid of gameRow.player_ids) {
      racks[pid] = bag.splice(0, 7);
      scores[pid] = 0;
    }
    const emptyBoard = Array.from({ length: 15 }, () => Array(15).fill(null));
    await supabase.from("scrabble_mp_games").update({
      status: "active",
      board: emptyBoard,
      racks,
      tile_bag: bag,
      scores,
      move_history: [],
      current_player_idx: 0,
      turn_number: 1,
      updated_at: new Date().toISOString(),
    }).eq("id", gameId);
    toast.success("Game started!");
  };

  // Pass turn
  const handlePass = async () => {
    if (!isMyTurn) return;
    const nextIdx = (gameRow.current_player_idx + 1) % gameRow.player_ids.length;
    await supabase.from("scrabble_mp_games").update({
      current_player_idx: nextIdx,
      updated_at: new Date().toISOString(),
    }).eq("id", gameId);
    setPlacedThisTurn([]);
    toast(`${profile?.username ?? "You"} passed`, { icon: "⏭" });
  };

  return (
    <>
      {showQuitMp && (
        <QuitGameModal
          message="Quitting will end your multiplayer Scrabble game."
          onConfirm={() => { setShowQuitMp(false); navigate("/break/scrabble"); }}
          onCancel={() => setShowQuitMp(false)}
        />
      )}
    <div className="relative px-4 sm:px-6 py-6 max-w-6xl mx-auto pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <button
            onClick={() => navigate("/break/scrabble")}
            className="text-xs mb-1 block transition-all"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            ← Scrabble
          </button>
          <h1 className="text-xl font-medium" style={{ color: "var(--text-primary)" }}>
            Scrabble — {gameRow.player_ids.length}P
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
            {gameRow.tile_bag.length} tiles in bag · Turn {gameRow.turn_number}
          </p>
        </div>
        {/* Turn indicator */}
        <div
          className="px-3 py-2 rounded-xl text-center"
          style={{
            background: isMyTurn ? "rgba(56,224,195,0.1)" : "rgba(255,255,255,0.04)",
            border: `0.5px solid ${isMyTurn ? "rgba(56,224,195,0.3)" : "rgba(255,255,255,0.09)"}`,
          }}
        >
          <p className="text-xs font-medium" style={{ color: isMyTurn ? "#38E0C3" : "rgba(255,255,255,0.5)" }}>
            {isMyTurn ? "Your turn" : `${currentPlayerName}'s turn`}
          </p>
        </div>
      </div>

      {/* Scores bar */}
      <div
        className="flex gap-2 mb-4 p-3 rounded-xl overflow-x-auto"
        style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        {gameRow.player_ids.map((pid, i) => {
          const name = gameRow.player_usernames[i] ?? `P${i + 1}`;
          const score = gameRow.scores[pid] ?? 0;
          const isCurrent = i === gameRow.current_player_idx;
          const isMe = pid === profile?.id;
          return (
            <div key={pid} className="flex-1 min-w-0 text-center px-2">
              <p
                className="text-xs font-medium truncate"
                style={{ color: isCurrent ? "#38E0C3" : isMe ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)" }}
              >
                {isCurrent ? "▶ " : ""}{name}{isMe ? " (you)" : ""}
              </p>
              <p className="text-lg font-medium leading-tight" style={{ color: isMe ? "#38E0C3" : "rgba(255,255,255,0.6)" }}>
                {score}
              </p>
            </div>
          );
        })}
      </div>

      {/* Lobby state */}
      {gameRow.status === "lobby" && (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">🔤</p>
          <p className="text-sm font-medium mb-1" style={{ color: "#fff" }}>
            Waiting for players to join…
          </p>
          <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
            {gameRow.player_ids.length} player{gameRow.player_ids.length > 1 ? "s" : ""} in lobby
          </p>
          {gameRow.host_id === profile?.id && (
            <button
              onClick={handleStartGame}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(56,224,195,0.14)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
            >
              Start Game
            </button>
          )}
        </div>
      )}

      {/* Active game */}
      {gameRow.status === "active" && (
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 min-w-0">
            <ScrabbleBoard
              board={displayBoard}
              placedThisTurn={placedThisTurn}
              onSquareClick={isMyTurn ? handlePlaceTile : () => {}}
              onTileRecall={isMyTurn ? handleRecallTile : () => {}}
              selectedTileId={selectedTileId}
            />
            {isMyTurn && (
              <div className="mt-4">
                <ScrabbleTileRack
                  rack={displayRack}
                  selectedTileId={selectedTileId}
                  onTileSelect={setSelectedTileId}
                  onShuffle={() => {}}
                  onRecallAll={handleRecallAll}
                  onPlay={handleCommitWord}
                  tentativeScore={0}
                  validationError={null}
                  isPlaying={isCommitting}
                  isDictLoading={isDictLoading}
                  tilesPlaced={placedThisTurn.length}
                />
                <div className="flex justify-center mt-2">
                  <button
                    onClick={handlePass}
                    className="px-4 py-1.5 rounded-xl text-xs transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.35)" }}
                  >
                    Pass turn
                  </button>
                </div>
              </div>
            )}
            {!isMyTurn && myIdx >= 0 && (
              <div className="mt-4 text-center">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38E0C3" }} />
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Waiting for {currentPlayerName}…
                  </p>
                </div>
                {/* Show your rack (read-only) */}
                <div className="flex gap-1.5 justify-center mt-3 flex-wrap">
                  {displayRack.map((tile) => (
                    <div
                      key={tile.id}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold relative"
                      style={{ background: "rgba(251,191,36,0.5)", border: "0.5px solid rgba(251,191,36,0.3)", color: "#1a1a1a", opacity: 0.6 }}
                    >
                      {tile.letter}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-60 space-y-3">
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>
                Move History
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {gameRow.move_history.slice().reverse().map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>{m.player_name ?? "?"}: {m.word}</span>
                    <span style={{ color: "#38E0C3" }}>+{m.score}</span>
                  </div>
                ))}
                {gameRow.move_history.length === 0 && (
                  <p className="text-[10px] text-center py-2" style={{ color: "rgba(255,255,255,0.2)" }}>No moves yet</p>
                )}
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Tiles in bag</span>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{gameRow.tile_bag.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed */}
      <AnimatePresence>
        {gameRow.status === "completed" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(10,22,40,0.88)", backdropFilter: "blur(14px)" }}
          >
            <motion.div
              className="text-center px-8 py-10 rounded-2xl max-w-sm w-full"
              style={{ background: "rgba(17,29,48,0.98)", border: "0.5px solid rgba(56,224,195,0.3)" }}
              initial={{ scale: 0.82, y: 24 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
            >
              <p className="text-4xl mb-4">🏆</p>
              <h2 className="text-xl font-medium mb-4" style={{ color: "#38E0C3", fontFamily: "Space Grotesk, sans-serif" }}>
                Game Over!
              </h2>
              {gameRow.player_ids.map((pid, i) => {
                const name = gameRow.player_usernames[i] ?? `P${i + 1}`;
                const score = gameRow.scores[pid] ?? 0;
                return (
                  <div key={pid} className="flex justify-between mb-1.5 text-sm">
                    <span style={{ color: "rgba(255,255,255,0.65)" }}>{name}</span>
                    <span style={{ color: "#38E0C3" }}>{score} pts</span>
                  </div>
                );
              })}
              <button
                onClick={() => navigate("/break/scrabble")}
                className="mt-6 w-full py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(56,224,195,0.14)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
              >
                Back to Scrabble
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

// ─── Root router ───────────────────────────────────────────────────────────────

export default function ScrabblePage() {
  const { id: rawId } = useParams<{ id?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const searchParams = new URLSearchParams(window.location.search);
  const difficultyParam = (searchParams.get("difficulty") as Difficulty) ?? "medium";

  // /break/scrabble → landing
  if (!rawId) return <ScrabbleLanding profile={profile} />;
  // /break/scrabble/new → new solo game
  if (rawId === "new") return <SoloScrabbleGame difficulty={difficultyParam} />;
  // /break/scrabble/:id → resume solo game
  return <SoloScrabbleGame gameId={rawId} difficulty={difficultyParam} />;
}

// Named exports for sub-routes used in App.tsx
export { MultiplayerScrabbleGame, ScrabbleLanding };
