export type SlotType = 'work' | 'rest'

export interface Config {
  rounds: number
  /** Default round length, seconds. */
  work: number
  /** Default rest length, seconds. 0 = rounds back to back. */
  rest: number
}

/** Per-slot durations that differ from the config, keyed by slot id. */
export type Overrides = Record<string, number>

export interface Slot {
  /** `w<n>` = round n, `r<n>` = rest after round n. Stable when rounds or durations change. */
  id: string
  type: SlotType
  round: number
  duration: number
  defaultDuration: number
  edited: boolean
}

export const LIMITS = {
  rounds: { min: 1, max: 30, step: 1 },
  work: { min: 15, max: 1200, step: 15 },
  rest: { min: 0, max: 300, step: 15 },
} as const

export const DEFAULT_CONFIG: Config = { rounds: 3, work: 180, rest: 60 }

export const QUICK_DURATIONS: Record<SlotType, number[]> = {
  work: [60, 120, 180, 240, 300],
  rest: [15, 30, 60, 90, 120],
}

export function generateSlots(config: Config, overrides: Overrides): Slot[] {
  const slots: Slot[] = []
  for (let round = 1; round <= config.rounds; round++) {
    slots.push(makeSlot(`w${round}`, 'work', round, config.work, overrides))
    if (round < config.rounds && config.rest > 0) {
      slots.push(makeSlot(`r${round}`, 'rest', round, config.rest, overrides))
    }
  }
  return slots
}

function makeSlot(id: string, type: SlotType, round: number, base: number, overrides: Overrides): Slot {
  const duration = overrides[id] ?? base
  return { id, type, round, duration, defaultDuration: base, edited: duration !== base }
}

export function totalSeconds(slots: Slot[]): number {
  return slots.reduce((sum, s) => sum + s.duration, 0)
}

/** Drops overrides for slots that no longer exist or that now equal the default. */
export function pruneOverrides(config: Config, overrides: Overrides): Overrides {
  const next: Overrides = {}
  for (const slot of generateSlots(config, overrides)) {
    if (slot.edited) next[slot.id] = slot.duration
  }
  return next
}

export function setSlotDuration(overrides: Overrides, slot: Slot, duration: number): Overrides {
  const next = { ...overrides }
  if (duration === slot.defaultDuration) delete next[slot.id]
  else next[slot.id] = duration
  return next
}

export function isDefaultWorkout(config: Config, overrides: Overrides): boolean {
  return (
    config.rounds === DEFAULT_CONFIG.rounds &&
    config.work === DEFAULT_CONFIG.work &&
    config.rest === DEFAULT_CONFIG.rest &&
    Object.keys(overrides).length === 0
  )
}
