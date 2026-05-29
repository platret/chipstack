import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TetrisRecord {
  highScore: number
  maxLevel: number
  mostLines: number
  longestB2B: number
  bestCombo: number
  gamesPlayed: number
}

interface StatsState {
  tetris: TetrisRecord
  recordTetris: (run: {
    score: number
    level: number
    lines: number
    maxB2B: number
    maxCombo: number
  }) => void
  reset: () => void
}

const EMPTY: TetrisRecord = {
  highScore: 0,
  maxLevel: 1,
  mostLines: 0,
  longestB2B: 0,
  bestCombo: 0,
  gamesPlayed: 0,
}

export const useStats = create<StatsState>()(
  persist(
    (set) => ({
      tetris: { ...EMPTY },
      recordTetris: (run) =>
        set((s) => ({
          tetris: {
            highScore: Math.max(s.tetris.highScore, run.score),
            maxLevel: Math.max(s.tetris.maxLevel, run.level),
            mostLines: Math.max(s.tetris.mostLines, run.lines),
            longestB2B: Math.max(s.tetris.longestB2B, run.maxB2B),
            bestCombo: Math.max(s.tetris.bestCombo, run.maxCombo),
            gamesPlayed: s.tetris.gamesPlayed + 1,
          },
        })),
      reset: () => set({ tetris: { ...EMPTY } }),
    }),
    { name: 'chipstack-stats', version: 1 },
  ),
)
