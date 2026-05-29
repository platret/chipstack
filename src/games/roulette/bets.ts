/* European single-zero roulette: bet definitions, payouts and settlement.
   All pure — the 2.70% house edge falls out of correct odds on a 37-pocket wheel. */

export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

/** Physical pocket order on a European wheel (clockwise from 0). */
export const WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16,
  33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

export type PocketColor = 'red' | 'black' | 'green'

export function colorOf(n: number): PocketColor {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

export const BET_KINDS = [
  'straight',
  'split',
  'street',
  'corner',
  'line',
  'column',
  'dozen',
  'red',
  'black',
  'odd',
  'even',
  'high',
  'low',
] as const
export type BetKind = (typeof BET_KINDS)[number]

/** Winnings-to-stake ratio. Gross return on a win = stake × (ratio + 1). */
export const PAYOUT: Record<BetKind, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  line: 5,
  column: 2,
  dozen: 2,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  high: 1,
  low: 1,
}

/** A placeable spot on the board. `id` is unique; `numbers` are the covered pockets. */
export interface BetSpot {
  id: string
  kind: BetKind
  numbers: readonly number[]
  label: string
}

export interface PlacedBet {
  spot: BetSpot
  amount: number
}

export function spotWins(spot: BetSpot, result: number): boolean {
  return spot.numbers.includes(result)
}

/** Gross return for a single bet given the spun number (0 if it loses). */
export function settleBet(bet: PlacedBet, result: number): number {
  if (!spotWins(bet.spot, result)) return 0
  return bet.amount * (PAYOUT[bet.spot.kind] + 1)
}

export function settleAll(bets: readonly PlacedBet[], result: number): number {
  return bets.reduce((sum, b) => sum + settleBet(b, result), 0)
}

export function totalStake(bets: readonly PlacedBet[]): number {
  return bets.reduce((sum, b) => sum + b.amount, 0)
}
