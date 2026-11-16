import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

const DELAY_MS = 400
const INTERVAL_MS = 90

/** Press = one step; press and hold = repeat. Keyboard activation works through onClick. */
export function useRepeatPress(action: () => void, disabled: boolean) {
  const actionRef = useRef(action)
  const timeout = useRef<number | undefined>(undefined)
  const interval = useRef<number | undefined>(undefined)

  useEffect(() => {
    actionRef.current = action
  }, [action])

  const stop = () => {
    window.clearTimeout(timeout.current)
    window.clearInterval(interval.current)
  }

  // A disabled button (limit reached) never receives pointerup, so stop here.
  useEffect(() => {
    if (disabled) stop()
  }, [disabled])
  useEffect(() => stop, [])

  return {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 || disabled) return
      actionRef.current()
      timeout.current = window.setTimeout(() => {
        interval.current = window.setInterval(() => actionRef.current(), INTERVAL_MS)
      }, DELAY_MS)
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      if (e.detail === 0) actionRef.current() // keyboard (Enter/Space) only; pointer handled above
    },
  }
}
