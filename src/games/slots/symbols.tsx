/* Neon vector glyphs for each slot symbol. Crisp SVG, no emoji.
   Drawn on a 0..100 viewBox; `color` drives the neon stroke/fill. */

import type * as React from 'react'
import { SYMBOL_COLORS, type SymbolId } from './config'

interface GlyphProps {
  color: string
  size?: number
  className?: string
}

const STROKE = 6

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

function Seven({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path
        d="M28 26 H72 L46 80"
        fill="none"
        stroke={color}
        strokeWidth={STROKE + 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="38" y1="50" x2="58" y2="50" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Frame>
  )
}

function Bar({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      {[28, 47, 66].map((y) => (
        <rect key={y} x="22" y={y} width="56" height="11" rx="3" fill={color} opacity={0.92} />
      ))}
    </Frame>
  )
}

function Bell({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path
        d="M50 22 C68 22 70 44 72 60 C73 68 80 70 80 72 H20 C20 70 27 68 28 60 C30 44 32 22 50 22 Z"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <circle cx="50" cy="82" r="6" fill={color} />
      <line x1="50" y1="14" x2="50" y2="22" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Frame>
  )
}

function Cherry({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path d="M50 20 C58 30 70 32 78 28" fill="none" stroke={color} strokeWidth={STROKE - 1} strokeLinecap="round" />
      <path d="M50 20 C44 36 38 50 34 58" fill="none" stroke={color} strokeWidth={STROKE - 1} strokeLinecap="round" />
      <path d="M50 20 C58 38 64 52 68 60" fill="none" stroke={color} strokeWidth={STROKE - 1} strokeLinecap="round" />
      <circle cx="32" cy="70" r="13" fill={color} opacity={0.92} />
      <circle cx="68" cy="72" r="13" fill={color} opacity={0.92} />
      <circle cx="28" cy="66" r="3.5" fill="#fff" opacity={0.7} />
      <circle cx="64" cy="68" r="3.5" fill="#fff" opacity={0.7} />
    </Frame>
  )
}

function Star({ color, ...p }: GlyphProps) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 34 : 14
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`)
  }
  return (
    <Frame color={color} {...p}>
      <polygon points={pts.join(' ')} fill={color} stroke={color} strokeWidth={3} strokeLinejoin="round" opacity={0.95} />
    </Frame>
  )
}

function Diamond({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <path d="M30 36 H70 L82 50 L50 84 L18 50 Z" fill={color} opacity={0.22} stroke={color} strokeWidth={STROKE - 1} strokeLinejoin="round" />
      <path d="M18 50 H82" stroke={color} strokeWidth={3} />
      <path d="M30 36 L40 50 L50 84" fill="none" stroke={color} strokeWidth={3} />
      <path d="M70 36 L60 50 L50 84" fill="none" stroke={color} strokeWidth={3} />
      <path d="M40 50 H60" stroke={color} strokeWidth={3} />
    </Frame>
  )
}

function Clover({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <circle cx="38" cy="38" r="15" fill={color} opacity={0.9} />
      <circle cx="62" cy="38" r="15" fill={color} opacity={0.9} />
      <circle cx="38" cy="60" r="15" fill={color} opacity={0.9} />
      <circle cx="62" cy="60" r="15" fill={color} opacity={0.9} />
      <path d="M50 56 C54 70 56 78 60 86" fill="none" stroke={color} strokeWidth={STROKE - 1} strokeLinecap="round" />
    </Frame>
  )
}

function WildGlyph({ color, ...p }: GlyphProps) {
  return (
    <Frame color={color} {...p}>
      <rect x="14" y="20" width="72" height="60" rx="10" fill="none" stroke={color} strokeWidth={STROKE - 2} opacity={0.5} />
      <path
        d="M22 34 L33 70 L42 44 L50 70 L58 44 L67 70 L78 34"
        fill="none"
        stroke={color}
        strokeWidth={STROKE + 1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  )
}

const GLYPHS: Record<SymbolId, (p: GlyphProps) => React.ReactElement> = {
  WILD: WildGlyph,
  SEVEN: Seven,
  DIAMOND: Diamond,
  BAR: Bar,
  BELL: Bell,
  STAR: Star,
  CLOVER: Clover,
  CHERRY: Cherry,
}

export function SymbolGlyph({ id, size, className }: { id: SymbolId; size?: number; className?: string }) {
  const G = GLYPHS[id]
  return <G color={SYMBOL_COLORS[id]} size={size} className={className} />
}
