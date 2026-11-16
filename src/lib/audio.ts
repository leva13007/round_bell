export type Sound = 'round' | 'rest' | 'warning' | 'countdown' | 'done'

type Note = [freq: number, offset: number, length: number]

// Synthesized signals, no audio files. Pitches sit at 1–2.5 kHz, where hearing is most
// sensitive and music has less energy, so the signals cut through headphones playing music.
const PATTERNS: Record<Sound, Note[]> = {
  round: [
    [1760, 0, 0.35],
    [1760, 0.4, 0.35],
    [1760, 0.8, 0.7],
  ],
  rest: [
    [1175, 0, 0.5],
    [880, 0.55, 0.9],
  ],
  warning: [
    [1568, 0, 0.14],
    [1568, 0.2, 0.14],
    [1568, 0.4, 0.14],
  ],
  countdown: [[2093, 0, 0.18]],
  done: [
    [1760, 0, 0.25],
    [1760, 0.3, 0.25],
    [1760, 0.6, 0.25],
    [1319, 0.9, 1.2],
  ],
}

const VIBRATION: Record<Sound, number[]> = {
  round: [300, 100, 300, 100, 500],
  rest: [700],
  warning: [120, 80, 120, 80, 120],
  countdown: [120],
  done: [300, 100, 300, 100, 800],
}

type AudioContextCtor = typeof AudioContext

/** Soft clipper: lets the signal be driven hot for loudness without harsh digital clipping. */
function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = Math.tanh(2.5 * x) / Math.tanh(2.5)
  }
  return curve
}

export class Beeper {
  private ctx: AudioContext | null = null
  private out: AudioNode | null = null
  muted = false

  /** Must be called from a user gesture (Start tap): browsers keep audio locked until then. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      const clip = ctx.createWaveShaper()
      clip.curve = softClipCurve()
      clip.oversample = '2x'
      const tone = ctx.createBiquadFilter()
      tone.type = 'lowpass'
      tone.frequency.value = 6000
      clip.connect(tone).connect(ctx.destination)
      this.ctx = ctx
      this.out = clip
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  play(sound: Sound): void {
    if (this.muted) return
    // Vibration exists on Android only; on iOS this is a no-op.
    navigator.vibrate?.(VIBRATION[sound])
    const { ctx, out } = this
    if (!ctx || !out) return
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime + 0.02
    for (const [freq, offset, length] of PATTERNS[sound]) {
      const start = t0 + offset
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(1, start + 0.005)
      gain.gain.setValueAtTime(1, start + length * 0.35)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
      gain.connect(out)
      // A square wave plus an octave-up sine: dense harmonics read as loud and bright.
      for (const [type, f, level] of [
        ['square', freq, 0.7],
        ['sine', freq * 2, 0.35],
      ] as const) {
        const osc = ctx.createOscillator()
        const mix = ctx.createGain()
        osc.type = type
        osc.frequency.value = f
        mix.gain.value = level
        osc.connect(mix).connect(gain)
        osc.start(start)
        osc.stop(start + length + 0.05)
      }
    }
  }
}
