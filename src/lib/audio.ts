import type { PlannedSound, SoundCue } from './timer'

export type Sound = SoundCue

type Sample = 'bell' | 'beep' | 'longbeep'

/** Each cue is one sample struck one or more times: [sample, offset in seconds]. */
const PATTERNS: Record<Sound, [Sample, number][]> = {
  round: [['bell', 0]],
  rest: [['bell', 0]],
  warning: [['longbeep', 0]],
  countdown: [['beep', 0]],
  done: [['bell', 0], ['bell', 0.35], ['bell', 0.7], ['bell', 1.05]],
}

const VIBRATION: Record<Sound, number[]> = {
  round: [300, 100, 300, 100, 500],
  rest: [700],
  warning: [120, 80, 120, 80, 120],
  countdown: [120],
  done: [300, 100, 300, 100, 800],
}

const SAMPLES: Sample[] = ['bell', 'beep', 'longbeep']

/**
 * iOS audio session category. 'transient' is meant for short sounds over other audio and may duck
 * music while a signal plays; 'playback' ignores the silent switch. Needs testing on a real iPhone.
 */
const IOS_AUDIO_SESSION: AudioSessionType = 'transient'

type AudioContextCtor = typeof AudioContext

interface Scheduled {
  src: AudioBufferSourceNode
  /** AudioContext time the source starts. */
  start: number
}

/**
 * Plays the signal samples through Web Audio. Workout sounds are scheduled ahead on the
 * AudioContext clock from a wall-clock plan, so they don't depend on the JS timer firing on time.
 * The plan is re-applied whenever the context resumes, because a suspended context's clock stops.
 */
export class Beeper {
  private ctx: AudioContext | null = null
  private buffers: Partial<Record<Sample, AudioBuffer>> = {}
  private loading: Promise<void> | null = null
  private plan: PlannedSound[] = []
  private scheduled: Scheduled[] = []
  private _muted = false

  get muted(): boolean {
    return this._muted
  }

  set muted(value: boolean) {
    this._muted = value
    this.apply()
  }

  /** Must be called from a user gesture (Start tap): browsers keep audio locked until then. */
  unlock(): void {
    if (navigator.audioSession) navigator.audioSession.type = IOS_AUDIO_SESSION
    if (!this.ctx) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'running') this.apply()
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (ctx.state === 'suspended') void ctx.resume()
          this.apply()
        }
      })
      this.ctx = ctx
      this.loading = this.load(ctx)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  private async load(ctx: AudioContext): Promise<void> {
    await Promise.all(
      SAMPLES.map(async (name) => {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}sounds/${name}.mp3`)
          this.buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer())
        } catch {
          // A missing sample just stays silent; vibration still works.
        }
      }),
    )
    this.apply()
  }

  /** Replaces the workout's sound plan. An empty plan cancels everything not yet playing. */
  schedule(plan: PlannedSound[]): void {
    this.plan = plan
    this.apply()
  }

  /** Forgets the plan without cutting sounds already scheduled (lets the final bell ring out). */
  release(): void {
    this.plan = []
    this.scheduled = []
  }

  /** Plays a cue right now (sound test). Ignores mute. */
  play(sound: Sound): void {
    const ctx = this.ctx
    if (!ctx) return
    const go = () => this.strike(ctx, sound, ctx.currentTime + 0.02)
    if (this.buffers.bell) go()
    else void this.loading?.then(go)
  }

  /** Vibrates for a cue (Android only; a no-op on iOS). Driven by timer events, not the plan. */
  vibrate(sound: Sound): void {
    if (!this._muted) navigator.vibrate?.(VIBRATION[sound])
  }

  /** Cancels sounds that haven't started and schedules the rest of the plan on the audio clock. */
  private apply(): void {
    const ctx = this.ctx
    if (!ctx) return
    const nowCtx = ctx.currentTime
    for (const s of this.scheduled) if (s.start > nowCtx) s.src.stop()
    this.scheduled = []
    if (this._muted || ctx.state !== 'running') return
    const now = Date.now()
    for (const p of this.plan) {
      if (p.at < now) continue
      this.scheduled.push(...this.strike(ctx, p.sound, nowCtx + (p.at - now) / 1000))
    }
  }

  private strike(ctx: AudioContext, sound: Sound, when: number): Scheduled[] {
    const out: Scheduled[] = []
    for (const [sample, offset] of PATTERNS[sound]) {
      const buffer = this.buffers[sample]
      if (!buffer) continue
      const src = ctx.createBufferSource()
      src.buffer = buffer
      // A touch of pitch variation so repeated strikes don't sound machine-identical.
      if (sample === 'bell') src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.04
      src.connect(ctx.destination)
      const start = Math.max(when + offset, ctx.currentTime)
      src.start(start)
      out.push({ src, start })
    }
    return out
  }
}
