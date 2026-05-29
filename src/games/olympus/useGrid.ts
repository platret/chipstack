/* Canvas grid engine for Gates of Fortune. Renders the 6x5 board and plays a tumble
   sequence: an initial drop, per-cascade win highlight, a pop on winning cells, then
   a gravity drop of survivors + fresh symbols. Orbs glow and reveal their value.
   The whole sequence is precomputed (deterministic); this only animates it. */

import { useCallback, useEffect, useRef } from 'react'
import type * as React from 'react'
import { drawSymbol } from './drawSymbol'
import { COLS, ORB, ROWS, SCATTER, type Cell, type Grid, type TumbleStep } from './config'

const GAP = 6 // px between cells
const PAD = 7 // inner padding inside a cell
const DROP_MS = 360 // initial drop / refill fall duration
const POP_MS = 260 // winning-cell shrink-out
const HOLD_MS = 620 // how long a winning step stays highlighted before popping
const ROW_STAGGER = 28 // ms extra fall delay per row from the top

/** Orb values aligned to a grid: orbVals[col][row] (0 where not an orb). */
export type OrbVals = number[][]

interface Tile {
  sym: Cell
  orb: number
  /** vertical pixel offset applied while falling (0 = settled). */
  fallFrom: number
  fallStart: number
  /** pop-out progress driver. */
  popStart: number
  popping: boolean
  winning: boolean
  scatter: boolean
}

type Phase = 'idle' | 'dropIn' | 'show' | 'pop' | 'done'

export interface GridHandle {
  /** Play a full precomputed tumble sequence. Callbacks fire per phase. */
  play: (
    steps: TumbleStep[],
    cb: {
      onCascade: (stepIndex: number, step: TumbleStep) => void
      onSettle: (stepIndex: number) => void
      onDone: () => void
    },
  ) => void
  /** Render a static grid (no animation) — used for the resting board. */
  setStatic: (grid: Grid, orbVals: OrbVals) => void
  /** Drop the win highlight glow (keeps the symbols, stops the pulse). */
  clearHighlight: () => void
  isBusy: () => boolean
}

function makeTiles(grid: Grid, orbVals: OrbVals): Tile[][] {
  const tiles: Tile[][] = []
  for (let c = 0; c < COLS; c++) {
    const col: Tile[] = []
    for (let r = 0; r < ROWS; r++) {
      col.push({
        sym: grid[c]![r]!,
        orb: orbVals[c]![r] ?? 0,
        fallFrom: 0,
        fallStart: 0,
        popStart: 0,
        popping: false,
        winning: false,
        scatter: grid[c]![r] === SCATTER,
      })
    }
    tiles.push(col)
  }
  return tiles
}

export function useGrid(canvasRef: React.RefObject<HTMLCanvasElement | null>): GridHandle {
  const tilesRef = useRef<Tile[][]>([])
  const phaseRef = useRef<Phase>('idle')
  const rafRef = useRef(0)
  const seqRef = useRef<{
    steps: TumbleStep[]
    idx: number
    phaseStart: number
    onCascade?: (i: number, s: TumbleStep) => void
    onSettle?: (i: number) => void
    onDone?: () => void
  } | null>(null)

  const ensureCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { ctx, cssW, cssH }
  }, [canvasRef])

  const render = useCallback(
    (now: number) => {
      const env = ensureCanvas()
      if (!env) return
      const { ctx, cssW, cssH } = env
      ctx.clearRect(0, 0, cssW, cssH)

      const cellW = (cssW - GAP * (COLS - 1)) / COLS
      const cellH = (cssH - GAP * (ROWS - 1)) / ROWS
      const symSize = Math.min(cellW, cellH) - PAD * 2
      const pulse = 0.5 + 0.5 * Math.sin(now / 120)

      const tiles = tilesRef.current
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const t = tiles[c]?.[r]
          const cx0 = c * (cellW + GAP)
          const cy0 = r * (cellH + GAP)

          // cell well
          ctx.save()
          roundRectPath(ctx, cx0, cy0, cellW, cellH, 8)
          const wellG = ctx.createLinearGradient(0, cy0, 0, cy0 + cellH)
          wellG.addColorStop(0, 'rgba(14,16,38,0.62)')
          wellG.addColorStop(1, 'rgba(7,9,22,0.62)')
          ctx.fillStyle = wellG
          ctx.fill()
          ctx.strokeStyle = 'rgba(56,189,248,0.14)'
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.restore()

          if (!t || t.sym === null) continue

          // falling offset
          let fall = 0
          if (t.fallFrom !== 0) {
            const ft = Math.min(1, Math.max(0, (now - t.fallStart) / DROP_MS))
            fall = (1 - easeOutBack(ft)) * t.fallFrom
          }
          // pop scale
          let scale = 1
          let alpha = 1
          if (t.popping) {
            const pt = Math.min(1, (now - t.popStart) / POP_MS)
            scale = 1 + 0.18 * Math.sin(pt * Math.PI) - pt * 0.5
            alpha = 1 - pt
          }

          const cx = cx0 + cellW / 2
          const cy = cy0 + cellH / 2 + fall

          // winning glow box behind the tile
          if (t.winning && !t.popping) {
            ctx.save()
            const c1 = t.scatter || t.sym === ORB ? '#f43f5e' : '#38bdf8'
            roundRectPath(ctx, cx0 + 2, cy0 + 2, cellW - 4, cellH - 4, 7)
            ctx.strokeStyle = hexA(c1, 0.45 + pulse * 0.55)
            ctx.lineWidth = 2.5
            ctx.shadowColor = c1
            ctx.shadowBlur = 12 + pulse * 16
            ctx.stroke()
            ctx.restore()
          }

          ctx.save()
          ctx.globalAlpha = alpha
          if (scale !== 1) {
            ctx.translate(cx, cy)
            ctx.scale(scale, scale)
            ctx.translate(-cx, -cy)
          }
          // orbs throb softly always
          const isOrb = t.sym === ORB
          drawSymbol(ctx, t.sym, cx, cy, isOrb ? symSize * (1 + (t.winning ? pulse * 0.05 : 0)) : symSize, false, t.orb)
          ctx.restore()
        }
      }
    },
    [ensureCanvas],
  )

  const clearFalls = (tiles: Tile[][]) => {
    for (const col of tiles) for (const t of col) t.fallFrom = 0
  }

  const beginDrop = (tiles: Tile[][], now: number, cellH: number) => {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const t = tiles[c]![r]!
        t.fallFrom = -(cellH * (r + 2))
        t.fallStart = now + r * ROW_STAGGER
      }
    }
  }

  const cellHeight = () => {
    const env = ensureCanvas()
    if (!env) return 60
    return (env.cssH - GAP * (ROWS - 1)) / ROWS
  }

  const step = useCallback(
    (now: number) => {
      const seq = seqRef.current
      render(now)

      if (!seq) {
        // sequence finished: keep a slow loop alive only while a win glow is pulsing
        const anyWinning = tilesRef.current.some((col) => col.some((t) => t.winning && !t.popping))
        if (phaseRef.current === 'done') phaseRef.current = anyWinning ? 'done' : 'idle'
        rafRef.current = anyWinning ? requestAnimationFrame(step) : 0
        return
      }

      const elapsed = now - seq.phaseStart
      const tiles = tilesRef.current

      switch (phaseRef.current) {
        case 'dropIn': {
          const settleAt = DROP_MS + (ROWS - 1) * ROW_STAGGER + 30
          if (elapsed >= settleAt) {
            clearFalls(tiles)
            const stepData = seq.steps[seq.idx]!
            // mark winning + scatter tiles
            const winCells = new Set(stepData.wins.flatMap((w) => w.cells.map(([c, r]) => c * ROWS + r)))
            const hasWin = stepData.units > 0
            for (let c = 0; c < COLS; c++) {
              for (let r = 0; r < ROWS; r++) {
                const t = tiles[c]![r]!
                t.winning = winCells.has(c * ROWS + r) || (hasWin && t.sym === ORB)
              }
            }
            seq.onCascade?.(seq.idx, stepData)
            if (hasWin) {
              phaseRef.current = 'show'
            } else {
              phaseRef.current = 'done'
              seq.onSettle?.(seq.idx)
              seqRef.current = null
              seq.onDone?.()
            }
            seq.phaseStart = now
          }
          break
        }
        case 'show': {
          if (elapsed >= HOLD_MS) {
            for (let c = 0; c < COLS; c++) {
              for (let r = 0; r < ROWS; r++) {
                const t = tiles[c]![r]!
                if (t.winning && t.sym !== ORB) {
                  t.popping = true
                  t.popStart = now
                }
              }
            }
            phaseRef.current = 'pop'
            seq.phaseStart = now
          }
          break
        }
        case 'pop': {
          if (elapsed >= POP_MS + 20) {
            // advance to next grid state
            const next = seq.steps[seq.idx + 1]
            seq.onSettle?.(seq.idx)
            if (!next) {
              phaseRef.current = 'done'
              seqRef.current = null
              seq.onDone?.()
              break
            }
            seq.idx += 1
            tilesRef.current = makeTiles(next.grid, next.orbVals)
            beginDrop(tilesRef.current, now, cellHeight())
            phaseRef.current = 'dropIn'
            seq.phaseStart = now
          }
          break
        }
        default:
          break
      }

      rafRef.current = requestAnimationFrame(step)
    },
    [render],
  )

  const play = useCallback<GridHandle['play']>(
    (steps, cb) => {
      if (steps.length === 0) return
      tilesRef.current = makeTiles(steps[0]!.grid, steps[0]!.orbVals)
      beginDrop(tilesRef.current, performance.now(), cellHeight())
      seqRef.current = {
        steps,
        idx: 0,
        phaseStart: performance.now(),
        onCascade: cb.onCascade,
        onSettle: cb.onSettle,
        onDone: cb.onDone,
      }
      phaseRef.current = 'dropIn'
      if (!rafRef.current) rafRef.current = requestAnimationFrame(step)
    },
    [step],
  )

  const setStatic = useCallback(
    (grid: Grid, orbVals: OrbVals) => {
      tilesRef.current = makeTiles(grid, orbVals)
      seqRef.current = null
      phaseRef.current = 'idle'
      // single repaint
      render(performance.now())
    },
    [render],
  )

  const clearHighlight = useCallback(() => {
    for (const col of tilesRef.current) for (const t of col) t.winning = false
    if (!seqRef.current) {
      phaseRef.current = 'idle'
      render(performance.now())
    }
  }, [render])

  const isBusy = useCallback(() => phaseRef.current !== 'idle' && phaseRef.current !== 'done', [])

  useEffect(() => {
    const draw = () => render(performance.now())
    draw()
    const ro = new ResizeObserver(draw)
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => {
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [canvasRef, render])

  return { play, setStatic, clearHighlight, isBusy }
}

function easeOutBack(t: number): number {
  const c1 = 1.4
  const c3 = c1 + 1
  const p = t - 1
  return 1 + c3 * p * p * p + c1 * p * p
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
