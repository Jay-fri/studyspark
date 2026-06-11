import { useState, useEffect, useRef } from "react";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useStreak } from "./useStreak";

const TILE_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4,  E: 12, F: 2, G: 3, H: 2,
  I: 9, J: 1, K: 1, L: 4,  M: 2,  N: 6, O: 8, P: 2,
  Q: 1, R: 6, S: 4, T: 6,  U: 4,  V: 2, W: 2, X: 1,
  Y: 2, Z: 1, _: 2,
};

const TILE_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2,  E: 1,  F: 4,  G: 2, H: 4,
  I: 1, J: 8, K: 5, L: 1,  M: 3,  N: 1,  O: 1, P: 3,
  Q: 10, R: 1, S: 1, T: 1, U: 1,  V: 4,  W: 4, X: 8,
  Y: 4, Z: 10, _: 0,
};

const TRIPLE_WORD_SET = new Set(
  [[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]].map(([r,c]) => `${r},${c}`)
);
const DOUBLE_WORD_SET = new Set(
  [[1,1],[2,2],[3,3],[4,4],[1,13],[2,12],[3,11],[4,10],
   [13,1],[12,2],[11,3],[10,4],[13,13],[12,12],[11,11],[10,10],[7,7]].map(([r,c]) => `${r},${c}`)
);
const TRIPLE_LETTER_SET = new Set(
  [[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]].map(([r,c]) => `${r},${c}`)
);
const DOUBLE_LETTER_SET = new Set(
  [[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],
   [7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]].map(([r,c]) => `${r},${c}`)
);

export type SquareType = "TW" | "DW" | "TL" | "DL" | "star" | null;

export function getSquareType(row: number, col: number): SquareType {
  const key = `${row},${col}`;
  if (TRIPLE_WORD_SET.has(key)) return "TW";
  if (DOUBLE_WORD_SET.has(key)) return "DW";
  if (TRIPLE_LETTER_SET.has(key)) return "TL";
  if (DOUBLE_LETTER_SET.has(key)) return "DL";
  if (row === 7 && col === 7) return "star";
  return null;
}

export interface ScrabbleTile {
  id: string;
  letter: string;
  value: number;
  isBlank?: boolean;
}

export interface PlacedTile {
  tile: ScrabbleTile;
  row: number;
  col: number;
}

export interface ScrabbleMove {
  word: string;
  score: number;
  positions: { row: number; col: number; letter: string }[];
  turnNumber: number;
}

export interface ScrabbleState {
  board: (ScrabbleTile | null)[][];
  playerRack: ScrabbleTile[];
  tileBag: ScrabbleTile[];
  score: number;
  wordsPlayed: string[];
  moveHistory: ScrabbleMove[];
  placedThisTurn: PlacedTile[];
  turnNumber: number;
  isGameOver: boolean;
}

export interface ScrabbleGameRecord {
  id: string;
  user_id: string;
  game_state: ScrabbleState;
  score: number;
  words_played: number;
  status: "active" | "completed";
  ai_review: Record<string, unknown> | null;
  ai_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

function createTileBag(): ScrabbleTile[] {
  const bag: ScrabbleTile[] = [];
  let id = 0;
  for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      bag.push({ id: `tile-${id++}`, letter, value: TILE_VALUES[letter] });
    }
  }
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function createEmptyBoard(): (ScrabbleTile | null)[][] {
  return Array.from({ length: 15 }, () => Array(15).fill(null));
}

function drawFromBag(
  bag: ScrabbleTile[],
  count: number
): [ScrabbleTile[], ScrabbleTile[]] {
  const n = Math.min(count, bag.length);
  return [bag.slice(0, n), bag.slice(n)];
}

async function loadDictionary(): Promise<Set<string>> {
  const CACHE_KEY = "scrabble_dict_v2";
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    return new Set(JSON.parse(cached) as string[]);
  }
  const res = await fetch(
    "https://raw.githubusercontent.com/dolph/dictionary/master/sowpods.txt"
  );
  const text = await res.text();
  const words = text
    .trim()
    .split("\n")
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean);
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(words));
  return new Set(words);
}

function freshState(): ScrabbleState {
  const bag = createTileBag();
  const [rack, remaining] = drawFromBag(bag, 7);
  return {
    board: createEmptyBoard(),
    playerRack: rack,
    tileBag: remaining,
    score: 0,
    wordsPlayed: [],
    moveHistory: [],
    placedThisTurn: [],
    turnNumber: 1,
    isGameOver: false,
  };
}

export function useScrabble(gameId?: string) {
  const profile = useAuthStore((s) => s.profile);
  const { recordActivity } = useStreak();
  const dictRef = useRef<Set<string> | null>(null);

  const [gameState, setGameState] = useState<ScrabbleState>(freshState);
  const [gameRecord, setGameRecord] = useState<ScrabbleGameRecord | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [tentativeScore, setTentativeScore] = useState(0);
  const [isLoadingGame, setIsLoadingGame] = useState(!!gameId);
  const [isDictLoading, setIsDictLoading] = useState(false);

  useEffect(() => {
    if (gameId) loadGame(gameId);
    getOrLoadDictionary();
  }, []);

  const getOrLoadDictionary = async (): Promise<Set<string>> => {
    if (dictRef.current) return dictRef.current;
    setIsDictLoading(true);
    try {
      const dict = await loadDictionary();
      dictRef.current = dict;
      return dict;
    } finally {
      setIsDictLoading(false);
    }
  };

  const persistGame = async (
    state: ScrabbleState,
    recordId: string | null
  ) => {
    if (!profile?.id) return null;
    const payload = {
      user_id: profile.id,
      game_state: state as unknown as Record<string, unknown>,
      score: state.score,
      words_played: state.wordsPlayed.length,
      status: (state.isGameOver ? "completed" : "active") as "active" | "completed",
      updated_at: new Date().toISOString(),
    };

    if (recordId) {
      const { data } = await supabase
        .from("scrabble_games")
        .update(payload)
        .eq("id", recordId)
        .select()
        .single();
      if (data) setGameRecord(data as ScrabbleGameRecord);
      return data;
    } else {
      const { data } = await supabase
        .from("scrabble_games")
        .insert(payload)
        .select()
        .single();
      if (data) setGameRecord(data as ScrabbleGameRecord);
      return data;
    }
  };

  const loadGame = async (id: string) => {
    setIsLoadingGame(true);
    try {
      const { data } = await supabase
        .from("scrabble_games")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setGameRecord(data as ScrabbleGameRecord);
        setGameState(data.game_state as ScrabbleState);
        setSelectedTileId(null);
        setValidationError(null);
      }
    } finally {
      setIsLoadingGame(false);
    }
  };

  const initGame = async () => {
    const state = freshState();
    setGameState(state);
    setSelectedTileId(null);
    setValidationError(null);
    setTentativeScore(0);
    setGameRecord(null);
    const record = await persistGame(state, null);
    return record;
  };

  const selectTile = (tileId: string) => {
    setSelectedTileId((prev) => (prev === tileId ? null : tileId));
    setValidationError(null);
  };

  const calcTentativeScore = (state: ScrabbleState): number => {
    if (state.placedThisTurn.length === 0) return 0;
    const words = getFormedWords(state);
    return words.reduce((sum, w) => sum + calcWordScore(state, w.positions), 0);
  };

  const placeTile = (row: number, col: number) => {
    if (!selectedTileId) return;
    if (gameState.board[row][col]) return;
    if (gameState.placedThisTurn.some((p) => p.row === row && p.col === col)) return;

    const tile = gameState.playerRack.find((t) => t.id === selectedTileId);
    if (!tile) return;

    const newBoard = gameState.board.map((r) => [...r]);
    newBoard[row][col] = tile;
    const newRack = gameState.playerRack.filter((t) => t.id !== selectedTileId);
    const newPlaced = [...gameState.placedThisTurn, { tile, row, col }];

    const newState = {
      ...gameState,
      board: newBoard,
      playerRack: newRack,
      placedThisTurn: newPlaced,
    };

    setGameState(newState);
    setTentativeScore(calcTentativeScore(newState));
    setSelectedTileId(null);
    setValidationError(null);
  };

  const placeTileWithLetter = (row: number, col: number, chosenLetter: string) => {
    if (!selectedTileId) return;
    if (gameState.board[row][col]) return;
    if (gameState.placedThisTurn.some((p) => p.row === row && p.col === col)) return;

    const tile = gameState.playerRack.find((t) => t.id === selectedTileId);
    if (!tile || tile.letter !== "_") return;

    const resolvedTile: ScrabbleTile = { ...tile, letter: chosenLetter.toUpperCase(), isBlank: true };

    const newBoard = gameState.board.map((r) => [...r]);
    newBoard[row][col] = resolvedTile;
    const newRack = gameState.playerRack.filter((t) => t.id !== selectedTileId);
    const newPlaced = [...gameState.placedThisTurn, { tile: resolvedTile, row, col }];

    const newState = { ...gameState, board: newBoard, playerRack: newRack, placedThisTurn: newPlaced };
    setGameState(newState);
    setTentativeScore(calcTentativeScore(newState));
    setSelectedTileId(null);
    setValidationError(null);
  };

  const recallTile = (row: number, col: number) => {
    const placed = gameState.placedThisTurn.find(
      (p) => p.row === row && p.col === col
    );
    if (!placed) return;

    const newBoard = gameState.board.map((r) => [...r]);
    newBoard[row][col] = null;

    const newState = {
      ...gameState,
      board: newBoard,
      playerRack: [...gameState.playerRack, placed.tile],
      placedThisTurn: gameState.placedThisTurn.filter(
        (p) => !(p.row === row && p.col === col)
      ),
    };
    setGameState(newState);
    setTentativeScore(calcTentativeScore(newState));
  };

  const recallAll = () => {
    if (gameState.placedThisTurn.length === 0) return;
    const newBoard = gameState.board.map((r) => [...r]);
    const recovered: ScrabbleTile[] = [];
    for (const p of gameState.placedThisTurn) {
      newBoard[p.row][p.col] = null;
      recovered.push(p.tile);
    }
    setGameState({
      ...gameState,
      board: newBoard,
      playerRack: [...gameState.playerRack, ...recovered],
      placedThisTurn: [],
    });
    setTentativeScore(0);
    setValidationError(null);
  };

  const shuffleRack = () => {
    const shuffled = [...gameState.playerRack];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setGameState({ ...gameState, playerRack: shuffled });
  };

  const exchangeTiles = async (tileIds: string[]) => {
    if (gameState.tileBag.length < tileIds.length) {
      setValidationError("Not enough tiles in the bag");
      return;
    }
    const toReturn = gameState.playerRack.filter((t) => tileIds.includes(t.id));
    const keepRack = gameState.playerRack.filter((t) => !tileIds.includes(t.id));
    const newBag = [...gameState.tileBag, ...toReturn];
    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
    }
    const [drawn, remainingBag] = drawFromBag(newBag, tileIds.length);
    const newState = {
      ...gameState,
      playerRack: [...keepRack, ...drawn],
      tileBag: remainingBag,
      placedThisTurn: [],
      turnNumber: gameState.turnNumber + 1,
    };
    setGameState(newState);
    await persistGame(newState, gameRecord?.id ?? null);
  };

  // Returns all words formed by current placed tiles (used for validation + scoring)
  const getFormedWords = (
    state: ScrabbleState
  ): { word: string; positions: { row: number; col: number }[] }[] => {
    if (state.placedThisTurn.length === 0) return [];

    const getWordAt = (
      startRow: number,
      startCol: number,
      dr: number,
      dc: number
    ) => {
      let r = startRow - dr;
      let c = startCol - dc;
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && state.board[r][c]) {
        r -= dr;
        c -= dc;
      }
      r += dr;
      c += dc;

      const positions: { row: number; col: number }[] = [];
      let word = "";
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && state.board[r][c]) {
        const t = state.board[r][c] as ScrabbleTile;
        word += t.letter === "_" ? "?" : t.letter;
        positions.push({ row: r, col: c });
        r += dr;
        c += dc;
      }
      return { word: word.toLowerCase(), positions };
    };

    const rows = state.placedThisTurn.map((p) => p.row);
    const cols = state.placedThisTurn.map((p) => p.col);
    const singleTile = state.placedThisTurn.length === 1;
    const isHorizontal = singleTile || new Set(rows).size === 1;
    const isVertical = singleTile || new Set(cols).size === 1;

    if (!singleTile && !isHorizontal && !isVertical) return [];

    const results: { word: string; positions: { row: number; col: number }[] }[] = [];
    const seen = new Set<string>();

    const addWord = (w: { word: string; positions: { row: number; col: number }[] }) => {
      if (w.word.length < 2) return;
      const key = w.positions.map((p) => `${p.row},${p.col}`).join("|");
      if (seen.has(key)) return;
      seen.add(key);
      results.push(w);
    };

    if (isHorizontal) {
      addWord(getWordAt(rows[0], Math.min(...cols), 0, 1));
      for (const p of state.placedThisTurn) {
        addWord(getWordAt(p.row, p.col, 1, 0));
      }
    }
    if (isVertical) {
      addWord(getWordAt(Math.min(...rows), cols[0], 1, 0));
      for (const p of state.placedThisTurn) {
        addWord(getWordAt(p.row, p.col, 0, 1));
      }
    }

    return results;
  };

  const calcWordScore = (
    state: ScrabbleState,
    positions: { row: number; col: number }[]
  ): number => {
    const placedSet = new Set(state.placedThisTurn.map((p) => `${p.row},${p.col}`));
    let score = 0;
    let wordMult = 1;

    for (const { row, col } of positions) {
      const tile = state.board[row][col];
      if (!tile) continue;
      let ls = tile.value;
      if (placedSet.has(`${row},${col}`)) {
        const sq = getSquareType(row, col);
        if (sq === "TL") ls *= 3;
        else if (sq === "DL") ls *= 2;
        else if (sq === "TW") wordMult *= 3;
        else if (sq === "DW" || sq === "star") wordMult *= 2;
      }
      score += ls;
    }
    return score * wordMult;
  };

  const validatePlacement = (state: ScrabbleState): string | null => {
    if (state.placedThisTurn.length === 0) return "No tiles placed";

    const rows = state.placedThisTurn.map((p) => p.row);
    const cols = state.placedThisTurn.map((p) => p.col);
    const isH = new Set(rows).size === 1;
    const isV = new Set(cols).size === 1;
    if (state.placedThisTurn.length > 1 && !isH && !isV)
      return "Tiles must be in a straight line";

    if (state.turnNumber === 1) {
      if (!state.placedThisTurn.some((p) => p.row === 7 && p.col === 7))
        return "First word must cover the center ★";
    } else {
      const connects = state.placedThisTurn.some((p) => {
        const nbrs = [[-1,0],[1,0],[0,-1],[0,1]];
        return nbrs.some(([dr, dc]) => {
          const nr = p.row + dr, nc = p.col + dc;
          if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15) return false;
          const nb = state.board[nr][nc];
          return nb && !state.placedThisTurn.some((pt) => pt.row === nr && pt.col === nc);
        });
      });
      if (!connects) return "Tiles must connect to existing words";
    }
    return null;
  };

  const commitWord = async (): Promise<boolean> => {
    const err = validatePlacement(gameState);
    if (err) { setValidationError(err); return false; }

    const dict = await getOrLoadDictionary();
    const words = getFormedWords(gameState);
    if (!words.length) { setValidationError("No valid words formed"); return false; }

    for (const { word } of words) {
      const clean = word.replace(/\?/g, "").toUpperCase();
      if (clean.length > 1 && !dict.has(clean)) {
        setValidationError(`"${clean}" is not a valid word`);
        return false;
      }
    }

    const turnScore = words.reduce((sum, w) => sum + calcWordScore(gameState, w.positions), 0);
    const bingo = gameState.placedThisTurn.length === 7 ? 50 : 0;
    const [newTiles, newBag] = drawFromBag(gameState.tileBag, gameState.placedThisTurn.length);
    const newRackAfterDraw = [...gameState.playerRack, ...newTiles];
    const isGameOver = newBag.length === 0 && newRackAfterDraw.length === 0;

    const wordStrings = words.map((w) => w.word.toUpperCase());
    const newMove: ScrabbleMove = {
      word: wordStrings.join(", "),
      score: turnScore + bingo,
      positions: gameState.placedThisTurn.map((p) => ({
        row: p.row,
        col: p.col,
        letter: p.tile.letter,
      })),
      turnNumber: gameState.turnNumber,
    };

    const newState: ScrabbleState = {
      ...gameState,
      playerRack: newRackAfterDraw,
      tileBag: newBag,
      score: gameState.score + turnScore + bingo,
      wordsPlayed: [...gameState.wordsPlayed, ...wordStrings],
      moveHistory: [...gameState.moveHistory, newMove],
      placedThisTurn: [],
      turnNumber: gameState.turnNumber + 1,
      isGameOver,
    };

    setGameState(newState);
    setValidationError(null);
    setTentativeScore(0);
    setSelectedTileId(null);

    await persistGame(newState, gameRecord?.id ?? null);
    await recordActivity("scrabble_move");

    return true;
  };

  return {
    gameState,
    gameRecord,
    selectedTileId,
    validationError,
    tentativeScore,
    isLoadingGame,
    isDictLoading,
    TILE_VALUES,
    selectTile,
    placeTile,
    placeTileWithLetter,
    recallTile,
    recallAll,
    shuffleRack,
    exchangeTiles,
    commitWord,
    initGame,
    loadGame,
  };
}
