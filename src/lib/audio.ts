/* Single Web Audio manager. All SFX are synthesized — no asset files.
   Volume is driven by the settings store via setVolume/setMuted. */

export type Sfx =
  | 'move' | 'rotate' | 'lock' | 'harddrop' | 'softdrop'
  | 'lineclear' | 'tetris' | 'tspin' | 'levelup' | 'hold' | 'topout'
  | 'countdown' | 'go'
  | 'chipWin' | 'jackpot' | 'chipBet' | 'lose'
  | 'reelStop' | 'spin' | 'cardFlip' | 'cardDeal'
  | 'click' | 'hover'

class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private volume = 0.7
  private muted = false

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : this.volume
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    // 1s of white noise reused for percussive sounds
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buf
    return ctx
  }

  /** Call from a user gesture to satisfy autoplay policies. */
  unlock() {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') void ctx.resume()
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.master && !this.muted) this.master.gain.value = this.volume
  }
  setMuted(m: boolean) {
    this.muted = m
    if (this.master) this.master.gain.value = m ? 0 : this.volume
  }

  private tone(freq: number, dur: number, opts: {
    type?: OscillatorType; gain?: number; slideTo?: number; delay?: number; attack?: number
  } = {}) {
    const ctx = this.ensure()
    if (!this.master || this.muted || this.volume === 0) return
    const t0 = ctx.currentTime + (opts.delay ?? 0)
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = opts.type ?? 'square'
    osc.frequency.setValueAtTime(freq, t0)
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur)
    const peak = (opts.gain ?? 0.3)
    const atk = opts.attack ?? 0.004
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  private noise(dur: number, opts: { gain?: number; filter?: number; type?: BiquadFilterType; delay?: number } = {}) {
    const ctx = this.ensure()
    if (!this.master || this.muted || this.volume === 0 || !this.noiseBuffer) return
    const t0 = ctx.currentTime + (opts.delay ?? 0)
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = opts.type ?? 'bandpass'
    filter.frequency.value = opts.filter ?? 1800
    const g = ctx.createGain()
    g.gain.setValueAtTime(opts.gain ?? 0.25, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filter).connect(g).connect(this.master)
    src.start(t0)
    src.stop(t0 + dur + 0.02)
  }

  private chord(freqs: number[], dur: number, opts: { type?: OscillatorType; gain?: number; stagger?: number } = {}) {
    freqs.forEach((f, i) => this.tone(f, dur, { type: opts.type, gain: opts.gain ?? 0.2, delay: (opts.stagger ?? 0) * i }))
  }

  play(name: Sfx) {
    switch (name) {
      case 'move': this.tone(220, 0.05, { type: 'square', gain: 0.12 }); break
      case 'rotate': this.tone(380, 0.06, { type: 'triangle', gain: 0.16, slideTo: 460 }); break
      case 'softdrop': this.tone(160, 0.03, { type: 'square', gain: 0.08 }); break
      case 'lock': this.tone(150, 0.09, { type: 'square', gain: 0.22, slideTo: 90 }); break
      case 'hold': this.tone(520, 0.08, { type: 'triangle', gain: 0.18, slideTo: 660 }); break
      case 'harddrop':
        this.tone(420, 0.12, { type: 'sawtooth', gain: 0.24, slideTo: 70 })
        this.noise(0.1, { gain: 0.18, filter: 700, type: 'lowpass' })
        break
      case 'lineclear':
        this.chord([523, 659, 784], 0.22, { type: 'triangle', gain: 0.18, stagger: 0.03 })
        break
      case 'tetris':
        this.chord([523, 659, 784, 1046], 0.4, { type: 'square', gain: 0.18, stagger: 0.045 })
        break
      case 'tspin':
        this.chord([440, 622, 880], 0.35, { type: 'sawtooth', gain: 0.16, stagger: 0.04 })
        break
      case 'levelup':
        this.chord([392, 523, 659, 784], 0.3, { type: 'triangle', gain: 0.16, stagger: 0.06 })
        break
      case 'topout':
        this.tone(300, 0.6, { type: 'sawtooth', gain: 0.22, slideTo: 60 })
        break
      case 'countdown': this.tone(440, 0.12, { type: 'square', gain: 0.2 }); break
      case 'go': this.tone(880, 0.25, { type: 'square', gain: 0.24 }); break
      case 'chipBet': this.tone(180, 0.05, { type: 'square', gain: 0.14 }); this.noise(0.04, { gain: 0.1, filter: 2500 }); break
      case 'chipWin':
        this.chord([784, 988, 1318], 0.3, { type: 'triangle', gain: 0.18, stagger: 0.05 })
        break
      case 'jackpot':
        this.chord([523, 659, 784, 1046, 1318], 0.6, { type: 'square', gain: 0.16, stagger: 0.08 })
        break
      case 'lose': this.tone(330, 0.4, { type: 'triangle', gain: 0.18, slideTo: 110 }); break
      case 'reelStop': this.tone(260, 0.07, { type: 'square', gain: 0.2, slideTo: 180 }); this.noise(0.05, { gain: 0.12, filter: 1200 }); break
      case 'spin': this.noise(0.5, { gain: 0.08, filter: 1400, type: 'bandpass' }); break
      case 'cardFlip': this.noise(0.06, { gain: 0.16, filter: 3200 }); break
      case 'cardDeal': this.noise(0.09, { gain: 0.12, filter: 2200 }); break
      case 'click': this.tone(600, 0.03, { type: 'square', gain: 0.1 }); break
      case 'hover': this.tone(800, 0.02, { type: 'sine', gain: 0.05 }); break
    }
  }
}

export const audio = new AudioManager()
