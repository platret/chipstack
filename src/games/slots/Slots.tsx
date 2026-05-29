import { AnimatePresence, motion } from 'framer-motion'
import { Coins, Crown, Info, Sparkles, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GameShell } from '@/components/GameShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { audio } from '@/lib/audio'
import { formatChips } from '@/lib/format'
import { createRng, randomSeed } from '@/lib/rng'
import { useWallet } from '@/store/wallet'
import {
  evaluate,
  LINE_COLORS,
  LINE_COUNT,
  PAYLINES,
  REELS,
  ROWS,
  SYMBOLS,
  SYMBOL_LABELS,
  spinGrid,
  type LineWin,
} from './config'
import { PayTable } from './PayTable'
import { useReels } from './useReels'

const CHIP_VALUES = [1, 5, 25, 100] as const
const BIG_WIN_MULT = 20 // total win >= 20x total bet -> jackpot sfx + banner

export default function Slots() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reels = useReels(canvasRef)
  const balance = useWallet((s) => s.balance)

  const [lineBet, setLineBet] = useState<number>(5)
  const [spinning, setSpinning] = useState(false)
  const [wins, setWins] = useState<LineWin[]>([])
  const [totalWin, setTotalWin] = useState(0)
  const [showLineIdx, setShowLineIdx] = useState<number | null>(null) // which payline number to outline
  const [bigWin, setBigWin] = useState(false)
  const [lastSpinBet, setLastSpinBet] = useState(0)

  const seedRef = useRef(randomSeed())
  const cycleRef = useRef<number>(0)

  const totalBet = lineBet * LINE_COUNT
  const canSpin = !spinning && totalBet <= balance && totalBet > 0

  const clearCycle = () => {
    if (cycleRef.current) window.clearTimeout(cycleRef.current)
    cycleRef.current = 0
  }

  // cycle through winning lines one-by-one, then show all together, repeat
  const startWinCycle = useCallback(
    (lineWins: LineWin[]) => {
      clearCycle()
      if (lineWins.length === 0) return
      let i = 0
      const tick = () => {
        if (i < lineWins.length) {
          const w = lineWins[i]!
          reels.setHighlight(w.cells)
          setShowLineIdx(w.lineIndex)
          i++
          cycleRef.current = window.setTimeout(tick, 900)
        } else {
          // show all cells together a moment, then loop
          reels.setHighlight(lineWins.flatMap((x) => x.cells))
          setShowLineIdx(null)
          i = 0
          cycleRef.current = window.setTimeout(tick, 1400)
        }
      }
      tick()
    },
    [reels],
  )

  const onAllStopped = useCallback(
    (grid: ReturnType<typeof spinGrid>, betForSpin: number) => {
      const lineWins = evaluate(grid)
      const won = lineWins.reduce((s, w) => s + w.amount, 0) * lineBetFromTotal(betForSpin)
      setSpinning(false)
      setWins(lineWins)
      setTotalWin(won)

      if (won > 0) {
        useWallet.getState().payout(won)
        const big = won >= BIG_WIN_MULT * betForSpin
        setBigWin(big)
        audio.play(big ? 'jackpot' : 'chipWin')
        const top = [...lineWins].sort((a, b) => b.amount - a.amount)[0]!
        toast({
          title: `${big ? 'BIG WIN' : 'Win'} +${formatChips(won)}`,
          description: `${lineWins.length} line${lineWins.length > 1 ? 's' : ''} · ${top.count}x ${SYMBOL_LABELS[top.symbol]}`,
          variant: big ? 'gold' : 'win',
        })
        startWinCycle(lineWins)
      } else {
        setBigWin(false)
        audio.play('lose')
        reels.setHighlight(null)
      }
    },
    [reels, startWinCycle],
  )

  const handleSpin = useCallback(() => {
    audio.unlock()
    audio.play('click')
    if (spinning) return
    if (totalBet > balance || totalBet <= 0) {
      toast({ title: 'Not enough chips', description: 'Lower the line bet or add chips.', variant: 'accent' })
      return
    }
    if (!useWallet.getState().bet(totalBet)) return

    clearCycle()
    reels.setHighlight(null)
    setWins([])
    setTotalWin(0)
    setBigWin(false)
    setShowLineIdx(null)
    setSpinning(true)
    setLastSpinBet(totalBet)

    seedRef.current = (seedRef.current * 1664525 + 1013904223) >>> 0
    const rng = createRng(seedRef.current ^ randomSeed())
    const grid = spinGrid(rng)

    audio.play('spin')
    audio.play('chipBet')

    reels.spin(
      () => rng.weighted(SYMBOLS, [3, 4, 5, 7, 9, 11, 13, 16]),
      grid,
      () => audio.play('reelStop'),
      () => onAllStopped(grid, totalBet),
    )
  }, [spinning, totalBet, balance, reels, onAllStopped])

  // keyboard: space / enter to spin
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        if (!spinning && totalBet <= balance) handleSpin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSpin, spinning, totalBet, balance])

  useEffect(() => () => clearCycle(), [])

  return (
    <GameShell
      id="slots"
      aside={
        <div className="flex items-center gap-2">
          <Badge variant="gold" className="gap-1.5">
            <Coins className="size-3.5" />
            <span className="tnum">{formatChips(balance)}</span>
          </Badge>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-start">
        {/* Reels + spin controls */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="relative">
            <div
              className="scanlines relative aspect-[5/3] w-full overflow-hidden rounded-2xl border border-gold/30 bg-black/50 p-2 sm:p-3"
              style={{ boxShadow: '0 0 0 1px rgba(251,191,36,0.25), 0 0 36px rgba(251,191,36,0.16)' }}
            >
              <canvas ref={canvasRef} className="block size-full" />

              {/* win banner */}
              <AnimatePresence>
                {totalWin > 0 && !spinning && (
                  <motion.div
                    key="winbanner"
                    initial={{ opacity: 0, y: -14, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                    className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center"
                  >
                    <div
                      className={`flex items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-md ${
                        bigWin ? 'border-gold/70 bg-black/60' : 'border-win/60 bg-black/55'
                      }`}
                    >
                      {bigWin ? (
                        <Crown className="size-4 text-gold" />
                      ) : (
                        <Sparkles className="size-4 text-win" />
                      )}
                      <span
                        className={`font-display text-base font-black tracking-wide tnum ${
                          bigWin ? 'text-gold text-glow' : 'text-win'
                        }`}
                      >
                        {bigWin ? 'BIG WIN ' : 'WIN '}+{formatChips(totalWin)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* active payline label */}
              <AnimatePresence>
                {showLineIdx !== null && (
                  <motion.div
                    key={`line-${showLineIdx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute bottom-2 left-2 z-20"
                  >
                    <span
                      className="rounded-md border px-2 py-0.5 text-[10px] font-semibold tnum backdrop-blur-md"
                      style={{
                        color: LINE_COLORS[showLineIdx % LINE_COLORS.length],
                        borderColor: `${LINE_COLORS[showLineIdx % LINE_COLORS.length]}88`,
                        background: 'rgba(0,0,0,0.5)',
                      }}
                    >
                      LINE {showLineIdx + 1}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* bet bar */}
          <div className="panel rounded-xl p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Line bet</span>
                <div className="flex gap-1.5">
                  {CHIP_VALUES.map((v) => {
                    const disabled = spinning || v * LINE_COUNT > balance
                    return (
                      <Button
                        key={v}
                        size="sm"
                        variant={v === lineBet ? 'gold' : 'secondary'}
                        disabled={disabled}
                        onClick={() => {
                          audio.unlock()
                          audio.play('click')
                          setLineBet(v)
                        }}
                        className="tnum min-w-9 px-2"
                      >
                        {v}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total bet</p>
                  <p className="tnum font-display text-lg font-bold text-gold">{formatChips(totalBet)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {LINE_COUNT} lines x <span className="tnum">{lineBet}</span>
                  </p>
                </div>
                <Button
                  size="lg"
                  variant="gold"
                  disabled={!canSpin}
                  onClick={handleSpin}
                  className="h-14 min-w-[8rem] gap-2 text-base font-black uppercase tracking-wide"
                >
                  <Zap className={`size-5 ${spinning ? 'animate-spin' : ''}`} />
                  {spinning ? 'Spinning' : 'Spin'}
                </Button>
              </div>
            </div>

            {totalBet > balance && (
              <p className="mt-2 text-center text-xs text-loss">
                Total bet exceeds balance — lower the line bet or add chips.
              </p>
            )}
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Press <span className="font-semibold text-foreground">Space</span> to spin · last result{' '}
              {wins.length > 0 ? (
                <span className="text-win tnum">+{formatChips(totalWin)}</span>
              ) : lastSpinBet > 0 ? (
                <span className="text-muted-foreground">no win</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
        </div>

        {/* Info panel */}
        <div className="w-full shrink-0 lg:w-72">
          <Tabs defaultValue="paytable">
            <TabsList className="w-full">
              <TabsTrigger value="paytable" className="flex-1 gap-1.5">
                <Coins className="size-3.5" /> Paytable
              </TabsTrigger>
              <TabsTrigger value="lines" className="flex-1 gap-1.5">
                <Info className="size-3.5" /> Lines
              </TabsTrigger>
            </TabsList>
            <TabsContent value="paytable">
              <div className="panel rounded-xl p-3">
                <PayTable lineBet={lineBet} />
              </div>
            </TabsContent>
            <TabsContent value="lines">
              <div className="panel rounded-xl p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {LINE_COUNT} paylines
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {PAYLINES.map((line, i) => (
                    <LineDiagram key={i} line={line} index={i} active={wins.some((w) => w.lineIndex === i)} />
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                  All {LINE_COUNT} lines are always active. Winning lines from the last spin glow.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </GameShell>
  )
}

function lineBetFromTotal(total: number): number {
  return total / LINE_COUNT
}

function LineDiagram({
  line,
  index,
  active,
}: {
  line: readonly [number, number, number, number, number]
  index: number
  active: boolean
}) {
  const color = LINE_COLORS[index % LINE_COLORS.length]!
  const cw = 44
  const ch = 28
  const cellW = cw / REELS
  const cellH = ch / ROWS
  const pts = line.map((row, r) => `${r * cellW + cellW / 2},${row * cellH + cellH / 2}`).join(' ')
  return (
    <div
      className="rounded-md border p-1"
      style={{
        borderColor: active ? color : 'var(--border)',
        background: active ? `${color}1a` : 'rgba(28,28,51,0.3)',
      }}
    >
      <svg viewBox={`0 0 ${cw} ${ch}`} className="w-full" aria-hidden>
        {Array.from({ length: REELS * ROWS }).map((_, k) => {
          const r = k % REELS
          const row = Math.floor(k / REELS)
          return (
            <rect
              key={k}
              x={r * cellW + 1}
              y={row * cellH + 1}
              width={cellW - 2}
              height={cellH - 2}
              rx={1.5}
              fill="rgba(255,255,255,0.04)"
            />
          )
        })}
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={active ? 1 : 0.85}
        />
      </svg>
      <p className="mt-0.5 text-center text-[9px] tnum" style={{ color: active ? color : 'var(--muted-foreground)' }}>
        {index + 1}
      </p>
    </div>
  )
}
