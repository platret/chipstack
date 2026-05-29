/* Star feature — animated meme callout banners. Phrase + intensity chosen by win size /
   top symbol. Affectionate Young Sheldon parody flavor (catchphrases as text only). */

import { AnimatePresence, motion } from 'framer-motion'
import type { SymbolId } from './config'

export type MemeTier = 'small' | 'big' | 'huge'

export interface Meme {
  id: number
  text: string
  tier: MemeTier
}

const SMALL_LINES = ['Bazinga!', 'Knock knock knock, Penny.', 'Fun with Flags!', 'Soft Kitty, warm kitty...']
const SHELDON_LINES = ["That's my spot.", "I'm not crazy — my mother had me tested.", 'HOT DAMN!']
const HUGE_LINES = ['Sheldon Lee Cooper, you dog!', 'Bazinga, you son of a gun!', 'HOT DAMN!']

let counter = 1

/** Pick a meme by win magnitude (x total bet) + the top winning symbol. */
export function pickMeme(winXBet: number, topSymbol: SymbolId | null, scatter: boolean, seed: number): Meme {
  const r = ((Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0) / 4294967296)
  let pool: string[]
  let tier: MemeTier
  if (winXBet >= 30 || (scatter && winXBet >= 12)) {
    tier = 'huge'
    pool = HUGE_LINES
  } else if (winXBet >= 8 || topSymbol === 'SHELDON' || scatter) {
    tier = 'big'
    pool = SHELDON_LINES
  } else {
    tier = 'small'
    pool = SMALL_LINES
  }
  const text = pool[Math.floor(r * pool.length)] ?? pool[0]!
  return { id: counter++, text, tier }
}

const TIER_STYLE: Record<MemeTier, { color: string; glow: string; size: string; rotate: number }> = {
  small: { color: '#fcd34d', glow: 'rgba(252,211,77,0.5)', size: 'text-2xl sm:text-3xl', rotate: -3 },
  big: { color: '#fb923c', glow: 'rgba(251,146,60,0.6)', size: 'text-3xl sm:text-5xl', rotate: -4 },
  huge: { color: '#f43f5e', glow: 'rgba(244,63,94,0.7)', size: 'text-4xl sm:text-6xl', rotate: -5 },
}

export function MemeBanner({ meme }: { meme: Meme | null }) {
  return (
    <AnimatePresence mode="popLayout">
      {meme && (
        <motion.div
          key={meme.id}
          initial={{ opacity: 0, scale: 0.4, rotate: TIER_STYLE[meme.tier].rotate - 8, y: 8 }}
          animate={{ opacity: 1, scale: 1, rotate: TIER_STYLE[meme.tier].rotate, y: 0 }}
          exit={{ opacity: 0, scale: 1.25, y: -16 }}
          transition={{ type: 'spring', stiffness: 420, damping: 14, mass: 0.7 }}
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
        >
          <motion.span
            animate={
              meme.tier === 'huge'
                ? { scale: [1, 1.06, 1], rotate: [TIER_STYLE.huge.rotate, TIER_STYLE.huge.rotate + 2, TIER_STYLE.huge.rotate] }
                : {}
            }
            transition={{ repeat: meme.tier === 'huge' ? Infinity : 0, duration: 0.6, ease: 'easeInOut' }}
            className={`select-none text-center font-display font-black uppercase tracking-tight ${TIER_STYLE[meme.tier].size}`}
            style={{
              color: TIER_STYLE[meme.tier].color,
              WebkitTextStroke: '2px rgba(0,0,0,0.85)',
              textShadow: `0 0 18px ${TIER_STYLE[meme.tier].glow}, 0 4px 0 rgba(0,0,0,0.55)`,
              paintOrder: 'stroke fill',
            }}
          >
            {meme.text}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
