import {
  FREE_SPINS,
  ORB,
  PAY_SCALE,
  PAY_SYMBOLS,
  PAYTABLE,
  SCATTER,
  SCATTERS_TO_TRIGGER,
  SYMBOL_LABELS,
  type SymbolId,
} from './config'
import { SymbolGlyph } from './symbols'

/** Round display values cleanly; keep one decimal only when needed. */
function fmt(v: number): string {
  const x = Math.round(v * 100) / 100
  return Number.isInteger(x) ? String(x) : x.toFixed(x < 1 ? 2 : 1)
}

export function PayTable({ bet }: { bet: number }) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_repeat(3,2.7rem)] items-center gap-x-2 px-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Symbol</span>
        <span className="text-right">8-9</span>
        <span className="text-right">10-11</span>
        <span className="text-right">12+</span>
      </div>
      {PAY_SYMBOLS.map((id: SymbolId) => {
        const [t0, t1, t2] = PAYTABLE[id]
        return (
          <div
            key={id}
            className="grid grid-cols-[1fr_repeat(3,2.7rem)] items-center gap-x-2 rounded-md border border-border/60 bg-secondary/30 px-2 py-1"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <SymbolGlyph id={id} size={26} />
              <span className="truncate text-xs font-medium">{SYMBOL_LABELS[id]}</span>
            </div>
            <Pay value={t0 * PAY_SCALE * bet} />
            <Pay value={t1 * PAY_SCALE * bet} />
            <Pay value={t2 * PAY_SCALE * bet} />
          </div>
        )
      })}

      <div className="mt-2 flex items-start gap-2 rounded-md border border-accent/50 bg-accent/10 px-2 py-1.5">
        <SymbolGlyph id={ORB} size={28} />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-accent">{SYMBOL_LABELS[ORB]}</span> — lands carrying a
          random multiplier (2x up to 500x). On any winning spin, every orb that landed is summed and
          multiplies your whole win.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border px-2 py-1.5" style={{ borderColor: '#38bdf880', background: '#38bdf81a' }}>
        <SymbolGlyph id={SCATTER} size={28} />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          <span className="font-semibold" style={{ color: '#38bdf8' }}>
            {SYMBOL_LABELS[SCATTER]}
          </span>{' '}
          — land {SCATTERS_TO_TRIGGER}+ anywhere for{' '}
          <span className="font-semibold text-foreground">{FREE_SPINS} free spins</span> where orb
          values build a persistent total multiplier.
        </p>
      </div>

      <p className="px-1 pt-1 text-[10px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Pay anywhere:</span> a symbol pays when 8 or more
        land anywhere on the grid. Wins tumble — they vanish, new symbols drop in, and pay again. Values
        shown are total chips at the current bet.
      </p>
    </div>
  )
}

function Pay({ value }: { value: number }) {
  return <span className="tnum text-right text-xs font-semibold text-gold">{fmt(value)}</span>
}
