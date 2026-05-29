import { AnimatePresence, motion } from 'framer-motion'
import { Coins, Crown, Minus, Plus, Repeat, Sparkles, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameShell } from '@/components/GameShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { audio } from '@/lib/audio'
import { formatChips } from '@/lib/format'
import { createRng, randomSeed } from '@/lib/rng'
import { useWallet } from '@/store/wallet'
import type { Card } from './cards'
import { shuffledDeck } from './cards'
import type { HandRank } from './evaluate'
import { evaluateHand } from './evaluate'
import { MAX_COINS, PAYTABLE, payMultiplier } from './paytable'
import { PlayingCard } from './PlayingCard'

const ACCENT = '#22d3ee'
const COIN_VALUES = [1, 5, 25, 100, 500] as const
const HAND_SIZE = 5

type Phase = 'idle' | 'dealt' | 'result'

interface Result {
  rank: HandRank
  gross: number
}

export default function VideoPoker() {
  const balance = useWallet((s) => s.balance)

  const [coinValue, setCoinValue] = useState<number>(COIN_VALUES[0])
  const [coins, setCoins] = useState(MAX_COINS)
  const [hand, setHand] = useState<(Card | null)[]>(Array(HAND_SIZE).fill(null))
  const [held, setHeld] = useState<boolean[]>(Array(HAND_SIZE).fill(false))
  const [faceUp, setFaceUp] = useState<boolean[]>(Array(HAND_SIZE).fill(false))
  const [dealingIdx, setDealingIdx] = useState<Set<number>>(new Set())
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Result | null>(null)

  const deckRef = useRef<Card[]>([])
  const cursorRef = useRef(0)
  const timers = useRef<number[]>([])

  const wager = coinValue * coins
  const canAfford = wager <= balance && wager > 0
  const busy = dealingIdx.size > 0

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])
  useEffect(() => clearTimers, [clearTimers])

  const draw = useCallback((): Card => deckRef.current[cursorRef.current++]!, [])

  function adjustCoins(delta: number) {
    if (phase !== 'idle') return
    audio.unlock()
    audio.play('click')
    setCoins((c) => Math.max(1, Math.min(MAX_COINS, c + delta)))
  }

  function selectCoinValue(v: number) {
    if (phase !== 'idle') return
    audio.unlock()
    audio.play('chipBet')
    setCoinValue(v)
  }

  function betMax() {
    if (phase !== 'idle') return
    audio.unlock()
    audio.play('chipBet')
    setCoins(MAX_COINS)
  }

  function toggleHold(i: number) {
    if (phase !== 'dealt' || busy) return
    audio.unlock()
    audio.play('click')
    setHeld((h) => {
      const next = [...h]
      next[i] = !next[i]
      return next
    })
  }

  function deal() {
    if (phase !== 'idle' || !canAfford || busy) return
    audio.unlock()
    if (!useWallet.getState().bet(wager)) {
      toast({ title: 'Not enough chips', description: 'Lower the bet or add chips.', variant: 'accent' })
      return
    }

    const rng = createRng(randomSeed())
    deckRef.current = shuffledDeck(rng)
    cursorRef.current = 0
    const cards: Card[] = Array.from({ length: HAND_SIZE }, () => draw())

    setResult(null)
    setHeld(Array(HAND_SIZE).fill(false))
    setHand(cards)
    setFaceUp(Array(HAND_SIZE).fill(false))
    setDealingIdx(new Set([0, 1, 2, 3, 4]))
    setPhase('dealt')

    clearTimers()
    cards.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          audio.play('cardDeal')
          setFaceUp((f) => {
            const n = [...f]
            n[i] = true
            return n
          })
          setDealingIdx((d) => {
            const n = new Set(d)
            n.delete(i)
            return n
          })
        }, 90 + i * 110),
      )
    })
  }

  function drawPhase() {
    if (phase !== 'dealt' || busy) return
    audio.unlock()

    const replacing = held.map((h) => !h)
    const newCards = hand.map((c, i) => (replacing[i] ? draw() : c))

    // Flip replaced cards face-down, then deal new face-up.
    const flipping = replacing.some(Boolean)
    if (flipping) audio.play('cardFlip')
    setFaceUp((f) => f.map((up, i) => (replacing[i] ? false : up)))
    setHand(newCards)

    const toDeal = replacing.map((r, i) => (r ? i : -1)).filter((i) => i >= 0)
    setDealingIdx(new Set(toDeal))

    clearTimers()
    if (toDeal.length === 0) {
      finish(newCards as Card[])
      return
    }
    toDeal.forEach((i, n) => {
      timers.current.push(
        window.setTimeout(() => {
          audio.play('cardDeal')
          setFaceUp((f) => {
            const arr = [...f]
            arr[i] = true
            return arr
          })
          setDealingIdx((d) => {
            const next = new Set(d)
            next.delete(i)
            return next
          })
        }, 140 + n * 110),
      )
    })

    const settle = 200 + toDeal.length * 110 + 120
    timers.current.push(window.setTimeout(() => finish(newCards as Card[]), settle))
  }

  function finish(cards: Card[]) {
    const rank = evaluateHand(cards)
    const mult = payMultiplier(rank, coins)
    const gross = coinValue * mult * coins
    setResult({ rank, gross })
    setPhase('result')

    if (gross > 0) {
      useWallet.getState().payout(gross)
      const profit = gross - wager
      const big = rank === 'royalFlush' || rank === 'straightFlush' || rank === 'quads'
      audio.play(big ? 'jackpot' : 'chipWin')
      const label = PAYTABLE.find((r) => r.rank === rank)?.label ?? 'Winner'
      toast({
        title: `${label}!`,
        description: `+${formatChips(profit)} chips`,
        variant: big ? 'gold' : 'win',
      })
    } else {
      audio.play('lose')
    }
  }

  function newHand() {
    if (busy) return
    audio.unlock()
    audio.play('click')
    setPhase('idle')
    setResult(null)
    setHeld(Array(HAND_SIZE).fill(false))
  }

  const winRank = phase === 'result' ? result?.rank : undefined

  return (
    <GameShell
      id="videopoker"
      aside={
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5">
          <Coins className="size-4" style={{ color: ACCENT }} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</span>
          <span className="tnum font-display text-sm font-bold" style={{ color: ACCENT }}>
            {formatChips(balance)}
          </span>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Paytable coins={coins} coinValue={coinValue} winRank={winRank} />

        <div className="relative flex flex-col gap-5 overflow-hidden rounded-xl border border-border bg-arena bg-grid p-4 box-glow scanlines">
          <RoundBanner phase={phase} result={result} wager={wager} />

          {/* Cards */}
          <div className="flex flex-1 items-center justify-center py-2">
            <div className="flex justify-center gap-[clamp(6px,2vw,16px)]">
              {hand.map((card, i) => (
                <PlayingCard
                  key={i}
                  index={i}
                  card={card}
                  faceUp={faceUp[i]!}
                  held={held[i]!}
                  dealing={dealingIdx.has(i)}
                  disabled={phase !== 'dealt' || busy}
                  onToggleHold={() => toggleHold(i)}
                />
              ))}
            </div>
          </div>

          {phase === 'dealt' && (
            <p className="text-center text-xs text-muted-foreground">
              Tap cards to <span style={{ color: ACCENT }}>hold</span>, then draw.
            </p>
          )}

          {/* Bet controls */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Coin value</span>
              <div className="flex flex-wrap gap-1.5">
                {COIN_VALUES.map((v) => {
                  const active = v === coinValue
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={phase !== 'idle'}
                      onClick={() => selectCoinValue(v)}
                      className="tnum flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
                      style={{
                        borderColor: active ? ACCENT : 'var(--border)',
                        color: active ? '#04141a' : 'var(--foreground)',
                        background: active ? ACCENT : 'transparent',
                        boxShadow: active ? '0 0 14px rgba(34,211,238,0.5)' : 'none',
                      }}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Coins</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={phase !== 'idle' || coins <= 1}
                    onClick={() => adjustCoins(-1)}
                    aria-label="Fewer coins"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: MAX_COINS }, (_, i) => (
                      <span
                        key={i}
                        className="h-6 w-2.5 rounded-full transition-colors"
                        style={{
                          background: i < coins ? ACCENT : 'var(--secondary)',
                          boxShadow: i < coins ? '0 0 8px rgba(34,211,238,0.6)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={phase !== 'idle' || coins >= MAX_COINS}
                    onClick={() => adjustCoins(1)}
                    aria-label="More coins"
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={phase !== 'idle' || coins === MAX_COINS}
                    onClick={betMax}
                    className="ml-1 gap-1"
                  >
                    <Zap className="size-3.5" /> Max
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bet</p>
                <p className="tnum font-display text-lg font-bold" style={{ color: ACCENT }}>
                  {formatChips(wager)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {phase !== 'dealt' ? (
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  disabled={!canAfford || busy}
                  onClick={deal}
                  style={{ background: ACCENT, color: '#04141a' }}
                >
                  <Sparkles className="size-5" />
                  {wager > balance ? 'Insufficient chips' : `Deal · ${formatChips(wager)}`}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  disabled={busy}
                  onClick={drawPhase}
                  style={{ background: ACCENT, color: '#04141a' }}
                >
                  <Repeat className="size-5" /> Draw
                </Button>
              )}
              {phase === 'result' && (
                <Button size="lg" variant="outline" className="gap-2" disabled={busy} onClick={newHand}>
                  New hand
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  )
}

function RoundBanner({ phase, result, wager }: { phase: Phase; result: Result | null; wager: number }) {
  let content: { text: string; sub?: string; tone: 'idle' | 'win' | 'loss' }
  if (phase === 'result' && result) {
    if (result.gross > 0) {
      const label = PAYTABLE.find((r) => r.rank === result.rank)?.label ?? 'Winner'
      content = { text: label, sub: `Pays ${formatChips(result.gross)}`, tone: 'win' }
    } else {
      content = { text: 'No win', sub: 'Deal again', tone: 'loss' }
    }
  } else if (phase === 'dealt') {
    content = { text: 'Hold & Draw', tone: 'idle' }
  } else {
    content = { text: 'Jacks or Better', sub: '9 / 6 paytable', tone: 'idle' }
  }

  const isJackpot = result?.rank === 'royalFlush'
  const color = content.tone === 'win' ? 'var(--win)' : content.tone === 'loss' ? 'var(--loss)' : ACCENT
  return (
    <div className="flex items-center justify-between gap-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={content.text + content.tone}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="flex items-center gap-2"
        >
          {isJackpot && <Crown className="size-6 text-gold" />}
          <div>
            <p
              className={`font-display text-xl font-bold leading-tight ${content.tone !== 'idle' ? 'text-glow' : ''}`}
              style={{ color }}
            >
              {content.text}
            </p>
            {content.sub && <p className="tnum text-xs text-muted-foreground">{content.sub}</p>}
          </div>
        </motion.div>
      </AnimatePresence>
      {phase === 'idle' && (
        <Badge variant="outline" className="tnum shrink-0">
          Bet {formatChips(wager)}
        </Badge>
      )}
    </div>
  )
}

function Paytable({
  coins,
  coinValue,
  winRank,
}: {
  coins: number
  coinValue: number
  winRank: HandRank | undefined
}) {
  const rows = useMemo(
    () =>
      PAYTABLE.map((row) => {
        const mult = payMultiplier(row.rank, coins)
        return { ...row, pay: coinValue * mult * coins }
      }),
    [coins, coinValue],
  )

  return (
    <div className="panel rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-sm font-bold" style={{ color: ACCENT }}>
          Paytable
        </p>
        <span className="tnum text-[10px] text-muted-foreground">{coins} coin{coins > 1 ? 's' : ''} × {coinValue}</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => {
          const active = winRank === row.rank
          return (
            <li
              key={row.rank}
              className="flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors"
              style={{
                background: active ? 'rgba(34,211,238,0.16)' : 'transparent',
                color: active ? ACCENT : undefined,
                boxShadow: active ? 'inset 0 0 0 1px rgba(34,211,238,0.5)' : 'none',
              }}
            >
              <span className={active ? 'font-bold' : 'text-foreground/90'}>{row.label}</span>
              <span className="tnum shrink-0 pl-2 font-semibold" style={{ color: active ? ACCENT : 'var(--gold)' }}>
                {formatChips(row.pay)}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Royal Flush pays <span className="text-gold">800×</span> per coin at {MAX_COINS} coins.
      </p>
    </div>
  )
}
