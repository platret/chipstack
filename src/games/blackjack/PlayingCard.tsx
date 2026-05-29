import { motion } from 'framer-motion'
import { isRed, type Card, type Suit } from './engine'

const SUIT_GLYPH: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }

const ACCENT = '#34e2a8'

function Pip({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <span className={className} style={{ color: isRed(suit) ? 'var(--loss)' : '#e9e9f6' }}>
      {SUIT_GLYPH[suit]}
    </span>
  )
}

function CardFace({ card }: { card: Card }) {
  const color = isRed(card.suit) ? 'var(--loss)' : '#e9e9f6'
  return (
    <div className="absolute inset-0 flex flex-col justify-between rounded-[0.6rem] border border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#0e0e1a] p-1.5 [backface-visibility:hidden]">
      <div className="flex flex-col items-start leading-none" style={{ color }}>
        <span className="font-display text-[0.95em] font-bold tnum">{card.rank}</span>
        <Pip suit={card.suit} className="text-[0.85em] leading-none" />
      </div>
      <div className="flex items-center justify-center">
        <Pip suit={card.suit} className="text-[2.1em] leading-none drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
      </div>
      <div className="flex rotate-180 flex-col items-start leading-none" style={{ color }}>
        <span className="font-display text-[0.95em] font-bold tnum">{card.rank}</span>
        <Pip suit={card.suit} className="text-[0.85em] leading-none" />
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div
      className="absolute inset-0 rounded-[0.6rem] border border-[color:var(--bj-accent)]/40 [backface-visibility:hidden] [transform:rotateY(180deg)]"
      style={{
        background:
          'repeating-linear-gradient(45deg, rgba(52,226,168,0.18) 0 6px, rgba(52,226,168,0.05) 6px 12px), #0c1a17',
        boxShadow: 'inset 0 0 0 2px rgba(52,226,168,0.25), 0 0 14px rgba(52,226,168,0.2)',
      }}
    >
      <div className="absolute inset-2 rounded-md border border-[color:var(--bj-accent)]/30" />
    </div>
  )
}

/**
 * Animated playing card. Deals in from above and, when `faceDown` flips to false,
 * rotates on the Y axis to reveal the face. `index` staggers multi-card deals.
 */
export function PlayingCard({
  card,
  faceDown = false,
  index = 0,
}: {
  card: Card
  faceDown?: boolean
  index?: number
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -56, x: 26, rotate: -8 }}
      animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30, delay: index * 0.08 }}
      className="relative h-[clamp(56px,13vw,84px)] w-[clamp(40px,9.2vw,60px)] shrink-0 [perspective:700px]"
      style={{ ['--bj-accent' as string]: ACCENT }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <CardFace card={card} />
        <CardBack />
      </motion.div>
    </motion.div>
  )
}
