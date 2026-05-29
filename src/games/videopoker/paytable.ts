import type { HandRank } from './evaluate'

export interface PayRow {
  rank: Exclude<HandRank, 'high'>
  label: string
  /** Multiplier per coin for 1–4 coins (9/6 Jacks-or-Better). */
  mult: number
}

/** 9/6 Jacks or Better. Ordered best → worst for display. */
export const PAYTABLE: readonly PayRow[] = [
  { rank: 'royalFlush', label: 'Royal Flush', mult: 250 },
  { rank: 'straightFlush', label: 'Straight Flush', mult: 50 },
  { rank: 'quads', label: 'Four of a Kind', mult: 25 },
  { rank: 'fullHouse', label: 'Full House', mult: 9 },
  { rank: 'flush', label: 'Flush', mult: 6 },
  { rank: 'straight', label: 'Straight', mult: 4 },
  { rank: 'trips', label: 'Three of a Kind', mult: 3 },
  { rank: 'twoPair', label: 'Two Pair', mult: 2 },
  { rank: 'jacks', label: 'Jacks or Better', mult: 1 },
] as const

export const MAX_COINS = 5
/** Royal Flush at max coins pays 800/coin instead of 250/coin. */
export const ROYAL_MAX_COIN_MULT = 800

export function payMultiplier(rank: HandRank, coins: number): number {
  const row = PAYTABLE.find((r) => r.rank === rank)
  if (!row) return 0
  if (rank === 'royalFlush' && coins >= MAX_COINS) return ROYAL_MAX_COIN_MULT
  return row.mult
}

/** Gross return for a winning hand: coinValue × multiplier(perCoin) × coins. */
export function grossReturn(rank: HandRank, coinValue: number, coins: number): number {
  return coinValue * payMultiplier(rank, coins) * coins
}
