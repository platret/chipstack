import { AnimatePresence, motion } from 'framer-motion'
import { Atom, Coins, Crown, Gift, Info, Sparkles, Star, Zap } from 'lucide-react'
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
  FREE_SPINS,
  LINE_COLORS,
  LINE_COUNT,
  PAYLINES,
  REELS,
  ROWS,
  SCATTER,
  SYMBOLS,
  SYMBOL_LABELS,
  spinGrid,
  type LineWin,
  type SpinResult,
} from './config'
import { MemeBanner, pickMeme, type Meme } from './MemeBanner'
import { PayTable } from './PayTable'
import { useReels } from './useReels'

const CHIP_VALUES = [1, 5, 25, 100] as const
const BIG_WIN_MULT = 20 // total win >= 20x total bet -> jackpot sting + crown

interface FreeState {
  active: boolean
  remaining: number
  total: number
  won: number // accumulated free-spin winnings (gross)
}

const NO_FREE: FreeState = { active: false, remaining: 0, total: 0, won: 0 }

export default function Sheldon() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reels = useReels(canvasRef)
  const balance = useWallet((s) => s.balance)

  const [lineBet, setLineBet] = useState<number>(5)
  const [spinning, setSpinning] = useState(false)
  const [wins, setWins] = useState<LineWin[]>([])
  const [totalWin, setTotalWin] = useState(0)
  const [showLineIdx, setShowLineIdx] = useState<number | null>(null)
  const [bigWin, setBigWin] = useState(false)
  const [lastSpinBet, setLastSpinBet] = useState(0)
  const [meme, setMeme] = useState<Meme | null>(null)
  const [free, setFree] = useState<FreeState>(NO_FREE)

  const seedRef = useRef(randomSeed())
  const cycleRef = useRef<number>(0)
  const memeTimer = useRef<number>(0)
  const freeTimer = useRef<number>(0)
  const freeRef = useRef<FreeState>(NO_FREE)
  freeRef.current = free

  const totalBet = lineBet * LINE_COUNT
  const canSpin = !spinning && totalBet <= balance && totalBet > 0 && !free.active

  const clearCycle = () => {
    if (cycleRef.current) window.clearTimeout(cycleRef.current)
    cycleRef.current = 0
  }

  const startWinCycle = useCallback(
    (lineWins: LineWin[], scatterCells: [number, number][]) => {
      clearCycle()
      if (lineWins.length === 0) {
        reels.setHighlight(scatterCells.length ? { cells: [], scatter: scatterCells } : null)
        return
      }
      let i = 0
      const tick = () => {
        if (i < lineWins.length) {
          const w = lineWins[i]!
          reels.setHighlight({ cells: w.cells, scatter: scatterCells })
          setShowLineIdx(w.lineIndex)
          i++
          cycleRef.current = window.setTimeout(tick, 900)
        } else {
          reels.setHighlight({ cells: lineWins.flatMap((x) => x.cells), scatter: scatterCells })
          setShowLineIdx(null)
          i = 0
          cycleRef.current = window.setTimeout(tick, 1400)
        }
      }
      tick()
    },
    [reels],
  )

  const flashMeme = useCallback((m: Meme, durationMs: number) => {
    if (memeTimer.current) window.clearTimeout(memeTimer.current)
    setMeme(m)
    memeTimer.current = window.setTimeout(() => setMeme(null), durationMs)
  }, [])

  const onAllStopped = useCallback(
    (result: SpinResult, lineBetForSpin: number, isFree: boolean, spinSeed: number) => {
      const totalBetForSpin = lineBetForSpin * LINE_COUNT
      const lineWin = result.lineUnits * lineBetForSpin
      const scatterWin = result.scatter ? result.scatter.amount * totalBetForSpin : 0
      const won = lineWin + scatterWin
      const scatterCells = result.scatter?.cells ?? []

      setSpinning(false)
      setWins(result.lineWins)
      setTotalWin(won)

      if (won > 0) {
        useWallet.getState().payout(won)
        const big = won >= BIG_WIN_MULT * totalBetForSpin
        setBigWin(big)
        audio.play(big ? 'jackpot' : 'chipWin')

        const top = [...result.lineWins].sort((a, b) => b.amount - a.amount)[0]
        const winXBet = won / totalBetForSpin
        const m = pickMeme(winXBet, top?.symbol ?? null, !!result.scatter, spinSeed)
        flashMeme(m, m.tier === 'huge' ? 2600 : 1800)

        const label = top ? `${top.count}x ${SYMBOL_LABELS[top.symbol]}` : `${result.scatter?.count}x Scatter`
        toast({
          title: `${big ? 'BIG WIN' : 'Win'} +${formatChips(won)}`,
          description: `${isFree ? 'Free spin · ' : ''}${result.lineWins.length} line${result.lineWins.length === 1 ? '' : 's'} · ${label}`,
          variant: big ? 'gold' : 'win',
        })
        startWinCycle(result.lineWins, scatterCells)
      } else {
        setBigWin(false)
        audio.play('lose')
        reels.setHighlight(scatterCells.length ? { cells: [], scatter: scatterCells } : null)
      }

      // accumulate free-spin winnings
      if (isFree) setFree((f) => ({ ...f, won: f.won + won }))

      // scatter -> trigger / retrigger free spins
      if (result.scatter) {
        audio.play('jackpot')
        flashMeme(pickMeme(99, null, true, spinSeed ^ 0x55), 2400)
        setFree((f) => {
          const adding = FREE_SPINS
          if (isFree && f.active) {
            return { ...f, remaining: f.remaining + adding, total: f.total + adding }
          }
          return { active: true, remaining: adding, total: adding, won: f.won }
        })
        toast({
          title: isFree ? `+${FREE_SPINS} Free Spins!` : `${FREE_SPINS} Free Spins!`,
          description: `${result.scatter.count} scatters · Bazinga wild boost`,
          variant: 'accent',
        })
      }
    },
    [flashMeme, reels, startWinCycle],
  )

  const doSpin = useCallback(
    (isFree: boolean) => {
      reels.setHighlight(null)
      setWins([])
      setTotalWin(0)
      setBigWin(false)
      setShowLineIdx(null)
      setSpinning(true)

      seedRef.current = (seedRef.current * 1664525 + 1013904223) >>> 0
      const spinSeed = seedRef.current ^ randomSeed()
      const rng = createRng(spinSeed)
      const grid = spinGrid(rng, isFree)
      const result = evaluate(grid)

      audio.play('spin')
      if (!isFree) audio.play('chipBet')

      reels.spin(
        () => rng.weighted(SYMBOLS, [3, 4, 6, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 20]),
        grid,
        () => audio.play('reelStop'),
        () => onAllStopped(result, lineBet, isFree, spinSeed),
      )
    },
    [reels, lineBet, onAllStopped],
  )

  // free-spin auto-runner: when in free mode and idle, advance the next spin
  useEffect(() => {
    if (!free.active || spinning) return
    if (free.remaining <= 0) {
      // session over -> summary
      if (freeTimer.current) window.clearTimeout(freeTimer.current)
      freeTimer.current = window.setTimeout(() => {
        const won = freeRef.current.won
        audio.play(won > 0 ? 'chipWin' : 'lose')
        toast({
          title: 'Free spins complete',
          description: won > 0 ? `Bazinga round paid +${formatChips(won)}` : 'No luck this round.',
          variant: won > 0 ? 'gold' : 'default',
        })
        setFree(NO_FREE)
      }, 1100)
      return
    }
    if (freeTimer.current) window.clearTimeout(freeTimer.current)
    freeTimer.current = window.setTimeout(() => {
      setFree((f) => ({ ...f, remaining: f.remaining - 1 }))
      doSpin(true)
    }, 1300)
    return () => {
      if (freeTimer.current) window.clearTimeout(freeTimer.current)
    }
  }, [free.active, free.remaining, spinning, doSpin])

  const handleSpin = useCallback(() => {
    audio.unlock()
    audio.play('click')
    if (spinning || free.active) return
    if (totalBet > balance || totalBet <= 0) {
      toast({ title: 'Not enough chips', description: 'Lower the line bet or add chips.', variant: 'accent' })
      return
    }
    if (!useWallet.getState().bet(totalBet)) return
    clearCycle()
    setLastSpinBet(totalBet)
    doSpin(false)
  }, [spinning, free.active, totalBet, balance, doSpin])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        if (canSpin) handleSpin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSpin, canSpin])

  useEffect(
    () => () => {
      clearCycle()
      if (memeTimer.current) window.clearTimeout(memeTimer.current)
      if (freeTimer.current) window.clearTimeout(freeTimer.current)
    },
    [],
  )

  return (
    <GameShell
      id="sheldon"
      aside={
        <div className="flex items-center gap-2">
          {free.active && (
            <Badge variant="accent" className="gap-1.5">
              <Gift className="size-3.5" />
              <span className="tnum">
                {free.remaining}/{free.total} FS
              </span>
            </Badge>
          )}
          <Badge variant="gold" className="gap-1.5">
            <Coins className="size-3.5" />
            <span className="tnum">{formatChips(balance)}</span>
          </Badge>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="relative">
            <div
              className={`scanlines relative aspect-[5/3] w-full overflow-hidden rounded-2xl border bg-black/50 p-2 transition-colors sm:p-3 ${
                free.active ? 'border-accent/60' : 'border-[#fb923c]/30'
              }`}
              style={{
                boxShadow: free.active
                  ? '0 0 0 1px rgba(244,63,94,0.3), 0 0 40px rgba(244,63,94,0.2)'
                  : '0 0 0 1px rgba(251,146,60,0.28), 0 0 36px rgba(251,146,60,0.16)',
              }}
            >
              <canvas ref={canvasRef} className="block size-full" />

              {/* meme callout */}
              <MemeBanner meme={meme} />

              {/* free-spins banner */}
              <AnimatePresence>
                {free.active && (
                  <motion.div
                    key="fsbanner"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center"
                  >
                    <div className="flex items-center gap-2 rounded-full border border-accent/70 bg-black/65 px-4 py-1.5 backdrop-blur-md">
                      <Gift className="size-4 text-accent" />
                      <span className="font-display text-sm font-black uppercase tracking-wide text-accent text-glow-accent">
                        Bazinga Free Spins · <span className="tnum">{free.remaining}</span> left
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* win banner */}
              <AnimatePresence>
                {totalWin > 0 && !spinning && !free.active && (
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
                      {bigWin ? <Crown className="size-4 text-gold" /> : <Sparkles className="size-4 text-win" />}
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
                    const disabled = spinning || free.active || v * LINE_COUNT > balance
                    const selected = v === lineBet
                    return (
                      <Button
                        key={v}
                        size="sm"
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => {
                          audio.unlock()
                          audio.play('click')
                          setLineBet(v)
                        }}
                        className="tnum min-w-9 px-2"
                        style={
                          selected
                            ? { background: '#fb923c', color: '#1a0e02', boxShadow: '0 0 16px rgba(251,146,60,0.45)' }
                            : undefined
                        }
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
                  <p className="tnum font-display text-lg font-bold" style={{ color: '#fb923c' }}>
                    {formatChips(totalBet)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {LINE_COUNT} lines x <span className="tnum">{lineBet}</span>
                  </p>
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  disabled={!canSpin}
                  onClick={handleSpin}
                  className="h-14 min-w-[8rem] gap-2 text-base font-black uppercase tracking-wide text-[#1a0e02] hover:brightness-105 disabled:text-foreground"
                  style={
                    canSpin
                      ? { background: '#fb923c', boxShadow: '0 0 24px rgba(251,146,60,0.45)' }
                      : undefined
                  }
                >
                  <Zap className={`size-5 ${spinning || free.active ? 'animate-spin' : ''}`} />
                  {free.active ? 'Free' : spinning ? 'Spinning' : 'Spin'}
                </Button>
              </div>
            </div>

            {totalBet > balance && !free.active && (
              <p className="mt-2 text-center text-xs text-loss">
                Total bet exceeds balance — lower the line bet or add chips.
              </p>
            )}
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {free.active ? (
                <span className="text-accent">Free spins running — sit back, Bazinga.</span>
              ) : (
                <>
                  Press <span className="font-semibold text-foreground">Space</span> to spin · last result{' '}
                  {wins.length > 0 || totalWin > 0 ? (
                    <span className="text-win tnum">+{formatChips(totalWin)}</span>
                  ) : lastSpinBet > 0 ? (
                    <span className="text-muted-foreground">no win</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Info panel */}
        <div className="w-full shrink-0 lg:w-72">
          <Tabs defaultValue="paytable">
            <TabsList className="w-full">
              <TabsTrigger value="paytable" className="flex-1 gap-1.5">
                <Atom className="size-3.5" /> Paytable
              </TabsTrigger>
              <TabsTrigger value="lines" className="flex-1 gap-1.5">
                <Info className="size-3.5" /> Lines
              </TabsTrigger>
              <TabsTrigger value="about" className="flex-1 gap-1.5">
                <Star className="size-3.5" /> About
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
                  All {LINE_COUNT} lines are always active and pay left to right. Winning lines from the
                  last spin glow orange.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="about">
              <div className="panel space-y-2 rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-display text-sm font-bold" style={{ color: '#fb923c' }}>
                  Bazinga Reels
                </p>
                <p>
                  An affectionate parody slot. Land{' '}
                  <span className="font-semibold text-foreground">{SYMBOL_LABELS[SCATTER]}</span> couch
                  cushions to win <span className="text-accent">free spins</span> — every free spin gets a
                  Bazinga wild boost, and more scatters add even more spins.
                </p>
                <p>
                  Big wins fire off a comic meme callout. The bigger the win, the louder Sheldon gets.
                  Knock knock knock.
                </p>
                <p className="text-[10px] opacity-80">
                  Play money only. Original art, no real likenesses. RTP ~94%.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </GameShell>
  )
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
