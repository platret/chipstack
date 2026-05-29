import { useCallback, useEffect, useRef, useState } from 'react'
import { audio } from '@/lib/audio'
import { clamp } from '@/lib/utils'
import { useSettings, type TetrisAction } from '@/store/settings'
import { useStats } from '@/store/stats'
import { STEP_MS, VISIBLE_ROWS, COLS } from './constants'
import { type Action, type GameEvent, type Status, TetrisEngine } from './engine'
import type { PieceType } from './pieces'
import { TetrisRenderer } from './renderer'

export interface FlashText {
  id: number
  label: string
  big: boolean
}
export interface BoardView {
  queue: PieceType[]
  hold: PieceType | null
  canHold: boolean
}

const ENGINE_ACTION: Partial<Record<TetrisAction, Action>> = {
  moveLeft: 'left',
  moveRight: 'right',
  softDrop: 'softDrop',
  hardDrop: 'hardDrop',
  rotateCW: 'cw',
  rotateCCW: 'ccw',
  rotate180: 'flip',
  hold: 'hold',
}

export function useTetris(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const engineRef = useRef<TetrisEngine | null>(null)
  const [status, setStatus] = useState<Status>('ready')
  const [view, setView] = useState<BoardView>({ queue: [], hold: null, canHold: true })
  const [flashes, setFlashes] = useState<FlashText[]>([])
  const onGameOverRef = useRef<((summary: { score: number; lines: number; level: number }) => void) | null>(null)
  const flashId = useRef(0)

  useEffect(() => {
    const engine = new TetrisEngine(() => useSettings.getState().handling)
    engineRef.current = engine
    const canvas = canvasRef.current
    const renderer = canvas ? new TetrisRenderer(canvas) : null

    const prev = { status: engine.status as Status, sig: '' }

    function applyFlash(label: string, big: boolean) {
      const id = ++flashId.current
      setFlashes((f) => [...f, { id, label, big }])
      setTimeout(() => setFlashes((f) => f.filter((x) => x.id !== id)), 1200)
    }

    function handleEvents(evs: GameEvent[]) {
      for (const e of evs) {
        switch (e.type) {
          case 'move': audio.play('move'); break
          case 'rotate': audio.play('rotate'); break
          case 'hold': audio.play('hold'); break
          case 'lock': audio.play('lock'); break
          case 'harddrop':
            audio.play('harddrop')
            renderer?.spawnHardDrop(e.cells)
            break
          case 'lineclear':
            audio.play(e.tspin !== 'none' ? 'tspin' : e.count === 4 ? 'tetris' : 'lineclear')
            renderer?.spawnLineClear(e.rows)
            break
          case 'clearText': applyFlash(e.label, e.big); break
          case 'levelup': audio.play('levelup'); break
          case 'countdown': audio.play(e.n > 0 ? 'countdown' : 'go'); break
          case 'gameover':
            audio.play('topout')
            useStats.getState().recordTetris({
              score: engine.score,
              level: engine.level,
              lines: engine.lines,
              maxB2B: engine.maxB2B,
              maxCombo: engine.maxCombo,
            })
            onGameOverRef.current?.({ score: engine.score, lines: engine.lines, level: engine.level })
            break
        }
      }
    }

    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now: number) => {
      let dt = now - last
      last = now
      if (dt > 250) dt = 250
      acc += dt
      let evs: GameEvent[] = []
      while (acc >= STEP_MS) {
        const out = engine.update(STEP_MS)
        if (out.length) evs = evs.length ? evs.concat(out) : out
        acc -= STEP_MS
      }
      if (evs.length) handleEvents(evs)
      renderer?.render(engine, useSettings.getState().gameplay, dt)

      if (engine.status !== prev.status) {
        prev.status = engine.status
        setStatus(engine.status)
      }
      const sig = engine.queue.slice(0, 5).join('') + '|' + (engine.hold ?? '-') + '|' + (engine.canHold ? '1' : '0')
      if (sig !== prev.sig) {
        prev.sig = sig
        setView({ queue: engine.queue.slice(0, 5), hold: engine.hold, canHold: engine.canHold })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // ---- input: map keybinds → engine actions; ignore OS key-repeat ----
    function findAction(code: string): TetrisAction | undefined {
      const kb = useSettings.getState().keybinds
      return (Object.keys(kb) as TetrisAction[]).find((a) => kb[a] === code)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const action = findAction(e.code)
      if (!action) return
      e.preventDefault()
      if (action === 'pause') {
        if (engine.status === 'playing') engine.pause()
        else if (engine.status === 'paused') engine.resume()
        return
      }
      if (action === 'restart') {
        engine.start()
        return
      }
      const ea = ENGINE_ACTION[action]
      if (ea) engine.press(ea)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const action = findAction(e.code)
      if (!action) return
      const ea = ENGINE_ACTION[action]
      if (ea === 'left' || ea === 'right' || ea === 'softDrop') engine.release(ea)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ---- responsive cell sizing ----
    const fit = () => {
      if (!renderer || !canvas?.parentElement) return
      const box = canvas.parentElement.getBoundingClientRect()
      const cell = clamp(Math.floor(Math.min(box.width / COLS, box.height / VISIBLE_ROWS)), 14, 36)
      if (cell > 0) renderer.resize(cell)
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (canvas?.parentElement) ro.observe(canvas.parentElement)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      ro.disconnect()
      engineRef.current = null
    }
  }, [canvasRef])

  const start = useCallback(() => engineRef.current?.start(), [])
  const restart = useCallback(() => engineRef.current?.start(), [])
  const pause = useCallback(() => engineRef.current?.pause(), [])
  const resume = useCallback(() => engineRef.current?.resume(), [])
  const setOnGameOver = useCallback(
    (cb: (summary: { score: number; lines: number; level: number }) => void) => {
      onGameOverRef.current = cb
    },
    [],
  )

  return { engineRef, status, view, flashes, start, restart, pause, resume, setOnGameOver }
}
