/* Canvas-native vector tiles for Gates of Fortune (mirrors symbols.tsx for the paytable).
   Original neon Greek/Olympus glyphs — premiums, faceted gems, a lightning orb, and a
   temple scatter. Drawn centered in a `size`-square cell at (cx, cy) with neon glow. */

import { SYMBOL_COLORS, type SymbolId } from './config'

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color
  ctx.shadowBlur = blur
}
function clearGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

/** Generic faceted gem outline used by the 5 low gems (varied by color + facet count). */
function gem(
  ctx: CanvasRenderingContext2D,
  x: (v: number) => number,
  y: (v: number) => number,
  u: number,
  color: string,
  facetSeed: number,
) {
  // crown table + pavilion silhouette
  ctx.lineWidth = 4 * u
  ctx.globalAlpha *= 1
  const top = 24
  const shoulder = 44
  const bottom = 84
  ctx.beginPath()
  ctx.moveTo(x(34), y(top))
  ctx.lineTo(x(66), y(top))
  ctx.lineTo(x(82), y(shoulder))
  ctx.lineTo(x(50), y(bottom))
  ctx.lineTo(x(18), y(shoulder))
  ctx.closePath()
  // faint fill
  const a = ctx.globalAlpha
  ctx.globalAlpha = a * 0.18
  ctx.fill()
  ctx.globalAlpha = a
  ctx.stroke()
  // internal facets
  ctx.lineWidth = 2.4 * u
  ctx.beginPath()
  ctx.moveTo(x(18), y(shoulder))
  ctx.lineTo(x(82), y(shoulder))
  ctx.moveTo(x(34), y(top))
  ctx.lineTo(x(42), y(shoulder))
  ctx.lineTo(x(50), y(bottom))
  ctx.moveTo(x(66), y(top))
  ctx.lineTo(x(58), y(shoulder))
  ctx.lineTo(x(50), y(bottom))
  if (facetSeed % 2 === 0) {
    ctx.moveTo(x(42), y(shoulder))
    ctx.lineTo(x(50), y(top + 8))
    ctx.lineTo(x(58), y(shoulder))
  }
  ctx.stroke()
  // sparkle
  ctx.globalAlpha = a
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x(40 + (facetSeed % 3) * 4), y(36), 2.6 * u, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
}

export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  id: SymbolId,
  cx: number,
  cy: number,
  size: number,
  dim = false,
  orbValue = 0,
) {
  const color = SYMBOL_COLORS[id]
  const s = size
  const u = s / 100 // unit scale from the 0..100 design space
  const x = (v: number) => cx - s / 2 + v * u
  const y = (v: number) => cy - s / 2 + v * u

  ctx.save()
  ctx.globalAlpha = dim ? 0.3 : 1
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  glow(ctx, color, dim ? 0 : s * 0.1)
  ctx.strokeStyle = color
  ctx.fillStyle = color

  switch (id) {
    case 'CROWN': {
      // laurel crown: 3-peak coronet with jewels
      ctx.lineWidth = 5 * u
      ctx.beginPath()
      ctx.moveTo(x(18), y(70))
      ctx.lineTo(x(24), y(34))
      ctx.lineTo(x(38), y(58))
      ctx.lineTo(x(50), y(26))
      ctx.lineTo(x(62), y(58))
      ctx.lineTo(x(76), y(34))
      ctx.lineTo(x(82), y(70))
      ctx.closePath()
      const a = ctx.globalAlpha
      ctx.globalAlpha = a * 0.18
      ctx.fill()
      ctx.globalAlpha = a
      ctx.stroke()
      // base band
      ctx.lineWidth = 5 * u
      roundRect(ctx, x(18), y(72), 64 * u, 12 * u, 4 * u)
      ctx.stroke()
      // peak jewels
      ctx.fillStyle = '#ffffff'
      for (const px of [24, 50, 76]) {
        ctx.beginPath()
        ctx.arc(x(px), y(px === 50 ? 26 : 34), 3.2 * u, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = color
      break
    }
    case 'RING': {
      // sapphire ring: band + raised gemstone
      ctx.lineWidth = 5 * u
      ctx.beginPath()
      ctx.arc(x(50), y(64), 24 * u, Math.PI * 0.08, Math.PI * 0.92, false)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x(50), y(64), 16 * u, Math.PI * 0.12, Math.PI * 0.88, false)
      ctx.stroke()
      // gem (diamond) on top
      ctx.lineWidth = 4 * u
      ctx.beginPath()
      ctx.moveTo(x(50), y(14))
      ctx.lineTo(x(64), y(28))
      ctx.lineTo(x(50), y(44))
      ctx.lineTo(x(36), y(28))
      ctx.closePath()
      const a = ctx.globalAlpha
      ctx.globalAlpha = a * 0.22
      ctx.fill()
      ctx.globalAlpha = a
      ctx.stroke()
      ctx.lineWidth = 2.2 * u
      ctx.beginPath()
      ctx.moveTo(x(36), y(28))
      ctx.lineTo(x(64), y(28))
      ctx.moveTo(x(50), y(14))
      ctx.lineTo(x(50), y(44))
      ctx.stroke()
      break
    }
    case 'CHALICE': {
      // golden chalice / goblet
      ctx.lineWidth = 4.5 * u
      // bowl
      ctx.beginPath()
      ctx.moveTo(x(28), y(24))
      ctx.lineTo(x(72), y(24))
      ctx.bezierCurveTo(x(70), y(48), x(60), y(56), x(50), y(56))
      ctx.bezierCurveTo(x(40), y(56), x(30), y(48), x(28), y(24))
      ctx.closePath()
      const a = ctx.globalAlpha
      ctx.globalAlpha = a * 0.18
      ctx.fill()
      ctx.globalAlpha = a
      ctx.stroke()
      // stem + foot
      ctx.beginPath()
      ctx.moveTo(x(50), y(56))
      ctx.lineTo(x(50), y(76))
      ctx.moveTo(x(34), y(82))
      ctx.lineTo(x(66), y(82))
      ctx.stroke()
      ctx.lineWidth = 3 * u
      ctx.beginPath()
      ctx.moveTo(x(40), y(76))
      ctx.lineTo(x(60), y(76))
      ctx.stroke()
      // rim shine
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x(40), y(30), 2.6 * u, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = color
      break
    }
    case 'HOURGLASS': {
      // hourglass of fate
      ctx.lineWidth = 5 * u
      ctx.beginPath()
      ctx.moveTo(x(26), y(20))
      ctx.lineTo(x(74), y(20))
      ctx.moveTo(x(26), y(80))
      ctx.lineTo(x(74), y(80))
      ctx.stroke()
      ctx.lineWidth = 4 * u
      ctx.beginPath()
      ctx.moveTo(x(30), y(20))
      ctx.lineTo(x(70), y(20))
      ctx.lineTo(x(52), y(50))
      ctx.lineTo(x(70), y(80))
      ctx.lineTo(x(30), y(80))
      ctx.lineTo(x(48), y(50))
      ctx.closePath()
      ctx.stroke()
      // sand
      const a = ctx.globalAlpha
      ctx.globalAlpha = a * 0.5
      ctx.beginPath()
      ctx.moveTo(x(36), y(26))
      ctx.lineTo(x(64), y(26))
      ctx.lineTo(x(52), y(46))
      ctx.lineTo(x(48), y(46))
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = a
      ctx.fillRect(x(46), y(58), 8 * u, 16 * u)
      break
    }
    case 'RED':
      gem(ctx, x, y, u, color, 0)
      break
    case 'PURPLE':
      gem(ctx, x, y, u, color, 1)
      break
    case 'YELLOW':
      gem(ctx, x, y, u, color, 2)
      break
    case 'GREEN':
      gem(ctx, x, y, u, color, 3)
      break
    case 'BLUE':
      gem(ctx, x, y, u, color, 4)
      break
    case 'ORB': {
      // glowing sphere with a lightning bolt + its multiplier value
      glow(ctx, color, dim ? 0 : s * 0.22)
      const a = ctx.globalAlpha
      const rad = 38 * u
      const grd = ctx.createRadialGradient(x(50), y(46), 4 * u, x(50), y(50), rad)
      grd.addColorStop(0, hexA('#ffffff', a * 0.9))
      grd.addColorStop(0.35, hexA(color, a * 0.95))
      grd.addColorStop(1, hexA(color, a * 0.15))
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(x(50), y(50), rad, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 3 * u
      ctx.strokeStyle = hexA('#ffffff', a * 0.8)
      ctx.beginPath()
      ctx.arc(x(50), y(50), rad, 0, Math.PI * 2)
      ctx.stroke()
      // lightning bolt
      ctx.strokeStyle = hexA('#fff7ed', a)
      ctx.lineWidth = 4.5 * u
      ctx.beginPath()
      ctx.moveTo(x(56), y(26))
      ctx.lineTo(x(42), y(50))
      ctx.lineTo(x(52), y(50))
      ctx.lineTo(x(44), y(74))
      ctx.lineTo(x(62), y(46))
      ctx.lineTo(x(50), y(46))
      ctx.closePath()
      ctx.stroke()
      // multiplier value
      if (orbValue > 0) {
        clearGlow(ctx)
        ctx.fillStyle = '#ffffff'
        ctx.font = `900 ${(orbValue >= 100 ? 22 : 26) * u}px Orbitron, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        glow(ctx, '#000000', s * 0.08)
        ctx.fillText(`${orbValue}x`, x(50), y(86))
      }
      ctx.fillStyle = color
      break
    }
    case 'SCATTER': {
      // Greek temple (pediment + columns) — Zeus scatter
      glow(ctx, color, dim ? 0 : s * 0.14)
      ctx.lineWidth = 4.5 * u
      // pediment (triangle roof)
      ctx.beginPath()
      ctx.moveTo(x(50), y(16))
      ctx.lineTo(x(84), y(40))
      ctx.lineTo(x(16), y(40))
      ctx.closePath()
      const a = ctx.globalAlpha
      ctx.globalAlpha = a * 0.18
      ctx.fill()
      ctx.globalAlpha = a
      ctx.stroke()
      // architrave
      ctx.lineWidth = 4 * u
      ctx.beginPath()
      ctx.moveTo(x(18), y(46))
      ctx.lineTo(x(82), y(46))
      ctx.stroke()
      // columns
      ctx.lineWidth = 4 * u
      for (const colx of [26, 42, 58, 74]) {
        ctx.beginPath()
        ctx.moveTo(x(colx), y(50))
        ctx.lineTo(x(colx), y(80))
        ctx.stroke()
      }
      // base steps
      ctx.lineWidth = 4.5 * u
      ctx.beginPath()
      ctx.moveTo(x(16), y(84))
      ctx.lineTo(x(84), y(84))
      ctx.stroke()
      // lightning glint over the temple
      ctx.lineWidth = 2.4 * u
      ctx.strokeStyle = hexA('#ffffff', a * 0.85)
      ctx.beginPath()
      ctx.moveTo(x(52), y(20))
      ctx.lineTo(x(46), y(30))
      ctx.lineTo(x(51), y(30))
      ctx.lineTo(x(47), y(40))
      ctx.stroke()
      break
    }
  }

  clearGlow(ctx)
  ctx.restore()
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
