import { motion } from 'framer-motion'
import { Club, Diamond, Heart, Lock, Spade } from 'lucide-react'
import type { Card, Suit } from './cards'
import { RANK_LABEL, RED_SUITS } from './cards'

const ACCENT = '#22d3ee'

const SuitIcon: Record<Suit, typeof Spade> = {
  s: Spade,
  h: Heart,
  d: Diamond,
  c: Club,
}

function CardFace({ card, big }: { card: Card; big?: boolean }) {
  const red = RED_SUITS.has(card.suit)
  const Icon = SuitIcon[card.suit]
  const color = red ? 'var(--loss)' : 'var(--foreground)'
  return (
    <div className="absolute inset-0 flex flex-col justify-between rounded-[inherit] bg-gradient-to-b from-[#f7f8ff] to-[#dfe2f2] p-1.5 [backface-visibility:hidden] [transform:rotateY(0deg)]">
      <div className="flex items-center justify-between leading-none" style={{ color }}>
        <span className="font-display font-bold tnum" style={{ fontSize: big ? 18 : 13 }}>
          {RANK_LABEL[card.rank]}
        </span>
        <Icon className="shrink-0 fill-current" style={{ width: big ? 14 : 11, height: big ? 14 : 11 }} />
      </div>
      <div className="flex flex-1 items-center justify-center" style={{ color }}>
        <Icon className="fill-current opacity-90" style={{ width: big ? 40 : 30, height: big ? 40 : 30 }} />
      </div>
      <div className="flex rotate-180 items-center justify-between leading-none" style={{ color }}>
        <span className="font-display font-bold tnum" style={{ fontSize: big ? 18 : 13 }}>
          {RANK_LABEL[card.rank]}
        </span>
        <Icon className="shrink-0 fill-current" style={{ width: big ? 14 : 11, height: big ? 14 : 11 }} />
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div
      className="absolute inset-0 rounded-[inherit] border border-[color:var(--border)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
      style={{
        background:
          'repeating-linear-gradient(45deg, #0c1b22 0 6px, #102a33 6px 12px)',
        boxShadow: `inset 0 0 0 3px rgba(34,211,238,0.35), inset 0 0 14px rgba(34,211,238,0.2)`,
      }}
    >
      <div className="absolute inset-1.5 rounded-md border border-[rgba(34,211,238,0.45)]" />
    </div>
  )
}

export function PlayingCard({
  card,
  faceUp,
  held,
  dealing,
  index,
  onToggleHold,
  disabled,
}: {
  card: Card | null
  faceUp: boolean
  held: boolean
  dealing: boolean
  index: number
  onToggleHold: () => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        disabled={disabled || !card}
        onClick={onToggleHold}
        aria-pressed={held}
        aria-label={held ? 'Held' : 'Tap to hold'}
        initial={false}
        animate={{
          y: dealing ? -14 : held ? -10 : 0,
          opacity: card ? 1 : 0,
          scale: held ? 1.04 : 1,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 24, delay: dealing ? index * 0.08 : 0 }}
        className="group relative aspect-[5/7] w-[clamp(48px,17vw,84px)] rounded-lg outline-none disabled:cursor-default"
        style={{ perspective: 800 }}
        whileHover={card && !disabled ? { y: held ? -14 : -4 } : undefined}
      >
        <motion.div
          className="relative h-full w-full rounded-lg [transform-style:preserve-3d]"
          animate={{ rotateY: faceUp ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: dealing ? index * 0.08 : 0 }}
          style={{
            boxShadow: held
              ? `0 0 0 2px ${ACCENT}, 0 0 18px rgba(34,211,238,0.55)`
              : '0 6px 16px rgba(0,0,0,0.5)',
          }}
        >
          {card && <CardFace card={card} />}
          <CardBack />
        </motion.div>
      </motion.button>

      <motion.div
        initial={false}
        animate={{ opacity: held ? 1 : 0, y: held ? 0 : -4 }}
        transition={{ duration: 0.15 }}
        className="pointer-events-none flex h-5 items-center gap-1 rounded-full bg-[rgba(34,211,238,0.16)] px-2 text-[10px] font-bold uppercase tracking-wider text-[color:var(--win)]"
        style={{ color: ACCENT }}
      >
        <Lock className="size-3" /> Hold
      </motion.div>
    </div>
  )
}
