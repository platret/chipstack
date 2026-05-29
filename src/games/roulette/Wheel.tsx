import { useEffect, useRef } from 'react'
import { colorOf, WHEEL_ORDER } from './bets'

const ACCENT = '#fb7185'
const TAU = Math.PI * 2
const N = WHEEL_ORDER.length
const SLICE = TAU / N

const COLORS = {
  red: '#e11d48',
  black: '#16162a',
  green: '#16a34a',
} as const

type Phase = 'idle' | 'spinning'

export interface WheelHandle {
  spinTo: (result: number, onDone: () => void) => void
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

export function Wheel({
  handleRef,
}: {
  handleRef: React.MutableRefObject<WheelHandle | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    phase: 'idle' as Phase,
    wheelAngle: 0,
    ballAngle: 0,
    targetWheel: 0,
    targetBall: 0,
    startWheel: 0,
    startBall: 0,
    t0: 0,
    duration: 4200,
    onDone: null as null | (() => void),
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let mounted = true

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const size = canvas.clientWidth
      canvas.width = Math.round(size * dpr)
      canvas.height = Math.round(size * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      if (!mounted) return
      const s = stateRef.current
      const size = canvas.clientWidth
      const c = size / 2
      const R = size * 0.46

      if (s.phase === 'spinning') {
        const t = Math.min(1, (now - s.t0) / s.duration)
        const e = easeOutQuart(t)
        s.wheelAngle = s.startWheel + (s.targetWheel - s.startWheel) * e
        s.ballAngle = s.startBall + (s.targetBall - s.startBall) * e
        if (t >= 1) {
          s.phase = 'idle'
          const done = s.onDone
          s.onDone = null
          done?.()
        }
      } else {
        s.wheelAngle += 0.0016 // gentle idle drift
      }

      ctx.clearRect(0, 0, size, size)

      // outer rim
      ctx.save()
      ctx.translate(c, c)

      const rimGrad = ctx.createRadialGradient(0, 0, R * 0.7, 0, 0, R * 1.08)
      rimGrad.addColorStop(0, '#1a1a2e')
      rimGrad.addColorStop(1, '#0a0a16')
      ctx.fillStyle = rimGrad
      ctx.beginPath()
      ctx.arc(0, 0, R * 1.08, 0, TAU)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(251,113,133,0.4)'
      ctx.stroke()

      // pockets
      ctx.rotate(s.wheelAngle)
      for (let i = 0; i < N; i++) {
        const n = WHEEL_ORDER[i]!
        const a0 = i * SLICE - SLICE / 2
        const a1 = a0 + SLICE
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, R, a0, a1)
        ctx.closePath()
        ctx.fillStyle = COLORS[colorOf(n)]
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'
        ctx.stroke()

        // number label
        const mid = a0 + SLICE / 2
        ctx.save()
        ctx.rotate(mid)
        ctx.translate(R * 0.82, 0)
        ctx.rotate(Math.PI / 2)
        ctx.fillStyle = '#f4f4ff'
        ctx.font = `700 ${Math.max(8, size * 0.032)}px "JetBrains Mono", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(n), 0, 0)
        ctx.restore()
      }

      // inner hub
      const hubGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5)
      hubGrad.addColorStop(0, '#23233f')
      hubGrad.addColorStop(1, '#101022')
      ctx.beginPath()
      ctx.arc(0, 0, R * 0.5, 0, TAU)
      ctx.fillStyle = hubGrad
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = 'rgba(251,113,133,0.35)'
      ctx.stroke()

      // metallic cross spokes
      ctx.strokeStyle = 'rgba(200,200,230,0.18)'
      ctx.lineWidth = 3
      for (let k = 0; k < 4; k++) {
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos((k * Math.PI) / 2) * R * 0.48, Math.sin((k * Math.PI) / 2) * R * 0.48)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(0, 0, R * 0.1, 0, TAU)
      ctx.fillStyle = ACCENT
      ctx.fill()

      ctx.restore()

      // ball (ball track is fixed frame; angle measured from top, clockwise)
      ctx.save()
      ctx.translate(c, c)
      const ballR = s.phase === 'spinning'
        ? R * (0.93 - 0.2 * easeOutQuart(Math.min(1, (now - s.t0) / s.duration)))
        : R * 0.73
      const ba = s.ballAngle - Math.PI / 2
      const bx = Math.cos(ba) * ballR
      const by = Math.sin(ba) * ballR
      ctx.beginPath()
      ctx.arc(bx, by, Math.max(4, size * 0.022), 0, TAU)
      const bGrad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, size * 0.026)
      bGrad.addColorStop(0, '#ffffff')
      bGrad.addColorStop(1, '#b9b9d0')
      ctx.fillStyle = bGrad
      ctx.shadowColor = 'rgba(255,255,255,0.6)'
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.restore()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      mounted = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  // expose imperative spin
  useEffect(() => {
    handleRef.current = {
      spinTo: (res, onDone) => {
        const s = stateRef.current
        const idx = WHEEL_ORDER.indexOf(res)
        // We want the result pocket to end up under the ball at the top (angle 0).
        // Pocket i sits at angle (i*SLICE + wheelAngle). For it to be at the top
        // we need wheelAngle ≡ -i*SLICE (mod TAU). Add several full turns for drama.
        const wheelTurns = 6
        // Pocket i is drawn at canvas angle (i*SLICE + wheelAngle). The ball settles
        // at the top of the frame (canvas angle -PI/2), so the winning pocket must
        // satisfy i*SLICE + wheelAngle ≡ -PI/2.
        const pocketAngle = idx * SLICE
        const baseWheel = s.wheelAngle % TAU
        const desiredWheel = -Math.PI / 2 - pocketAngle
        let deltaWheel = ((desiredWheel - baseWheel) % TAU + TAU) % TAU
        deltaWheel += wheelTurns * TAU
        s.startWheel = s.wheelAngle
        s.targetWheel = s.wheelAngle + deltaWheel

        // ball spins the opposite way and lands at top (angle 0) relative to frame.
        const ballTurns = 9
        const baseBall = s.ballAngle % TAU
        let deltaBall = ((0 - baseBall) % TAU + TAU) % TAU
        deltaBall -= ballTurns * TAU // negative → counter-rotation
        s.startBall = s.ballAngle
        s.targetBall = s.ballAngle + deltaBall

        s.t0 = performance.now()
        s.duration = 4200
        s.phase = 'spinning'
        s.onDone = onDone
      },
    }
    return () => {
      handleRef.current = null
    }
  }, [handleRef])

  return (
    <div className="relative aspect-square w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* pointer / indicator at top */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: `16px solid ${ACCENT}`, filter: 'drop-shadow(0 0 6px rgba(251,113,133,0.7))' }}
      />
    </div>
  )
}
