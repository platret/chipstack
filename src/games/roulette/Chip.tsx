import { formatChipsCompact } from '@/lib/format'

const RING: Record<number, string> = {
  1: '#94a3b8',
  5: '#fb7185',
  25: '#34e2a8',
  100: '#fbbf24',
  500: '#a78bfa',
}

export function chipColor(denom: number): string {
  const keys = Object.keys(RING).map(Number)
  let best = keys[0]!
  for (const k of keys) if (k <= denom) best = k
  return RING[best]!
}

export function Chip({ amount, size = 30 }: { amount: number; size?: number }) {
  const color = chipColor(amount)
  return (
    <div
      className="tnum flex items-center justify-center rounded-full font-mono font-bold text-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: `radial-gradient(circle at 30% 30%, #fff, ${color} 78%)`,
        border: `${Math.max(2, size * 0.09)}px dashed rgba(0,0,0,0.45)`,
        boxShadow: `0 0 8px ${color}, 0 2px 4px rgba(0,0,0,0.5)`,
      }}
    >
      {formatChipsCompact(amount)}
    </div>
  )
}
