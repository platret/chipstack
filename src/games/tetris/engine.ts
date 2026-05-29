import { createRng, randomSeed, type Rng } from '@/lib/rng'
import { SDF_INFINITE } from '@/store/settings'
import {
  BUFFER_ROWS,
  CLEAR_ANIM_MS,
  COLS,
  COUNTDOWN_MS,
  LOCK_DELAY_MS,
  LOCK_RESET_CAP,
  NEXT_COUNT,
  SPAWN_X,
  SPAWN_Y,
  TOTAL_ROWS,
} from './constants'
import {
  getKicks,
  PIECE_CELLS,
  PIECE_COLORS,
  PIECES,
  type PieceType,
  type Rot,
} from './pieces'
import { gravityMsPerRow, levelFromLines, scoreClear, type TSpin } from './scoring'

export type Action = 'left' | 'right' | 'softDrop' | 'hardDrop' | 'cw' | 'ccw' | 'flip' | 'hold'
export type Status = 'ready' | 'countdown' | 'playing' | 'paused' | 'over'

export type GameEvent =
  | { type: 'move' }
  | { type: 'rotate' }
  | { type: 'hold' }
  | { type: 'lock' }
  | { type: 'harddrop'; cells: [number, number][]; distance: number }
  | { type: 'lineclear'; rows: number[]; count: number; tspin: TSpin }
  | { type: 'clearText'; label: string; big: boolean }
  | { type: 'levelup'; level: number }
  | { type: 'countdown'; n: number }
  | { type: 'gameover' }

export interface ActivePiece {
  type: PieceType
  rot: Rot
  x: number
  y: number
}

export const COLOR_BY_INDEX: string[] = ['', ...PIECES.map((p) => PIECE_COLORS[p])]
const colorIndex = (t: PieceType) => PIECES.indexOf(t) + 1

interface Handling {
  das: number
  arr: number
  sdf: number
}

export class TetrisEngine {
  board: Uint8Array = new Uint8Array(TOTAL_ROWS * COLS)
  active: ActivePiece | null = null
  hold: PieceType | null = null
  canHold = true
  queue: PieceType[] = []
  status: Status = 'ready'

  score = 0
  lines = 0
  level = 1
  combo = 0
  b2bChain = 0
  maxCombo = 0
  maxB2B = 0
  elapsedMs = 0

  // animation hint for renderer (rows being cleared + remaining time)
  clearFlash: { rows: number[]; timer: number } | null = null

  private bag: PieceType[] = []
  private rng: Rng
  private getHandling: () => Handling

  gravityAcc = 0
  private lockTimer = 0
  private lockResets = 0
  private lowestY = 0
  private lastWasRotation = false
  private lastKickIndex = 0

  private leftHeld = false
  private rightHeld = false
  private softHeld = false
  private lastHoriz: -1 | 1 = -1
  private appliedDir: -1 | 0 | 1 = 0
  private dasCharged = false
  private dasTimer = 0
  private arrTimer = 0

  private events: GameEvent[] = []
  countdownTimer = 0
  private lastCountSecond = -1

  constructor(getHandling: () => Handling, seed?: number) {
    this.getHandling = getHandling
    this.rng = createRng(seed ?? randomSeed())
  }

  // ---- lifecycle ----
  start(seed?: number) {
    this.board = new Uint8Array(TOTAL_ROWS * COLS)
    this.active = null
    this.hold = null
    this.canHold = true
    this.queue = []
    this.bag = []
    this.rng = createRng(seed ?? randomSeed())
    this.score = 0
    this.lines = 0
    this.level = 1
    this.combo = 0
    this.b2bChain = 0
    this.maxCombo = 0
    this.maxB2B = 0
    this.elapsedMs = 0
    this.gravityAcc = 0
    this.lockTimer = 0
    this.lockResets = 0
    this.lastWasRotation = false
    this.clearFlash = null
    this.refillQueue()
    this.status = 'countdown'
    this.countdownTimer = COUNTDOWN_MS
    this.lastCountSecond = -1
  }

  pause() {
    if (this.status === 'playing') this.status = 'paused'
  }
  resume() {
    if (this.status === 'paused') this.status = 'playing'
  }

  // ---- input (host calls these once per physical press/release) ----
  press(a: Action) {
    if (this.status !== 'playing') return
    switch (a) {
      case 'left': this.leftHeld = true; this.lastHoriz = -1; break
      case 'right': this.rightHeld = true; this.lastHoriz = 1; break
      case 'softDrop': this.softHeld = true; break
      case 'hardDrop': this.queueDiscrete('hardDrop'); break
      case 'cw': this.queueDiscrete('cw'); break
      case 'ccw': this.queueDiscrete('ccw'); break
      case 'flip': this.queueDiscrete('flip'); break
      case 'hold': this.queueDiscrete('hold'); break
    }
  }
  release(a: Action) {
    switch (a) {
      case 'left': this.leftHeld = false; break
      case 'right': this.rightHeld = false; break
      case 'softDrop': this.softHeld = false; break
    }
  }

  private discrete: Action[] = []
  private queueDiscrete(a: Action) {
    this.discrete.push(a)
  }

  // ---- main tick (fixed dt) ----
  update(dt: number): GameEvent[] {
    this.events = []
    if (this.status === 'countdown') {
      this.countdownTimer -= dt
      const sec = Math.ceil(this.countdownTimer / 1000)
      if (sec !== this.lastCountSecond && sec > 0) {
        this.lastCountSecond = sec
        this.events.push({ type: 'countdown', n: sec })
      }
      if (this.countdownTimer <= 0) {
        this.status = 'playing'
        this.spawnNext()
        this.events.push({ type: 'countdown', n: 0 })
      }
      return this.events
    }
    if (this.status !== 'playing') return this.events

    this.elapsedMs += dt
    if (this.clearFlash) {
      this.clearFlash.timer -= dt
      if (this.clearFlash.timer <= 0) this.clearFlash = null
    }

    this.processDiscrete()
    if (this.status !== 'playing' || !this.active) return this.events
    this.handleHorizontal(dt)
    this.handleGravity(dt)
    this.handleLock(dt)
    return this.events
  }

  private processDiscrete() {
    const q = this.discrete
    this.discrete = []
    for (const a of q) {
      if (!this.active) break
      switch (a) {
        case 'cw': this.rotate(1); break
        case 'ccw': this.rotate(-1); break
        case 'flip': this.rotate(2); break
        case 'hold': this.doHold(); break
        case 'hardDrop': this.hardDrop(); break
        default: break
      }
    }
  }

  // ---- horizontal movement: DAS / ARR off the fixed tick ----
  // DAS is the charge delay; ARR is the repeat interval (0 = teleport to wall).
  private resolveDir(): -1 | 0 | 1 {
    if (this.leftHeld && this.rightHeld) return this.lastHoriz
    if (this.leftHeld) return -1
    if (this.rightHeld) return 1
    return 0
  }

  private handleHorizontal(dt: number) {
    const { das, arr } = this.getHandling()
    const dir = this.resolveDir()
    if (dir !== this.appliedDir) {
      this.appliedDir = dir
      this.dasCharged = false
      this.dasTimer = das
      this.arrTimer = 0
      if (dir !== 0 && this.tryMove(dir, 0)) this.events.push({ type: 'move' })
      return
    }
    if (dir === 0) return
    if (!this.dasCharged) {
      this.dasTimer -= dt
      if (this.dasTimer <= 0) {
        this.dasCharged = true
        this.arrTimer = 0
        this.applyArr(dir, arr)
      }
    } else {
      this.applyArr(dir, arr)
    }
  }

  private applyArr(dir: -1 | 1, arr: number) {
    if (arr <= 0) {
      while (this.tryMove(dir, 0)) {
        /* teleport to wall */
      }
      return
    }
    this.arrTimer -= 1000 / 60
    while (this.arrTimer <= 0) {
      if (!this.tryMove(dir, 0)) {
        this.arrTimer = 0
        break
      }
      this.arrTimer += arr
    }
  }

  // ---- gravity + soft drop ----
  private handleGravity(dt: number) {
    if (!this.active) return
    const { sdf } = this.getHandling()
    const natural = 1 / gravityMsPerRow(this.level) // rows per ms
    let rowsThisTick = natural * dt
    if (this.softHeld) {
      rowsThisTick = sdf >= SDF_INFINITE ? TOTAL_ROWS : Math.max(rowsThisTick, natural * dt * sdf)
    }
    this.gravityAcc += rowsThisTick
    let moved = 0
    while (this.gravityAcc >= 1) {
      if (this.tryMove(0, 1)) {
        this.gravityAcc -= 1
        moved++
      } else {
        this.gravityAcc = 0
        break
      }
    }
    if (this.softHeld && moved > 0) this.score += moved
  }

  // ---- lock delay with move reset ----
  private handleLock(dt: number) {
    if (!this.active) return
    const grounded = this.collides(this.active.type, this.active.rot, this.active.x, this.active.y + 1)
    if (grounded) {
      this.lockTimer += dt
      if (this.lockTimer >= LOCK_DELAY_MS) this.lock()
    } else {
      this.lockTimer = 0
    }
  }

  private resetLock() {
    if (!this.active) return
    if (this.collides(this.active.type, this.active.rot, this.active.x, this.active.y + 1)) {
      if (this.lockResets < LOCK_RESET_CAP) {
        this.lockTimer = 0
        this.lockResets++
      }
    }
  }

  // ---- piece operations ----
  private cellsOf(p: ActivePiece): [number, number][] {
    return PIECE_CELLS[p.type][p.rot].map(([cx, cy]) => [p.x + cx, p.y + cy])
  }

  collides(type: PieceType, rot: Rot, x: number, y: number): boolean {
    const cells = PIECE_CELLS[type][rot]
    for (const [cx, cy] of cells) {
      const px = x + cx
      const py = y + cy
      if (px < 0 || px >= COLS || py >= TOTAL_ROWS) return true
      if (py >= 0 && this.board[py * COLS + px] !== 0) return true
    }
    return false
  }

  private tryMove(dx: number, dy: number): boolean {
    if (!this.active) return false
    const { type, rot, x, y } = this.active
    if (this.collides(type, rot, x + dx, y + dy)) return false
    this.active.x = x + dx
    this.active.y = y + dy
    if (dx !== 0 || dy > 0) this.lastWasRotation = false
    if (dy > 0) this.onDescend()
    else this.resetLock()
    return true
  }

  private onDescend() {
    if (!this.active) return
    const lowest = Math.max(...this.cellsOf(this.active).map(([, py]) => py))
    if (lowest > this.lowestY) {
      this.lowestY = lowest
      this.lockResets = 0
      this.lockTimer = 0
    }
  }

  private rotate(dir: 1 | -1 | 2) {
    if (!this.active) return
    const from = this.active.rot
    const to = (((from + (dir === 2 ? 2 : dir)) % 4) + 4) % 4 as Rot
    const kicks = getKicks(this.active.type, from, to)
    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i]!
      if (!this.collides(this.active.type, to, this.active.x + kx, this.active.y + ky)) {
        this.active.rot = to
        this.active.x += kx
        this.active.y += ky
        this.lastWasRotation = true
        this.lastKickIndex = i
        this.resetLock()
        this.events.push({ type: 'rotate' })
        return
      }
    }
  }

  private hardDrop() {
    if (!this.active) return
    let distance = 0
    while (this.tryMove(0, 1)) distance++
    this.score += distance * 2
    const cells = this.cellsOf(this.active)
    this.events.push({ type: 'harddrop', cells, distance })
    if (distance > 0) this.lastWasRotation = false
    this.lock()
  }

  private doHold() {
    if (!this.canHold || !this.active) return
    const cur = this.active.type
    if (this.hold === null) {
      this.hold = cur
      this.spawnNext()
    } else {
      const h = this.hold
      this.hold = cur
      this.spawn(h)
    }
    this.canHold = false
    this.events.push({ type: 'hold' })
  }

  // ---- lock / clears ----
  private detectTSpin(): TSpin {
    const p = this.active
    if (!p || p.type !== 'T' || !this.lastWasRotation) return 'none'
    const corner = (cx: number, cy: number) => {
      const x = p.x + cx
      const y = p.y + cy
      if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true
      return y >= 0 && this.board[y * COLS + x] !== 0
    }
    const tl = corner(0, 0)
    const tr = corner(2, 0)
    const bl = corner(0, 2)
    const br = corner(2, 2)
    const count = [tl, tr, bl, br].filter(Boolean).length
    if (count < 3) return 'none'
    let front: [boolean, boolean]
    switch (p.rot) {
      case 0: front = [tl, tr]; break
      case 1: front = [tr, br]; break
      case 2: front = [bl, br]; break
      default: front = [tl, bl]; break
    }
    const full = front[0] && front[1]
    if (full || this.lastKickIndex === 4) return 'full'
    return 'mini'
  }

  private lock() {
    const p = this.active
    if (!p) return
    const tspin = this.detectTSpin()
    let allInBuffer = true
    for (const [px, py] of this.cellsOf(p)) {
      if (py >= 0) {
        this.board[py * COLS + px] = colorIndex(p.type)
        if (py >= BUFFER_ROWS) allInBuffer = false
      }
    }
    this.active = null
    this.events.push({ type: 'lock' })

    // find full rows
    const cleared: number[] = []
    for (let r = 0; r < TOTAL_ROWS; r++) {
      let full = true
      for (let c = 0; c < COLS; c++) {
        if (this.board[r * COLS + c] === 0) {
          full = false
          break
        }
      }
      if (full) cleared.push(r)
    }

    if (cleared.length > 0) {
      this.clearFlash = { rows: [...cleared], timer: CLEAR_ANIM_MS }
      // remove cleared rows, collapse downward
      const next = new Uint8Array(TOTAL_ROWS * COLS)
      let writeRow = TOTAL_ROWS - 1
      for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
        if (cleared.includes(r)) continue
        for (let c = 0; c < COLS; c++) next[writeRow * COLS + c] = this.board[r * COLS + c]!
        writeRow--
      }
      this.board = next
      this.combo++
    } else {
      this.combo = 0
    }
    this.maxCombo = Math.max(this.maxCombo, this.combo)

    const perfectClear = cleared.length > 0 && this.board.every((v) => v === 0)
    const wasB2b = this.b2bChain > 0
    const res = scoreClear(cleared.length, tspin, this.level, wasB2b, Math.max(0, this.combo - 1), perfectClear)
    this.score += res.points
    this.lines += cleared.length
    const newLevel = levelFromLines(this.lines)
    if (newLevel > this.level) this.events.push({ type: 'levelup', level: newLevel })
    this.level = newLevel

    if (res.difficult) this.b2bChain = wasB2b ? this.b2bChain + 1 : 1
    else if (cleared.length > 0) this.b2bChain = 0
    this.maxB2B = Math.max(this.maxB2B, this.b2bChain)

    if (cleared.length > 0) {
      this.events.push({ type: 'lineclear', rows: [...cleared], count: cleared.length, tspin })
    }
    if (res.label && (cleared.length > 0 || tspin !== 'none')) {
      const big = cleared.length === 4 || tspin !== 'none' || perfectClear
      this.events.push({ type: 'clearText', label: res.label, big })
    }

    if (allInBuffer && cleared.length === 0) {
      this.gameOver()
      return
    }
    this.spawnNext()
  }

  // ---- spawning / bag ----
  private spawn(type: PieceType) {
    const piece: ActivePiece = { type, rot: 0, x: SPAWN_X, y: SPAWN_Y }
    this.gravityAcc = 0
    this.lockTimer = 0
    this.lockResets = 0
    this.lastWasRotation = false
    this.lowestY = Math.max(...PIECE_CELLS[type][0].map(([, cy]) => SPAWN_Y + cy))
    if (this.collides(type, 0, piece.x, piece.y)) {
      this.active = piece
      this.gameOver()
      return
    }
    this.active = piece
  }

  private spawnNext() {
    this.refillQueue()
    const type = this.queue.shift()!
    this.canHold = true
    this.spawn(type)
  }

  private refillQueue() {
    while (this.queue.length < NEXT_COUNT + 1) {
      if (this.bag.length === 0) this.bag = this.rng.shuffle([...PIECES])
      this.queue.push(this.bag.pop()!)
    }
  }

  private gameOver() {
    this.status = 'over'
    this.events.push({ type: 'gameover' })
  }

  // ---- read helpers for rendering / HUD ----
  ghostY(): number {
    if (!this.active) return 0
    let y = this.active.y
    while (!this.collides(this.active.type, this.active.rot, this.active.x, y + 1)) y++
    return y
  }
}
