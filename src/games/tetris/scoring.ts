export type TSpin = 'none' | 'mini' | 'full'

export function gravityMsPerRow(level: number): number {
  const l = Math.max(1, level)
  const sec = Math.pow(0.8 - (l - 1) * 0.007, l - 1)
  return Math.max(sec * 1000, 1)
}

export function levelFromLines(lines: number): number {
  return Math.floor(lines / 10) + 1
}

export interface ScoreResult {
  points: number
  b2b: boolean // whether back-to-back chain is active after this clear
  difficult: boolean // tetris or any line-clearing t-spin
  label: string
}

const NORMAL = [0, 100, 300, 500, 800]
const TSPIN_FULL = [400, 800, 1200, 1600]
const TSPIN_MINI = [100, 200, 400, 400]
const PC_BONUS = [0, 800, 1200, 1800, 2000]

export function scoreClear(
  lines: number,
  tspin: TSpin,
  level: number,
  b2bActive: boolean,
  combo: number,
  perfectClear: boolean,
): ScoreResult {
  let base = 0
  let label = ''
  const difficult = lines > 0 && (lines === 4 || tspin !== 'none')

  if (tspin === 'full') {
    base = TSPIN_FULL[lines] ?? 0
    label = lines === 0 ? 'T-Spin' : `T-Spin ${['', 'Single', 'Double', 'Triple'][lines]}`
  } else if (tspin === 'mini') {
    base = TSPIN_MINI[lines] ?? 0
    label = lines === 0 ? 'T-Spin Mini' : `T-Spin Mini ${['', 'Single', 'Double'][lines] ?? ''}`
  } else {
    base = NORMAL[lines] ?? 0
    label = ['', 'Single', 'Double', 'Triple', 'Tetris'][lines] ?? ''
  }

  const nextB2b = difficult ? true : lines > 0 ? false : b2bActive
  let points = base * level

  // back-to-back applies a 1.5x bonus on the difficult clear (not the first of a chain)
  if (difficult && b2bActive) points = Math.floor(base * level * 1.5)

  if (combo > 0 && lines > 0) points += 50 * combo * level

  if (perfectClear && lines > 0) {
    points += (PC_BONUS[lines] ?? 0) * level
    label = `Perfect Clear`
  }

  return { points, b2b: nextB2b, difficult, label }
}
