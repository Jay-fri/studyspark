export const DEFAULT_TOKEN_COSTS = {
  summary:       35,
  quiz:          40,
  flashcards:    35,
  mindmap:       50,
  studyguide:    60,
  keyconcepts:   25,
  podcast:       65,
  chat:           8,
  anatomy_chat: 100,
} as const;

// Alias kept so import sites compile without changes (live values come from useTokenCosts)
export const TOKEN_COSTS = DEFAULT_TOKEN_COSTS;

export type OperationType = keyof typeof DEFAULT_TOKEN_COSTS;
export type TokenCosts = { [K in OperationType]: number };

// Pass live costs from useTokenCosts() when available; falls back to defaults
export function getCost(op: OperationType, costs?: TokenCosts): number {
  return costs?.[op] ?? DEFAULT_TOKEN_COSTS[op];
}

export function canAfford(balance: number, op: OperationType, costs?: TokenCosts): boolean {
  return balance >= getCost(op, costs);
}

export function formatTokenCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
