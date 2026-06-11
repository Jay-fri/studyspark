import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useStreak } from "./useStreak";
import type { ChessMove, ChessGameRecord, GameOverInfo } from "./useChess";

export type { ChessMove, ChessGameRecord, GameOverInfo };

function getGameOverReason(chess: Chess): GameOverInfo["reason"] {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "insufficient";
  if (chess.isThreefoldRepetition()) return "repetition";
  return "fifty_moves";
}

function buildMoveHistoryStatic(chess: Chess): ChessMove[] {
  const history = chess.history({ verbose: true });
  const temp = new Chess();
  return history.map((move, i) => {
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
}

export interface MultiplayerGameRecord extends ChessGameRecord {
  player2_id: string | null;
  game_type: "multiplayer";
  player1_color: "white" | "black";
  game_over_reason?: string;
}

export function useMultiplayerChess(
  gameId: string,
  opts?: {
    onGameOver?: (info: GameOverInfo) => void;
    onMove?: (isCapture: boolean, isCheck: boolean) => void;
    onDeclined?: () => void;
  },
) {
  const [game, setGame] = useState(() => new Chess());
  const [gameRecord, setGameRecord] = useState<MultiplayerGameRecord | null>(null);
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isLoadingGame, setIsLoadingGame] = useState(true);

  const onGameOverRef = useRef(opts?.onGameOver);
  const onMoveRef = useRef(opts?.onMove);
  const onDeclinedRef = useRef(opts?.onDeclined);
  onGameOverRef.current = opts?.onGameOver;
  onMoveRef.current = opts?.onMove;
  onDeclinedRef.current = opts?.onDeclined;
  const lastSoundMoveCountRef = useRef(-1);
  // Tracks whether THIS client already fired the game-over callback locally.
  // Used to skip the Realtime echo (which carries the OTHER player's result).
  const gameOverFiredRef = useRef(false);

  const profile = useAuthStore((s) => s.profile);
  const { recordActivity } = useStreak();

  const updateBothElo = async (myResult: "win" | "loss" | "draw", record: MultiplayerGameRecord) => {
    const myDelta = myResult === "win" ? 8 : myResult === "loss" ? -8 : 0;
    const oppDelta = -myDelta;
    const opponentId = record.user_id === profile?.id ? record.player2_id : record.user_id;
    const updates: PromiseLike<void>[] = [];
    if (myDelta !== 0 && profile?.id) {
      updates.push(supabase.rpc("update_chess_elo", { p_user_id: profile.id, p_delta: myDelta }).then(() => {}));
    }
    if (oppDelta !== 0 && opponentId) {
      updates.push(supabase.rpc("update_chess_elo", { p_user_id: opponentId, p_delta: oppDelta }).then(() => {}));
    }
    await Promise.all(updates);
    // Refresh local profile so the user's own ELO reflects immediately in the UI
    if (profile?.id) {
      const { data: fresh } = await supabase.from("profiles").select("*").eq("id", profile.id).single();
      if (fresh) useAuthStore.getState().refreshProfile(fresh as any);
    }
  };

  // Determine which color this user plays
  const myColor: "white" | "black" | null = gameRecord
    ? gameRecord.user_id === profile?.id
      ? gameRecord.player1_color
      : gameRecord.player1_color === "white"
      ? "black"
      : "white"
    : null;

  const orientation = myColor ?? "white";

  const applyGameState = (record: MultiplayerGameRecord) => {
    const chess = new Chess();
    if (record.pgn) chess.loadPgn(record.pgn);
    setGame(chess);
    setGameRecord(record);
    const moves = buildMoveHistoryStatic(chess);
    setMoveHistory(moves);
    return chess;
  };

  // Initial load
  useEffect(() => {
    loadGame();
  }, [gameId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chess-mp-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chess_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const rec = payload.new as MultiplayerGameRecord;

          if ((rec.status as string) === "declined") {
            onDeclinedRef.current?.();
            return;
          }

          const chess = applyGameState(rec);

          const myColorChar = myColor === "white" ? "w" : "b";
          if (chess.turn() === myColorChar && rec.status === "active") {
            const history = chess.history({ verbose: true });
            const lastMove = history[history.length - 1];
            const moveCount = history.length;
            if (lastMove && moveCount !== lastSoundMoveCountRef.current) {
              lastSoundMoveCountRef.current = moveCount;
              onMoveRef.current?.(!!lastMove.captured, chess.inCheck());
            }
          }

          if (rec.status === "completed" && rec.result) {
            // Skip if this client already fired game-over locally (e.g. timeout fires on both sides)
            if (gameOverFiredRef.current) return;
            // rec.result was written from the OTHER player's perspective — invert it
            const raw = rec.result as "win" | "loss" | "draw";
            const myResult: "win" | "loss" | "draw" =
              raw === "win" ? "loss" : raw === "loss" ? "win" : "draw";
            const reason = (rec.game_over_reason as GameOverInfo["reason"]) ?? "checkmate";
            onGameOverRef.current?.({ result: myResult, reason, movesCount: chess.history().length });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, myColor]);

  const loadGame = async () => {
    setIsLoadingGame(true);
    try {
      const { data } = await supabase
        .from("chess_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (data) applyGameState(data as MultiplayerGameRecord);
    } finally {
      setIsLoadingGame(false);
    }
  };

  const getResult = (chess: Chess): "win" | "loss" | "draw" => {
    if (chess.isCheckmate()) {
      // The side that just moved (the one NOT to move now) won
      const losingColor = chess.turn(); // side to move is the one who lost
      if (myColor === "white") return losingColor === "w" ? "loss" : "win";
      return losingColor === "b" ? "loss" : "win";
    }
    return "draw";
  };

  const onDrop = async (
    sourceSquare: string,
    targetSquare: string,
  ): Promise<boolean> => {
    if (currentMoveIndex !== -1) return false;
    if (!gameRecord || gameRecord.status !== "active") return false;
    if (game.isGameOver()) return false;

    // Enforce turn-based play — only move on your turn
    const myColorChar: "w" | "b" = orientation === "white" ? "w" : "b";
    if (game.turn() !== myColorChar) return false;

    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn());

    let move;
    try {
      move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      return false;
    }
    if (!move) return false;

    // Optimistic update
    setGame(gameCopy);
    const moves = buildMoveHistoryStatic(gameCopy);
    setMoveHistory(moves);
    setCurrentMoveIndex(-1);

    // Play local sound (deduped by move count)
    const mp_moveCount = gameCopy.history().length;
    if (mp_moveCount !== lastSoundMoveCountRef.current) {
      lastSoundMoveCountRef.current = mp_moveCount;
      onMoveRef.current?.(!!move.captured, gameCopy.inCheck());
    }

    const isOver = gameCopy.isGameOver();
    const reason = isOver ? getGameOverReason(gameCopy) : undefined;
    const result = isOver ? getResult(gameCopy) : null;

    // winner_id: reliable for past-games display
    const winnerId = isOver && result
      ? result === "win" ? profile?.id : (gameRecord.user_id === profile?.id ? gameRecord.player2_id : gameRecord.user_id)
      : null;

    // Save to DB (triggers realtime for opponent)
    await supabase.from("chess_games").update({
      pgn: gameCopy.pgn(),
      fen: gameCopy.fen(),
      moves_count: gameCopy.history().length,
      status: isOver ? "completed" : "active",
      result,
      ...(reason ? { game_over_reason: reason } : {}),
      ...(winnerId ? { winner_id: winnerId } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", gameId);

    if (isOver) {
      if (gameRecord) await updateBothElo(result!, gameRecord);
      setGameRecord((prev) =>
        prev ? { ...prev, status: "completed", result: result! } : null,
      );
      gameOverFiredRef.current = true;
      onGameOverRef.current?.({
        result: result!,
        reason: reason ?? "checkmate",
        movesCount: gameCopy.history().length,
      });
    } else {
      await recordActivity("chess_move");
    }

    return true;
  };

  const resign = async () => {
    if (!gameRecord || !profile) return;
    // The resigning player always loses
    const result: "win" | "loss" = "loss";
    const opponentId = gameRecord.user_id === profile.id ? gameRecord.player2_id : gameRecord.user_id;

    await supabase.from("chess_games").update({
      status: "completed",
      result,
      game_over_reason: "resignation",
      winner_id: opponentId,
      updated_at: new Date().toISOString(),
    }).eq("id", gameId);
    await updateBothElo(result, gameRecord);
    setGameRecord((prev) => prev ? { ...prev, status: "completed", result } : null);
    gameOverFiredRef.current = true;
    onGameOverRef.current?.({ result, reason: "resignation", movesCount: game.history().length });
  };

  const timeoutGame = async (loserColor: "white" | "black") => {
    if (!gameRecord) return;
    const result: "win" | "loss" = loserColor === orientation ? "loss" : "win";
    const loserIsPlayer1 = loserColor === gameRecord.player1_color;
    const winnerId = loserIsPlayer1 ? gameRecord.player2_id : gameRecord.user_id;

    await supabase.from("chess_games").update({
      status: "completed",
      result,
      game_over_reason: "timeout",
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
    }).eq("id", gameId);

    await updateBothElo(result, gameRecord);
    setGameRecord((prev) => prev ? { ...prev, status: "completed", result } : null);
    gameOverFiredRef.current = true;
    onGameOverRef.current?.({ result, reason: "timeout", movesCount: game.history().length });
  };

  const goToMove = (index: number) => setCurrentMoveIndex(index);

  const gameStatus = (): string => {
    if (!gameRecord) return "Loading…";
    if ((gameRecord.status as string) === "waiting") return "Waiting for opponent…";
    if ((gameRecord.status as string) === "declined") return "Challenge declined";
    if (gameRecord.status === "completed") {
      if (gameRecord.result === "win") return "You won! 🎉";
      if (gameRecord.result === "loss") return "You lost";
      return "Draw";
    }
    if (game.inCheck()) return `${game.turn() === "w" ? "White" : "Black"} is in check`;
    const myColorChar: "w" | "b" = orientation === "white" ? "w" : "b";
    return game.turn() === myColorChar ? "Your turn" : "Opponent's turn…";
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
    myColor,
    gameStatus,
    onDrop,
    goToMove,
    resign,
    timeoutGame,
    reloadGame: loadGame,
  };
}
