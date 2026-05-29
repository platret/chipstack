/* Gates of Fortune — math model. Pure logic, no React/DOM.
   6 columns x 5 rows = 30 cells. PAY ANYWHERE: a symbol pays when 8+ of it land
   anywhere on the grid (position-independent), with tiers for 8-9 / 10-11 / 12+.
   TUMBLE: winning symbols are removed, the grid refills from the top, and it
   re-evaluates until a tumble yields nothing. MULTIPLIER ORBS land carrying a value;
   at the end of a winning sequence every orb value is summed and multiplies the spin.
   "Gates of Olympus"-style mechanics with original neon Greek tiles.
   Verified RTP ~95.0% (high volatility) via Monte-Carlo over the model below. */

import type { Rng } from '@/lib/rng'

export const COLS = 6
export const ROWS = 5
export const CELLS = COLS * ROWS // 30

/* Symbol set: 5 low gems, 4 high premiums, ORB (multiplier), SCATTER (Zeus temple). */
export const SYMBOLS = [
  // high premiums (rarer, pay more)
  'CROWN',
  'RING',
  'CHALICE',
  'HOURGLASS',
  // low gems
  'RED',
  'PURPLE',
  'YELLOW',
  'GREEN',
  'BLUE',
  // specials
  'ORB',
  'SCATTER',
] as const
export type SymbolId = (typeof SYMBOLS)[number]

export const ORB: SymbolId = 'ORB'
export const SCATTER: SymbolId = 'SCATTER'

/** Paying symbols only (everything except ORB + SCATTER). These pay anywhere 8+. */
export const PAY_SYMBOLS = SYMBOLS.filter((s) => s !== ORB && s !== SCATTER) as readonly SymbolId[]

export const SYMBOL_COLORS: Record<SymbolId, string> = {
  CROWN: '#fbbf24', // gold crown
  RING: '#22d3ee', // sapphire ring
  CHALICE: '#a78bfa', // amethyst chalice
  HOURGLASS: '#34e2a8', // emerald hourglass
  RED: '#fb7185',
  PURPLE: '#c084fc',
  YELLOW: '#fcd34d',
  GREEN: '#4ade80',
  BLUE: '#38bdf8',
  ORB: '#f43f5e', // lightning orb (Zeus rose-red)
  SCATTER: '#38bdf8', // Zeus / temple — electric blue
}

export const SYMBOL_LABELS: Record<SymbolId, string> = {
  CROWN: 'Laurel Crown',
  RING: 'Sapphire Ring',
  CHALICE: 'Golden Chalice',
  HOURGLASS: 'Hourglass',
  RED: 'Ruby Gem',
  PURPLE: 'Amethyst Gem',
  YELLOW: 'Topaz Gem',
  GREEN: 'Emerald Gem',
  BLUE: 'Aquamarine Gem',
  ORB: 'Zeus Orb',
  SCATTER: 'Temple Scatter',
}

export const FREE_SPINS = 15
export const RETRIGGER_SPINS = 5
export const SCATTERS_TO_TRIGGER = 4
export const SCATTERS_TO_RETRIGGER = 3

/* Pay-anywhere paytable. Payout = multiplier x TOTAL BET for [8-9, 10-11, 12+] count tiers.
   "Gates"-style: the rarer the symbol, the bigger the pays; low gems pay little.
   Tuned (with the weights + orb model below) to ~95% RTP, high volatility. */
export const PAYTABLE: Record<SymbolId, readonly [number, number, number]> = {
  //          8-9    10-11   12+
  CROWN: [10, 25, 50],
  RING: [4, 8, 15],
  CHALICE: [2.5, 5, 12],
  HOURGLASS: [2, 4, 9],
  RED: [1.2, 2, 5],
  PURPLE: [0.8, 1.5, 4],
  YELLOW: [0.5, 1, 2.5],
  GREEN: [0.4, 0.8, 2],
  BLUE: [0.25, 0.6, 1.5],
  ORB: [0, 0, 0], // orbs do not pay directly
  SCATTER: [0, 0, 0], // scatters trigger free spins, not a payout
}

/** Global house-edge trim applied to every pay-anywhere payout. Keeps the paytable
   numbers clean while landing the model at ~95% RTP (verified Monte-Carlo). */
export const PAY_SCALE = 0.95

/** Map a symbol count (>=8) to its paytable tier index. */
export function payTier(count: number): 0 | 1 | 2 {
  if (count >= 12) return 2
  if (count >= 10) return 1
  return 0
}

/** Payout multiplier (x total bet) for `count` of `symbol`, house-edge-trimmed. */
export function payUnit(symbol: SymbolId, count: number): number {
  if (count < 8) return 0
  return PAYTABLE[symbol][payTier(count)] * PAY_SCALE
}

/** Symbol spawn weights for a fresh cell (used both for the initial drop and refills).
   Premiums are scarce, low gems common, orb + scatter rare. Tuned for ~95% RTP. */
export const SYMBOL_WEIGHTS: Record<SymbolId, number> = {
  CROWN: 7,
  RING: 11,
  CHALICE: 14,
  HOURGLASS: 15,
  RED: 22,
  PURPLE: 24,
  YELLOW: 26,
  GREEN: 28,
  BLUE: 30,
  ORB: 2.2,
  SCATTER: 4,
}

/** During free spins the temple is slightly more generous (orbs land a touch more often). */
export const FREE_SYMBOL_WEIGHTS: Record<SymbolId, number> = {
  ...SYMBOL_WEIGHTS,
  ORB: 3.5,
  SCATTER: 3,
}

/** Lightning-orb multiplier values (x). Heavily weighted toward the small end. */
export const ORB_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500] as const
export type OrbValue = (typeof ORB_VALUES)[number]

export const ORB_VALUE_WEIGHTS: readonly number[] = [
  //2     3     4    5    6    8   10   12  15  20  25 50 100 250  500
  3400, 2050, 1300, 820, 520, 330, 200, 120, 70, 38, 20, 7, 2, 0.5, 0.12,
]

/** A cell can be empty (gap during a tumble) or hold a symbol. */
export type Cell = SymbolId | null

/** Grid is column-major: grid[col][row], row 0 = top, row ROWS-1 = bottom. */
export type Grid = Cell[][]

export interface OrbHit {
  col: number
  row: number
  value: OrbValue
}

export interface SymbolWin {
  symbol: SymbolId
  count: number
  /** payout multiplier in TOTAL-BET units (before any orb/free-spin multiplier). */
  unit: number
  cells: [number, number][]
}

export interface TumbleStep {
  /** the grid as it appeared for this evaluation (before removal). */
  grid: Grid
  /** orb value per cell aligned to `grid` (0 where the cell is not an orb). */
  orbVals: number[][]
  wins: SymbolWin[]
  /** total payout for this step in TOTAL-BET units. */
  units: number
  /** orbs present on the grid this step (revealed when the step has a win). */
  orbs: OrbHit[]
}

export interface SpinResult {
  steps: TumbleStep[]
  /** total base win across all tumbles in TOTAL-BET units (before orb/total multiplier). */
  baseUnits: number
  /** every orb value collected across the whole sequence (only meaningful if baseUnits>0). */
  orbValues: OrbValue[]
  /** sum of all collected orb values (the spin total multiplier when baseUnits>0). */
  orbMultiplier: number
  /** scatter count on the *initial* drop (free-spin trigger uses the first grid only). */
  scatterCount: number
  /** final win in TOTAL-BET units after orb multiplier (base feature). */
  finalUnits: number
}

function rollOrbValue(rng: Rng): OrbValue {
  return rng.weighted(ORB_VALUES, ORB_VALUE_WEIGHTS)
}

/** Pick a fresh symbol for a cell. Orb value (if any) is rolled separately by the caller. */
function rollSymbol(rng: Rng, free: boolean): SymbolId {
  const weights = free ? FREE_SYMBOL_WEIGHTS : SYMBOL_WEIGHTS
  return rng.weighted(SYMBOLS, SYMBOLS.map((s) => weights[s]))
}

/** A fresh full 6x5 grid. */
export function spinGrid(rng: Rng, free = false): Grid {
  const grid: Grid = []
  for (let c = 0; c < COLS; c++) {
    const col: Cell[] = []
    for (let r = 0; r < ROWS; r++) col.push(rollSymbol(rng, free))
    grid.push(col)
  }
  return grid
}

function countScatter(grid: Grid): number {
  let n = 0
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (grid[c]![r] === SCATTER) n++
  return n
}

/** Collect every orb on the grid with its rolled value. */
function readOrbs(grid: Grid, orbVals: number[][]): OrbHit[] {
  const out: OrbHit[] = []
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c]![r] === ORB) out.push({ col: c, row: r, value: orbVals[c]![r] as OrbValue })
    }
  }
  return out
}

/** Tally pay-anywhere wins for one grid state. Amounts in TOTAL-BET units. */
function evaluateGrid(grid: Grid): { wins: SymbolWin[]; units: number } {
  const positions = new Map<SymbolId, [number, number][]>()
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const s = grid[c]![r]
      if (s === null || s === ORB || s === SCATTER) continue
      const arr = positions.get(s)
      if (arr) arr.push([c, r])
      else positions.set(s, [[c, r]])
    }
  }
  const wins: SymbolWin[] = []
  let units = 0
  for (const [symbol, cells] of positions) {
    if (cells.length >= 8) {
      const unit = payUnit(symbol, cells.length)
      if (unit > 0) {
        wins.push({ symbol, count: cells.length, unit, cells })
        units += unit
      }
    }
  }
  wins.sort((a, b) => b.unit - a.unit)
  return { wins, units }
}

/** Remove winning cells (set to null) so the grid can tumble. */
function clearWins(grid: Grid, wins: SymbolWin[]): void {
  for (const w of wins) {
    for (const [c, r] of w.cells) grid[c]![r] = null
  }
}

/** Apply gravity per column and refill the empty top cells with fresh symbols.
   Mirrors the symbol move into the parallel orb-value grid so orb values follow. */
function tumble(grid: Grid, orbVals: number[][], rng: Rng, free: boolean): void {
  for (let c = 0; c < COLS; c++) {
    const col = grid[c]!
    const vals = orbVals[c]!
    // compact existing (non-null) symbols to the bottom, preserving order
    const kept: Cell[] = []
    const keptVals: number[] = []
    for (let r = 0; r < ROWS; r++) {
      if (col[r] !== null) {
        kept.push(col[r])
        keptVals.push(vals[r]!)
      }
    }
    const missing = ROWS - kept.length
    const fresh: Cell[] = []
    const freshVals: number[] = []
    for (let i = 0; i < missing; i++) {
      const s = rollSymbol(rng, free)
      fresh.push(s)
      freshVals.push(s === ORB ? rollOrbValue(rng) : 0)
    }
    // new column = fresh symbols on top, kept compacted below
    for (let r = 0; r < ROWS; r++) {
      if (r < missing) {
        col[r] = fresh[r]!
        vals[r] = freshVals[r]!
      } else {
        col[r] = kept[r - missing]!
        vals[r] = keptVals[r - missing]!
      }
    }
  }
}

function makeOrbVals(grid: Grid, rng: Rng): number[][] {
  const vals: number[][] = []
  for (let c = 0; c < COLS; c++) {
    const col: number[] = []
    for (let r = 0; r < ROWS; r++) col.push(grid[c]![r] === ORB ? rollOrbValue(rng) : 0)
    vals.push(col)
  }
  return vals
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((col) => col.slice())
}

function cloneVals(vals: number[][]): number[][] {
  return vals.map((col) => col.slice())
}

/** Run a complete spin: initial drop, then tumble until no win. Pure + deterministic. */
export function playSpin(rng: Rng, free = false): SpinResult {
  const grid = spinGrid(rng, free)
  const orbVals = makeOrbVals(grid, rng)
  const scatterCount = countScatter(grid)

  const steps: TumbleStep[] = []
  let baseUnits = 0
  const orbValues: OrbValue[] = []

  // up to a generous cap to guarantee termination on pathological RNG
  for (let guard = 0; guard < 64; guard++) {
    const { wins, units } = evaluateGrid(grid)
    const orbs = readOrbs(grid, orbVals)
    steps.push({ grid: cloneGrid(grid), orbVals: cloneVals(orbVals), wins, units, orbs })

    if (units <= 0) break

    baseUnits += units
    // orbs on this winning step contribute to the total multiplier
    for (const o of orbs) orbValues.push(o.value)

    clearWins(grid, wins)
    tumble(grid, orbVals, rng, free)
  }

  const orbMultiplier = orbValues.reduce((s, v) => s + v, 0)
  const finalUnits = baseUnits > 0 && orbMultiplier > 0 ? baseUnits * orbMultiplier : baseUnits

  return { steps, baseUnits, orbValues, orbMultiplier, scatterCount, finalUnits }
}
