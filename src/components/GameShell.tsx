import { ArrowLeft } from 'lucide-react'
import type * as React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { gameById, type GameId } from '@/types/game'

export function GameShell({
  id,
  children,
  aside,
}: {
  id: GameId
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  const meta = gameById(id)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to="/" aria-label="Back to home">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight" style={{ color: meta.accent }}>
              {meta.title}
            </h1>
            <p className="text-xs text-muted-foreground">{meta.tagline}</p>
          </div>
        </div>
        {aside}
      </div>
      {children}
    </div>
  )
}

export function ComingSoon({ id }: { id: GameId }) {
  const meta = gameById(id)
  return (
    <GameShell id={id}>
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
        <p className="font-display text-2xl font-bold" style={{ color: meta.accent }}>
          {meta.title}
        </p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          This game module is being built. {meta.highlight}.
        </p>
      </div>
    </GameShell>
  )
}
