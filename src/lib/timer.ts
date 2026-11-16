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

export type TimerState =
  | { status: 'idle' }
  | { status: 'running'; index: number; endAt: number; warned: boolean }
  | { status: 'paused'; index: number; remaining: number; warned: boolean }
  | { status: 'finished'; outcome: 'done' | 'stopped'; index: number; remaining: number }

export type TimerEvent = { type: 'step-start'; phase: Phase } | { type: 'warning' } | { type: 'done' }

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
    state: { status: 'running', index: 0, endAt: now + seq[0].duration * 1000, warned: false },
    events: [{ type: 'step-start', phase: seq[0].phase }],
  }
}

function warnable(step: Step): boolean {
  return step.phase !== 'ready' && step.duration * 1000 > WARNING_MS
}

/**
 * Advances by wall-clock time. Works out the position from absolute end times, so a throttled
 * or sleeping tab catches up correctly. When it catches up over several steps it announces only
 * the step it lands on.
 */
export function tick(seq: Step[], state: TimerState, now: number): Transition {
  if (state.status !== 'running') return { state, events: [] }
  let { index, endAt, warned } = state
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
    advanced = true
  }
  const events: TimerEvent[] = []
  if (advanced) events.push({ type: 'step-start', phase: seq[index].phase })
  if (!warned && warnable(seq[index]) && endAt - now <= WARNING_MS) {
    warned = true
    events.push({ type: 'warning' })
  }
  if (!advanced && events.length === 0) return { state, events }
  return { state: { status: 'running', index, endAt, warned }, events }
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state
  return { status: 'paused', index: state.index, remaining: Math.max(0, state.endAt - now), warned: state.warned }
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused') return state
  return { status: 'running', index: state.index, endAt: now + state.remaining, warned: state.warned }
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
    state: { status: 'running', index, endAt: now + seq[index].duration * 1000, warned: false },
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
