import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { audio } from '@/lib/audio'

export const TETRIS_ACTIONS = [
  'moveLeft', 'moveRight', 'softDrop', 'hardDrop',
  'rotateCW', 'rotateCCW', 'rotate180', 'hold', 'pause', 'restart',
] as const
export type TetrisAction = (typeof TETRIS_ACTIONS)[number]

export const ACTION_LABELS: Record<TetrisAction, string> = {
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  softDrop: 'Soft Drop',
  hardDrop: 'Hard Drop',
  rotateCW: 'Rotate CW',
  rotateCCW: 'Rotate CCW',
  rotate180: 'Rotate 180°',
  hold: 'Hold',
  pause: 'Pause',
  restart: 'Restart',
}

export type Keybinds = Record<TetrisAction, string>

const DEFAULT_KEYBINDS: Keybinds = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: 'Space',
  rotateCW: 'ArrowUp',
  rotateCCW: 'KeyZ',
  rotate180: 'KeyA',
  hold: 'KeyC',
  pause: 'Escape',
  restart: 'KeyR',
}

export interface Handling {
  das: number // ms before auto-shift kicks in
  arr: number // ms between auto-shifts (0 = instant)
  sdf: number // soft-drop factor multiplier; SDF_INFINITE = instant
}
export const SDF_INFINITE = 41
const DEFAULT_HANDLING: Handling = { das: 133, arr: 0, sdf: 20 }

export const THEMES = ['synthwave', 'aqua', 'ember', 'matrix'] as const
export type ThemeName = (typeof THEMES)[number]

export interface GameplayFlags {
  ghost: boolean
  grid: boolean
  bettingEnabled: boolean
}

interface SettingsState {
  keybinds: Keybinds
  handling: Handling
  volume: number
  muted: boolean
  theme: ThemeName
  gameplay: GameplayFlags

  setKeybind: (action: TetrisAction, code: string) => void
  resetKeybinds: () => void
  setHandling: (patch: Partial<Handling>) => void
  setVolume: (v: number) => void
  setMuted: (m: boolean) => void
  setTheme: (t: ThemeName) => void
  setGameplay: (patch: Partial<GameplayFlags>) => void
  resetAll: () => void
}

function applyTheme(theme: ThemeName) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      keybinds: { ...DEFAULT_KEYBINDS },
      handling: { ...DEFAULT_HANDLING },
      volume: 0.7,
      muted: false,
      theme: 'synthwave',
      gameplay: { ghost: true, grid: true, bettingEnabled: false },

      setKeybind: (action, code) =>
        set((s) => ({ keybinds: { ...s.keybinds, [action]: code } })),
      resetKeybinds: () => set({ keybinds: { ...DEFAULT_KEYBINDS } }),
      setHandling: (patch) => set((s) => ({ handling: { ...s.handling, ...patch } })),
      setVolume: (v) => {
        const vol = Math.max(0, Math.min(1, v))
        audio.setVolume(vol)
        set({ volume: vol })
      },
      setMuted: (m) => {
        audio.setMuted(m)
        set({ muted: m })
      },
      setTheme: (t) => {
        applyTheme(t)
        set({ theme: t })
      },
      setGameplay: (patch) => set((s) => ({ gameplay: { ...s.gameplay, ...patch } })),
      resetAll: () => {
        applyTheme('synthwave')
        audio.setVolume(0.7)
        audio.setMuted(false)
        set({
          keybinds: { ...DEFAULT_KEYBINDS },
          handling: { ...DEFAULT_HANDLING },
          volume: 0.7,
          muted: false,
          theme: 'synthwave',
          gameplay: { ghost: true, grid: true, bettingEnabled: false },
        })
      },
    }),
    {
      name: 'chipstack-settings',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
          audio.setVolume(state.volume)
          audio.setMuted(state.muted)
        }
      },
    },
  ),
)
