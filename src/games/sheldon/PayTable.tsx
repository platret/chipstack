import {
  FREE_SPINS,
  LINE_COUNT,
  PAY_SYMBOLS,
  PAYTABLE,
  SCATTER,
  SCATTER_PAY,
  SYMBOL_LABELS,
  type SymbolId,
} from './config'
import { SymbolGlyph } from './symbols'

export function PayTable({ lineBet }: { lineBet: number }) {
  const totalBet = lineBet * LINE_COUNT
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_repeat(3,2.5rem)] items-center gap-x-2 px-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Symbol</span>
        <span className="text-right">3x</span>
        <span className="text-right">4x</span>
        <span className="text-right">5x</span>
      </div>
      {PAY_SYMBOLS.map((id: SymbolId) => {
        const [p3, p4, p5] = PAYTABLE[id]
        return (
          <div
            key={id}
            className="grid grid-cols-[1fr_repeat(3,2.5rem)] items-center gap-x-2 rounded-md border border-border/60 bg-secondary/30 px-2 py-1"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <SymbolGlyph id={id} size={26} />
              <span className="truncate text-xs font-medium">{SYMBOL_LABELS[id]}</span>
            </div>
            <Pay value={p3 * lineBet} />
            <Pay value={p4 * lineBet} />
            <Pay value={p5 * lineBet} />
          </div>
        )
      })}

      <div className="mt-2 grid grid-cols-[1fr_repeat(3,2.5rem)] items-center gap-x-2 rounded-md border border-accent/50 bg-accent/10 px-2 py-1">
        <div className="flex items-center gap-2 overflow-hidden">
          <SymbolGlyph id={SCATTER} size={26} />
          <span className="truncate text-xs font-medium text-accent">{SYMBOL_LABELS[SCATTER]}</span>
        </div>
        <Pay value={SCATTER_PAY[0] * totalBet} accent />
        <Pay value={SCATTER_PAY[1] * totalBet} accent />
        <Pay value={SCATTER_PAY[2] * totalBet} accent />
      </div>

      <p className="px-1 pt-1 text-[10px] leading-relaxed text-muted-foreground">
        <span className="font-semibold" style={{ color: 'var(--accent)' }}>
          Bazinga!
        </span>{' '}
        is wild and substitutes for any paying symbol. Scatters pay anywhere x total bet; 3+ award{' '}
        <span className="font-semibold text-foreground">{FREE_SPINS} free spins</span> with a Bazinga
        wild boost. Wins pay left to right from reel 1.
      </p>
    </div>
  )
}

function Pay({ value, accent }: { value: number; accent?: boolean }) {
  return (
    <span className={`tnum text-right text-xs font-semibold ${accent ? 'text-accent' : 'text-gold'}`}>{value}</span>
  )
}
