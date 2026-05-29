/* Canvas reel engine for Bazinga Reels. Renders 5 spinning strips on one canvas with
   staggered stops, a short overshoot/settle bounce, and a pulsing highlight of winning
   cells (orange for line wins, rose for scatters). */

import { useCallback, useEffect, useRef } from 'react'
import type * as React from 'react'
import { drawSymbol } from './drawSymbol'
import { REELS, ROWS, SYMBOLS, type Grid, type SymbolId } from './config'

const GAP = 10 // px between reels
const PAD = 10 // inner padding inside a reel column
const SPIN_SPEED = 0.034 // strip rows per ms while spinning
const STAGGER = 160 // ms between reel stops
const SPIN_LEAD = 620 // ms reel 0 spins before it begins settling
const SETTLE = 360 // ms settle (overshoot -> snap)

const ACCENT = '#fb923c'
const SCATTER_HL = '#f43f5e'

interface ReelState {
  strip: SymbolId[]
  offset: number
  state: 'idle' | 'spinning' | 'settling' | 'stopped'
  stopAt: number
  settleStart: number
  settleFrom: number
  result: SymbolId[] // [top, mid, bot]
}

export interface Highlight {
  cells: [number, number][]
  scatter?: [number, number][]
}

export interface ReelsHandle {
  spin: (
    seedRng: () => SymbolId,
    finalGrid: Grid,
    onReelStop: (reel: number) => void,
    onAllStopped: () => void,
  ) => void
  setHighlight: (hl: Highlight | null) => void
  isSpinning: () => boolean
}

function makeStrip(rand: () => SymbolId, len = 28): SymbolId[] {
  return Array.from({ length: len }, rand)
}

export function useReels(canvasRef: React.RefObject<HTMLCanvasElement | null>): ReelsHandle {
  const reelsRef = useRef<ReelState[]>([])
  const highlightRef = useRef<Highlight | null>(null)
  const rafRef = useRef(0)
  const cbRef = useRef<{ onReelStop?: (r: number) => void; onAll?: () => void; stoppedFlags: boolean[] }>({
    stoppedFlags: [],
  })

  if (reelsRef.current.length === 0) {
    reelsRef.current = Array.from({ length: REELS }, (_, i) => {
      const init: SymbolId[] = [
        SYMBOLS[(i * 3 + 4) % SYMBOLS.length]!,
        SYMBOLS[(i * 3 + 2) % SYMBOLS.length]!,
        SYMBOLS[(i * 3 + 6) % SYMBOLS.length]!,
      ]
      return {
        strip: [...makeStrip(() => SYMBOLS[(Math.floor(Math.sin(i) * 1000) >>> 0) % SYMBOLS.length]!, 25), ...init],
        offset: 0,
        state: 'idle',
        stopAt: 0,
        settleStart: 0,
        settleFrom: 0,
        result: init,
      } satisfies ReelState
    })
  }

  const render = useCallback(
    (now: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cssW = canvas.clientWidth
      const cssH = canvas.clientHeight
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr)
        canvas.height = Math.round(cssH * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)

      const reelW = (cssW - GAP * (REELS - 1)) / REELS
      const cellH = cssH / ROWS
      const symSize = Math.min(reelW, cellH) - PAD * 2

      const hl = highlightRef.current
      const pulse = hl ? 0.5 + 0.5 * Math.sin(now / 130) : 0
      const isLit = (r: number, row: number) =>
        !!hl && (hl.cells.some(([a, b]) => a === r && b === row) || !!hl.scatter?.some(([a, b]) => a === r && b === row))

      for (let r = 0; r < REELS; r++) {
        const reel = reelsRef.current[r]!
        const rx = r * (reelW + GAP)

        ctx.save()
        ctx.beginPath()
        roundRectPath(ctx, rx, 0, reelW, cssH, 8)
        ctx.clip()

        const g = ctx.createLinearGradient(0, 0, 0, cssH)
        g.addColorStop(0, 'rgba(36,24,14,0.6)')
        g.addColorStop(0.5, 'rgba(12,9,18,0.4)')
        g.addColorStop(1, 'rgba(36,24,14,0.6)')
        ctx.fillStyle = g
        ctx.fillRect(rx, 0, reelW, cssH)

        const spinning = reel.state === 'spinning' || reel.state === 'settling'
        const off = reel.offset % reel.strip.length

        for (let vis = -1; vis <= ROWS; vis++) {
          const idxF = off + vis
          const stripIdx = ((Math.floor(idxF) % reel.strip.length) + reel.strip.length) % reel.strip.length
          const sym = reel.strip[stripIdx]!
          const frac = idxF - Math.floor(idxF)
          const cy = (vis - frac + 0.5) * cellH
          if (cy < -cellH || cy > cssH + cellH) continue
          const cx = rx + reelW / 2

          const visRow = Math.round(cy / cellH - 0.5)
          let dim = false
          if (!spinning && hl && visRow >= 0 && visRow < ROWS) dim = !isLit(r, visRow)
          drawSymbol(ctx, sym, cx, cy, symSize, dim)
        }

        // winning-cell glow boxes
        if (!spinning && hl) {
          const drawBox = (hrow: number, c: string) => {
            const cy = (hrow + 0.5) * cellH
            ctx.save()
            ctx.strokeStyle = hexA(c, 0.4 + pulse * 0.6)
            ctx.lineWidth = 2.5
            ctx.shadowColor = c
            ctx.shadowBlur = 10 + pulse * 14
            roundRectPath(ctx, rx + 3, cy - cellH / 2 + 3, reelW - 6, cellH - 6, 7)
            ctx.stroke()
            ctx.restore()
          }
          for (const [hr, hrow] of hl.cells) if (hr === r) drawBox(hrow, ACCENT)
          if (hl.scatter) for (const [hr, hrow] of hl.scatter) if (hr === r) drawBox(hrow, SCATTER_HL)
        }
        ctx.restore()

        if (spinning) {
          ctx.save()
          ctx.globalAlpha = reel.state === 'settling' ? 0.12 : 0.22
          const mb = ctx.createLinearGradient(0, 0, 0, cssH)
          mb.addColorStop(0, 'rgba(7,7,15,0.9)')
          mb.addColorStop(0.5, 'rgba(7,7,15,0)')
          mb.addColorStop(1, 'rgba(7,7,15,0.9)')
          ctx.fillStyle = mb
          ctx.fillRect(rx, 0, reelW, cssH)
          ctx.restore()
        }

        ctx.save()
        ctx.strokeStyle = 'rgba(251,146,60,0.3)'
        ctx.lineWidth = 1.5
        roundRectPath(ctx, rx + 0.5, 0.5, reelW - 1, cssH - 1, 8)
        ctx.stroke()
        ctx.restore()
      }

      ctx.save()
      ctx.strokeStyle = 'rgba(251,146,60,0.1)'
      ctx.lineWidth = 1
      for (let row = 1; row < ROWS; row++) {
        ctx.beginPath()
        ctx.moveTo(0, row * cellH)
        ctx.lineTo(cssW, row * cellH)
        ctx.stroke()
      }
      ctx.restore()
    },
    [canvasRef],
  )

  const step = useCallback(
    (now: number) => {
      const reels = reelsRef.current
      let anySpinning = false

      for (let r = 0; r < REELS; r++) {
        const reel = reels[r]!
        if (reel.state === 'spinning') {
          anySpinning = true
          reel.offset += SPIN_SPEED * 16
          if (now >= reel.stopAt) {
            const top = ((Math.floor(reel.offset) % reel.strip.length) + reel.strip.length) % reel.strip.length
            for (let row = 0; row < ROWS; row++) {
              reel.strip[(top + row) % reel.strip.length] = reel.result[row]!
            }
            reel.settleFrom = reel.offset
            reel.settleStart = now
            reel.state = 'settling'
          }
        } else if (reel.state === 'settling') {
          anySpinning = true
          const t = Math.min(1, (now - reel.settleStart) / SETTLE)
          const target = Math.round(reel.settleFrom)
          const e = overshoot(t)
          reel.offset = reel.settleFrom + (target - reel.settleFrom) * e
          if (t >= 1) {
            reel.offset = target
            reel.state = 'stopped'
            if (!cbRef.current.stoppedFlags[r]) {
              cbRef.current.stoppedFlags[r] = true
              cbRef.current.onReelStop?.(r)
            }
          }
        }
      }

      render(now)

      if (anySpinning) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        const allStopped = reels.every((x) => x.state === 'stopped' || x.state === 'idle')
        if (allStopped && cbRef.current.onAll) {
          const cb = cbRef.current.onAll
          cbRef.current.onAll = undefined
          cb()
        }
        if (highlightRef.current) rafRef.current = requestAnimationFrame(step)
        else rafRef.current = 0
      }
    },
    [render],
  )

  const spin = useCallback<ReelsHandle['spin']>(
    (seedRng, finalGrid, onReelStop, onAllStopped) => {
      const now = performance.now()
      const reels = reelsRef.current
      highlightRef.current = null
      cbRef.current = { onReelStop, onAll: onAllStopped, stoppedFlags: new Array(REELS).fill(false) }

      for (let r = 0; r < REELS; r++) {
        const reel = reels[r]!
        reel.strip = makeStrip(seedRng, 28)
        reel.result = [finalGrid[r]![0]!, finalGrid[r]![1]!, finalGrid[r]![2]!]
        reel.state = 'spinning'
        reel.stopAt = now + SPIN_LEAD + r * STAGGER
      }
      if (!rafRef.current) rafRef.current = requestAnimationFrame(step)
    },
    [step],
  )

  const setHighlight = useCallback(
    (hl: Highlight | null) => {
      highlightRef.current = hl && (hl.cells.length || hl.scatter?.length) ? hl : null
      if (highlightRef.current && !rafRef.current) rafRef.current = requestAnimationFrame(step)
    },
    [step],
  )

  const isSpinning = useCallback(
    () => reelsRef.current.some((r) => r.state === 'spinning' || r.state === 'settling'),
    [],
  )

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

  return { spin, setHighlight, isSpinning }
}

/** ease-out with a small overshoot at the end (reel bounce). */
function overshoot(t: number): number {
  const c = 1.9
  const p = t - 1
  return 1 + (c + 1) * p * p * p + c * p * p
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
