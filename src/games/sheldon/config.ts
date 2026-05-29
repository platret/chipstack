/* Bazinga Reels — math model. Pure logic, no React/DOM.
   5 reels x 3 rows, 20 left-aligned paylines, WILD substitutes, SCATTER pays anywhere
   and triggers free spins. Affectionate Young Sheldon parody (original vector tiles only).
   Verified RTP ~94.1% (incl. free-spin feature) via Monte-Carlo over the weights x paytable below. */

import type { Rng } from '@/lib/rng'

export const SYMBOLS = [
  'BAZINGA', // WILD
  'SCATTER', // POW couch cushion -> free spins
  'SHELDON',
  'MEEMAW',
  'GEORGE',
  'MARY',
  'MISSY',
  'BOWTIE',
  'GLASSES',
  'COMIC',
  'TRAIN',
  'STAR',
  'ATOM',
  'KITTY',
] as const
export type SymbolId = (typeof SYMBOLS)[number]
export const WILD: SymbolId = 'BAZINGA'
export const SCATTER: SymbolId = 'SCATTER'

/** Paying symbols only (everything except SCATTER). WILD substitutes for these. */
export const PAY_SYMBOLS = SYMBOLS.filter((s) => s !== SCATTER) as readonly SymbolId[]

export const SYMBOL_COLORS: Record<SymbolId, string> = {
  BAZINGA: '#fb923c',
  SCATTER: '#f43f5e',
  SHELDON: '#38bdf8',
  MEEMAW: '#f472b6',
  GEORGE: '#fbbf24',
  MARY: '#a78bfa',
  MISSY: '#fb7185',
  BOWTIE: '#22d3ee',
  GLASSES: '#34e2a8',
  COMIC: '#facc15',
  TRAIN: '#818cf8',
  STAR: '#fcd34d',
  ATOM: '#2dd4bf',
  KITTY: '#f9a8d4',
}

export const SYMBOL_LABELS: Record<SymbolId, string> = {
  BAZINGA: 'Bazinga!',
  SCATTER: "That's My Spot",
  SHELDON: 'Sheldon',
  MEEMAW: 'Meemaw',
  GEORGE: 'George Sr.',
  MARY: 'Mary',
  MISSY: 'Missy',
  BOWTIE: 'Bow Tie',
  GLASSES: 'Glasses',
  COMIC: 'Comic Book',
  TRAIN: 'Choo-Choo',
  STAR: 'Texas Star',
  ATOM: 'Atom',
  KITTY: 'Soft Kitty',
}

export const REELS = 5
export const ROWS = 3
export const FREE_SPINS = 10
/** Extra-wilds boost during free spins: each non-scatter cell has this chance to roll WILD. */
export const FREE_WILD_CHANCE = 0.08

/** Per-reel symbol weights (column order matches SYMBOLS). Wild + scatter rare; high pays scarce. */
export const REEL_WEIGHTS: readonly (readonly number[])[] = [
  //BAZ SCT SHE MEE GEO MAR MIS BOW GLA COM TRN STR ATM KIT
  [3, 5, 6, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 22],
  [4, 5, 7, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20],
  [5, 6, 8, 10, 11, 12, 13, 15, 16, 16, 17, 17, 18, 16],
  [4, 5, 7, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20],
  [3, 5, 6, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 22],
]

/** Line payout = multiplier x LINE BET for [3, 4, 5] of a kind. WILD pays the most. */
export const PAYTABLE: Record<SymbolId, readonly [number, number, number]> = {
  BAZINGA: [250, 1450, 5650],
  SCATTER: [0, 0, 0], // scatter pays separately (see SCATTER_PAY)
  SHELDON: [145, 730, 2850],
  MEEMAW: [95, 480, 1950],
  GEORGE: [75, 340, 1350],
  MARY: [60, 240, 1000],
  MISSY: [48, 195, 800],
  BOWTIE: [34, 108, 440],
  GLASSES: [28, 88, 360],
  COMIC: [24, 72, 300],
  TRAIN: [20, 62, 250],
  STAR: [18, 48, 210],
  ATOM: [14, 44, 185],
  KITTY: [14, 38, 155],
}

/** SCATTER pays x TOTAL BET (anywhere) for [3, 4, 5] scatters, plus triggers free spins. */
export const SCATTER_PAY: readonly [number, number, number] = [2, 8, 40]

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
  '#fb923c', '#34e2a8', '#22d3ee', '#fb7185', '#a78bfa',
  '#f472b6', '#facc15', '#4ade80', '#38bdf8', '#fbbf24',
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
  cells: [number, number][]
}

export interface ScatterWin {
  count: number
  amount: number // in TOTAL-BET units
  cells: [number, number][]
  triggersFreeSpins: boolean
}

export interface SpinResult {
  grid: Grid
  lineWins: LineWin[]
  scatter: ScatterWin | null
  /** total line win in LINE-BET units */
  lineUnits: number
}

function spinReel(reel: number, rng: Rng, wildChance: number): SymbolId {
  if (wildChance > 0 && rng.next() < wildChance) return WILD
  return rng.weighted(SYMBOLS, REEL_WEIGHTS[reel]!)
}

export function spinGrid(rng: Rng, freeSpin = false): Grid {
  const wildChance = freeSpin ? FREE_WILD_CHANCE : 0
  const grid: Grid = []
  for (let r = 0; r < REELS; r++) {
    const col: SymbolId[] = []
    for (let row = 0; row < ROWS; row++) col.push(spinReel(r, rng, wildChance))
    grid.push(col)
  }
  return grid
}

/** Evaluate all paylines (left-aligned, WILD substitutes). Amounts in LINE-BET units. */
function evaluateLines(grid: Grid): LineWin[] {
  const wins: LineWin[] = []
  for (let li = 0; li < PAYLINES.length; li++) {
    const line = PAYLINES[li]!
    const first = grid[0]![line[0]!]!
    if (first === SCATTER) continue

    let base: SymbolId = first
    if (base === WILD) {
      for (let r = 0; r < REELS; r++) {
        const sy = grid[r]![line[r]!]!
        if (sy !== WILD && sy !== SCATTER) {
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

    // a pure-wild leading run also pays the WILD line if that beats the substituted pay
    if (first === WILD) {
      let wc = 0
      for (let r = 0; r < REELS; r++) {
        if (grid[r]![line[r]!] === WILD) wc++
        else break
      }
      if (wc >= 3) {
        const wildPay = PAYTABLE.BAZINGA[(wc - 3) as 0 | 1 | 2]
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

function evaluateScatter(grid: Grid): ScatterWin | null {
  const cells: [number, number][] = []
  for (let r = 0; r < REELS; r++) {
    for (let row = 0; row < ROWS; row++) {
      if (grid[r]![row] === SCATTER) cells.push([r, row])
    }
  }
  const count = cells.length
  if (count < 3) return null
  const amount = SCATTER_PAY[Math.min(count, 5) - 3 as 0 | 1 | 2]
  return { count, amount, cells, triggersFreeSpins: true }
}

export function evaluate(grid: Grid): SpinResult {
  const lineWins = evaluateLines(grid)
  const scatter = evaluateScatter(grid)
  const lineUnits = lineWins.reduce((s, w) => s + w.amount, 0)
  return { grid, lineWins, scatter, lineUnits }
}
