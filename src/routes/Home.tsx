import { motion } from 'framer-motion'
import { Coins, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GameCard } from '@/components/GameCard'
import { AddChipsDialog } from '@/components/AddChipsDialog'
import { Button } from '@/components/ui/button'
import { formatChips } from '@/lib/format'
import { GAMES } from '@/types/game'
import { useWallet } from '@/store/wallet'

export function Home() {
  const balance = useWallet((s) => s.balance)
  const biggestWin = useWallet((s) => s.biggestWin)

  return (
    <div className="flex flex-col gap-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-8 sm:p-12"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-72 rounded-full bg-accent/15 blur-3xl" aria-hidden />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-win" /> Play money only · no real cash, ever
          </span>
          <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-6xl">
            <span className="text-foreground">CHIP</span>
            <span className="text-primary text-glow">STACK</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            A neon arcade — guideline-grade Tetris with full SRS, 7-bag and tunable DAS/ARR,
            plus a four-game play-money casino. Free chips on tap.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/play/tetris">Play Tetris</Link>
            </Button>
            <AddChipsDialog
              trigger={
                <Button variant="gold" size="lg" className="gap-2">
                  <Coins className="size-5" /> Add Chips
                </Button>
              }
            />
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Balance</p>
              <p className="tnum font-display text-xl font-bold text-gold">{formatChips(balance)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Biggest win</p>
              <p className="tnum font-display text-xl font-bold text-win">{formatChips(biggestWin)}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <section>
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Choose your game
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} featured={game.id === 'tetris'} />
          ))}
        </div>
      </section>
    </div>
  )
}
