import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useStreak } from "./useStreak";

export type Difficulty = "easy" | "medium" | "hard" | "extra_hard" | "super_hard";

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

export interface ChessMove {
  index: number;
  san: string;
  fen: string;
  piece: string;
  from: string;
  to: string;
  captured?: string;
  isCheck: boolean;
}

export interface ChessGameRecord {
  id: string;
  user_id: string;
  pgn: string;
  fen: string;
  status: "active" | "completed" | "abandoned";
  result: "win" | "loss" | "draw" | null;
  moves_count: number;
  difficulty: Difficulty;
  time_control: string;
  ai_review: Record<string, unknown> | null;
  ai_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Minimax AI ────────────────────────────────────────────────────────────────

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 0,
};

function evaluateBoard(chess: Chess, aiColor: "w" | "b"): number {
  if (chess.isCheckmate()) return chess.turn() === aiColor ? -80000 : 80000;
  if (chess.isDraw()) return 0;
  let score = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      const v = PIECE_VALUES[sq.type] ?? 0;
      score += sq.color === aiColor ? v : -v;
    }
  }
  return score;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  aiColor: "w" | "b",
): number {
  if (depth === 0 || chess.isGameOver()) return evaluateBoard(chess, aiColor);

  const isMaximizing = chess.turn() === aiColor;
  const moves = chess.moves();
  // Move ordering: captures first (improves alpha-beta pruning)
  moves.sort((a, b) => (b.includes("x") ? 1 : 0) - (a.includes("x") ? 1 : 0));

  if (isMaximizing) {
    let best = -Infinity;
    for (const m of moves) {
      chess.move(m);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, aiColor));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      chess.move(m);
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, aiColor));
      chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(chess: Chess, depth: number, aiColor: "w" | "b"): string {
  const moves = [...chess.moves()].sort(() => Math.random() - 0.5);
  if (!moves.length) return "";
  let bestMove = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    chess.move(m);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, aiColor);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}

function getGameOverReason(chess: Chess): GameOverInfo["reason"] {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "insufficient";
  if (chess.isThreefoldRepetition()) return "repetition";
  return "fifty_moves";
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useChess(
  gameId?: string,
  opts?: {
    onGameOver?: (info: GameOverInfo) => void;
    onMove?: (isCapture: boolean, isCheck: boolean) => void;
  },
) {
  const [game, setGame] = useState(() => new Chess());
  const [gameRecord, setGameRecord] = useState<ChessGameRecord | null>(null);
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [isLoadingGame, setIsLoadingGame] = useState(!!gameId);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  // Keep callback refs fresh without dep-array churn
  const onGameOverRef = useRef(opts?.onGameOver);
  const onMoveRef = useRef(opts?.onMove);
  onGameOverRef.current = opts?.onGameOver;
  onMoveRef.current = opts?.onMove;

  const profile = useAuthStore((s) => s.profile);
  const { recordActivity } = useStreak();

  const updateElo = async (result: "win" | "loss" | "draw") => {
    if (!profile?.id) return;
    const delta = result === "win" ? 8 : result === "loss" ? -8 : 0;
    if (delta === 0) return;
    await supabase.rpc("update_chess_elo", { p_user_id: profile.id, p_delta: delta });
  };

  useEffect(() => {
    if (gameId) loadGame(gameId);
  }, [gameId]);

  const buildMoveHistory = (chess: Chess): ChessMove[] => {
    const history = chess.history({ verbose: true });
    const temp = new Chess();
    const moves: ChessMove[] = history.map((move, i) => {
      temp.move(move);
      return {
        index: i,
        san: move.san,
        fen: temp.fen(),
        piece: move.piece,
        from: move.from,
        to: move.to,
        captured: move.captured,
        isCheck: temp.inCheck(),
      };
    });
    setMoveHistory(moves);
    return moves;
  };

  const loadGame = async (id: string) => {
    setIsLoadingGame(true);
    try {
      const { data } = await supabase
        .from("chess_games")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        const chess = new Chess();
        if (data.pgn) chess.loadPgn(data.pgn);
        setGame(chess);
        setGameRecord(data as ChessGameRecord);
        const diff = (data.difficulty as Difficulty) ?? "easy";
        setDifficulty(diff);
        const playerColor = (data.player1_color as "white" | "black") ?? "white";
        if (data.player1_color) setOrientation(playerColor);
        buildMoveHistory(chess);
        setCurrentMoveIndex(-1);

        // Trigger AI first move if game loaded on AI's turn (e.g. player chose black)
        if (data.status === "active" && !chess.isGameOver()) {
          const playerChar: "w" | "b" = playerColor === "white" ? "w" : "b";
          if (chess.turn() !== playerChar) {
            const aiColor: "w" | "b" = playerColor === "white" ? "b" : "w";
            setTimeout(() => makeAIMove(chess, data.id, diff, aiColor), 600);
          }
        }
      }
    } finally {
      setIsLoadingGame(false);
    }
  };

  const reloadGame = () => { if (gameId) loadGame(gameId); };

  const startNewGame = async (
    playAs: "white" | "black" = "white",
    diff: Difficulty = "easy",
    timeControl = "unlimited",
    botId?: string,
  ) => {
    if (!profile?.id) return null;

    const chess = new Chess();
    setGame(chess);
    setOrientation(playAs);
    setDifficulty(diff);
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setGameRecord(null);

    const { data } = await supabase
      .from("chess_games")
      .insert({
        user_id: profile.id,
        pgn: chess.pgn(),
        fen: chess.fen(),
        status: "active",
        difficulty: diff,
        time_control: timeControl,
        player1_color: playAs,
        ...(botId ? { bot_id: botId } : {}),
      })
      .select()
      .single();

    if (data) setGameRecord(data as ChessGameRecord);
    return data;
  };

  const getResult = (chess: Chess): "win" | "loss" | "draw" => {
    if (chess.isCheckmate()) return chess.turn() === "w" ? "loss" : "win";
    return "draw";
  };

  const saveGameState = async (
    chess: Chess,
    id: string,
    isOver: boolean,
    diff?: Difficulty,
    reason?: GameOverInfo["reason"],
  ) => {
    await supabase
      .from("chess_games")
      .update({
        pgn: chess.pgn(),
        fen: chess.fen(),
        moves_count: chess.history().length,
        status: isOver ? "completed" : "active",
        result: isOver ? getResult(chess) : null,
        ...(reason ? { game_over_reason: reason } : {}),
        ...(diff ? { difficulty: diff } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  };

  const makeAIMove = async (
    currentGame: Chess,
    recordId: string,
    diff: Difficulty,
    aiColor: "w" | "b",
  ) => {
    const gameCopy = new Chess();
    gameCopy.loadPgn(currentGame.pgn());

    const moves = gameCopy.moves();
    if (!moves.length) return;

    // Yield the main thread for heavier difficulties so React can commit last state
    if (diff === "extra_hard" || diff === "super_hard") {
      await new Promise<void>((r) => setTimeout(r, 50));
    }

    let aiMove: string;
    if (diff === "easy") {
      aiMove = moves[Math.floor(Math.random() * moves.length)];
    } else if (diff === "medium") {
      aiMove = getBestMove(gameCopy, 1, aiColor);
    } else if (diff === "hard") {
      aiMove = getBestMove(gameCopy, 2, aiColor);
    } else if (diff === "extra_hard") {
      aiMove = getBestMove(gameCopy, 3, aiColor);
    } else {
      // super_hard — depth 4
      aiMove = getBestMove(gameCopy, 4, aiColor);
    }

    // Apply the chosen move
    const moveResult = gameCopy.move(aiMove);
    setGame(gameCopy);
    buildMoveHistory(gameCopy);

    // Fire onMove callback for sounds
    onMoveRef.current?.(!!moveResult?.captured, gameCopy.inCheck());

    const isOver = gameCopy.isGameOver();
    const reason = isOver ? getGameOverReason(gameCopy) : undefined;
    await saveGameState(gameCopy, recordId, isOver, diff, reason);

    if (isOver) {
      const result = getResult(gameCopy);
      await updateElo(result);
      const info: GameOverInfo = {
        result,
        reason: reason ?? "checkmate",
        movesCount: gameCopy.history().length,
      };
      setGameRecord((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              result,
              pgn: gameCopy.pgn(),
              fen: gameCopy.fen(),
              moves_count: gameCopy.history().length,
            }
          : null,
      );
      onGameOverRef.current?.(info);
    }
  };

  const onDrop = async (
    sourceSquare: string,
    targetSquare: string,
  ): Promise<boolean> => {
    if (currentMoveIndex !== -1) return false;
    if (!gameRecord) return false;
    if (game.isGameOver()) return false;

    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());

    let move;
    try {
      move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      return false;
    }
    if (!move) return false;

    setGame(gameCopy);
    buildMoveHistory(gameCopy);
    setCurrentMoveIndex(-1);

    // Fire onMove callback for sounds
    onMoveRef.current?.(!!move.captured, gameCopy.inCheck());

    const isOver = gameCopy.isGameOver();
    const reason = isOver ? getGameOverReason(gameCopy) : undefined;
    await saveGameState(gameCopy, gameRecord.id, isOver, difficulty, reason);

    const result = isOver ? getResult(gameCopy) : null;
    setGameRecord((prev) =>
      prev
        ? {
            ...prev,
            pgn: gameCopy.pgn(),
            fen: gameCopy.fen(),
            moves_count: gameCopy.history().length,
            status: isOver ? "completed" : "active",
            result,
          }
        : null,
    );

    if (isOver) {
      await updateElo(result!);
      onGameOverRef.current?.({
        result: result!,
        reason: reason ?? "checkmate",
        movesCount: gameCopy.history().length,
      });
    } else {
      await recordActivity("chess_move");
      const aiColor: "w" | "b" = orientation === "white" ? "b" : "w";
      setTimeout(() => makeAIMove(gameCopy, gameRecord.id, difficulty, aiColor), 500);
    }

    return true;
  };

  const goToMove = (index: number) => setCurrentMoveIndex(index);

  const resign = async () => {
    if (!gameRecord) return;
    await supabase
      .from("chess_games")
      .update({
        status: "completed",
        result: "loss",
        game_over_reason: "resignation",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameRecord.id);
    await updateElo("loss");
    setGameRecord((prev) =>
      prev ? { ...prev, status: "completed", result: "loss" } : null,
    );
    onGameOverRef.current?.({
      result: "loss",
      reason: "resignation",
      movesCount: game.history().length,
    });
  };

  const timeoutGame = async (loserColor: "white" | "black") => {
    if (!gameRecord) return;
    const result: "win" | "loss" =
      loserColor === orientation ? "loss" : "win";

    await supabase
      .from("chess_games")
      .update({
        status: "completed",
        result,
        game_over_reason: "timeout",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameRecord.id);
    await updateElo(result);
    setGameRecord((prev) =>
      prev ? { ...prev, status: "completed", result } : null,
    );
    onGameOverRef.current?.({
      result,
      reason: "timeout",
      movesCount: game.history().length,
    });
  };

  const gameStatus = (): string => {
    if (gameRecord?.status === "completed") {
      if (gameRecord.result === "win") return "You won! 🎉";
      if (gameRecord.result === "loss") return "You lost";
      if (gameRecord.result === "draw") return "Draw";
      return "Game over";
    }
    if (game.isCheckmate()) return "Checkmate!";
    if (game.isDraw()) return "Draw";
    if (game.inCheck())
      return `${game.turn() === "w" ? "White" : "Black"} is in check`;
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  };

  const displayFen =
    currentMoveIndex === -1
      ? game.fen()
      : (moveHistory[currentMoveIndex]?.fen ?? game.fen());

  return {
    game,
    displayFen,
    moveHistory,
    currentMoveIndex,
    orientation,
    gameRecord,
    isLoadingGame,
    difficulty,
    gameStatus,
    reloadGame,
    onDrop,
    startNewGame,
    loadGame,
    goToMove,
    resign,
    timeoutGame,
  };
}
