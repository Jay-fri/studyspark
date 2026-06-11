import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBackGuard, QuitGameModal } from "@/hooks/useBackGuard";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";
type Player = "player1" | "player2";
type Kind = "man" | "king";

interface Piece { player: Player; kind: Kind }
type Board = (Piece | null)[][];

interface Move {
  from: [number, number];
  to: [number, number];
  capture: [number, number] | null;
}

interface DraughtsGameRow {
  id: string;
  player1_id: string;
  player2_id: string | null;
  board: Board;
  current_player: Player;
  status: "waiting" | "active" | "completed" | "declined";
  winner: Player | null;
  p1_username: string | null;
  p2_username: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Board logic ───────────────────────────────────────────────────────────────

function createBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) b[r][c] = { player: "player2", kind: "man" };
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) b[r][c] = { player: "player1", kind: "man" };
  return b;
}

function movesForPiece(board: Board, r: number, c: number): Move[] {
  const piece = board[r][c];
  if (!piece) return [];
  const fwdRows = piece.kind === "king" ? [-1, 1] : piece.player === "player1" ? [-1] : [1];
  const captures: Move[] = [];
  const regular: Move[] = [];
  for (const dr of fwdRows) {
    for (const dc of [-1, 1]) {
      const mr = r + dr, mc = c + dc, lr = r + dr * 2, lc = c + dc * 2;
      if (mr < 0 || mr >= 8 || mc < 0 || mc >= 8) continue;
      const mid = board[mr][mc];
      if (!mid) {
        regular.push({ from: [r, c], to: [mr, mc], capture: null });
      } else if (mid.player !== piece.player && lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && !board[lr][lc]) {
        captures.push({ from: [r, c], to: [lr, lc], capture: [mr, mc] });
      }
    }
  }
  return captures.length > 0 ? captures : regular;
}

function allMoves(board: Board, player: Player): Move[] {
  const caps: Move[] = [], regs: Move[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.player === player)
        for (const m of movesForPiece(board, r, c))
          (m.capture ? caps : regs).push(m);
  return caps.length > 0 ? caps : regs;
}

function applyMove(board: Board, move: Move): Board {
  const nb = board.map((row) => [...row]);
  const piece = { ...nb[move.from[0]][move.from[1]]! };
  nb[move.from[0]][move.from[1]] = null;
  if (move.capture) nb[move.capture[0]][move.capture[1]] = null;
  if (piece.kind === "man") {
    if (piece.player === "player1" && move.to[0] === 0) piece.kind = "king";
    if (piece.player === "player2" && move.to[0] === 7) piece.kind = "king";
  }
  nb[move.to[0]][move.to[1]] = piece;
  return nb;
}

function countPieces(board: Board, player: Player): number {
  let n = 0;
  for (const row of board) for (const sq of row) if (sq?.player === player) n++;
  return n;
}

// ─── AI ─────────────────────────────────────────────────────────────────────

function evalBoard(board: Board): number {
  let score = 0;
  for (const row of board)
    for (const sq of row)
      if (sq) score += sq.player === "player2" ? (sq.kind === "king" ? 3 : 1) : (sq.kind === "king" ? -3 : -1);
  return score;
}

function minimax(board: Board, depth: number, isMax: boolean, alpha: number, beta: number): number {
  const p2moves = allMoves(board, "player2");
  const p1moves = allMoves(board, "player1");
  if (depth === 0 || p2moves.length === 0 || p1moves.length === 0) return evalBoard(board);
  if (isMax) {
    let best = -Infinity;
    for (const m of p2moves) {
      best = Math.max(best, minimax(applyMove(board, m), depth - 1, false, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of p1moves) {
      best = Math.min(best, minimax(applyMove(board, m), depth - 1, true, alpha, beta));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getAIMove(board: Board, difficulty: Difficulty): Move | null {
  const moves = allMoves(board, "player2");
  if (!moves.length) return null;
  if (difficulty === "easy") {
    const caps = moves.filter((m) => m.capture);
    const pool = caps.length > 0 ? caps : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const depth = difficulty === "medium" ? 3 : 6;
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const score = minimax(applyMove(board, m), depth - 1, false, -Infinity, Infinity);
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

// ─── Draughts Landing ──────────────────────────────────────────────────────────

function DraughtsLanding({ profile }: { profile: any }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"ai" | "friend">("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; username: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: friends = [] } = useQuery<{ id: string; username: string | null }[]>({
    queryKey: ["friends-draughts", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_friends", { p_user_id: profile.id });
      return (data ?? []).map((f: any) => ({ id: f.friend_id, username: f.username }));
    },
    enabled: !!profile?.id,
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase.rpc("search_users_by_username", {
        p_query: searchQuery.trim(), p_user_id: profile?.id, p_limit: 8,
      });
      setSearchResults((data ?? []).map((u: any) => ({ id: u.id, username: u.username })));
    } finally { setSearching(false); }
  };

  const handleChallengeFriend = async (friendId: string, friendUsername: string | null) => {
    if (!profile?.id) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("draughts_games")
        .insert({
          player1_id: profile.id,
          player2_id: friendId,
          board: createBoard(),
          current_player: "player1",
          status: "waiting",
          p1_username: profile.username ?? null,
          p2_username: friendUsername,
        })
        .select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Failed");
      toast.success(`Challenge sent to @${friendUsername ?? "friend"}!`);
      navigate(`/break/draughts/${data.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't send challenge");
    } finally { setCreating(false); }
  };

  const displayList = searchResults.length > 0 ? searchResults : friends;

  return (
    <div className="px-5 sm:px-6 py-6 max-w-2xl mx-auto pb-28 md:pb-6">
      <button
        onClick={() => navigate("/break")}
        className="text-xs mb-4 block transition-all"
        style={{ color: "rgba(255,255,255,0.35)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
      >
        ← Break Room
      </button>

      <h1 className="text-2xl font-medium mb-1" style={{ color: "#fff", fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.025em" }}>
        Draughts
      </h1>
      <p className="text-xs mb-7" style={{ color: "rgba(255,255,255,0.35)" }}>Classic checkers · Kings & mandatory captures</p>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}>
        {(["ai", "friend"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: mode === m ? "rgba(56,224,195,0.12)" : "transparent", border: `0.5px solid ${mode === m ? "rgba(56,224,195,0.3)" : "transparent"}`, color: mode === m ? "#38E0C3" : "rgba(255,255,255,0.35)" }}
          >
            {m === "ai" ? "vs AI" : "vs Friend"}
          </button>
        ))}
      </div>

      {mode === "ai" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <p className="text-[9px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>Difficulty</p>
          <div className="flex gap-2 mb-8">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)}
                className="flex-1 py-3 rounded-xl text-center transition-all capitalize"
                style={{ background: difficulty === d ? "rgba(56,224,195,0.1)" : "rgba(255,255,255,0.03)", border: `0.5px solid ${difficulty === d ? "rgba(56,224,195,0.35)" : "rgba(255,255,255,0.08)"}`, color: difficulty === d ? "#38E0C3" : "rgba(255,255,255,0.4)" }}
              >
                <p className="text-sm font-medium">{d}</p>
                <p className="text-[10px] mt-0.5" style={{ color: difficulty === d ? "rgba(56,224,195,0.65)" : "rgba(255,255,255,0.25)" }}>
                  {d === "easy" ? "Random moves" : d === "medium" ? "Look-ahead 3" : "Full minimax"}
                </p>
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate(`/break/draughts/ai?d=${difficulty}`)}
            className="w-full py-3.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(56,224,195,0.14)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
          >
            Start Game
          </button>
        </motion.div>
      )}

      {mode === "friend" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <p className="text-[9px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>Choose a friend to challenge</p>
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
            <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
              className="px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
            >
              {searching ? "…" : "Search"}
            </button>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {displayList.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ background: "rgba(56,224,195,0.1)", color: "#38E0C3" }}>
                  {(u.username ?? "?")[0]?.toUpperCase()}
                </div>
                <span className="flex-1 text-xs truncate" style={{ color: "rgba(255,255,255,0.7)" }}>@{u.username ?? "—"}</span>
                <button
                  onClick={() => handleChallengeFriend(u.id, u.username)}
                  disabled={creating}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-50"
                  style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}
                >
                  Challenge
                </button>
              </div>
            ))}
            {displayList.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)" }}>Add friends from Break Room to invite them</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── AI Draughts Game ──────────────────────────────────────────────────────────

function AIDraughtsGame({ difficulty }: { difficulty: Difficulty }) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [board, setBoard] = useState<Board>(createBoard);
  const [turn, setTurn] = useState<Player>("player1");
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [highlights, setHighlights] = useState<Map<string, "move" | "capture">>(new Map());
  const [result, setResult] = useState<"win" | "loss" | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Your turn — tap a piece");

  const humanMoves = allMoves(board, "player1");
  const hasCapture = humanMoves.some((m) => m.capture);

  useEffect(() => {
    if (result) return;
    const hc = countPieces(board, "player1"), ac = countPieces(board, "player2");
    const hm = allMoves(board, "player1").length, am = allMoves(board, "player2").length;
    if (hc === 0 || hm === 0) { setResult("loss"); return; }
    if (ac === 0 || am === 0) {
      setResult("win");
      if (profile?.id) void supabase.rpc("update_draughts_win", { p_user_id: profile.id });
    }
  }, [board, result]);

  useEffect(() => {
    if (turn !== "player2" || result || aiThinking) return;
    setAiThinking(true);
    setStatusMsg("AI is thinking…");
    const delay = difficulty === "hard" ? 600 + Math.random() * 400 : 300 + Math.random() * 300;
    const t = setTimeout(() => {
      const move = getAIMove(board, difficulty);
      if (move) setBoard((b) => applyMove(b, move));
      setTurn("player1");
      setAiThinking(false);
      setStatusMsg("Your turn");
    }, delay);
    return () => clearTimeout(t);
  }, [turn, result, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (r: number, c: number) => {
    if (turn !== "player1" || result || aiThinking) return;
    const piece = board[r][c];
    const key = `${r},${c}`;
    if (selected && highlights.has(key)) {
      const move = humanMoves.find((m) => m.to[0] === r && m.to[1] === c && m.from[0] === selected[0] && m.from[1] === selected[1]);
      if (move) { setBoard((b) => applyMove(b, move)); setSelected(null); setHighlights(new Map()); setTurn("player2"); return; }
    }
    if (piece?.player === "player1") {
      const pieceMoves = hasCapture
        ? humanMoves.filter((m) => m.capture && m.from[0] === r && m.from[1] === c)
        : humanMoves.filter((m) => m.from[0] === r && m.from[1] === c);
      if (!pieceMoves.length && hasCapture) { setStatusMsg("Must capture!"); setSelected(null); setHighlights(new Map()); return; }
      const map = new Map<string, "move" | "capture">();
      for (const m of pieceMoves) map.set(`${m.to[0]},${m.to[1]}`, m.capture ? "capture" : "move");
      setSelected([r, c]); setHighlights(map);
      setStatusMsg(pieceMoves.length ? "Choose destination" : "No moves for this piece");
    } else { setSelected(null); setHighlights(new Map()); }
  };

  const reset = () => {
    setBoard(createBoard()); setTurn("player1"); setSelected(null); setHighlights(new Map());
    setResult(null); setAiThinking(false); setStatusMsg("Your turn — tap a piece");
  };

  const humanCount = countPieces(board, "player1"), aiCount = countPieces(board, "player2");
  const { showQuit, setShowQuit } = useBackGuard(!result);

  return (
    <>
      {showQuit && (
        <QuitGameModal
          onConfirm={() => { setShowQuit(false); navigate("/break/draughts"); }}
          onCancel={() => setShowQuit(false)}
        />
      )}
      <DraughtsBoard board={board} selected={selected} highlights={highlights} humanCount={humanCount} opponentCount={aiCount}
        statusMsg={statusMsg} result={result} opponentLabel="AI" difficultyLabel={difficulty}
        onSquareClick={handleClick} onReset={reset} onBack={() => setShowQuit(true)} resultLabels={["You Win!", "AI Wins"]} />
    </>
  );
}

// ─── Multiplayer Draughts Game ─────────────────────────────────────────────────

function MultiplayerDraughtsGame({ gameId }: { gameId: string }) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const [gameRow, setGameRow] = useState<DraughtsGameRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [highlights, setHighlights] = useState<Map<string, "move" | "capture">>(new Map());
  const [wasDeclined, setWasDeclined] = useState(false);

  const fetchGame = async () => {
    const { data } = await supabase.from("draughts_games").select("*").eq("id", gameId).single();
    if (data) setGameRow(data as DraughtsGameRow);
    setLoading(false);
  };

  useEffect(() => {
    fetchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    const ch = supabase.channel(`draughts-mp-${gameId}`)
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "draughts_games", filter: `id=eq.${gameId}` }, (payload: any) => {
        const rec = payload.new as DraughtsGameRow;
        if (rec.status === "declined") { setWasDeclined(true); setTimeout(() => navigate("/break/draughts"), 3000); return; }
        setGameRow(rec);
        setSelected(null); setHighlights(new Map());
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [gameId, navigate]);

  const handleAccept = async () => {
    const board = createBoard();
    await supabase.from("draughts_games").update({ status: "active", board }).eq("id", gameId);
    fetchGame();
  };

  // Hook MUST be before any early returns
  const { showQuit: showQuitMp, setShowQuit: setShowQuitMp } = useBackGuard(gameRow?.status === "active");
  const [disconnectedSecs, setDisconnectedSecs] = useState<number | null>(null);

  const forfeit = async () => {
    if (!gameRow || !profile) return;
    const myP: Player | null = profile.id === gameRow.player1_id ? "player1" : profile.id === gameRow.player2_id ? "player2" : null;
    if (!myP) return;
    const winner: Player = myP === "player1" ? "player2" : "player1";
    await supabase.from("draughts_games").update({ status: "completed", winner, updated_at: new Date().toISOString() }).eq("id", gameId);
    navigate("/break/draughts");
  };

  useEffect(() => {
    if (gameRow?.status !== "active") return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const handleOffline = () => {
      let secs = 60;
      setDisconnectedSecs(secs);
      interval = setInterval(() => {
        secs -= 1;
        if (secs <= 0) {
          if (interval) clearInterval(interval);
          setDisconnectedSecs(null);
          forfeit();
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
  }, [gameRow?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !gameRow) {
    return <div className="flex items-center justify-center min-h-96"><div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#38E0C3" }} /></div>;
  }

  if (wasDeclined) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-2xl mb-2">❌</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Challenge declined. Redirecting…</p>
        </div>
      </div>
    );
  }

  const myPlayer: Player | null = profile?.id === gameRow.player1_id ? "player1" : profile?.id === gameRow.player2_id ? "player2" : null;
  const isMyTurn = myPlayer !== null && gameRow.current_player === myPlayer && gameRow.status === "active";
  const board = gameRow.board;
  const myMoves = myPlayer ? allMoves(board, myPlayer) : [];
  const hasCapture = myMoves.some((m) => m.capture);
  const opponentLabel = myPlayer === "player1" ? (gameRow.p2_username ?? "Opponent") : (gameRow.p1_username ?? "Opponent");
  const myCount = myPlayer ? countPieces(board, myPlayer) : 0;
  const oppPlayer: Player = myPlayer === "player1" ? "player2" : "player1";
  const oppCount = countPieces(board, oppPlayer);

  let statusMsg = "";
  if (gameRow.status === "waiting") {
    statusMsg = myPlayer === "player1" ? "Waiting for opponent to accept…" : "You have been challenged!";
  } else if (gameRow.status === "active") {
    statusMsg = isMyTurn ? "Your turn — tap a piece" : `Waiting for ${opponentLabel}…`;
  }

  const handleClick = (r: number, c: number) => {
    if (!isMyTurn) return;
    const piece = board[r][c];
    const key = `${r},${c}`;
    if (selected && highlights.has(key)) {
      const move = myMoves.find((m) => m.to[0] === r && m.to[1] === c && m.from[0] === selected[0] && m.from[1] === selected[1]);
      if (move) {
        const newBoard = applyMove(board, move);
        const p2count = countPieces(newBoard, "player2");
        const p1count = countPieces(newBoard, "player1");
        const p1moves = allMoves(newBoard, "player1").length;
        const p2moves = allMoves(newBoard, "player2").length;
        const nextPlayer: Player = myPlayer === "player1" ? "player2" : "player1";
        let newStatus: DraughtsGameRow["status"] = "active";
        let winner: Player | null = null;
        if (p2count === 0 || p2moves === 0) { newStatus = "completed"; winner = "player1"; }
        else if (p1count === 0 || p1moves === 0) { newStatus = "completed"; winner = "player2"; }
        supabase.from("draughts_games").update({
          board: newBoard, current_player: nextPlayer,
          status: newStatus, winner, updated_at: new Date().toISOString(),
        }).eq("id", gameId).then(() => {});
        setSelected(null); setHighlights(new Map());
        return;
      }
    }
    if (piece?.player === myPlayer) {
      const pieceMoves = hasCapture
        ? myMoves.filter((m) => m.capture && m.from[0] === r && m.from[1] === c)
        : myMoves.filter((m) => m.from[0] === r && m.from[1] === c);
      if (!pieceMoves.length && hasCapture) { setSelected(null); setHighlights(new Map()); return; }
      const map = new Map<string, "move" | "capture">();
      for (const m of pieceMoves) map.set(`${m.to[0]},${m.to[1]}`, m.capture ? "capture" : "move");
      setSelected([r, c]); setHighlights(map);
    } else { setSelected(null); setHighlights(new Map()); }
  };

  const result: "win" | "loss" | null = gameRow.status === "completed"
    ? gameRow.winner === myPlayer ? "win" : "loss"
    : null;

  // Accept challenge banner
  if (gameRow.status === "waiting" && myPlayer === "player2") {
    return (
      <div className="flex items-center justify-center min-h-96 px-6">
        <div className="text-center p-8 rounded-2xl max-w-sm w-full" style={{ background: "rgba(17,29,48,0.98)", border: "0.5px solid rgba(56,224,195,0.2)" }}>
          <p className="text-3xl mb-3">♟</p>
          <p className="text-sm font-medium mb-1" style={{ color: "#fff" }}>
            {gameRow.p1_username ?? "Someone"} challenged you to Draughts!
          </p>
          <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>You play Mint pieces · They play Red</p>
          <div className="flex gap-2">
            <button onClick={handleAccept} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "rgba(56,224,195,0.12)", border: "0.5px solid rgba(56,224,195,0.3)", color: "#38E0C3" }}>Accept</button>
            <button onClick={async () => { await supabase.from("draughts_games").update({ status: "declined" }).eq("id", gameId); navigate("/break/draughts"); }}
              className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.65)" }}>
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showQuitMp && (
        <QuitGameModal
          message="Quitting will end your multiplayer game. Your opponent will win by forfeit."
          onConfirm={() => { setShowQuitMp(false); forfeit(); }}
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
      <DraughtsBoard board={board} selected={selected} highlights={highlights}
        humanCount={myCount} opponentCount={oppCount} myPlayer={myPlayer ?? "player1"}
        statusMsg={statusMsg} result={result} opponentLabel={opponentLabel}
        onSquareClick={handleClick} onReset={() => navigate("/break/draughts")} onBack={() => setShowQuitMp(true)}
        resultLabels={["You Win!", `${opponentLabel} Wins`]} isWaiting={gameRow.status === "waiting" && myPlayer === "player1"}
      />
    </>
  );
}

// ─── Shared Board Renderer ─────────────────────────────────────────────────────

interface BoardProps {
  board: Board;
  selected: [number, number] | null;
  highlights: Map<string, "move" | "capture">;
  humanCount: number;
  opponentCount: number;
  myPlayer?: Player;
  statusMsg: string;
  result: "win" | "loss" | null;
  opponentLabel: string;
  difficultyLabel?: Difficulty;
  onSquareClick: (r: number, c: number) => void;
  onReset: () => void;
  onBack: () => void;
  resultLabels: [string, string];
  isWaiting?: boolean;
}

function DraughtsBoard({
  board, selected, highlights, humanCount, opponentCount, myPlayer = "player1",
  statusMsg, result, opponentLabel, difficultyLabel, onSquareClick, onReset, onBack, resultLabels, isWaiting,
}: BoardProps) {
  return (
    <div className="relative px-4 sm:px-6 py-6 max-w-2xl mx-auto pb-28 md:pb-6">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 mb-5">
        <div className="min-w-0">
          <button onClick={onBack} className="text-xs mb-1 block transition-all" style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >← Draughts</button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-medium" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>Draughts</h1>
            {difficultyLabel && (
              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-lg capitalize"
                style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.35)" }}>
                {difficultyLabel}
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{statusMsg}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: "#38E0C3" }}>You {humanCount}p</span>
            <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
            <span style={{ color: "rgba(200,80,80,0.9)" }}>{opponentLabel} {opponentCount}p</span>
          </div>
          <button onClick={onReset} className="px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.25)"; e.currentTarget.style.color = "#38E0C3"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            New
          </button>
        </div>
      </div>

      {isWaiting && (
        <div className="mb-4 px-4 py-3 rounded-xl text-center" style={{ background: "rgba(56,224,195,0.05)", border: "0.5px solid rgba(56,224,195,0.15)" }}>
          <p className="text-xs" style={{ color: "rgba(56,224,195,0.7)" }}>Waiting for opponent to accept the challenge…</p>
        </div>
      )}

      <div className="w-full max-w-sm mx-auto rounded-xl overflow-hidden" style={{ aspectRatio: "1", border: "0.5px solid rgba(56,224,195,0.15)" }}>
        <div className="w-full h-full" style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)" }}>
          {Array.from({ length: 64 }, (_, idx) => {
            const dR = Math.floor(idx / 8), dC = idx % 8;
            // Flip board for player2 so they see their pieces at the bottom
            const r = myPlayer === "player2" ? 7 - dR : dR;
            const c = myPlayer === "player2" ? 7 - dC : dC;
            const isDark = (r + c) % 2 === 1;
            const piece = board[r][c];
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const hlType = highlights.get(`${r},${c}`);
            const isMyPiece = piece?.player === myPlayer;

            let bg = isDark ? "#1a3a4a" : "#2d5a6e";
            if (isDark && isSel) bg = "rgba(56,224,195,0.22)";
            else if (isDark && hlType === "capture") bg = "rgba(239,68,68,0.14)";
            else if (isDark && hlType === "move") bg = "rgba(56,224,195,0.1)";

            return (
              <div key={idx} className="relative flex items-center justify-center"
                style={{ background: bg, cursor: isDark ? "pointer" : "default" }}
                onClick={() => isDark && onSquareClick(r, c)}
              >
                {isDark && hlType && !piece && (
                  <div className="w-[30%] h-[30%] rounded-full"
                    style={{ background: hlType === "capture" ? "rgba(239,68,68,0.65)" : "rgba(56,224,195,0.6)" }} />
                )}
                {piece && (
                  <div className="w-[72%] h-[72%] rounded-full flex items-center justify-center select-none transition-all"
                    style={{
                      background: isMyPiece ? "rgba(56,224,195,0.82)" : "rgba(200,55,55,0.82)",
                      border: `2px solid ${isMyPiece ? "#38E0C3" : "rgb(185,45,45)"}`,
                      boxShadow: isSel ? "0 0 0 2px rgba(255,255,255,0.35), 0 2px 8px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.35)",
                    }}
                  >
                    {piece.kind === "king" && (
                      <span className="text-[11px] leading-none" style={{ color: isMyPiece ? "#0a1628" : "#fff" }}>♔</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
        Mint = You · Red = {opponentLabel} · Crown = King · Captures mandatory
      </p>

      <AnimatePresence>
        {result && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(10,22,40,0.88)", backdropFilter: "blur(14px)" }}
          >
            <motion.div className="text-center px-8 py-10 rounded-2xl max-w-xs w-full"
              style={{ background: "rgba(17,29,48,0.98)", border: `0.5px solid ${result === "win" ? "rgba(56,224,195,0.3)" : "rgba(239,68,68,0.2)"}` }}
              initial={{ scale: 0.82, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
            >
              <p className="text-5xl mb-4 select-none">{result === "win" ? "🏆" : "😔"}</p>
              <h2 className="text-2xl font-medium mb-1"
                style={{ color: result === "win" ? "#38E0C3" : "rgba(239,68,68,0.85)", letterSpacing: "-0.025em" }}
              >
                {result === "win" ? resultLabels[0] : resultLabels[1]}
              </h2>
              <p className="text-sm mb-7" style={{ color: "rgba(255,255,255,0.35)" }}>
                {result === "win" ? "All enemy pieces captured or blocked" : "All your pieces captured or blocked"}
              </p>
              <div className="flex gap-3">
                <button onClick={onReset} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "rgba(56,224,195,0.14)", border: "0.5px solid rgba(56,224,195,0.35)", color: "#38E0C3" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(56,224,195,0.22)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(56,224,195,0.14)")}
                >Play Again</button>
                <button onClick={onBack} className="flex-1 py-3 rounded-xl text-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                >Break Room</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function DraughtsPage() {
  const { id: rawId } = useParams<{ id?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const searchParams = new URLSearchParams(window.location.search);
  const difficulty = (searchParams.get("d") as Difficulty) ?? "medium";

  // No id → landing
  if (!rawId) return <DraughtsLanding profile={profile} />;
  // /break/draughts/ai → AI game
  if (rawId === "ai") return <AIDraughtsGame difficulty={difficulty} />;
  // /break/draughts/mp/:gameId handled via nested route — fallback here is just the multiplayer game
  return <MultiplayerDraughtsGame gameId={rawId} />;
}

export { MultiplayerDraughtsGame };
