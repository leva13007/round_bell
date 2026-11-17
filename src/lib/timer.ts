import type { Slot } from './slots'

export type Phase = 'ready' | 'work' | 'rest'

export interface Step {
  phase: Phase
  /** Seconds. */
  duration: number
  round: number
}

export const READY_SECONDS = 10
export const WARNING_MS = 10_000
/** Beep and flash on each of the last N seconds of a step. */
export const COUNTDOWN_SECONDS = 3

export type TimerState =
  | { status: 'idle' }
  /** `count`: the last countdown second announced in this step (0 = none yet). */
  | { status: 'running'; index: number; endAt: number; warned: boolean; count: number }
  | { status: 'paused'; index: number; remaining: number; warned: boolean; count: number }
  | { status: 'finished'; outcome: 'done' | 'stopped'; index: number; remaining: number }

export type TimerEvent =
  | { type: 'step-start'; phase: Phase }
  | { type: 'warning' }
  | { type: 'countdown'; seconds: number }
  | { type: 'done' }

export interface Transition {
  state: TimerState
  events: TimerEvent[]
}

/** Run order: optional get-ready lead-in, then every slot that has a duration. */
export function buildSequence(slots: Slot[], readySeconds = READY_SECONDS): Step[] {
  const steps: Step[] = []
  if (readySeconds > 0) steps.push({ phase: 'ready', duration: readySeconds, round: 1 })
  for (const s of slots) {
    if (s.duration > 0) steps.push({ phase: s.type, duration: s.duration, round: s.round })
  }
  return steps
}

export function start(seq: Step[], now: number): Transition {
  if (seq.length === 0) return { state: { status: 'idle' }, events: [] }
  return {
    state: { status: 'running', index: 0, endAt: now + seq[0].duration * 1000, warned: false, count: 0 },
    events: [{ type: 'step-start', phase: seq[0].phase }],
  }
}

function warnable(step: Step): boolean {
  return step.phase !== 'ready' && step.duration * 1000 > WARNING_MS
}

/** The countdown second (3, 2, 1) the step is in, or 0 outside the countdown. */
export function countdownSecond(step: Step, remaining: number): number {
  if (step.duration <= COUNTDOWN_SECONDS || remaining <= 0) return 0
  const n = Math.ceil(remaining / 1000)
  return n <= COUNTDOWN_SECONDS ? n : 0
}

/**
 * Advances by wall-clock time. Works out the position from absolute end times, so a throttled
 * or sleeping tab catches up correctly. When it catches up over several steps it announces only
 * the step it lands on.
 */
export function tick(seq: Step[], state: TimerState, now: number): Transition {
  if (state.status !== 'running') return { state, events: [] }
  let { index, endAt, warned, count } = state
  let advanced = false
  while (now >= endAt) {
    index++
    if (index >= seq.length) {
      return {
        state: { status: 'finished', outcome: 'done', index: seq.length - 1, remaining: 0 },
        events: [{ type: 'done' }],
      }
    }
    endAt += seq[index].duration * 1000
    warned = false
    count = 0
    advanced = true
  }
  const events: TimerEvent[] = []
  if (advanced) events.push({ type: 'step-start', phase: seq[index].phase })
  if (!warned && warnable(seq[index]) && endAt - now <= WARNING_MS) {
    warned = true
    events.push({ type: 'warning' })
  }
  const n = countdownSecond(seq[index], endAt - now)
  if (n > 0 && (count === 0 || n < count)) {
    count = n
    events.push({ type: 'countdown', seconds: n })
  }
  if (!advanced && events.length === 0) return { state, events }
  return { state: { status: 'running', index, endAt, warned, count }, events }
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state
  return { status: 'paused', index: state.index, remaining: Math.max(0, state.endAt - now), warned: state.warned, count: state.count }
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused') return state
  return { status: 'running', index: state.index, endAt: now + state.remaining, warned: state.warned, count: state.count }
}

/** Jumps to the start of the next step (used for "Start now" during get-ready). */
export function skip(seq: Step[], state: TimerState, now: number): Transition {
  if (state.status !== 'running' && state.status !== 'paused') return { state, events: [] }
  const index = state.index + 1
  if (index >= seq.length) {
    return {
      state: { status: 'finished', outcome: 'done', index: seq.length - 1, remaining: 0 },
      events: [{ type: 'done' }],
    }
  }
  return {
    state: { status: 'running', index, endAt: now + seq[index].duration * 1000, warned: false, count: 0 },
    events: [{ type: 'step-start', phase: seq[index].phase }],
  }
}

export function stop(state: TimerState, now: number): TimerState {
  if (state.status === 'running') {
    return { status: 'finished', outcome: 'stopped', index: state.index, remaining: Math.max(0, state.endAt - now) }
  }
  if (state.status === 'paused') {
    return { status: 'finished', outcome: 'stopped', index: state.index, remaining: state.remaining }
  }
  return state
}

export interface TimerView {
  index: number
  step: Step
  /** Ms left in the current step. */
  remaining: number
  /** Time spent in rounds and rests so far, excluding get-ready (ms). */
  elapsed: number
  /** Total rounds + rests (ms). */
  total: number
  workDone: number
  roundsDone: number
  roundsTotal: number
}

export function view(seq: Step[], state: TimerState, now: number): TimerView | null {
  if (state.status === 'idle' || seq.length === 0) return null
  const index = state.index
  const step = seq[index]
  const remaining =
    state.status === 'running' ? Math.max(0, state.endAt - now) : state.remaining
  let elapsed = 0
  let total = 0
  let workDone = 0
  let roundsDone = 0
  let roundsTotal = 0
  seq.forEach((s, i) => {
    const ms = s.duration * 1000
    if (s.phase === 'work') roundsTotal++
    if (s.phase === 'ready') return
    total += ms
    const spent = i < index ? ms : i === index ? ms - remaining : 0
    elapsed += spent
    if (s.phase === 'work') {
      workDone += spent
      if (spent >= ms) roundsDone++
    }
  })
  return { index, step, remaining, elapsed, total, workDone, roundsDone, roundsTotal }
}

export type SoundCue = 'round' | 'rest' | 'warning' | 'countdown' | 'done'

export interface PlannedSound {
  sound: SoundCue
  /** Wall-clock time (Date.now() ms) when the sound should start. */
  at: number
}

/**
 * Every sound left in a running workout, as absolute wall-clock times. The audio layer schedules
 * them ahead on the AudioContext clock, so signals stay on time even when the JS thread is
 * throttled. Mirrors what `tick` announces: step start, 10 s warning, 3-2-1 countdown, done.
 * Only sounds at or after `now` are returned, so resuming doesn't replay the current step start.
 */
export function soundPlan(seq: Step[], state: TimerState, now: number): PlannedSound[] {
  if (state.status !== 'running') return []
  const plan: PlannedSound[] = []
  let endAt = state.endAt
  for (let i = state.index; i < seq.length; i++) {
    const step = seq[i]
    if (i > state.index) endAt += step.duration * 1000
    const startAt = endAt - step.duration * 1000
    if (step.phase !== 'ready') plan.push({ sound: step.phase === 'work' ? 'round' : 'rest', at: startAt })
    if (warnable(step)) plan.push({ sound: 'warning', at: endAt - WARNING_MS })
    if (step.duration > COUNTDOWN_SECONDS) {
      for (let n = COUNTDOWN_SECONDS; n >= 1; n--) plan.push({ sound: 'countdown', at: endAt - n * 1000 })
    }
  }
  plan.push({ sound: 'done', at: endAt })
  return plan.filter((p) => p.at >= now)
}

/**
 * Wall-clock time the current run would have started had it never paused or skipped. It stays the
 * same while steps advance naturally and changes on start, resume and skip, so it tells the UI
 * when the sound plan must be rebuilt.
 */
export function runAnchor(seq: Step[], state: TimerState): number | null {
  if (state.status !== 'running') return null
  let elapsed = 0
  for (let i = 0; i <= state.index; i++) elapsed += seq[i].duration * 1000
  return state.endAt - elapsed
}
