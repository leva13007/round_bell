import { clamp } from './time'
import { DEFAULT_CONFIG, LIMITS, pruneOverrides, type Config, type Overrides } from './slots'

const WORKOUT_KEY = 'roundbell:workout:v1'
const FLAG_PREFIX = 'roundbell:flag:'

export interface Workout {
  config: Config
  overrides: Overrides
}

function snap(value: unknown, limits: { min: number; max: number; step: number }, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return clamp(Math.round(value / limits.step) * limits.step, limits.min, limits.max)
}

/** Parses stored JSON defensively: anything malformed falls back to defaults. */
export function parseWorkout(raw: string | null): Workout | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as { config?: Partial<Config>; overrides?: Record<string, unknown> }
    const c = data.config ?? {}
    const config: Config = {
      rounds: snap(c.rounds, LIMITS.rounds, DEFAULT_CONFIG.rounds),
      work: snap(c.work, LIMITS.work, DEFAULT_CONFIG.work),
      rest: snap(c.rest, LIMITS.rest, DEFAULT_CONFIG.rest),
    }
    const overrides: Overrides = {}
    for (const [id, value] of Object.entries(data.overrides ?? {})) {
      const limits = id.startsWith('w') ? LIMITS.work : LIMITS.rest
      if (typeof value === 'number' && /^[wr]\d+$/.test(id)) overrides[id] = snap(value, limits, limits.min)
    }
    return { config, overrides: pruneOverrides(config, overrides) }
  } catch {
    return null
  }
}

export function loadWorkout(): Workout | null {
  try {
    return parseWorkout(localStorage.getItem(WORKOUT_KEY))
  } catch {
    return null
  }
}

export function saveWorkout(workout: Workout): void {
  try {
    localStorage.setItem(WORKOUT_KEY, JSON.stringify(workout))
  } catch {
    // Storage blocked (private mode etc.): the app still works, it just won't remember.
  }
}

export function getFlag(name: string): boolean {
  try {
    return localStorage.getItem(FLAG_PREFIX + name) === '1'
  } catch {
    return false
  }
}

export function setFlag(name: string): void {
  try {
    localStorage.setItem(FLAG_PREFIX + name, '1')
  } catch {
    // ignore
  }
}
