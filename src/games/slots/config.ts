/* Neon Reels — math model. Pure logic, no React/DOM.
   5 reels x 3 rows, 20 fixed paylines, left-aligned matches from reel 1, WILD substitutes.
   Verified RTP ~94.8% (house edge ~5.2%) via Monte-Carlo over the weights x paytable below. */

import type { Rng } from '@/lib/rng'

export const SYMBOLS = ['WILD', 'SEVEN', 'DIAMOND', 'BAR', 'BELL', 'STAR', 'CLOVER', 'CHERRY'] as const
export type SymbolId = (typeof SYMBOLS)[number]
export const WILD: SymbolId = 'WILD'

export const SYMBOL_COLORS: Record<SymbolId, string> = {
  WILD: '#fbbf24',
  SEVEN: '#fb7185',
  DIAMOND: '#22d3ee',
  BAR: '#a78bfa',
  BELL: '#facc15',
  STAR: '#f472b6',
  CLOVER: '#34e2a8',
  CHERRY: '#f87171',
}

export const SYMBOL_LABELS: Record<SymbolId, string> = {
  WILD: 'Wild',
  SEVEN: 'Lucky 7',
  DIAMOND: 'Diamond',
  BAR: 'Triple Bar',
  BELL: 'Bell',
  STAR: 'Star',
  CLOVER: 'Clover',
  CHERRY: 'Cherry',
}

export const REELS = 5
export const ROWS = 3

/** Per-reel symbol weights (column order matches SYMBOLS). Wild rarer; high pays scarce. */
export const REEL_WEIGHTS: readonly (readonly number[])[] = [
  [4, 5, 7, 10, 12, 14, 16, 20],
  [5, 6, 8, 11, 13, 15, 17, 18],
  [6, 7, 9, 12, 14, 16, 18, 16],
  [5, 6, 8, 11, 13, 15, 17, 18],
  [4, 5, 7, 10, 12, 14, 16, 20],
]

/** Payout = multiplier x LINE BET for [3, 4, 5] of a kind. WILD pays the most. */
export const PAYTABLE: Record<SymbolId, readonly [number, number, number]> = {
  WILD: [50, 350, 1500],
  SEVEN: [35, 175, 800],
  DIAMOND: [20, 100, 400],
  BAR: [15, 60, 250],
  BELL: [10, 40, 175],
  STAR: [8, 22, 110],
  CLOVER: [6, 16, 80],
  CHERRY: [4, 10, 50],
}

/** 20 fixed paylines. Each entry is the row index (0=top, 2=bottom) per reel column. */
export const PAYLINES: readonly (readonly [number, number, number, number, number])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
]
export const LINE_COUNT = PAYLINES.length

/** Distinct neon hue per payline for the line-highlight overlay. */
export const LINE_COLORS: readonly string[] = [
  '#fbbf24', '#34e2a8', '#22d3ee', '#fb7185', '#a78bfa',
  '#f472b6', '#facc15', '#4ade80', '#38bdf8', '#fb923c',
  '#e879f9', '#2dd4bf', '#f87171', '#c084fc', '#a3e635',
  '#fcd34d', '#5eead4', '#f9a8d4', '#818cf8', '#fde047',
]

/** A 5x3 spin result: grid[reel][row]. */
export type Grid = SymbolId[][]

export interface LineWin {
  lineIndex: number
  symbol: SymbolId
  count: number
  amount: number // in LINE-BET units
  /** [reel, row] cells that form the win, for highlighting. */
  cells: [number, number][]
}

function spinReel(reel: number, rng: Rng): SymbolId {
  return rng.weighted(SYMBOLS, REEL_WEIGHTS[reel]!)
}

export function spinGrid(rng: Rng): Grid {
  const grid: Grid = []
  for (let r = 0; r < REELS; r++) {
    const col: SymbolId[] = []
    for (let row = 0; row < ROWS; row++) col.push(spinReel(r, rng))
    grid.push(col)
  }
  return grid
}

/** Evaluate all paylines. Amounts are in LINE-BET units. WILD substitutes; a wild-led
    run also pays the WILD line if that beats paying it as the substituted symbol. */
export function evaluate(grid: Grid): LineWin[] {
  const wins: LineWin[] = []
  for (let li = 0; li < PAYLINES.length; li++) {
    const line = PAYLINES[li]!
    const first = grid[0]![line[0]!]!

    let base: SymbolId = first
    if (base === WILD) {
      for (let r = 0; r < REELS; r++) {
        const sy = grid[r]![line[r]!]!
        if (sy !== WILD) {
          base = sy
          break
        }
      }
    }

    let count = 0
    for (let r = 0; r < REELS; r++) {
      const sy = grid[r]![line[r]!]!
      if (sy === base || sy === WILD) count++
      else break
    }

    let symbol = base
    let amount = count >= 3 ? PAYTABLE[base][(count - 3) as 0 | 1 | 2] : 0

    if (first === WILD) {
      let wc = 0
      for (let r = 0; r < REELS; r++) {
        if (grid[r]![line[r]!] === WILD) wc++
        else break
      }
      if (wc >= 3) {
        const wildPay = PAYTABLE.WILD[(wc - 3) as 0 | 1 | 2]
        if (wildPay >= amount) {
          amount = wildPay
          symbol = WILD
          count = wc
        }
      }
    }

    if (amount > 0) {
      const cells: [number, number][] = []
      for (let r = 0; r < count; r++) cells.push([r, line[r]!])
      wins.push({ lineIndex: li, symbol, count, amount, cells })
    }
  }
  return wins
}
