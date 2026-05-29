/* Geometry for the classic 3×12 roulette layout.

   Grid coordinates: the number grid uses (col 0..11, row 0..2). Row 0 is the top
   physical row (3,6,9,…36), row 2 the bottom (1,4,7,…34) — matching a real felt
   where the top column pays the "3-6-9" column. Spots that sit on edges/corners
   carry an explicit fractional position so a chip lands exactly on the seam. */

import type { BetSpot } from './bets'

/** number at grid (col,row); row 0 top → 3,6,…; row 2 bottom → 1,4,… */
export function numAt(col: number, row: number): number {
  return col * 3 + (3 - row)
}

export interface PositionedSpot extends BetSpot {
  /** center in grid units: col in [-1..12], row in [0..2] (outside bets use synthetic coords) */
  gx: number
  gy: number
}

function id(kind: string, nums: readonly number[]): string {
  return `${kind}:${[...nums].sort((a, b) => a - b).join('-')}`
}

/** Build every inside bet (straight/split/street/corner/line) with seam coordinates. */
export function buildInsideSpots(): PositionedSpot[] {
  const spots: PositionedSpot[] = []

  // Straight numbers 1..36 on their grid cell.
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const n = numAt(col, row)
      spots.push({ id: id('straight', [n]), kind: 'straight', numbers: [n], label: String(n), gx: col, gy: row })
    }
  }

  // Splits — horizontal (between adjacent columns) and vertical (between rows).
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const n = numAt(col, row)
      if (row < 2) {
        const b = numAt(col, row + 1)
        spots.push({ id: id('split', [n, b]), kind: 'split', numbers: [n, b], label: '', gx: col, gy: row + 0.5 })
      }
      if (col < 11) {
        const r = numAt(col + 1, row)
        spots.push({ id: id('split', [n, r]), kind: 'split', numbers: [n, r], label: '', gx: col + 0.5, gy: row })
      }
    }
  }

  // Streets — a vertical trio in one column of the felt (top..bottom).
  for (let col = 0; col < 12; col++) {
    const nums = [numAt(col, 0), numAt(col, 1), numAt(col, 2)]
    spots.push({ id: id('street', nums), kind: 'street', numbers: nums, label: '', gx: col, gy: 2.5 })
  }

  // Corners — four numbers around a grid intersection.
  for (let col = 0; col < 11; col++) {
    for (let row = 0; row < 2; row++) {
      const nums = [numAt(col, row), numAt(col, row + 1), numAt(col + 1, row), numAt(col + 1, row + 1)]
      spots.push({ id: id('corner', nums), kind: 'corner', numbers: nums, label: '', gx: col + 0.5, gy: row + 0.5 })
    }
  }

  // Lines — six numbers spanning two adjacent streets.
  for (let col = 0; col < 11; col++) {
    const nums = [
      numAt(col, 0), numAt(col, 1), numAt(col, 2),
      numAt(col + 1, 0), numAt(col + 1, 1), numAt(col + 1, 2),
    ]
    spots.push({ id: id('line', nums), kind: 'line', numbers: nums, label: '', gx: col + 0.5, gy: 2.5 })
  }

  return spots
}

export function columnSpots(): BetSpot[] {
  return [0, 1, 2].map((row) => {
    const nums = Array.from({ length: 12 }, (_, c) => numAt(c, row))
    return { id: id('column', nums), kind: 'column', numbers: nums, label: '2:1' }
  })
}

export function dozenSpots(): BetSpot[] {
  return [
    { lo: 1, label: '1st 12' },
    { lo: 13, label: '2nd 12' },
    { lo: 25, label: '3rd 12' },
  ].map(({ lo, label }) => {
    const nums = Array.from({ length: 12 }, (_, i) => lo + i)
    return { id: id('dozen', nums), kind: 'dozen', numbers: nums, label }
  })
}

const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
const BLACK = Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => !RED.includes(n))

export function evenMoneySpots(): BetSpot[] {
  const low = Array.from({ length: 18 }, (_, i) => i + 1)
  const high = Array.from({ length: 18 }, (_, i) => i + 19)
  const even = Array.from({ length: 18 }, (_, i) => (i + 1) * 2)
  const odd = Array.from({ length: 18 }, (_, i) => i * 2 + 1)
  return [
    { id: id('low', low), kind: 'low', numbers: low, label: '1-18' },
    { id: id('even', even), kind: 'even', numbers: even, label: 'EVEN' },
    { id: id('red', RED), kind: 'red', numbers: RED, label: 'RED' },
    { id: id('black', BLACK), kind: 'black', numbers: BLACK, label: 'BLACK' },
    { id: id('odd', odd), kind: 'odd', numbers: odd, label: 'ODD' },
    { id: id('high', high), kind: 'high', numbers: high, label: '19-36' },
  ]
}
