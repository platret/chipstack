import type { Rng } from '@/lib/rng'

export const SUITS = ['s', 'h', 'd', 'c'] as const
export type Suit = (typeof SUITS)[number]

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const
export type Rank = (typeof RANKS)[number]

export interface Card {
  rank: Rank
  suit: Suit
}

/** 2 → 2 … T → 10, J → 11, Q → 12, K → 13, A → 14. */
export function rankValue(r: Rank): number {
  return RANKS.indexOf(r) + 2
}

export const RANK_LABEL: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A',
}

export const RED_SUITS: ReadonlySet<Suit> = new Set<Suit>(['h', 'd'])

export function freshDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit })
  return deck
}

export function shuffledDeck(rng: Rng): Card[] {
  return rng.shuffle(freshDeck())
}

export function cardKey(c: Card): string {
  return `${c.rank}${c.suit}`
}
