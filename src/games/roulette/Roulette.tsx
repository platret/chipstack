import { AnimatePresence, motion } from 'framer-motion'
import { Coins, History, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { GameShell } from '@/components/GameShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { audio } from '@/lib/audio'
import { formatChips } from '@/lib/format'
import { cn } from '@/lib/utils'
import { createRng, randomSeed } from '@/lib/rng'
import { useWallet } from '@/store/wallet'
import {
  colorOf,
  PAYOUT,
  settleAll,
  settleBet,
  totalStake,
  WHEEL_ORDER,
  type BetSpot,
  type PlacedBet,
} from './bets'
import { Chip, chipColor } from './Chip'
import { BettingBoard } from './BettingBoard'
import { Wheel, type WheelHandle } from './Wheel'

const ACCENT = '#fb7185'
const DENOMS = [1, 5, 25, 100, 500] as const

interface HistoryEntry {
  n: number
  net: number
}

type Status = 'betting' | 'spinning' | 'result'

const KIND_LABEL: Record<BetSpot['kind'], string> = {
  straight: 'Straight',
  split: 'Split',
  street: 'Street',
  corner: 'Corner',
  line: 'Line',
  column: 'Column',
  dozen: 'Dozen',
  red: 'Red',
  black: 'Black',
  odd: 'Odd',
  even: 'Even',
  high: 'High 19-36',
  low: 'Low 1-18',
}

const INSIDE_KINDS = ['straight', 'split', 'street', 'corner', 'line']

export default function Roulette() {
  const balance = useWallet((s) => s.balance)

  const [bets, setBets] = useState<Map<string, PlacedBet>>(new Map())
  const [denom, setDenom] = useState<number>(5)
  const [status, setStatus] = useState<Status>('betting')
  const [result, setResult] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const lastRoundRef = useRef<PlacedBet[]>([])
  const wheelRef = useRef<WheelHandle | null>(null)

  const placed = useMemo(() => [...bets.values()], [bets])
  const staked = totalStake(placed)
  const amounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const b of placed) m[b.spot.id] = b.amount
    return m
  }, [placed])

  const settling = status === 'result'
  const winningSpotIds = useMemo(() => {
    if (!settling || result == null) return null
    const ids = new Set<string>()
    for (const b of placed) if (settleBet(b, result) > 0) ids.add(b.spot.id)
    return ids
  }, [settling, result, placed])

  const highlightNumbers = useMemo(() => {
    if (!settling || result == null) return null
    return new Set([result])
  }, [settling, result])

  const placeChip = useCallback(
    (spot: BetSpot) => {
      audio.unlock()
      if (denom > balance - staked) {
        toast({ title: 'Not enough chips', description: `Need ${formatChips(denom)} to place this chip.`, variant: 'accent' })
        return
      }
      audio.play('chipBet')
      setBets((prev) => {
        const next = new Map(prev)
        const existing = next.get(spot.id)
        next.set(spot.id, { spot, amount: (existing?.amount ?? 0) + denom })
        return next
      })
    },
    [denom, balance, staked],
  )

  const clearBets = () => {
    if (!placed.length) return
    audio.play('click')
    setBets(new Map())
  }

  const restoreLast = () => {
    if (!lastRoundRef.current.length) return
    const next = new Map<string, PlacedBet>()
    for (const b of lastRoundRef.current) next.set(b.spot.id, { ...b })
    if (totalStake([...next.values()]) > balance) {
      toast({ title: 'Not enough chips', description: 'That layout exceeds your balance.', variant: 'accent' })
      return
    }
    audio.play('click')
    setStatus('betting')
    setResult(null)
    setBets(next)
  }

  const spin = () => {
    if (status !== 'betting' || !placed.length) return
    audio.unlock()
    if (staked > balance || !useWallet.getState().bet(staked)) {
      toast({ title: 'Not enough chips', description: 'Lower your bets or add chips.', variant: 'accent' })
      return
    }

    lastRoundRef.current = placed.map((b) => ({ ...b }))

    const rng = createRng(randomSeed())
    const spun = WHEEL_ORDER[rng.int(0, WHEEL_ORDER.length - 1)]!
    const snapshot = placed.map((b) => ({ ...b }))

    setStatus('spinning')
    setResult(spun)
    audio.play('spin')

    wheelRef.current?.spinTo(spun, () => {
      const gross = settleAll(snapshot, spun)
      const net = gross - staked
      if (gross > 0) useWallet.getState().payout(gross)

      setHistory((h) => [{ n: spun, net }, ...h].slice(0, 18))
      setStatus('result')

      if (gross > 0) {
        const big = net >= staked * 8
        audio.play(big ? 'jackpot' : 'chipWin')
        toast({
          title: `${spun} ${colorOf(spun).toUpperCase()} · won ${formatChips(gross)}`,
          description: `Net ${net >= 0 ? '+' : ''}${formatChips(net)} on ${formatChips(staked)} staked`,
          variant: big ? 'gold' : 'win',
        })
      } else {
        audio.play('lose')
        toast({
          title: `${spun} ${colorOf(spun).toUpperCase()} · no win`,
          description: `Lost ${formatChips(staked)}`,
          variant: 'accent',
        })
      }
    })
  }

  const nextRound = () => {
    audio.play('click')
    setStatus('betting')
    setResult(null)
  }

  const canSpin = status === 'betting' && placed.length > 0 && staked <= balance
  const disabledBoard = status !== 'betting'
  const lastNet = history[0]?.net ?? 0

  return (
    <GameShell
      id="roulette"
      aside={
        <Badge variant="outline" className="gap-1.5">
          <Coins className="size-3.5" style={{ color: ACCENT }} />
          <span className="tnum">{formatChips(balance)}</span>
        </Badge>
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Wheel + controls */}
        <div className="flex w-full flex-col gap-3 lg:w-[340px] lg:shrink-0">
          <div className="panel relative overflow-hidden rounded-xl p-4">
            <div className="scanlines pointer-events-none absolute inset-0" />
            <div className="relative mx-auto w-[min(78vw,300px)]">
              <Wheel handleRef={wheelRef} />
            </div>

            <div className="mt-3 flex min-h-[2.75rem] items-center justify-center">
              <AnimatePresence mode="wait">
                {result != null && status !== 'betting' ? (
                  <motion.div
                    key={`${result}-${status}`}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    className="flex items-center gap-2"
                  >
                    <ResultBead n={result} big />
                    <span className="font-display text-sm uppercase tracking-widest text-muted-foreground">
                      {status === 'spinning' ? 'spinning…' : colorOf(result)}
                    </span>
                  </motion.div>
                ) : (
                  <motion.span
                    key="place"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-display text-sm uppercase tracking-widest text-muted-foreground"
                  >
                    Place your bets
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Chip selector */}
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Chip value</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {DENOMS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    audio.unlock()
                    audio.play('hover')
                    setDenom(d)
                  }}
                  className={cn(
                    'rounded-full transition-transform',
                    denom === d ? 'scale-110' : 'opacity-70 hover:opacity-100',
                  )}
                  style={denom === d ? { boxShadow: `0 0 0 2px ${chipColor(d)}, 0 0 12px ${chipColor(d)}` } : undefined}
                  aria-pressed={denom === d}
                  aria-label={`${d} chip`}
                >
                  <Chip amount={d} size={40} />
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={clearBets} disabled={disabledBoard || !placed.length} className="gap-1.5">
              <Trash2 className="size-4" /> Clear
            </Button>
            <Button
              variant="outline"
              onClick={restoreLast}
              disabled={!lastRoundRef.current.length || status === 'spinning'}
              className="gap-1.5"
            >
              {status === 'result' ? <RotateCcw className="size-4" /> : <Undo2 className="size-4" />}
              {status === 'result' ? 'Rebet' : 'Last bets'}
            </Button>
          </div>

          {status === 'result' ? (
            <Button size="lg" onClick={nextRound} className="w-full gap-2 box-glow-accent" style={{ background: ACCENT, color: '#1a0307' }}>
              <Coins className="size-5" /> New bets
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={spin}
              disabled={!canSpin}
              className="w-full gap-2 box-glow-accent disabled:opacity-50"
              style={{ background: ACCENT, color: '#1a0307' }}
            >
              <RotateCcw className="size-5" />
              {status === 'spinning' ? 'No more bets' : staked > 0 ? `Spin · ${formatChips(staked)}` : 'Spin'}
            </Button>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total staked</span>
            <span className="tnum font-display font-bold" style={{ color: ACCENT }}>
              {formatChips(staked)}
            </span>
          </div>
        </div>

        {/* Board + summaries */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="panel relative overflow-x-auto rounded-xl p-3 sm:p-4">
            <div className="min-w-[520px]">
              <BettingBoard
                amounts={amounts}
                highlightNumbers={highlightNumbers}
                winningSpotIds={winningSpotIds}
                disabled={disabledBoard}
                onPlace={placeChip}
              />
            </div>
          </div>

          {/* Active bets */}
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Active bets {placed.length > 0 && <span className="tnum text-foreground">({placed.length})</span>}
            </p>
            {placed.length === 0 ? (
              <p className="text-xs text-muted-foreground">No chips placed. Pick a chip value and click the felt — straights, splits, corners, dozens and more.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {placed.map((b) => (
                  <li
                    key={b.spot.id}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-[11px]',
                      winningSpotIds?.has(b.spot.id) && 'border-win/60 text-win',
                    )}
                  >
                    <span className="font-medium">{KIND_LABEL[b.spot.kind]}</span>
                    {INSIDE_KINDS.includes(b.spot.kind) && (
                      <span className="text-muted-foreground">{b.spot.numbers.join('·')}</span>
                    )}
                    <span className="tnum font-semibold" style={{ color: ACCENT }}>
                      {formatChips(b.amount)}
                    </span>
                    <span className="tnum text-muted-foreground">{PAYOUT[b.spot.kind]}:1</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* History */}
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <History className="size-3.5" /> Recent
              </p>
              {history.length > 0 && (
                <span className={cn('tnum text-xs font-semibold', lastNet >= 0 ? 'text-win' : 'text-loss')}>
                  last {lastNet >= 0 ? '+' : ''}
                  {formatChips(lastNet)}
                </span>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">No spins yet.</p>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <AnimatePresence initial={false}>
                  {history.map((h, i) => (
                    <motion.div
                      key={`${history.length}-${i}`}
                      layout
                      initial={i === 0 ? { scale: 0.4, opacity: 0 } : false}
                      animate={{ scale: 1, opacity: 1 }}
                      className="shrink-0"
                    >
                      <ResultBead n={h.n} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </GameShell>
  )
}

function ResultBead({ n, big }: { n: number; big?: boolean }) {
  const c = colorOf(n)
  const bg = c === 'green' ? '#16a34a' : c === 'red' ? '#e11d48' : '#16162a'
  return (
    <span
      className={cn(
        'tnum inline-flex items-center justify-center rounded-full border border-black/40 font-display font-bold text-white',
        big ? 'size-11 text-lg' : 'size-8 text-sm',
      )}
      style={{ background: bg, boxShadow: big ? `0 0 14px ${bg}` : `0 0 6px ${bg}` }}
    >
      {n}
    </span>
  )
}
