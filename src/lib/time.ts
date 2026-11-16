/** Formats whole seconds as m:ss (e.g. 185 → "3:05"). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Remaining milliseconds → seconds shown on the clock (counts down 3, 2, 1, then 0 at the end). */
export function displaySeconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
