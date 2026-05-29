/* Seeded RNG (mulberry32). Deterministic given a seed — used by the 7-bag and
   every casino game so results are reproducible and provably-fair-ready. */

export interface Rng {
  next: () => number // float in [0, 1)
  int: (minInclusive: number, maxInclusive: number) => number
  pick: <T>(arr: readonly T[]) => T
  shuffle: <T>(arr: T[]) => T[] // in-place Fisher–Yates
  weighted: <T>(items: readonly T[], weights: readonly number[]) => T
}

export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export function createRng(seed: number | string): Rng {
  let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0
  const next = () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]!
  const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
    }
    return arr
  }
  const weighted = <T>(items: readonly T[], weights: readonly number[]): T => {
    const total = weights.reduce((s, w) => s + w, 0)
    let r = next() * total
    for (let i = 0; i < items.length; i++) {
      r -= weights[i]!
      if (r < 0) return items[i]!
    }
    return items[items.length - 1]!
  }
  return { next, int, pick, shuffle, weighted }
}

/** Non-deterministic seed for a fresh session (uses crypto when available). */
export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0]!
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}
