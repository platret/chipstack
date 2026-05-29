/* Neon SVG glyphs for the paytable (mirror the canvas tiles in drawSymbol.ts).
   Original Greek/Olympus art on a 0..100 viewBox — no emoji. */

import type * as React from 'react'
import { SYMBOL_COLORS, type SymbolId } from './config'

interface GlyphProps {
  color: string
  size?: number
  className?: string
}

function Frame({ color, size = 40, className, children }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ filter: `drop-shadow(0 0 4px ${color}99)` }}
      aria-hidden
    >
      {children}
    </svg>
  )
}

function Gem({ color, facet = 0, ...p }: GlyphProps & { facet?: number }) {
  return (
    <Frame color={color} {...p}>
      <polygon
        points="34,24 66,24 82,44 50,84 18,44"
        fill={`${color}2e`}
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path
        d="M18 44 H82 M34 24 L42 44 L50 84 M66 24 L58 44 L50 84"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {facet % 2 === 0 && (
        <path d="M42 44 L50 32 L58 44" fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
      )}
      <circle cx={40 + (facet % 3) * 4} cy={36} r={2.6} fill="#ffffff" />
    </Frame>
  )
}

function Crown({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <polygon
        points="18,70 24,34 38,58 50,26 62,58 76,34 82,70"
        fill={`${color}2e`}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <rect x="18" y="72" width="64" height="12" rx="4" fill="none" stroke={color} strokeWidth={5} />
      <circle cx="24" cy="34" r="3.2" fill="#ffffff" />
      <circle cx="50" cy="26" r="3.2" fill="#ffffff" />
      <circle cx="76" cy="34" r="3.2" fill="#ffffff" />
    </Frame>
  )
}

function Ring({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path
        d="M26 64 A24 24 0 0 0 74 64"
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M34 64 A16 16 0 0 0 66 64"
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <polygon
        points="50,14 64,28 50,44 36,28"
        fill={`${color}38`}
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path d="M36 28 H64 M50 14 V44" fill="none" stroke={color} strokeWidth={2.2} />
    </Frame>
  )
}

function Chalice({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path
        d="M28 24 H72 C70 48 60 56 50 56 C40 56 30 48 28 24 Z"
        fill={`${color}2e`}
        stroke={color}
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      <path d="M50 56 V76 M34 82 H66 M40 76 H60" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <circle cx="40" cy="30" r="2.6" fill="#ffffff" />
    </Frame>
  )
}

function Hourglass({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path d="M26 20 H74 M26 80 H74" stroke={color} strokeWidth={5} strokeLinecap="round" />
      <path
        d="M30 20 H70 L52 50 L70 80 H30 L48 50 Z"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <polygon points="36,26 64,26 52,46 48,46" fill={`${color}88`} />
      <rect x="46" y="58" width="8" height="16" fill={`${color}88`} />
    </Frame>
  )
}

function Orb({ color, ...p }: GlyphProps) {
  const id = `orbg-${color.replace('#', '')}`
  return (
    <Frame color={color} {...p}>
      <defs>
        <radialGradient id={id} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
          <stop offset="38%" stopColor={color} stopOpacity={0.95} />
          <stop offset="100%" stopColor={color} stopOpacity={0.18} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="38" fill={`url(#${id})`} stroke="#ffffffcc" strokeWidth={3} />
      <polygon
        points="56,26 42,50 52,50 44,74 62,46 50,46"
        fill="none"
        stroke="#fff7ed"
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
    </Frame>
  )
}

function Temple({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <polygon
        points="50,16 84,40 16,40"
        fill={`${color}2e`}
        stroke={color}
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      <path d="M18 46 H82" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <path
        d="M26 50 V80 M42 50 V80 M58 50 V80 M74 50 V80"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path d="M16 84 H84" stroke={color} strokeWidth={4.5} strokeLinecap="round" />
      <path d="M52 20 L46 30 L51 30 L47 40" fill="none" stroke="#ffffffdd" strokeWidth={2.4} strokeLinejoin="round" />
    </Frame>
  )
}

const GLYPHS: Record<SymbolId, (p: GlyphProps) => React.ReactElement> = {
  CROWN: Crown,
  RING: Ring,
  CHALICE: Chalice,
  HOURGLASS: Hourglass,
  RED: (p) => <Gem {...p} facet={0} />,
  PURPLE: (p) => <Gem {...p} facet={1} />,
  YELLOW: (p) => <Gem {...p} facet={2} />,
  GREEN: (p) => <Gem {...p} facet={3} />,
  BLUE: (p) => <Gem {...p} facet={4} />,
  ORB: Orb,
  SCATTER: Temple,
}

export function SymbolGlyph({ id, size, className }: { id: SymbolId; size?: number; className?: string }) {
  const G = GLYPHS[id]
  return <G color={SYMBOL_COLORS[id]} size={size} className={className} />
}
