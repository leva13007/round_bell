import { describe, expect, it } from 'vitest'
import { generateSlots } from './slots'
import { buildSequence, pause, resume, skip, start, stop, tick, view, type Step } from './timer'

// ready 10 s → work 30 s → rest 15 s → work 30 s
const seq: Step[] = buildSequence(generateSlots({ rounds: 2, work: 30, rest: 15 }, {}))
const T0 = 1_000_000

describe('buildSequence', () => {
  it('prepends get-ready and drops zero-length slots', () => {
    const steps = buildSequence(generateSlots({ rounds: 2, work: 30, rest: 15 }, { r1: 0 }))
    expect(steps.map((s) => s.phase)).toEqual(['ready', 'work', 'work'])
  })

  it('can skip get-ready', () => {
    expect(buildSequence(generateSlots({ rounds: 1, work: 30, rest: 0 }, {}), 0)[0].phase).toBe('work')
  })
})

describe('timer', () => {
  it('starts on the first step and announces it', () => {
    const { state, events } = start(seq, T0)
    expect(state).toMatchObject({ status: 'running', index: 0, endAt: T0 + 10_000 })
    expect(events).toEqual([{ type: 'step-start', phase: 'ready' }])
  })

  it('does nothing mid-step', () => {
    const s = start(seq, T0).state
    const r = tick(seq, s, T0 + 3_000)
    expect(r.state).toBe(s)
    expect(r.events).toEqual([])
  })

  it('advances to the next step and carries over end times without drift', () => {
    const s = start(seq, T0).state
    const r = tick(seq, s, T0 + 10_250)
    expect(r.state).toMatchObject({ status: 'running', index: 1, endAt: T0 + 40_000 })
    expect(r.events).toEqual([{ type: 'step-start', phase: 'work' }])
  })

  it('warns once at 10 seconds left, but not during get-ready', () => {
    let s = start(seq, T0).state
    expect(tick(seq, s, T0 + 1).events).toEqual([]) // ready has exactly 10 s: no warning
    s = tick(seq, s, T0 + 10_000).state // work 30 s, ends at T0+40s
    const warned = tick(seq, s, T0 + 30_000)
    expect(warned.events).toEqual([{ type: 'warning' }])
    expect(tick(seq, warned.state, T0 + 31_000).events).toEqual([])
  })

  it('does not warn for steps of 10 s or less', () => {
    const short = buildSequence(generateSlots({ rounds: 1, work: 15, rest: 0 }, { w1: 15 }), 0)
    const tiny: Step[] = [{ phase: 'rest', duration: 10, round: 1 }, ...short]
    const s = start(tiny, T0).state
    expect(tick(tiny, s, T0 + 5_000).events).toEqual([])
  })

  it('catches up over several steps after a long gap and announces only the landing step', () => {
    const s = start(seq, T0).state
    const r = tick(seq, s, T0 + 56_000) // past ready (10) + work (30) + rest (15)
    expect(r.state).toMatchObject({ index: 3 })
    expect(r.events).toEqual([{ type: 'step-start', phase: 'work' }])
  })

  it('finishes after the last step', () => {
    const s = start(seq, T0).state
    const r = tick(seq, s, T0 + 85_000)
    expect(r.state).toMatchObject({ status: 'finished', outcome: 'done' })
    expect(r.events).toEqual([{ type: 'done' }])
  })

  it('pause keeps the remaining time and resume continues from it', () => {
    const s = start(seq, T0).state
    const paused = pause(s, T0 + 4_000)
    expect(paused).toMatchObject({ status: 'paused', remaining: 6_000 })
    expect(tick(seq, paused, T0 + 60_000).state).toBe(paused)
    const resumed = resume(paused, T0 + 60_000)
    expect(resumed).toMatchObject({ status: 'running', endAt: T0 + 66_000 })
  })

  it('skip jumps straight into the next step', () => {
    const s = start(seq, T0).state
    const r = skip(seq, s, T0 + 2_000)
    expect(r.state).toMatchObject({ index: 1, endAt: T0 + 32_000 })
    expect(r.events).toEqual([{ type: 'step-start', phase: 'work' }])
  })

  it('stop records where it ended', () => {
    const s = tick(seq, start(seq, T0).state, T0 + 10_000).state
    expect(stop(s, T0 + 25_000)).toMatchObject({ status: 'finished', outcome: 'stopped', index: 1, remaining: 15_000 })
  })
})

describe('view', () => {
  it('excludes get-ready from elapsed and total', () => {
    const s = start(seq, T0).state
    expect(view(seq, s, T0 + 5_000)).toMatchObject({ elapsed: 0, total: 75_000, roundsTotal: 2 })
  })

  it('counts elapsed time, work done and completed rounds', () => {
    const s = tick(seq, start(seq, T0).state, T0 + 50_000).state // in rest, 10 s in
    expect(view(seq, s, T0 + 50_000)).toMatchObject({ index: 2, elapsed: 40_000, workDone: 30_000, roundsDone: 1 })
  })

  it('reports everything done when finished', () => {
    const s = tick(seq, start(seq, T0).state, T0 + 90_000).state
    expect(view(seq, s, T0 + 90_000)).toMatchObject({ elapsed: 75_000, roundsDone: 2, remaining: 0 })
  })
})
