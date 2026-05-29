import { motion } from 'framer-motion'
import { ArrowRight, Blocks, Cherry, CircleDot, Diamond, Spade, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { audio } from '@/lib/audio'
import { cn } from '@/lib/utils'
import type { GameId, GameMeta } from '@/types/game'

const ICONS: Record<GameId, LucideIcon> = {
  tetris: Blocks,
  slots: Cherry,
  blackjack: Spade,
  roulette: CircleDot,
  videopoker: Diamond,
}

export function GameCard({ game, featured = false }: { game: GameMeta; featured?: boolean }) {
  const Icon = ICONS[game.id]
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(featured && 'sm:col-span-2 sm:row-span-2')}
    >
      <Link
        to={game.route}
        onMouseEnter={() => audio.play('hover')}
        onClick={() => audio.unlock()}
        className={cn(
          'group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors hover:border-[color:var(--ga)]',
          featured ? 'min-h-[18rem]' : 'min-h-[12rem]',
        )}
        style={{ ['--ga' as string]: game.accent }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-25 blur-3xl transition-opacity group-hover:opacity-50"
          style={{ background: game.accent }}
          aria-hidden
        />
        <div className="relative flex items-start justify-between">
          <div
            className="flex size-12 items-center justify-center rounded-lg border border-border"
            style={{ color: game.accent, background: `${game.accent}1a` }}
          >
            <Icon className={featured ? 'size-7' : 'size-6'} />
          </div>
          {game.kind === 'casino' ? (
            <Badge variant="outline" className="uppercase tracking-wider">Casino</Badge>
          ) : (
            <Badge variant="default" className="uppercase tracking-wider">Arcade</Badge>
          )}
        </div>

        <div className="relative mt-4">
          <h3 className={cn('font-display font-bold tracking-tight', featured ? 'text-3xl' : 'text-xl')}>
            {game.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{game.tagline}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground/80">{game.highlight}</span>
            <span
              className="inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
              style={{ color: game.accent }}
            >
              Play <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
