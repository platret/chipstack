/* Canvas-native vector drawing of each symbol (mirrors symbols.tsx for the reels).
   Draws centered in a `size`-square cell at (cx, cy) with neon glow. */

import { SYMBOL_COLORS, type SymbolId } from './config'

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color
  ctx.shadowBlur = blur
}
function clearGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  id: SymbolId,
  cx: number,
  cy: number,
  size: number,
  dim = false,
) {
  const color = SYMBOL_COLORS[id]
  const s = size
  const u = s / 100 // unit scale from the 0..100 design space
  const x = (v: number) => cx - s / 2 + v * u
  const y = (v: number) => cy - s / 2 + v * u

  ctx.save()
  ctx.globalAlpha = dim ? 0.34 : 1
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  glow(ctx, color, dim ? 0 : s * 0.1)
  ctx.strokeStyle = color
  ctx.fillStyle = color

  switch (id) {
    case 'WILD': {
      ctx.globalAlpha = (dim ? 0.34 : 1) * 0.5
      ctx.lineWidth = 4 * u
      roundRect(ctx, x(14), y(20), 72 * u, 60 * u, 10 * u)
      ctx.stroke()
      ctx.globalAlpha = dim ? 0.34 : 1
      ctx.lineWidth = 7 * u
      ctx.beginPath()
      ctx.moveTo(x(22), y(34))
      ctx.lineTo(x(33), y(70))
      ctx.lineTo(x(42), y(44))
      ctx.lineTo(x(50), y(70))
      ctx.lineTo(x(58), y(44))
      ctx.lineTo(x(67), y(70))
      ctx.lineTo(x(78), y(34))
      ctx.stroke()
      break
    }
    case 'SEVEN': {
      ctx.lineWidth = 8 * u
      ctx.beginPath()
      ctx.moveTo(x(28), y(26))
      ctx.lineTo(x(72), y(26))
      ctx.lineTo(x(46), y(80))
      ctx.stroke()
      ctx.lineWidth = 6 * u
      ctx.beginPath()
      ctx.moveTo(x(38), y(50))
      ctx.lineTo(x(58), y(50))
      ctx.stroke()
      break
    }
    case 'BAR': {
      for (const by of [28, 47, 66]) {
        roundRect(ctx, x(22), y(by), 56 * u, 11 * u, 3 * u)
        ctx.fill()
      }
      break
    }
    case 'BELL': {
      ctx.lineWidth = 6 * u
      ctx.beginPath()
      ctx.moveTo(x(50), y(22))
      ctx.bezierCurveTo(x(68), y(22), x(70), y(44), x(72), y(60))
      ctx.bezierCurveTo(x(73), y(68), x(80), y(70), x(80), y(72))
      ctx.lineTo(x(20), y(72))
      ctx.bezierCurveTo(x(20), y(70), x(27), y(68), x(28), y(60))
      ctx.bezierCurveTo(x(30), y(44), x(32), y(22), x(50), y(22))
      ctx.closePath()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x(50), y(82), 6 * u, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'CHERRY': {
      ctx.lineWidth = 5 * u
      ctx.beginPath()
      ctx.moveTo(x(50), y(20))
      ctx.bezierCurveTo(x(58), y(30), x(70), y(32), x(78), y(28))
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x(50), y(20))
      ctx.bezierCurveTo(x(44), y(36), x(38), y(50), x(34), y(58))
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x(50), y(20))
      ctx.bezierCurveTo(x(58), y(38), x(64), y(52), x(68), y(60))
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x(32), y(70), 13 * u, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x(68), y(72), 13 * u, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'STAR': {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 === 0 ? 34 : 14) * u
        const a = (Math.PI / 5) * i - Math.PI / 2
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'DIAMOND': {
      ctx.globalAlpha = (dim ? 0.34 : 1) * 0.22
      ctx.beginPath()
      ctx.moveTo(x(30), y(36))
      ctx.lineTo(x(70), y(36))
      ctx.lineTo(x(82), y(50))
      ctx.lineTo(x(50), y(84))
      ctx.lineTo(x(18), y(50))
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = dim ? 0.34 : 1
      ctx.lineWidth = 5 * u
      ctx.beginPath()
      ctx.moveTo(x(30), y(36))
      ctx.lineTo(x(70), y(36))
      ctx.lineTo(x(82), y(50))
      ctx.lineTo(x(50), y(84))
      ctx.lineTo(x(18), y(50))
      ctx.closePath()
      ctx.stroke()
      ctx.lineWidth = 3 * u
      ctx.beginPath()
      ctx.moveTo(x(18), y(50))
      ctx.lineTo(x(82), y(50))
      ctx.moveTo(x(30), y(36))
      ctx.lineTo(x(40), y(50))
      ctx.lineTo(x(50), y(84))
      ctx.moveTo(x(70), y(36))
      ctx.lineTo(x(60), y(50))
      ctx.lineTo(x(50), y(84))
      ctx.stroke()
      break
    }
    case 'CLOVER': {
      for (const [lx, ly] of [
        [38, 38],
        [62, 38],
        [38, 60],
        [62, 60],
      ] as const) {
        ctx.beginPath()
        ctx.arc(x(lx), y(ly), 15 * u, 0, Math.PI * 2)
        ctx.fill()
      }
      clearGlow(ctx)
      ctx.lineWidth = 5 * u
      ctx.beginPath()
      ctx.moveTo(x(50), y(56))
      ctx.bezierCurveTo(x(54), y(70), x(56), y(78), x(60), y(86))
      ctx.stroke()
      break
    }
  }

  clearGlow(ctx)
  ctx.restore()
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
