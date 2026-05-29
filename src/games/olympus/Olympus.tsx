import { AnimatePresence, motion } from 'framer-motion'
import { Coins, Crown, Gift, Info, Layers, Sparkles, Star, Zap } from 'lucide-react'
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
  FREE_SPINS,
  RETRIGGER_SPINS,
  SCATTERS_TO_RETRIGGER,
  SCATTERS_TO_TRIGGER,
  SYMBOL_LABELS,
  playSpin,
  type SpinResult,
  type TumbleStep,
} from './config'
import { PayTable } from './PayTable'
import { useGrid } from './useGrid'

const ACCENT = '#38bdf8'
const GOLD = '#fbbf24'
const CHIP_VALUES = [20, 50, 100, 500] as const
const BIG_WIN_MULT = 25 // final win >= 25x total bet -> jackpot sting + crown banner

interface FreeState {
  active: boolean
  remaining: number
  total: number
  /** persistent total multiplier built from orbs across the session. */
  mult: number
  /** accumulated free-spin winnings (gross, in chips). */
  won: number
}

const NO_FREE: FreeState = { active: false, remaining: 0, total: 0, mult: 0, won: 0 }

/** Resolved outcome of one spin (base or free) once tumbles + multipliers settle. */
interface Resolved {
  /** chips to credit for this spin (gross — already includes any multiplier). */
  win: number
  /** the base win in chips before the multiplier was applied. */
  base: number
  /** the multiplier sum applied to this spin (0 = none / no win). */
  mult: number
  big: boolean
}

export default function Olympus() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const grid = useGrid(canvasRef)
  const balance = useWallet((s) => s.balance)

  const [bet, setBet] = useState<number>(20)
  const [spinning, setSpinning] = useState(false)
  const [totalWin, setTotalWin] = useState(0)
  const [bigWin, setBigWin] = useState(false)
  const [cascadeWin, setCascadeWin] = useState<{ chips: number; key: number } | null>(null)
  const [multReveal, setMultReveal] = useState<number | null>(null)
  const [lastBet, setLastBet] = useState(0)
  const [free, setFree] = useState<FreeState>(NO_FREE)
  const [introFs, setIntroFs] = useState(false)

  const seedRef = useRef(randomSeed())
  const freeRef = useRef<FreeState>(NO_FREE)
  const freeTimer = useRef<number>(0)
  const introTimer = useRef<number>(0)
  freeRef.current = free

  const canSpin = !spinning && bet <= balance && bet > 0 && !free.active

  const clearTimers = useCallback(() => {
    if (freeTimer.current) window.clearTimeout(freeTimer.current)
    if (introTimer.current) window.clearTimeout(introTimer.current)
    freeTimer.current = 0
    introTimer.current = 0
  }, [])

  /** Animate one precomputed spin, then resolve payouts via onResolved. */
  const animateSpin = useCallback(
    (
      result: SpinResult,
      betForSpin: number,
      isFree: boolean,
      onResolved: (r: Resolved) => void,
    ) => {
      let runningBaseChips = 0

      const onCascade = (_i: number, step: TumbleStep) => {
        if (step.units > 0) {
          audio.play('reelStop')
          const stepChips = step.units * betForSpin
          runningBaseChips += stepChips
          setCascadeWin({ chips: stepChips, key: performance.now() })
        }
      }

      const finish = () => {
        // Base game: orbs on winning steps sum and multiply this spin's whole base.
        // Free game: orbs add to the PERSISTENT session multiplier, applied to this spin's base.
        const won = result.baseUnits > 0
        const base = won ? runningBaseChips : 0
        // For free spins, accumulate this spin's orbs onto the running session multiplier.
        const mult = won ? (isFree ? freeRef.current.mult + result.orbMultiplier : result.orbMultiplier) : 0
        const winChips = won && mult > 0 ? base * mult : base
        const big = winChips >= BIG_WIN_MULT * betForSpin
        onResolved({ win: winChips, base, mult, big })
      }

      grid.play(result.steps, {
        onCascade,
        onSettle: () => {},
        onDone: finish,
      })
    },
    [grid],
  )

  /** Resolve a base (paid) spin once its tumble animation completes. */
  const resolveBase = useCallback(
    (result: SpinResult, r: Resolved) => {
      setSpinning(false)
      setCascadeWin(null)

      if (r.win > 0) {
        useWallet.getState().payout(r.win)
        setTotalWin(r.win)
        setBigWin(r.big)
        if (r.mult > 0) {
          setMultReveal(r.mult)
          audio.play('jackpot')
        } else {
          setMultReveal(null)
          audio.play(r.big ? 'jackpot' : 'chipWin')
        }
        toast({
          title: `${r.big ? 'BIG WIN' : 'Win'} +${formatChips(r.win)}`,
          description: r.mult > 0 ? `Base ${formatChips(r.base)} x ${r.mult} orb multiplier` : 'Pay-anywhere tumble',
          variant: r.big ? 'gold' : 'win',
        })
      } else {
        setTotalWin(0)
        setBigWin(false)
        setMultReveal(null)
        audio.play('lose')
      }

      // Scatter trigger -> enter free spins (counted on the initial drop only).
      if (result.scatterCount >= SCATTERS_TO_TRIGGER) {
        audio.play('jackpot')
        setIntroFs(true)
        setFree({ active: true, remaining: FREE_SPINS, total: FREE_SPINS, mult: 0, won: 0 })
        if (introTimer.current) window.clearTimeout(introTimer.current)
        introTimer.current = window.setTimeout(() => setIntroFs(false), 2200)
        toast({
          title: `${FREE_SPINS} Free Spins!`,
          description: `${result.scatterCount} temples · orbs build a persistent multiplier`,
          variant: 'accent',
        })
      }
    },
    [],
  )

  /** Resolve a free spin once its tumble animation completes. */
  const resolveFree = useCallback((result: SpinResult, r: Resolved) => {
    setSpinning(false)
    setCascadeWin(null)

    if (r.win > 0) {
      useWallet.getState().payout(r.win)
      setTotalWin(r.win)
      setBigWin(r.big)
      if (r.mult > 0) {
        setMultReveal(r.mult)
        audio.play('jackpot')
      } else {
        setMultReveal(null)
        audio.play(r.big ? 'jackpot' : 'chipWin')
      }
    } else {
      setTotalWin(0)
      setBigWin(false)
      setMultReveal(null)
    }

    setFree((f) => ({
      ...f,
      mult: r.mult > 0 ? r.mult : f.mult,
      won: f.won + r.win,
    }))

    // Retrigger: 3+ scatters add spins.
    if (result.scatterCount >= SCATTERS_TO_RETRIGGER) {
      audio.play('jackpot')
      setFree((f) => ({ ...f, remaining: f.remaining + RETRIGGER_SPINS, total: f.total + RETRIGGER_SPINS }))
      toast({
        title: `+${RETRIGGER_SPINS} Free Spins!`,
        description: `${result.scatterCount} temples retrigger`,
        variant: 'accent',
      })
    }
  }, [])

  const runSpin = useCallback(
    (isFree: boolean, betForSpin: number) => {
      setTotalWin(0)
      setBigWin(false)
      setMultReveal(null)
      setCascadeWin(null)
      setSpinning(true)

      seedRef.current = (seedRef.current * 1664525 + 1013904223) >>> 0
      const spinSeed = seedRef.current ^ randomSeed()
      const rng = createRng(spinSeed)
      const result = playSpin(rng, isFree)

      audio.play('spin')

      animateSpin(result, betForSpin, isFree, (r) => {
        if (isFree) resolveFree(result, r)
        else resolveBase(result, r)
      })
    },
    [animateSpin, resolveBase, resolveFree],
  )

  // Free-spins auto-runner: advance the next spin while idle.
  useEffect(() => {
    if (!free.active || spinning || introFs) return
    if (free.remaining <= 0) {
      if (freeTimer.current) window.clearTimeout(freeTimer.current)
      freeTimer.current = window.setTimeout(() => {
        const won = freeRef.current.won
        audio.play(won > 0 ? 'jackpot' : 'lose')
        toast({
          title: 'Free spins complete',
          description: won > 0 ? `Olympus paid +${formatChips(won)}` : 'The gods stayed silent.',
          variant: won > 0 ? 'gold' : 'default',
        })
        setFree(NO_FREE)
        setTotalWin(0)
        setBigWin(false)
        setMultReveal(null)
      }, 1200)
      return () => {
        if (freeTimer.current) window.clearTimeout(freeTimer.current)
      }
    }
    if (freeTimer.current) window.clearTimeout(freeTimer.current)
    freeTimer.current = window.setTimeout(() => {
      setFree((f) => ({ ...f, remaining: f.remaining - 1 }))
      runSpin(true, lastBet || bet)
    }, 1100)
    return () => {
      if (freeTimer.current) window.clearTimeout(freeTimer.current)
    }
  }, [free.active, free.remaining, spinning, introFs, lastBet, bet, runSpin])

  const handleSpin = useCallback(() => {
    audio.unlock()
    audio.play('click')
    if (spinning || free.active) return
    if (bet > balance || bet <= 0) {
      toast({ title: 'Not enough chips', description: 'Lower the bet or add chips.', variant: 'accent' })
      return
    }
    if (!useWallet.getState().bet(bet)) return
    audio.play('chipBet')
    clearTimers()
    setLastBet(bet)
    runSpin(false, bet)
  }, [spinning, free.active, bet, balance, runSpin, clearTimers])

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

  useEffect(() => () => clearTimers(), [clearTimers])

  return (
    <GameShell
      id="olympus"
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
              className={`scanlines relative aspect-[6/5] w-full overflow-hidden rounded-2xl border bg-black/55 p-2 transition-colors sm:p-3 ${
                free.active ? 'border-accent/60' : 'border-[#38bdf8]/30'
              }`}
              style={{
                boxShadow: free.active
                  ? '0 0 0 1px rgba(56,189,248,0.32), 0 0 44px rgba(56,189,248,0.22)'
                  : '0 0 0 1px rgba(56,189,248,0.26), 0 0 36px rgba(56,189,248,0.14)',
              }}
            >
              <canvas ref={canvasRef} className="block size-full" />

              {/* persistent free-spins multiplier badge */}
              <AnimatePresence>
                {free.active && (
                  <motion.div
                    key="fsmult"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="pointer-events-none absolute right-3 top-3 z-20"
                  >
                    <div className="flex items-center gap-1.5 rounded-full border border-gold/70 bg-black/65 px-3 py-1 backdrop-blur-md">
                      <Zap className="size-3.5 text-gold" />
                      <span className="font-display text-sm font-black tnum text-gold text-glow">
                        x{free.mult || 1}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* per-cascade win popup */}
              <AnimatePresence>
                {cascadeWin && (
                  <motion.div
                    key={cascadeWin.key}
                    initial={{ opacity: 0, y: 8, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center"
                  >
                    <span className="rounded-full border border-win/60 bg-black/60 px-3 py-1 font-display text-sm font-bold tnum text-win backdrop-blur-md">
                      +{formatChips(cascadeWin.chips)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* free-spins intro splash */}
              <AnimatePresence>
                {introFs && (
                  <motion.div
                    key="fsintro"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                      className="flex flex-col items-center gap-2 text-center"
                    >
                      <Gift className="size-12 text-accent text-glow-accent" />
                      <p className="font-display text-3xl font-black uppercase tracking-wider text-accent text-glow-accent">
                        {FREE_SPINS} Free Spins
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Orbs now build a persistent total multiplier
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* total-multiplier reveal */}
              <AnimatePresence>
                {multReveal !== null && multReveal > 0 && !spinning && (
                  <motion.div
                    key={`mult-${multReveal}`}
                    initial={{ opacity: 0, scale: 0.4, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                    className="pointer-events-none absolute inset-x-0 top-1/3 z-30 flex justify-center"
                  >
                    <div className="flex items-center gap-2 rounded-2xl border-2 border-gold/80 bg-black/70 px-5 py-2 backdrop-blur-md shadow-[0_0_40px_rgba(251,191,36,0.45)]">
                      <Zap className="size-7 text-gold" />
                      <span className="font-display text-4xl font-black tnum text-gold text-glow">
                        x{multReveal}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* big win / total banner */}
              <AnimatePresence>
                {totalWin > 0 && !spinning && (multReveal === null || multReveal === 0) && (
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

              {/* free-spins running ribbon */}
              <AnimatePresence>
                {free.active && !introFs && (
                  <motion.div
                    key="fsribbon"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="pointer-events-none absolute left-3 top-3 z-20"
                  >
                    <div className="flex items-center gap-1.5 rounded-full border border-accent/70 bg-black/65 px-3 py-1 backdrop-blur-md">
                      <Gift className="size-3.5 text-accent" />
                      <span className="font-display text-xs font-black uppercase tracking-wide text-accent">
                        Free · <span className="tnum">{free.remaining}</span>
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* bet bar */}
          <div className="panel rounded-xl p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total bet</span>
                <div className="flex gap-1.5">
                  {CHIP_VALUES.map((v) => {
                    const disabled = spinning || free.active || v > balance
                    const selected = v === bet
                    return (
                      <Button
                        key={v}
                        size="sm"
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => {
                          audio.unlock()
                          audio.play('click')
                          setBet(v)
                        }}
                        className="tnum min-w-11 px-2"
                        style={
                          selected
                            ? { background: ACCENT, color: '#04121f', boxShadow: '0 0 16px rgba(56,189,248,0.5)' }
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
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Bet</p>
                  <p className="tnum font-display text-lg font-bold" style={{ color: ACCENT }}>
                    {formatChips(bet)}
                  </p>
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  disabled={!canSpin}
                  onClick={handleSpin}
                  className="h-14 min-w-[8rem] gap-2 text-base font-black uppercase tracking-wide text-[#04121f] hover:brightness-105 disabled:text-foreground"
                  style={canSpin ? { background: ACCENT, boxShadow: '0 0 24px rgba(56,189,248,0.5)' } : undefined}
                >
                  <Zap className={`size-5 ${spinning || free.active ? 'animate-spin' : ''}`} />
                  {free.active ? 'Free' : spinning ? 'Tumbling' : 'Spin'}
                </Button>
              </div>
            </div>

            {bet > balance && !free.active && (
              <p className="mt-2 text-center text-xs text-loss">
                Bet exceeds balance — lower the bet or add chips.
              </p>
            )}
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {free.active ? (
                <span className="text-accent">Free spins running — orbs stack the multiplier.</span>
              ) : (
                <>
                  Press <span className="font-semibold text-foreground">Space</span> to spin · last result{' '}
                  {totalWin > 0 ? (
                    <span className="text-win tnum">+{formatChips(totalWin)}</span>
                  ) : lastBet > 0 ? (
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
                <Layers className="size-3.5" /> Paytable
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex-1 gap-1.5">
                <Info className="size-3.5" /> Rules
              </TabsTrigger>
              <TabsTrigger value="about" className="flex-1 gap-1.5">
                <Star className="size-3.5" /> About
              </TabsTrigger>
            </TabsList>
            <TabsContent value="paytable">
              <div className="panel rounded-xl p-3">
                <PayTable bet={bet} />
              </div>
            </TabsContent>
            <TabsContent value="rules">
              <div className="panel space-y-2 rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-display text-sm font-bold" style={{ color: ACCENT }}>
                  Pay anywhere · tumble · orbs
                </p>
                <p>
                  <span className="font-semibold text-foreground">Pay anywhere:</span> a symbol pays when
                  8 or more land anywhere across the 6x5 grid — position does not matter.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Tumble:</span> winning symbols vanish,
                  the rest fall, and fresh symbols drop from above. Every tumble win adds to the spin total
                  until no new win lands.
                </p>
                <p>
                  <span className="font-semibold" style={{ color: GOLD }}>
                    {SYMBOL_LABELS.ORB}:
                  </span>{' '}
                  carries a value from 2x up to 500x. On a winning spin, every orb that landed is summed
                  and multiplies the whole spin.
                </p>
                <p>
                  <span className="font-semibold text-accent">Free spins:</span>{' '}
                  {SCATTERS_TO_TRIGGER}+ temples award {FREE_SPINS} spins where orb values build a single
                  persistent multiplier; {SCATTERS_TO_RETRIGGER}+ retrigger for +{RETRIGGER_SPINS}.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="about">
              <div className="panel space-y-2 rounded-xl p-3 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-display text-sm font-bold" style={{ color: ACCENT }}>
                  Gates of Fortune
                </p>
                <p>
                  Scale Olympus on a tumbling pay-anywhere grid. Zeus orbs charge with lightning
                  multipliers, and the temple scatter opens the gates to free spins where the multiplier
                  never resets.
                </p>
                <p>
                  High volatility — wins are rarer but the orb multipliers can soar past 1000x your bet.
                </p>
                <p className="text-[10px] opacity-80">Play money only. Original neon art. RTP ~95%.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </GameShell>
  )
}
