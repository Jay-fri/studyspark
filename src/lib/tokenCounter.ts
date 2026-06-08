// Token costs for each AI operation (approximate)
export const TOKEN_COSTS = {
  summary:     20,
  quiz:        25,
  flashcards:  20,
  mindmap:     30,
  studyguide:  35,
  keyconcepts: 15,
  podcast:     40,
  chat:         5,  // per message
} as const;

export type OperationType = keyof typeof TOKEN_COSTS;

export function getCost(op: OperationType): number {
  return TOKEN_COSTS[op];
}

export function canAfford(balance: number, op: OperationType): boolean {
  return balance >= getCost(op);
}

export function formatTokenCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
