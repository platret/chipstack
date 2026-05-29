import { useEffect, useRef } from 'react'
import { formatChips, formatTime } from '@/lib/format'
import type { TetrisEngine } from './engine'

function Stat({ label, refEl }: { label: string; refEl: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <span ref={refEl} className="tnum font-display text-lg font-bold leading-tight text-foreground">
        0
      </span>
    </div>
  )
}

export function TetrisHud({ engineRef }: { engineRef: React.RefObject<TetrisEngine | null> }) {
  const score = useRef<HTMLSpanElement>(null)
  const level = useRef<HTMLSpanElement>(null)
  const lines = useRef<HTMLSpanElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  const combo = useRef<HTMLSpanElement>(null)
  const b2b = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const e = engineRef.current
      if (e) {
        if (score.current) score.current.textContent = formatChips(e.score)
        if (level.current) level.current.textContent = String(e.level)
        if (lines.current) lines.current.textContent = String(e.lines)
        if (time.current) time.current.textContent = formatTime(e.elapsedMs)
        if (combo.current) combo.current.textContent = e.combo > 1 ? `${e.combo - 1}×` : '—'
        if (b2b.current) b2b.current.textContent = e.b2bChain > 1 ? `${e.b2bChain - 1}×` : '—'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engineRef])

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 rounded-lg border border-primary/30 bg-card/50 px-3 py-2 box-glow">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Score</p>
        <span ref={score} className="tnum font-display text-2xl font-black leading-tight text-primary text-glow">
          0
        </span>
      </div>
      <Stat label="Level" refEl={level} />
      <Stat label="Lines" refEl={lines} />
      <Stat label="Combo" refEl={combo} />
      <Stat label="Back-to-Back" refEl={b2b} />
      <div className="col-span-2 rounded-lg border border-border bg-card/50 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Time</p>
        <span ref={time} className="tnum font-display text-lg font-bold leading-tight text-foreground">
          00:00.00
        </span>
      </div>
    </div>
  )
}
