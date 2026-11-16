import { describe, expect, it } from 'vitest'
import { parseWorkout } from './storage'
import { formatClock, displaySeconds } from './time'

describe('parseWorkout', () => {
  it('returns null for missing or broken data', () => {
    expect(parseWorkout(null)).toBeNull()
    expect(parseWorkout('{not json')).toBeNull()
  })

  it('clamps and snaps values into the allowed ranges', () => {
    const w = parseWorkout(JSON.stringify({ config: { rounds: 99, work: 7, rest: 62 }, overrides: {} }))
    expect(w?.config).toEqual({ rounds: 30, work: 15, rest: 60 })
  })

  it('falls back to defaults for invalid fields and drops junk overrides', () => {
    const w = parseWorkout(
      JSON.stringify({ config: { rounds: 'x' }, overrides: { w1: 120, hack: 5, r1: 'no', w9: 60 } }),
    )
    expect(w).toEqual({ config: { rounds: 3, work: 180, rest: 60 }, overrides: { w1: 120 } })
  })
})

describe('time helpers', () => {
  it('formats m:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(1200)).toBe('20:00')
  })

  it('rounds remaining ms up to whole seconds', () => {
    expect(displaySeconds(10_000)).toBe(10)
    expect(displaySeconds(9_001)).toBe(10)
    expect(displaySeconds(1)).toBe(1)
    expect(displaySeconds(0)).toBe(0)
    expect(displaySeconds(-50)).toBe(0)
  })
})
