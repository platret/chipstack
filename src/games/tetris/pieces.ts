/* Canonical SRS data. Rotation states: 0 = spawn, 1 = CW (R), 2 = 180, 3 = CCW (L).
   Cells are [x, y] within each piece's bounding box (y increases downward).
   Kick tables are the standard SRS offsets, converted to y-down (canonical
   tables use y-up, so every y is negated here). */

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export type Rot = 0 | 1 | 2 | 3

export const PIECES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#2ee6e6',
  O: '#f5d90a',
  T: '#b14cf0',
  S: '#36e05a',
  Z: '#f0414e',
  J: '#5072f5',
  L: '#f5a13a',
}
export const GARBAGE_COLOR = '#6b7280'

export const BOX_SIZE: Record<PieceType, number> = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 }

type Cells = [number, number][]
export const PIECE_CELLS: Record<PieceType, [Cells, Cells, Cells, Cells]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
}

type KickTable = Record<string, [number, number][]>

export const KICKS_JLSTZ: KickTable = {
  '01': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '10': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '12': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '21': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '23': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '32': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '30': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '03': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
}

export const KICKS_I: KickTable = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
}

// 180 kicks (not part of classic guideline; a sensible symmetric set for feel).
export const KICKS_180: KickTable = {
  '02': [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]],
  '20': [[0, 0], [0, -1], [0, 1], [1, 0], [-1, 0]],
  '13': [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
  '31': [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1]],
}

export function getKicks(type: PieceType, from: Rot, to: Rot): [number, number][] {
  const key = `${from}${to}`
  const diff = (to - from + 4) % 4
  if (diff === 2) return KICKS_180[key] ?? [[0, 0]]
  if (type === 'O') return [[0, 0]]
  if (type === 'I') return KICKS_I[key] ?? [[0, 0]]
  return KICKS_JLSTZ[key] ?? [[0, 0]]
}
