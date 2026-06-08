import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import type { Flashcard } from "@/types";

const SRS_KEY = "studylm-srs";

interface CardRecord {
  nextReview: string; // ISO date
  interval:   number; // days
}

type SRSStore = Record<string, CardRecord>;

function loadStore(): SRSStore {
  try {
    return JSON.parse(localStorage.getItem(SRS_KEY) ?? "{}") as SRSStore;
  } catch {
    return {};
  }
}

function saveStore(store: SRSStore) {
  localStorage.setItem(SRS_KEY, JSON.stringify(store));
}

function cardKey(userId: string, cardId: string) {
  return `${userId}__${cardId}`;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function useSRS() {
  const userId = useAuthStore((s) => s.user?.id) ?? "anon";

  /** Record a review result. "known" → 3 days, "again" → 1 day */
  const review = useCallback(
    (cardId: string, known: boolean) => {
      const store = loadStore();
      const key   = cardKey(userId, cardId);
      const prev  = store[key];
      const prevInterval = prev?.interval ?? 1;
      const nextInterval = known ? Math.min(prevInterval * 2, 30) : 1;
      store[key] = {
        nextReview: addDays(known ? Math.max(nextInterval, 3) : 1),
        interval:   nextInterval,
      };
      saveStore(store);
    },
    [userId]
  );

  /** Returns true if the card is due for review today */
  const isDue = useCallback(
    (cardId: string): boolean => {
      const store  = loadStore();
      const record = store[cardKey(userId, cardId)];
      if (!record) return true; // never reviewed → always due
      return new Date(record.nextReview) <= new Date();
    },
    [userId]
  );

  /** Filter a list of flashcards to only those due today */
  const getDueCards = useCallback(
    (cards: Flashcard[]): Flashcard[] => cards.filter((c) => isDue(c.id)),
    [isDue]
  );

  /** How many cards are due today across a given set */
  const dueCount = useCallback(
    (cards: Flashcard[]): number => getDueCards(cards).length,
    [getDueCards]
  );

  /** Reset all SRS data for a user */
  const resetAll = useCallback(() => {
    const store = loadStore();
    const updated: SRSStore = {};
    for (const k of Object.keys(store)) {
      if (!k.startsWith(userId + "__")) updated[k] = store[k];
    }
    saveStore(updated);
  }, [userId]);

  return { review, isDue, getDueCards, dueCount, resetAll };
}
