export type Sound = 'round' | 'rest' | 'warning' | 'done'

type Note = [freq: number, offset: number, length: number]

// Short synthesized bell-like signals, no audio files.
const PATTERNS: Record<Sound, Note[]> = {
  round: [
    [988, 0, 0.16],
    [988, 0.22, 0.16],
    [988, 0.44, 0.32],
  ],
  rest: [[523, 0, 0.9]],
  warning: [
    [784, 0, 0.1],
    [784, 0.16, 0.1],
  ],
  done: [
    [988, 0, 0.16],
    [988, 0.22, 0.16],
    [988, 0.44, 0.16],
    [659, 0.7, 1.1],
  ],
}

const VIBRATION: Record<Sound, number[]> = {
  round: [200, 100, 200, 100, 300],
  rest: [600],
  warning: [100, 80, 100],
  done: [300, 100, 300, 100, 600],
}

type AudioContextCtor = typeof AudioContext

export class Beeper {
  private ctx: AudioContext | null = null
  muted = false

  /** Must be called from a user gesture (Start tap): browsers keep audio locked until then. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  play(sound: Sound): void {
    if (this.muted) return
    // Vibration exists on Android only; on iOS this is a no-op.
    navigator.vibrate?.(VIBRATION[sound])
    const ctx = this.ctx
    if (!ctx) return
    const t0 = ctx.currentTime + 0.02
    for (const [freq, offset, length] of PATTERNS[sound]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = t0 + offset
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.6, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + length + 0.05)
    }
  }
}
