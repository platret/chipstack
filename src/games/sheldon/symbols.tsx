/* Neon SVG glyphs for the paytable (mirror the canvas tiles in drawSymbol.ts).
   Original parody monograms + props, no emoji, drawn on a 0..100 viewBox. */

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

function Mono({ ch, color, fontSize = 50, x = 50, y = 56 }: { ch: string; color: string; fontSize?: number; x?: number; y?: number }) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontFamily="Orbitron, system-ui, sans-serif"
      fontWeight={900}
      fontSize={fontSize}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {ch}
    </text>
  )
}

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return pts.join(' ')
}

function Bazinga({ color, ...p }: GlyphProps) {
  const pts: string[] = []
  const spikes = 12
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 44 : 32
    const a = (Math.PI / spikes) * i - Math.PI / 2
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`)
  }
  return (
    <Frame color={color} {...p}>
      <polygon points={pts.join(' ')} fill="none" stroke={color} strokeWidth={4.5} strokeLinejoin="round" />
      <Mono ch="B!" color={color} fontSize={38} y={54} />
    </Frame>
  )
}

function Scatter({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <rect x="16" y="28" width="68" height="48" rx="12" fill="none" stroke={color} strokeWidth={5} />
      <path d="M28 28 L40 76 M72 28 L60 76" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Mono ch="POW" color={color} fontSize={17} y={52} />
    </Frame>
  )
}

function Sheldon({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path
        d="M30 20 L46 20 L38 30 L54 30 L46 20 L70 20 L54 30 Z"
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <Mono ch="S" color={color} fontSize={50} y={62} />
    </Frame>
  )
}

function Meemaw({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      {[
        [34, -18],
        [50, 0],
        [66, 18],
      ].map(([tx, rot], i) => (
        <rect
          key={i}
          x={-10}
          y={-16}
          width={20}
          height={30}
          rx={3}
          fill="none"
          stroke={color}
          strokeWidth={3}
          transform={`translate(${tx} 66) rotate(${rot})`}
        />
      ))}
      <Mono ch="M" color={color} fontSize={38} y={34} />
    </Frame>
  )
}

function George({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <Mono ch="G" color={color} fontSize={50} x={44} y={50} />
      <circle cx="70" cy="64" r="12" fill="none" stroke={color} strokeWidth={4} />
      <path d="M70 52 L84 46 L84 58 Z" fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" />
    </Frame>
  )
}

function Mary({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path
        d="M50 82 C16 56 22 24 50 38 C78 24 84 56 50 82 Z"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Mono ch="M" color={color} fontSize={34} y={52} />
    </Frame>
  )
}

function Missy({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <Mono ch="T" color={color} fontSize={46} y={50} />
      <path
        d="M24 34 Q14 58 22 80 M76 34 Q86 58 78 80"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </Frame>
  )
}

function BowTie({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path
        d="M50 50 L20 32 L20 68 Z M50 50 L80 32 L80 68 Z"
        fill="none"
        stroke={color}
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="8" fill={color} />
    </Frame>
  )
}

function Glasses({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <circle cx="30" cy="54" r="17" fill="none" stroke={color} strokeWidth={4.5} />
      <circle cx="70" cy="54" r="17" fill="none" stroke={color} strokeWidth={4.5} />
      <path d="M47 50 H53 M13 48 L6 40 M87 48 L94 40" stroke={color} strokeWidth={4.5} strokeLinecap="round" />
    </Frame>
  )
}

function Comic({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <rect x="24" y="20" width="52" height="60" rx="4" fill="none" stroke={color} strokeWidth={4} />
      <path d="M38 20 V80" stroke={color} strokeWidth={3} />
      <polygon points={starPoints(58, 40, 11, 5)} fill={color} />
    </Frame>
  )
}

function Train({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <rect x="18" y="44" width="46" height="24" rx="4" fill="none" stroke={color} strokeWidth={4} />
      <path d="M64 68 L64 54 L78 54 L84 68 Z" fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" />
      <rect x="40" y="30" width="16" height="14" rx="2" fill="none" stroke={color} strokeWidth={4} />
      <path d="M26 44 L26 32 L34 32 L34 44" fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" />
      {[28, 50, 74].map((wx) => (
        <circle key={wx} cx={wx} cy={74} r={7} fill="none" stroke={color} strokeWidth={4} />
      ))}
    </Frame>
  )
}

function TexasStar({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth={3.5} />
      <polygon points={starPoints(50, 50, 30, 12)} fill={color} stroke={color} strokeWidth={3} strokeLinejoin="round" />
    </Frame>
  )
}

function Atom({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <circle cx="50" cy="50" r="8" fill={color} />
      {[0, 60, -60].map((deg) => (
        <ellipse
          key={deg}
          cx="50"
          cy="50"
          rx="38"
          ry="15"
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
    </Frame>
  )
}

function Kitty({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path
        d="M28 38 L22 20 L40 30 M72 38 L78 20 L60 30"
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <circle cx="50" cy="56" r="26" fill="none" stroke={color} strokeWidth={4} />
      <circle cx="40" cy="52" r="3" fill={color} />
      <circle cx="60" cy="52" r="3" fill={color} />
      <polygon points="50,58 46,64 54,64" fill={color} />
      <path
        d="M56 62 L78 58 M56 66 L78 68 M44 62 L22 58 M44 66 L22 68"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Frame>
  )
}

const GLYPHS: Record<SymbolId, (p: GlyphProps) => React.ReactElement> = {
  BAZINGA: Bazinga,
  SCATTER: Scatter,
  SHELDON: Sheldon,
  MEEMAW: Meemaw,
  GEORGE: George,
  MARY: Mary,
  MISSY: Missy,
  BOWTIE: BowTie,
  GLASSES: Glasses,
  COMIC: Comic,
  TRAIN: Train,
  STAR: TexasStar,
  ATOM: Atom,
  KITTY: Kitty,
}

export function SymbolGlyph({ id, size, className }: { id: SymbolId; size?: number; className?: string }) {
  const G = GLYPHS[id]
  return <G color={SYMBOL_COLORS[id]} size={size} className={className} />
}
