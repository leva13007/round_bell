import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  generateSlots,
  isDefaultWorkout,
  pruneOverrides,
  setSlotDuration,
  totalSeconds,
} from './slots'

describe('generateSlots', () => {
  it('alternates rounds and rests, with no rest after the last round', () => {
    const slots = generateSlots({ rounds: 3, work: 180, rest: 60 }, {})
    expect(slots.map((s) => s.id)).toEqual(['w1', 'r1', 'w2', 'r2', 'w3'])
    expect(totalSeconds(slots)).toBe(3 * 180 + 2 * 60)
  })

  it('skips rests when rest is 0', () => {
    const slots = generateSlots({ rounds: 3, work: 60, rest: 0 }, {})
    expect(slots.map((s) => s.id)).toEqual(['w1', 'w2', 'w3'])
  })

  it('has a single slot for one round', () => {
    expect(generateSlots({ rounds: 1, work: 60, rest: 30 }, {})).toHaveLength(1)
  })

  it('applies overrides and marks them as edited', () => {
    const slots = generateSlots({ rounds: 2, work: 180, rest: 60 }, { r1: 120 })
    const rest = slots.find((s) => s.id === 'r1')!
    expect(rest).toMatchObject({ duration: 120, defaultDuration: 60, edited: true })
    expect(slots[0].edited).toBe(false)
  })

  it('keeps edited slots when the default length changes', () => {
    const slots = generateSlots({ rounds: 2, work: 150, rest: 60 }, { w2: 120 })
    expect(slots.map((s) => s.duration)).toEqual([150, 60, 120])
  })
})

describe('pruneOverrides', () => {
  it('drops overrides for removed rounds and ones equal to the default', () => {
    const config = { rounds: 2, work: 120, rest: 60 }
    expect(pruneOverrides(config, { w1: 120, w2: 90, w5: 30, r1: 45, r2: 30 })).toEqual({ w2: 90, r1: 45 })
  })
})

describe('setSlotDuration', () => {
  it('sets an override, and removes it when back to the default', () => {
    const [slot] = generateSlots({ rounds: 1, work: 180, rest: 0 }, {})
    const edited = setSlotDuration({}, slot, 150)
    expect(edited).toEqual({ w1: 150 })
    expect(setSlotDuration(edited, slot, 180)).toEqual({})
  })
})

describe('isDefaultWorkout', () => {
  it('is true only for default config with no edits', () => {
    expect(isDefaultWorkout(DEFAULT_CONFIG, {})).toBe(true)
    expect(isDefaultWorkout(DEFAULT_CONFIG, { w1: 60 })).toBe(false)
    expect(isDefaultWorkout({ ...DEFAULT_CONFIG, rounds: 4 }, {})).toBe(false)
  })
})
