const grouped = new Intl.NumberFormat('en-US')

/** Full grouped integer, e.g. 1,234,567. */
export function formatChips(n: number): string {
  return grouped.format(Math.round(n))
}

/** Compact for tight HUD spaces, e.g. 1.2M, 12.3K. */
export function formatChipsCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1) + 'B'
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M'
  if (abs >= 10_000) return (n / 1_000).toFixed(abs >= 100_000 ? 0 : 1) + 'K'
  return grouped.format(Math.round(n))
}

/** mm:ss.cs game clock. */
export function formatTime(ms: number): string {
  const totalCs = Math.floor(ms / 10)
  const cs = totalCs % 100
  const totalS = Math.floor(totalCs / 100)
  const s = totalS % 60
  const m = Math.floor(totalS / 60)
  const pad = (v: number, l = 2) => v.toString().padStart(l, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}

export function parsePositiveInt(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '')
  if (!/^\d+$/.test(cleaned)) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(n, Number.MAX_SAFE_INTEGER)
}
