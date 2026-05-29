import type { Card, Rank } from './cards'
import { rankValue } from './cards'

export const HAND_RANKS = [
  'high',
  'jacks',
  'twoPair',
  'trips',
  'straight',
  'flush',
  'fullHouse',
  'quads',
  'straightFlush',
  'royalFlush',
] as const
export type HandRank = (typeof HAND_RANKS)[number]

interface StraightInfo {
  isStraight: boolean
  /** true only for T-J-Q-K-A */
  isRoyalRun: boolean
}

function straightInfo(values: number[]): StraightInfo {
  const unique = Array.from(new Set(values)).sort((a, b) => a - b)
  if (unique.length !== 5) return { isStraight: false, isRoyalRun: false }
  // Wheel: A-2-3-4-5 (A counted as low).
  if (unique[0] === 2 && unique[1] === 3 && unique[2] === 4 && unique[3] === 5 && unique[4] === 14) {
    return { isStraight: true, isRoyalRun: false }
  }
  const isRun = unique[4]! - unique[0]! === 4
  return { isStraight: isRun, isRoyalRun: isRun && unique[0] === 10 }
}

/** Counts of each rank, sorted descending by count then value. */
function rankCounts(cards: Card[]): { rank: Rank; count: number; value: number }[] {
  const map = new Map<Rank, number>()
  for (const c of cards) map.set(c.rank, (map.get(c.rank) ?? 0) + 1)
  return [...map.entries()]
    .map(([rank, count]) => ({ rank, count, value: rankValue(rank) }))
    .sort((a, b) => b.count - a.count || b.value - a.value)
}

/** Evaluate exactly 5 cards. */
export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length !== 5) return 'high'

  const values = cards.map((c) => rankValue(c.rank))
  const isFlush = cards.every((c) => c.suit === cards[0]!.suit)
  const { isStraight, isRoyalRun } = straightInfo(values)
  const counts = rankCounts(cards)
  const top = counts[0]!.count
  const second = counts[1]?.count ?? 0

  if (isStraight && isFlush) return isRoyalRun ? 'royalFlush' : 'straightFlush'
  if (top === 4) return 'quads'
  if (top === 3 && second === 2) return 'fullHouse'
  if (isFlush) return 'flush'
  if (isStraight) return 'straight'
  if (top === 3) return 'trips'
  if (top === 2 && second === 2) return 'twoPair'
  if (top === 2) {
    // Jacks or Better: a single pair only pays if it's J/Q/K/A.
    return counts[0]!.value >= 11 ? 'jacks' : 'high'
  }
  return 'high'
}
