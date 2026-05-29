import { PAYTABLE, SYMBOLS, SYMBOL_LABELS, type SymbolId } from './config'
import { SymbolGlyph } from './symbols'

export function PayTable({ lineBet }: { lineBet: number }) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_repeat(3,2.6rem)] items-center gap-x-2 px-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Symbol</span>
        <span className="text-right">3x</span>
        <span className="text-right">4x</span>
        <span className="text-right">5x</span>
      </div>
      {SYMBOLS.map((id: SymbolId) => {
        const [p3, p4, p5] = PAYTABLE[id]
        return (
          <div
            key={id}
            className="grid grid-cols-[1fr_repeat(3,2.6rem)] items-center gap-x-2 rounded-md border border-border/60 bg-secondary/30 px-2 py-1"
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
      <p className="px-1 pt-1 text-[10px] leading-relaxed text-muted-foreground">
        Wild substitutes for any symbol. Wins pay left to right from reel 1. Values shown are total
        chips at the current line bet.
      </p>
    </div>
  )
}

function Pay({ value }: { value: number }) {
  return <span className="tnum text-right text-xs font-semibold text-gold">{value}</span>
}
