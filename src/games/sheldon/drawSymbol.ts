/* Canvas-native vector tiles for Bazinga Reels (mirrors symbols.tsx for the reels).
   Original Young-Sheldon-parody monograms + props — no copyrighted art or likenesses.
   Drawn centered in a `size`-square cell at (cx, cy) with neon glow. */

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
  ctx.globalAlpha = dim ? 0.32 : 1
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  glow(ctx, color, dim ? 0 : s * 0.09)
  ctx.strokeStyle = color
  ctx.fillStyle = color

  // monogram letter helper (bold neon glyph)
  const letter = (ch: string, fontSize: number, ox = 50, oy = 56) => {
    ctx.save()
    ctx.font = `900 ${fontSize * u}px Orbitron, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ch, x(ox), y(oy))
    ctx.restore()
  }

  switch (id) {
    case 'BAZINGA': {
      // comic burst with bold "B!" — the WILD
      ctx.lineWidth = 4.5 * u
      ctx.beginPath()
      const spikes = 12
      for (let i = 0; i < spikes * 2; i++) {
        const r = (i % 2 === 0 ? 44 : 32) * u
        const a = (Math.PI / spikes) * i - Math.PI / 2
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      letter('B!', 38, 50, 54)
      break
    }
    case 'SCATTER': {
      // couch cushion with "POW" — "that's my spot"
      ctx.lineWidth = 5 * u
      roundRect(ctx, x(16), y(28), 68 * u, 48 * u, 12 * u)
      ctx.stroke()
      ctx.lineWidth = 3 * u
      ctx.beginPath()
      ctx.moveTo(x(28), y(28))
      ctx.lineTo(x(40), y(76))
      ctx.moveTo(x(72), y(28))
      ctx.lineTo(x(60), y(76))
      ctx.stroke()
      letter('POW', 17, 50, 52)
      break
    }
    case 'SHELDON': {
      // monogram "S" with bow-tie + glasses bar
      ctx.lineWidth = 3.5 * u
      ctx.beginPath()
      ctx.moveTo(x(30), y(20))
      ctx.lineTo(x(46), y(20))
      ctx.lineTo(x(38), y(30))
      ctx.lineTo(x(54), y(30))
      ctx.lineTo(x(46), y(20))
      ctx.lineTo(x(70), y(20))
      ctx.lineTo(x(54), y(30))
      ctx.closePath()
      ctx.stroke()
      letter('S', 50, 50, 62)
      break
    }
    case 'MEEMAW': {
      // monogram "M" over a fan of playing cards
      ctx.lineWidth = 3 * u
      for (const [tx, rot] of [[34, -0.32], [50, 0], [66, 0.32]] as const) {
        ctx.save()
        ctx.translate(x(tx), y(66))
        ctx.rotate(rot)
        roundRect(ctx, -10 * u, -16 * u, 20 * u, 30 * u, 3 * u)
        ctx.stroke()
        ctx.restore()
      }
      letter('M', 38, 50, 34)
      break
    }
    case 'GEORGE': {
      // monogram "G" with a coach's whistle
      letter('G', 50, 44, 50)
      ctx.lineWidth = 4 * u
      ctx.beginPath()
      ctx.arc(x(70), y(64), 12 * u, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x(70), y(52))
      ctx.lineTo(x(84), y(46))
      ctx.lineTo(x(84), y(58))
      ctx.closePath()
      ctx.stroke()
      break
    }
    case 'MARY': {
      // monogram "M" inside a soft heart (warm matriarch)
      ctx.lineWidth = 4 * u
      ctx.beginPath()
      ctx.moveTo(x(50), y(82))
      ctx.bezierCurveTo(x(16), y(56), x(22), y(24), x(50), y(38))
      ctx.bezierCurveTo(x(78), y(24), x(84), y(56), x(50), y(82))
      ctx.closePath()
      ctx.stroke()
      letter('M', 34, 50, 52)
      break
    }
    case 'MISSY': {
      // monogram "T" twin braids (Sheldon's twin) — "Missy"
      letter('T', 46, 50, 50)
      ctx.lineWidth = 4 * u
      ctx.beginPath()
      ctx.moveTo(x(24), y(34))
      ctx.quadraticCurveTo(x(14), y(58), x(22), y(80))
      ctx.moveTo(x(76), y(34))
      ctx.quadraticCurveTo(x(86), y(58), x(78), y(80))
      ctx.stroke()
      break
    }
    case 'BOWTIE': {
      ctx.lineWidth = 4.5 * u
      ctx.beginPath()
      ctx.moveTo(x(50), y(50))
      ctx.lineTo(x(20), y(32))
      ctx.lineTo(x(20), y(68))
      ctx.closePath()
      ctx.moveTo(x(50), y(50))
      ctx.lineTo(x(80), y(32))
      ctx.lineTo(x(80), y(68))
      ctx.closePath()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x(50), y(50), 8 * u, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'GLASSES': {
      ctx.lineWidth = 4.5 * u
      ctx.beginPath()
      ctx.arc(x(30), y(54), 17 * u, 0, Math.PI * 2)
      ctx.arc(x(70), y(54), 17 * u, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x(47), y(50))
      ctx.lineTo(x(53), y(50))
      ctx.moveTo(x(13), y(48))
      ctx.lineTo(x(6), y(40))
      ctx.moveTo(x(87), y(48))
      ctx.lineTo(x(94), y(40))
      ctx.stroke()
      break
    }
    case 'COMIC': {
      // comic book with a folded cover + star badge
      ctx.lineWidth = 4 * u
      roundRect(ctx, x(24), y(20), 52 * u, 60 * u, 4 * u)
      ctx.stroke()
      ctx.lineWidth = 3 * u
      ctx.beginPath()
      ctx.moveTo(x(38), y(20))
      ctx.lineTo(x(38), y(80))
      ctx.stroke()
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 === 0 ? 11 : 5) * u
        const a = (Math.PI / 5) * i - Math.PI / 2
        const px = x(58) + r * Math.cos(a)
        const py = y(40) + r * Math.sin(a)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'TRAIN': {
      // little choo-choo locomotive
      ctx.lineWidth = 4 * u
      roundRect(ctx, x(18), y(44), 46 * u, 24 * u, 4 * u)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x(64), y(68))
      ctx.lineTo(x(64), y(54))
      ctx.lineTo(x(78), y(54))
      ctx.lineTo(x(84), y(68))
      ctx.closePath()
      ctx.stroke()
      // cab roof + funnel
      roundRect(ctx, x(40), y(30), 16 * u, 14 * u, 2 * u)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x(26), y(44))
      ctx.lineTo(x(26), y(32))
      ctx.lineTo(x(34), y(32))
      ctx.lineTo(x(34), y(44))
      ctx.stroke()
      // wheels
      for (const wx of [28, 50, 74]) {
        ctx.beginPath()
        ctx.arc(x(wx), y(74), 7 * u, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }
    case 'STAR': {
      // Texas lone star inside a ring
      ctx.lineWidth = 3.5 * u
      ctx.beginPath()
      ctx.arc(cx, cy, 40 * u, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 === 0 ? 30 : 12) * u
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
    case 'ATOM': {
      ctx.lineWidth = 3.5 * u
      ctx.beginPath()
      ctx.arc(cx, cy, 8 * u, 0, Math.PI * 2)
      ctx.fill()
      for (const rot of [0, Math.PI / 3, -Math.PI / 3]) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rot)
        ctx.beginPath()
        ctx.ellipse(0, 0, 38 * u, 15 * u, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      break
    }
    case 'KITTY': {
      // soft kitty face
      ctx.lineWidth = 4 * u
      ctx.beginPath()
      ctx.moveTo(x(28), y(38))
      ctx.lineTo(x(22), y(20))
      ctx.lineTo(x(40), y(30))
      ctx.moveTo(x(72), y(38))
      ctx.lineTo(x(78), y(20))
      ctx.lineTo(x(60), y(30))
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, y(56), 26 * u, 0, Math.PI * 2)
      ctx.stroke()
      // eyes + nose
      ctx.beginPath()
      ctx.arc(x(40), y(52), 3 * u, 0, Math.PI * 2)
      ctx.arc(x(60), y(52), 3 * u, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x(50), y(58))
      ctx.lineTo(x(46), y(64))
      ctx.lineTo(x(54), y(64))
      ctx.closePath()
      ctx.fill()
      // whiskers
      ctx.lineWidth = 2 * u
      ctx.beginPath()
      ctx.moveTo(x(56), y(62)); ctx.lineTo(x(78), y(58))
      ctx.moveTo(x(56), y(66)); ctx.lineTo(x(78), y(68))
      ctx.moveTo(x(44), y(62)); ctx.lineTo(x(22), y(58))
      ctx.moveTo(x(44), y(66)); ctx.lineTo(x(22), y(68))
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
