import { AnimatePresence, motion } from 'framer-motion'
import { Coins, Copy, HandCoins, Layers, Minus, Plus, RotateCcw, Shield, SquareStack } from 'lucide-react'
import type * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameShell } from '@/components/GameShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { audio } from '@/lib/audio'
import { formatChips } from '@/lib/format'
import { useWallet, wallet } from '@/store/wallet'
import {
  createShoe,
  draw,
  handValue,
  isBlackjack,
  isBust,
  needsReshuffle,
  reshuffle,
  settleHand,
  type Card,
  type Outcome,
  type Shoe,
} from './engine'
import { PlayingCard } from './PlayingCard'

const ACCENT = '#34e2a8'
const CHIPS = [5, 25, 100, 500] as const

type Phase = 'betting' | 'insurance' | 'player' | 'dealer' | 'settled'

interface PlayerHand {
  cards: Card[]
  wager: number
  /** original natural blackjack (two cards, 21, not from a split) */
  natural: boolean
  doubled: boolean
  /** split-Ace hands receive one card and auto-stand */
  fromSplitAce: boolean
  done: boolean
  result: Outcome | null
  gross: number
}

interface RoundSummary {
  net: number
  anyWin: boolean
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function newHand(cards: Card[], wager: number, natural = false, fromSplitAce = false): PlayerHand {
  return { cards, wager, natural, doubled: false, fromSplitAce, done: false, result: null, gross: 0 }
}

const OUTCOME_META: Record<Outcome, { label: string; variant: 'win' | 'accent' | 'outline' }> = {
  blackjack: { label: 'Blackjack 3:2', variant: 'win' },
  win: { label: 'Win', variant: 'win' },
  push: { label: 'Push', variant: 'outline' },
  lose: { label: 'Lose', variant: 'accent' },
  bust: { label: 'Bust', variant: 'accent' },
}

export default function Blackjack() {
  const balance = useWallet((s) => s.balance)
  const shoeRef = useRef<Shoe | null>(null)
  if (!shoeRef.current) shoeRef.current = createShoe()

  const [phase, setPhase] = useState<Phase>('betting')
  const [wager, setWager] = useState(25)
  const [dealer, setDealer] = useState<Card[]>([])
  const [holeDown, setHoleDown] = useState(true)
  const [hands, setHands] = useState<PlayerHand[]>([])
  const [active, setActive] = useState(0)
  const [insurance, setInsurance] = useState(0)
  const [summary, setSummary] = useState<RoundSummary | null>(null)
  const [, forceShoeTick] = useState(0)

  const shoeRemaining = shoeRef.current.cards.length - shoeRef.current.pos
  const shoePct = Math.max(0, Math.round((shoeRemaining / shoeRef.current.cards.length) * 100))

  const activeHand = hands[active] ?? null
  const dealerScore = handValue(holeDown ? dealer.slice(0, 1) : dealer)

  const unlock = useCallback(() => audio.unlock(), [])

  const adjustWager = useCallback(
    (delta: number) => {
      unlock()
      audio.play('click')
      setWager((w) => Math.max(5, Math.min(balance, w + delta)))
    },
    [balance, unlock],
  )

  const canSplit =
    !!activeHand &&
    activeHand.cards.length === 2 &&
    activeHand.cards[0].rank === activeHand.cards[1].rank &&
    hands.length < 4 &&
    balance >= activeHand.wager
  const canDouble =
    !!activeHand && activeHand.cards.length === 2 && !activeHand.fromSplitAce && balance >= activeHand.wager

  // ---- Dealing a new round ----
  const deal = useCallback(async () => {
    unlock()
    if (wager <= 0 || wager > balance) return
    const shoe = shoeRef.current!
    if (needsReshuffle(shoe)) {
      reshuffle(shoe)
      toast({ title: 'Shoe reshuffled', description: '6 decks · fresh shuffle' })
    }
    if (!wallet.bet(wager)) {
      toast({ title: 'Not enough chips', description: 'Lower your wager or add chips.', variant: 'accent' })
      return
    }

    setSummary(null)
    setInsurance(0)
    setActive(0)
    setHoleDown(true)
    setDealer([])
    setHands([])

    // Deal sequence: player, dealer-up, player, dealer-hole.
    const p1 = draw(shoe)
    const d1 = draw(shoe)
    const p2 = draw(shoe)
    const d2 = draw(shoe)
    const playerCards = [p1, p2]
    const dealerCards = [d1, d2]
    const natural = isBlackjack(playerCards)

    setPhase('player')

    // Staggered deal: player, dealer-up, player, dealer-hole.
    setHands([newHand([p1], wager)])
    audio.play('cardDeal')
    await sleep(180)
    setDealer([d1])
    audio.play('cardDeal')
    await sleep(180)
    setHands([newHand(playerCards, wager, natural)])
    audio.play('cardDeal')
    await sleep(180)
    setDealer([d1, d2])
    audio.play('cardDeal')
    forceShoeTick((t) => t + 1)

    await sleep(300)

    // Insurance offered when dealer shows an Ace.
    if (d1.rank === 'A' && balance - wager >= Math.ceil(wager / 2)) {
      setPhase('insurance')
      return
    }
    // Peek for naturals (player BJ or dealer BJ end the round immediately).
    if (natural || isBlackjack(dealerCards)) {
      await resolveDealer(dealerCards, [newHand(playerCards, wager, natural)])
    }
  }, [balance, wager, unlock])

  // ---- Insurance choice ----
  const takeInsurance = useCallback(
    async (yes: boolean) => {
      unlock()
      audio.play('click')
      const cost = Math.ceil(wager / 2)
      let ins = 0
      if (yes) {
        if (!wallet.bet(cost)) {
          toast({ title: 'Not enough chips', description: 'Skipping insurance.', variant: 'accent' })
        } else {
          ins = cost
          setInsurance(cost)
        }
      }
      const dealerCards = dealer
      const dealerBJ = isBlackjack(dealerCards)
      // Insurance pays 2:1 (gross 3x the side bet) when dealer has blackjack.
      if (ins > 0 && dealerBJ) {
        wallet.payout(ins * 3)
        toast({ title: `Insurance pays +${formatChips(ins * 2)}`, description: 'Dealer had blackjack.', variant: 'win' })
      } else if (ins > 0) {
        toast({ title: 'Insurance lost', description: 'No dealer blackjack.', variant: 'accent' })
      }

      if (dealerBJ || hands[0]?.natural) {
        await resolveDealer(dealerCards, hands)
      } else {
        setPhase('player')
      }
    },
    [dealer, hands, wager, unlock],
  )

  // ---- Player actions ----
  const hit = useCallback(() => {
    unlock()
    const shoe = shoeRef.current!
    const c = draw(shoe)
    audio.play('cardDeal')
    forceShoeTick((t) => t + 1)
    setHands((prev) => {
      const next = prev.map((h) => ({ ...h, cards: [...h.cards] }))
      const h = next[active]
      if (!h) return prev
      h.cards.push(c)
      if (isBust(h.cards)) {
        h.done = true
        audio.play('lose')
      }
      return next
    })
  }, [active, unlock])

  const stand = useCallback(() => {
    unlock()
    audio.play('click')
    setHands((prev) => {
      const next = prev.map((h) => ({ ...h }))
      if (next[active]) next[active].done = true
      return next
    })
  }, [active, unlock])

  const double = useCallback(() => {
    unlock()
    if (!activeHand || !canDouble) return
    if (!wallet.bet(activeHand.wager)) {
      toast({ title: 'Not enough chips', description: 'Cannot double.', variant: 'accent' })
      return
    }
    const shoe = shoeRef.current!
    const c = draw(shoe)
    audio.play('chipBet')
    audio.play('cardDeal')
    forceShoeTick((t) => t + 1)
    setHands((prev) => {
      const next = prev.map((h) => ({ ...h, cards: [...h.cards] }))
      const h = next[active]
      if (!h) return prev
      h.wager += h.wager
      h.doubled = true
      h.cards.push(c)
      h.done = true
      if (isBust(h.cards)) audio.play('lose')
      return next
    })
  }, [active, activeHand, canDouble, unlock])

  const split = useCallback(() => {
    unlock()
    if (!activeHand || !canSplit) return
    if (!wallet.bet(activeHand.wager)) {
      toast({ title: 'Not enough chips', description: 'Cannot split.', variant: 'accent' })
      return
    }
    const shoe = shoeRef.current!
    const isAces = activeHand.cards[0].rank === 'A'
    audio.play('chipBet')
    setHands((prev) => {
      const next = prev.map((h) => ({ ...h, cards: [...h.cards] }))
      const h = next[active]
      if (!h) return prev
      const [a, b] = h.cards
      const c1 = draw(shoe)
      const c2 = draw(shoe)
      const left = newHand([a!, c1], h.wager, false, isAces)
      const right = newHand([b!, c2], h.wager, false, isAces)
      if (isAces) {
        left.done = true
        right.done = true
      } else {
        if (isBust(left.cards)) left.done = true
      }
      next.splice(active, 1, left, right)
      audio.play('cardDeal')
      return next
    })
    forceShoeTick((t) => t + 1)
  }, [active, activeHand, canSplit, unlock])

  // ---- Advance through hands / into dealer turn ----
  useEffect(() => {
    if (phase !== 'player' || hands.length === 0) return
    const cur = hands[active]
    if (cur && !cur.done) return
    // current hand finished — move to next undone hand
    const nextIdx = hands.findIndex((h, i) => i > active && !h.done)
    if (nextIdx !== -1) {
      const t = setTimeout(() => setActive(nextIdx), 280)
      return () => clearTimeout(t)
    }
    if (hands.every((h) => h.done)) {
      const t = setTimeout(() => {
        void resolveDealer(dealer, hands)
      }, 320)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hands, active])

  // ---- Dealer turn + settlement ----
  const resolveDealer = useCallback(
    async (dealerCards: Card[], finalHands: PlayerHand[]) => {
      setPhase('dealer')
      const dealerArr = [...dealerCards]

      setHoleDown(false)
      audio.play('cardFlip')
      setDealer([...dealerArr])
      await sleep(420)

      // Dealer only draws if at least one player hand is live (not all busted / not all natural-resolved).
      const anyLive = finalHands.some((h) => !isBust(h.cards))
      const dealerHasBJ = isBlackjack(dealerArr)
      if (anyLive && !dealerHasBJ && !finalHands.every((h) => h.natural)) {
        while (handValue(dealerArr).total < 17) {
          const c = draw(shoeRef.current!)
          dealerArr.push(c)
          audio.play('cardDeal')
          setDealer([...dealerArr])
          await sleep(440)
        }
      }
      forceShoeTick((t) => t + 1)

      // Settle every hand independently.
      let net = 0
      let anyWin = false
      const settled = finalHands.map((h) => {
        const r = settleHand(h.cards, dealerArr, h.wager, h.natural)
        net += r.gross - h.wager
        if (r.outcome === 'win' || r.outcome === 'blackjack') anyWin = true
        if (r.gross > 0) wallet.payout(r.gross)
        return { ...h, result: r.outcome, gross: r.gross, done: true }
      })

      setHands(settled)
      setPhase('settled')
      setSummary({ net, anyWin })

      await sleep(120)
      if (net > 0) {
        audio.play('chipWin')
        toast({
          title: `You win +${formatChips(net)}`,
          description: anyWin ? 'Nice hand.' : 'Returned.',
          variant: 'win',
        })
      } else if (net < 0) {
        audio.play('lose')
        toast({ title: `You lose ${formatChips(net)}`, description: 'Try again.', variant: 'accent' })
      } else {
        toast({ title: 'Push', description: 'Wager returned.' })
      }
    },
    [],
  )

  const newRound = useCallback(() => {
    unlock()
    audio.play('click')
    setPhase('betting')
    setSummary(null)
    setHands([])
    setDealer([])
    setHoleDown(true)
    setActive(0)
    setInsurance(0)
  }, [unlock])

  const dealDisabled = wager <= 0 || wager > balance
  const insuranceCost = Math.ceil(wager / 2)

  const totalAtRisk = useMemo(
    () => hands.reduce((s, h) => s + h.wager, 0) + insurance,
    [hands, insurance],
  )

  return (
    <GameShell
      id="blackjack"
      aside={
        <div className="flex items-center gap-3">
          <ShoeMeter pct={shoePct} remaining={shoeRemaining} />
          {phase !== 'betting' && (
            <Button variant="ghost" size="sm" onClick={newRound} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="size-4" /> New
            </Button>
          )}
        </div>
      }
    >
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="bg-arena scanlines relative overflow-hidden rounded-2xl border border-border p-4 sm:p-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(120% 80% at 50% -10%, rgba(52,226,168,0.14), transparent 55%), radial-gradient(80% 60% at 50% 120%, rgba(52,226,168,0.08), transparent 60%)',
            }}
          />
          <div className="relative flex min-h-[440px] flex-col">
            {/* Dealer */}
            <Seat
              label="Dealer"
              score={dealer.length ? dealerScore.total : null}
              soft={!holeDown && dealerScore.soft}
              hideScore={holeDown}
              accent="#fb7185"
            >
              <AnimatePresence mode="popLayout">
                {dealer.map((c, i) => (
                  <PlayingCard key={c.id} card={c} faceDown={holeDown && i === 1} index={i} />
                ))}
              </AnimatePresence>
            </Seat>

            <div className="my-3 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <span
                className="font-display text-[10px] uppercase tracking-[0.3em]"
                style={{ color: ACCENT }}
              >
                Blackjack pays 3:2
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* Player hand(s) */}
            <div className="flex flex-1 flex-wrap items-start justify-center gap-4">
              {hands.length === 0 && phase === 'betting' && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                  <Layers className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Place your bet and deal in.</p>
                </div>
              )}
              {hands.map((h, i) => {
                const score = handValue(h.cards)
                const isActive = phase === 'player' && i === active && !h.done
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-2 rounded-xl p-2 transition-all ${
                      isActive ? 'bg-[color:var(--bj)]/5 ring-1 ring-[color:var(--bj)]' : ''
                    } ${hands.length > 1 ? 'min-w-[120px]' : ''}`}
                    style={{ ['--bj' as string]: ACCENT }}
                  >
                    <Seat
                      inline
                      label={hands.length > 1 ? `Hand ${i + 1}` : 'You'}
                      score={score.total}
                      soft={score.soft}
                      accent={ACCENT}
                      result={h.result}
                      busted={isBust(h.cards)}
                    >
                      <AnimatePresence mode="popLayout">
                        {h.cards.map((c, ci) => (
                          <PlayingCard key={c.id} card={c} index={ci} />
                        ))}
                      </AnimatePresence>
                    </Seat>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Coins className="size-3 text-gold" />
                      <span className="tnum text-gold">{formatChips(h.wager)}</span>
                      {h.doubled && <Badge variant="outline" className="px-1.5 py-0 text-[9px]">2x</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Controls */}
            <div className="mt-4">
              <AnimatePresence mode="wait">
                {phase === 'betting' && (
                  <BettingControls
                    key="bet"
                    wager={wager}
                    balance={balance}
                    setWager={(v) => {
                      unlock()
                      audio.play('chipBet')
                      setWager(Math.max(5, Math.min(balance, v)))
                    }}
                    adjustWager={adjustWager}
                    onDeal={() => void deal()}
                    dealDisabled={dealDisabled}
                  />
                )}

                {phase === 'insurance' && (
                  <ActionRow key="ins">
                    <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="size-4" style={{ color: ACCENT }} />
                      Dealer shows an Ace — insurance?
                    </div>
                    <Button variant="outline" onClick={() => void takeInsurance(false)}>
                      No
                    </Button>
                    <Button onClick={() => void takeInsurance(true)} className="gap-1.5">
                      <Shield className="size-4" /> Insure {formatChips(insuranceCost)}
                    </Button>
                  </ActionRow>
                )}

                {phase === 'player' && activeHand && (
                  <ActionRow key="play">
                    <Button onClick={hit} className="gap-1.5">
                      <Plus className="size-4" /> Hit
                    </Button>
                    <Button variant="secondary" onClick={stand} className="gap-1.5">
                      <HandCoins className="size-4" /> Stand
                    </Button>
                    <Button variant="outline" onClick={double} disabled={!canDouble} className="gap-1.5">
                      <Copy className="size-4" /> Double
                    </Button>
                    <Button variant="outline" onClick={split} disabled={!canSplit} className="gap-1.5">
                      <SquareStack className="size-4" /> Split
                    </Button>
                  </ActionRow>
                )}

                {(phase === 'dealer' || phase === 'settled') && (
                  <ActionRow key="end">
                    {summary ? (
                      <>
                        <div
                          className="mr-auto font-display text-lg font-bold tnum"
                          style={{
                            color:
                              summary.net > 0 ? 'var(--win)' : summary.net < 0 ? 'var(--loss)' : 'var(--foreground)',
                          }}
                        >
                          {summary.net > 0 ? '+' : ''}
                          {formatChips(summary.net)}
                        </div>
                        <Button onClick={newRound} size="lg" className="gap-1.5">
                          <RotateCcw className="size-4" /> Next hand
                        </Button>
                      </>
                    ) : (
                      <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
                        <Layers className="size-4 animate-pulse" style={{ color: ACCENT }} /> Dealer playing…
                      </div>
                    )}
                  </ActionRow>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer status strip */}
        <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span>6-deck shoe · dealer stands on all 17 · insurance 2:1</span>
          {totalAtRisk > 0 && phase !== 'settled' && (
            <span className="tnum">
              At risk <span className="text-gold">{formatChips(totalAtRisk)}</span>
            </span>
          )}
        </div>
      </div>
    </GameShell>
  )
}

function ShoeMeter({ pct, remaining }: { pct: number; remaining: number }) {
  return (
    <div className="hidden items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 sm:flex">
      <SquareStack className="size-3.5 text-muted-foreground" />
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }}
        />
      </div>
      <span className="tnum text-[10px] text-muted-foreground">{remaining}</span>
    </div>
  )
}

function Seat({
  label,
  score,
  soft,
  hideScore,
  accent,
  result,
  busted,
  inline,
  children,
}: {
  label: string
  score: number | null
  soft?: boolean
  hideScore?: boolean
  accent: string
  result?: Outcome | null
  busted?: boolean
  inline?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={inline ? '' : 'flex flex-col items-center gap-2'}>
      <div className="flex items-center gap-2">
        <span className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
        {score !== null && !hideScore && (
          <span
            className="tnum rounded-full px-2 py-0.5 text-xs font-bold"
            style={{
              color: busted ? 'var(--loss)' : accent,
              background: busted ? 'rgba(251,113,133,0.12)' : `${accent}1f`,
            }}
          >
            {soft && score <= 21 ? `${score - 10}/${score}` : score}
          </span>
        )}
        {result && (
          <Badge variant={OUTCOME_META[result].variant} className="px-2 py-0 text-[10px]">
            {OUTCOME_META[result].label}
          </Badge>
        )}
      </div>
      <div className="flex min-h-[clamp(56px,13vw,84px)] items-center justify-center gap-1.5">{children}</div>
    </div>
  )
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card/60 p-3 backdrop-blur-sm sm:flex-nowrap"
    >
      {children}
    </motion.div>
  )
}

function BettingControls({
  wager,
  balance,
  setWager,
  adjustWager,
  onDeal,
  dealDisabled,
}: {
  wager: number
  balance: number
  setWager: (v: number) => void
  adjustWager: (delta: number) => void
  onDeal: () => void
  dealDisabled: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setWager(wager + c)}
            disabled={wager + c > balance}
            className="group relative flex size-12 items-center justify-center rounded-full border-2 font-display text-xs font-bold tnum transition-all hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
            style={{
              borderColor: ACCENT,
              color: ACCENT,
              background: `radial-gradient(circle at 50% 30%, ${ACCENT}22, #0c1a17)`,
              boxShadow: `0 0 12px ${ACCENT}33, inset 0 0 0 4px #0c1a1799`,
            }}
            aria-label={`Add ${c} chips`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon-sm" onClick={() => adjustWager(-5)} disabled={wager <= 5}>
          <Minus className="size-4" />
        </Button>
        <div className="flex min-w-[120px] flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Wager</span>
          <span className="tnum font-display text-2xl font-bold text-gold">{formatChips(wager)}</span>
        </div>
        <Button variant="outline" size="icon-sm" onClick={() => adjustWager(5)} disabled={wager + 5 > balance}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setWager(5)} className="text-xs text-muted-foreground">
          Min
        </Button>
        <Button
          size="lg"
          onClick={onDeal}
          disabled={dealDisabled}
          className="gap-2 px-8"
          style={dealDisabled ? undefined : { boxShadow: `0 0 22px ${ACCENT}55` }}
        >
          <Layers className="size-5" /> Deal
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWager(Math.max(5, balance))}
          disabled={balance < 5}
          className="text-xs text-muted-foreground"
        >
          Max
        </Button>
      </div>
    </motion.div>
  )
}
