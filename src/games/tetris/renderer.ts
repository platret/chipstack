import { BUFFER_ROWS, COLS, VISIBLE_ROWS } from './constants'
import { COLOR_BY_INDEX, type TetrisEngine } from './engine'
import { CLEAR_ANIM_MS } from './constants'
import { PIECE_CELLS, PIECE_COLORS } from './pieces'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt))
  const b = Math.max(0, Math.min(255, (n & 255) + amt))
  return `rgb(${r},${g},${b})`
}

export class TetrisRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private cell = 30
  private dpr = Math.min(window.devicePixelRatio || 1, 2)
  private particles: Particle[] = []

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d context unavailable')
    this.canvas = canvas
    this.ctx = ctx
    this.resize(this.cell)
  }

  resize(cell: number) {
    this.cell = cell
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(COLS * cell * this.dpr)
    this.canvas.height = Math.round(VISIBLE_ROWS * cell * this.dpr)
    this.canvas.style.width = `${COLS * cell}px`
    this.canvas.style.height = `${VISIBLE_ROWS * cell}px`
  }

  get width() {
    return COLS * this.cell
  }
  get height() {
    return VISIBLE_ROWS * this.cell
  }

  spawnHardDrop(cells: [number, number][]) {
    const c = this.cell
    for (const [cx, cy] of cells) {
      const vr = cy - BUFFER_ROWS
      if (vr < 0) continue
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: (cx + Math.random()) * c,
          y: (vr + 1) * c,
          vx: (Math.random() - 0.5) * 2,
          vy: -(Math.random() * 3 + 1),
          life: 1,
          maxLife: 0.4 + Math.random() * 0.2,
          color: '#ffffff',
          size: 2 + Math.random() * 2,
        })
      }
    }
  }

  spawnLineClear(rows: number[]) {
    const c = this.cell
    for (const r of rows) {
      const vr = r - BUFFER_ROWS
      if (vr < 0) continue
      for (let i = 0; i < COLS * 2; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: (vr + 0.5) * c,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 1,
          maxLife: 0.5 + Math.random() * 0.3,
          color: Math.random() > 0.5 ? '#ffffff' : '#8b5cf6',
          size: 2 + Math.random() * 3,
        })
      }
    }
  }

  private drawBlock(col: number, row: number, color: string, glow: boolean) {
    const ctx = this.ctx
    const c = this.cell
    const x = col * c
    const y = row * c
    const pad = 1
    if (glow) {
      ctx.shadowColor = color
      ctx.shadowBlur = 12
    }
    ctx.fillStyle = color
    ctx.fillRect(x + pad, y + pad, c - pad * 2, c - pad * 2)
    ctx.shadowBlur = 0
    ctx.fillStyle = shade(color, 55)
    ctx.fillRect(x + pad, y + pad, c - pad * 2, 3)
    ctx.fillRect(x + pad, y + pad, 3, c - pad * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(x + pad, y + c - pad - 3, c - pad * 2, 3)
    ctx.fillRect(x + c - pad - 3, y + pad, 3, c - pad * 2)
  }

  private drawGhost(col: number, row: number, color: string) {
    const ctx = this.ctx
    const c = this.cell
    const x = col * c
    const y = row * c
    ctx.globalAlpha = 0.2
    ctx.fillStyle = color
    ctx.fillRect(x + 1, y + 1, c - 2, c - 2)
    ctx.globalAlpha = 0.85
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(x + 2, y + 2, c - 4, c - 4)
    ctx.globalAlpha = 1
  }

  render(engine: TetrisEngine, opts: { ghost: boolean; grid: boolean }, dtMs: number) {
    const ctx = this.ctx
    const c = this.cell
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)

    ctx.fillStyle = 'rgba(10,10,20,0.55)'
    ctx.fillRect(0, 0, this.width, this.height)

    if (opts.grid) {
      ctx.strokeStyle = 'rgba(139,92,246,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let col = 1; col < COLS; col++) {
        ctx.moveTo(col * c, 0)
        ctx.lineTo(col * c, this.height)
      }
      for (let row = 1; row < VISIBLE_ROWS; row++) {
        ctx.moveTo(0, row * c)
        ctx.lineTo(this.width, row * c)
      }
      ctx.stroke()
    }

    const board = engine.board
    for (let r = BUFFER_ROWS; r < BUFFER_ROWS + VISIBLE_ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const v = board[r * COLS + col]
        if (v) this.drawBlock(col, r - BUFFER_ROWS, COLOR_BY_INDEX[v]!, false)
      }
    }

    const active = engine.active
    if (active) {
      const color = PIECE_COLORS[active.type]
      const cells = PIECE_CELLS[active.type][active.rot]

      if (opts.ghost) {
        const gy = engine.ghostY()
        if (gy !== active.y) {
          for (const [cx, cy] of cells) {
            const vr = gy + cy - BUFFER_ROWS
            if (vr >= 0) this.drawGhost(active.x + cx, vr, color)
          }
        }
      }

      const grounded = engine.collides(active.type, active.rot, active.x, active.y + 1)
      const frac = grounded ? 0 : Math.min(engine.gravityAcc, 1)
      for (const [cx, cy] of cells) {
        const vr = active.y + cy - BUFFER_ROWS + frac
        if (vr > -1) this.drawBlock(active.x + cx, vr, color, true)
      }
    }

    if (engine.clearFlash) {
      const a = Math.max(0, engine.clearFlash.timer / CLEAR_ANIM_MS)
      ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`
      for (const r of engine.clearFlash.rows) {
        const vr = r - BUFFER_ROWS
        if (vr >= 0) ctx.fillRect(0, vr * c, this.width, c)
      }
    }

    const dt = dtMs / 1000
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.life -= dt / p.maxLife
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.25
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, p.size, p.size)
    }
    ctx.globalAlpha = 1
  }
}
