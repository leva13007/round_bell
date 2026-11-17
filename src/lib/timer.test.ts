import { describe, expect, it } from 'vitest'
import { generateSlots } from './slots'
import { buildSequence, pause, resume, runAnchor, skip, soundPlan, start, stop, tick, view, type Step } from './timer'

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

  it('counts down the last 3 seconds of each step once per second', () => {
    let s = start(seq, T0).state // ready ends at T0+10s
    const at = (ms: number) => {
      const r = tick(seq, s, T0 + ms)
      s = r.state
      return r.events
    }
    expect(at(6_900)).toEqual([])
    expect(at(7_000)).toEqual([{ type: 'countdown', seconds: 3 }])
    expect(at(7_500)).toEqual([])
    expect(at(8_100)).toEqual([{ type: 'countdown', seconds: 2 }])
    expect(at(9_950)).toEqual([{ type: 'countdown', seconds: 1 }]) // a late tick skips 2→1 without repeats
    expect(at(10_000)).toEqual([{ type: 'step-start', phase: 'work' }])
    expect(at(30_000)).toEqual([{ type: 'warning' }])
    expect(at(37_200)).toEqual([{ type: 'countdown', seconds: 3 }])
  })

  it('does not count down steps of 3 s or less', () => {
    const tiny: Step[] = [{ phase: 'rest', duration: 3, round: 1 }]
    expect(tick(tiny, start(tiny, T0).state, T0 + 500).events).toEqual([])
  })

  it('keeps the countdown position across pause and resume', () => {
    const s = tick(seq, start(seq, T0).state, T0 + 7_500).state
    const resumed = resume(pause(s, T0 + 7_600), T0 + 20_000)
    expect(tick(seq, resumed, T0 + 20_100).events).toEqual([])
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

describe('soundPlan', () => {
  it('lists every sound of a fresh run, ready step silent', () => {
    const s = start(seq, T0).state
    const plan = soundPlan(seq, s, T0).map((p) => [p.sound, p.at - T0])
    expect(plan).toEqual([
      // ready 0–10 s: countdown only
      ['countdown', 7_000], ['countdown', 8_000], ['countdown', 9_000],
      // work 10–40 s
      ['round', 10_000], ['warning', 30_000],
      ['countdown', 37_000], ['countdown', 38_000], ['countdown', 39_000],
      // rest 40–55 s
      ['rest', 40_000], ['warning', 45_000],
      ['countdown', 52_000], ['countdown', 53_000], ['countdown', 54_000],
      // work 55–85 s
      ['round', 55_000], ['warning', 75_000],
      ['countdown', 82_000], ['countdown', 83_000], ['countdown', 84_000],
      ['done', 85_000],
    ])
  })

  it('drops sounds already in the past after a resume', () => {
    const running = tick(seq, start(seq, T0).state, T0 + 35_000).state // 5 s left in round 1
    const paused = pause(running, T0 + 35_000)
    const resumed = resume(paused, T0 + 100_000)
    const plan = soundPlan(seq, resumed, T0 + 100_000)
    expect(plan[0]).toEqual({ sound: 'countdown', at: T0 + 102_000 })
    expect(plan.some((p) => p.sound === 'round' && p.at < T0 + 100_000)).toBe(false)
  })

  it('is empty unless running', () => {
    expect(soundPlan(seq, { status: 'idle' }, T0)).toEqual([])
    expect(soundPlan(seq, pause(start(seq, T0).state, T0 + 1_000), T0 + 1_000)).toEqual([])
  })
})

describe('runAnchor', () => {
  it('stays put while steps advance and moves on resume', () => {
    const s0 = start(seq, T0).state
    const s1 = tick(seq, s0, T0 + 12_000).state
    expect(runAnchor(seq, s0)).toBe(T0)
    expect(runAnchor(seq, s1)).toBe(T0)
    const r = resume(pause(s1, T0 + 20_000), T0 + 50_000)
    expect(runAnchor(seq, r)).toBe(T0 + 30_000)
  })
})
