import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { GameShell } from '@/components/GameShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { keyLabel } from '@/lib/keys'
import { formatChips } from '@/lib/format'
import { useSettings } from '@/store/settings'
import { useStats } from '@/store/stats'
import { useWallet } from '@/store/wallet'
import type { TetrisEngine } from './engine'
import { PiecePreview } from './PiecePreview'
import { TetrisHud } from './TetrisHud'
import { useTetris } from './useTetris'

interface BetType {
  id: 'lines' | 'survive' | 'level'
  label: string
  unit: string
  min: number
  max: number
  step: number
  mult: (t: number) => number
}
const BET_TYPES: BetType[] = [
  { id: 'lines', label: 'Clear lines', unit: 'lines', min: 5, max: 40, step: 5, mult: (t) => 1 + t * 0.18 },
  { id: 'survive', label: 'Survive', unit: 'sec', min: 30, max: 300, step: 30, mult: (t) => 1 + t / 90 },
  { id: 'level', label: 'Reach level', unit: 'lvl', min: 3, max: 20, step: 1, mult: (t) => 1 + (t - 1) * 0.45 },
]

interface ActiveBet {
  typeId: BetType['id']
  target: number
  wager: number
  payout: number
}
interface OverInfo {
  score: number
  lines: number
  level: number
  betWon: boolean | null
  betPayout: number
}

function CountdownOverlay({ engineRef }: { engineRef: React.RefObject<TetrisEngine | null> }) {
  const [n, setN] = useState(3)
  useEffect(() => {
    let raf = 0
    const t = () => {
      const e = engineRef.current
      if (e) setN(Math.max(0, Math.ceil(e.countdownTimer / 1000)))
      raf = requestAnimationFrame(t)
    }
    raf = requestAnimationFrame(t)
    return () => cancelAnimationFrame(raf)
  }, [engineRef])
  return (
    <motion.div
      key={n}
      initial={{ scale: 1.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="font-display text-7xl font-black text-primary text-glow"
    >
      {n > 0 ? n : 'GO'}
    </motion.div>
  )
}

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { engineRef, status, view, flashes, start, pause, resume, setOnGameOver } = useTetris(canvasRef)
  const bettingEnabled = useSettings((s) => s.gameplay.bettingEnabled)
  const keybinds = useSettings((s) => s.keybinds)
  const balance = useWallet((s) => s.balance)
  const highScore = useStats((s) => s.tetris.highScore)

  const [over, setOver] = useState<OverInfo | null>(null)
  const activeBetRef = useRef<ActiveBet | null>(null)

  // bet config
  const [betTypeId, setBetTypeId] = useState<BetType['id']>('lines')
  const [betTarget, setBetTarget] = useState(10)
  const [wager, setWager] = useState(50)
  const betType = BET_TYPES.find((b) => b.id === betTypeId)!
  const payout = Math.floor(wager * betType.mult(betTarget))

  useEffect(() => {
    setOnGameOver((s) => {
      const bet = activeBetRef.current
      let betWon: boolean | null = null
      let betPayout = 0
      if (bet) {
        const elapsed = engineRef.current?.elapsedMs ?? 0
        const achieved =
          bet.typeId === 'lines'
            ? s.lines >= bet.target
            : bet.typeId === 'level'
              ? s.level >= bet.target
              : elapsed >= bet.target * 1000
        betWon = achieved
        if (achieved) {
          betPayout = bet.payout
          useWallet.getState().payout(bet.payout)
          toast({ title: `Bet won! +${formatChips(bet.payout)}`, description: 'Target reached.', variant: 'win' })
        } else {
          toast({ title: 'Bet lost', description: 'Target not reached.', variant: 'accent' })
        }
      }
      activeBetRef.current = null
      setOver({ ...s, betWon, betPayout })
    })
  }, [setOnGameOver, engineRef])

  function handleStart() {
    setOver(null)
    if (bettingEnabled && wager > 0) {
      if (!useWallet.getState().bet(wager)) {
        toast({ title: 'Not enough chips', description: 'Lower your wager or add chips.', variant: 'accent' })
        return
      }
      activeBetRef.current = { typeId: betTypeId, target: betTarget, wager, payout }
      toast({ title: 'Bet placed', description: `${betType.label} ${betTarget} ${betType.unit} · pays ${formatChips(payout)}` })
    } else {
      activeBetRef.current = null
    }
    start()
  }

  const showReady = status === 'ready'
  const showOver = status === 'over'

  return (
    <GameShell
      id="tetris"
      aside={
        <div className="flex items-center gap-2">
          {status === 'playing' && (
            <Button variant="outline" size="sm" onClick={pause} className="gap-1.5">
              <Pause className="size-4" /> Pause
            </Button>
          )}
          {status === 'paused' && (
            <Button variant="outline" size="sm" onClick={resume} className="gap-1.5">
              <Play className="size-4" /> Resume
            </Button>
          )}
          {(status === 'playing' || status === 'paused') && (
            <Button variant="ghost" size="sm" onClick={handleStart} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="size-4" /> Restart
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap items-start justify-center gap-4 lg:gap-6">
        {/* Left: hold + controls */}
        <div className="order-2 flex w-40 shrink-0 flex-col gap-3 lg:order-1">
          <div className="rounded-lg border border-border bg-card/50 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Hold</p>
            <div className="flex h-16 items-center justify-center">
              <PiecePreview type={view.hold} cell={view.canHold ? 15 : 13} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card/50 p-3 text-xs text-muted-foreground">
            <p className="mb-2 text-[10px] uppercase tracking-[0.15em]">Controls</p>
            <ul className="space-y-1">
              <li className="flex justify-between"><span>Move</span><kbd className="font-mono text-foreground">{keyLabel(keybinds.moveLeft)} {keyLabel(keybinds.moveRight)}</kbd></li>
              <li className="flex justify-between"><span>Rotate</span><kbd className="font-mono text-foreground">{keyLabel(keybinds.rotateCCW)} {keyLabel(keybinds.rotateCW)}</kbd></li>
              <li className="flex justify-between"><span>Hard drop</span><kbd className="font-mono text-foreground">{keyLabel(keybinds.hardDrop)}</kbd></li>
              <li className="flex justify-between"><span>Hold</span><kbd className="font-mono text-foreground">{keyLabel(keybinds.hold)}</kbd></li>
              <li className="flex justify-between"><span>Pause</span><kbd className="font-mono text-foreground">{keyLabel(keybinds.pause)}</kbd></li>
            </ul>
          </div>
        </div>

        {/* Center: board */}
        <div className="relative order-1 mx-auto h-[min(74vh,660px)] aspect-[1/2] overflow-hidden rounded-xl border border-border bg-black/40 box-glow lg:order-2">
          <canvas ref={canvasRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

          {/* clear-text flashes */}
          <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex flex-col items-center gap-1">
            <AnimatePresence>
              {flashes.map((f) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 16, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  className={`font-display font-black tracking-wide ${
                    f.big ? 'text-3xl text-accent text-glow-accent' : 'text-xl text-primary text-glow'
                  }`}
                >
                  {f.label}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* overlays */}
          <AnimatePresence>
            {status === 'countdown' && (
              <motion.div
                key="cd"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
              >
                <CountdownOverlay engineRef={engineRef} />
              </motion.div>
            )}

            {status === 'paused' && (
              <motion.div
                key="pause"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm"
              >
                <p className="font-display text-3xl font-black text-foreground">PAUSED</p>
                <Button onClick={resume} className="gap-2"><Play className="size-4" /> Resume</Button>
              </motion.div>
            )}

            {showReady && (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/75 p-4 backdrop-blur-sm"
              >
                <p className="font-display text-3xl font-black text-primary text-glow">READY</p>
                {bettingEnabled && (
                  <BetPanel
                    betTypeId={betTypeId}
                    setBetTypeId={setBetTypeId}
                    betTarget={betTarget}
                    setBetTarget={setBetTarget}
                    wager={wager}
                    setWager={setWager}
                    payout={payout}
                    balance={balance}
                  />
                )}
                <Button size="lg" onClick={handleStart} className="gap-2">
                  <Play className="size-5" /> {bettingEnabled && wager > 0 ? `Bet ${formatChips(wager)} & Play` : 'Play'}
                </Button>
              </motion.div>
            )}

            {showOver && over && (
              <motion.div
                key="over"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center backdrop-blur-sm"
              >
                <p className="font-display text-3xl font-black text-accent text-glow-accent">GAME OVER</p>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-[10px] uppercase text-muted-foreground">Score</p><p className="tnum font-display text-xl font-bold text-primary">{formatChips(over.score)}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">Lines</p><p className="tnum font-display text-xl font-bold">{over.lines}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">Level</p><p className="tnum font-display text-xl font-bold">{over.level}</p></div>
                </div>
                {over.score >= highScore && over.score > 0 && (
                  <Badge variant="gold" className="gap-1"><Trophy className="size-3.5" /> New high score</Badge>
                )}
                {over.betWon !== null && (
                  <Badge variant={over.betWon ? 'win' : 'outline'}>
                    {over.betWon ? `Bet won +${formatChips(over.betPayout)}` : 'Bet lost'}
                  </Badge>
                )}
                <Button size="lg" onClick={handleStart} className="mt-1 gap-2"><RotateCcw className="size-5" /> Play again</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: next + HUD */}
        <div className="order-3 flex w-44 shrink-0 flex-col gap-3">
          <TetrisHud engineRef={engineRef} />
          <div className="rounded-lg border border-border bg-card/50 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Next</p>
            <div className="flex flex-col items-center gap-1">
              {view.queue.map((t, i) => (
                <PiecePreview key={i} type={t} cell={i === 0 ? 15 : 12} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  )
}

function BetPanel({
  betTypeId,
  setBetTypeId,
  betTarget,
  setBetTarget,
  wager,
  setWager,
  payout,
  balance,
}: {
  betTypeId: BetType['id']
  setBetTypeId: (v: BetType['id']) => void
  betTarget: number
  setBetTarget: (v: number) => void
  wager: number
  setWager: (v: number) => void
  payout: number
  balance: number
}) {
  const betType = BET_TYPES.find((b) => b.id === betTypeId)!
  return (
    <div className="w-full max-w-xs rounded-lg border border-border bg-card/70 p-3 text-left">
      <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Optional wager</p>
      <div className="mb-2 grid grid-cols-3 gap-1">
        {BET_TYPES.map((b) => (
          <Button
            key={b.id}
            size="sm"
            variant={b.id === betTypeId ? 'default' : 'secondary'}
            className="px-1 text-[11px]"
            onClick={() => {
              setBetTypeId(b.id)
              setBetTarget(b.min * 2 < b.max ? b.min * 2 : b.min)
            }}
          >
            {b.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <label className="flex-1">
          <span className="text-muted-foreground">Target ({betType.unit})</span>
          <Input
            type="number"
            min={betType.min}
            max={betType.max}
            step={betType.step}
            value={betTarget}
            onChange={(e) => setBetTarget(Math.max(betType.min, Math.min(betType.max, Number(e.target.value) || betType.min)))}
            className="mt-1 h-8"
          />
        </label>
        <label className="flex-1">
          <span className="text-muted-foreground">Wager</span>
          <Input
            type="number"
            min={0}
            value={wager}
            onChange={(e) => setWager(Math.max(0, Math.min(balance, Number(e.target.value) || 0)))}
            className="mt-1 h-8"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Pays <span className="font-semibold text-win">{formatChips(payout)}</span> · {betType.mult(betTarget).toFixed(2)}×
      </p>
    </div>
  )
}
