import { useCallback, useEffect, useRef, useState } from 'react'
import * as T from '../lib/timer'

const TICK_MS = 100

/**
 * Owns the timer state and the tick loop. Uses Date.now() (wall clock) rather than
 * performance.now(), because the monotonic clock may not advance while the device sleeps.
 */
export function useTimer(onEvent: (event: T.TimerEvent) => void) {
  const [state, setState] = useState<T.TimerState>({ status: 'idle' })
  const [now, setNow] = useState(() => Date.now())
  const [seq, setSeq] = useState<T.Step[]>([])
  const stateRef = useRef(state)
  const seqRef = useRef(seq)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const commit = useCallback((next: T.TimerState, events: T.TimerEvent[] = []) => {
    stateRef.current = next
    setState(next)
    setNow(Date.now())
    for (const e of events) onEventRef.current(e)
  }, [])

  const running = state.status === 'running'
  useEffect(() => {
    if (!running) return
    const step = () => {
      const t = Date.now()
      const r = T.tick(seqRef.current, stateRef.current, t)
      if (r.state !== stateRef.current) commit(r.state, r.events)
      else setNow(t)
    }
    const id = window.setInterval(step, TICK_MS)
    document.addEventListener('visibilitychange', step)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', step)
    }
  }, [running, commit])

  const start = useCallback(
    (steps: T.Step[]) => {
      seqRef.current = steps
      setSeq(steps)
      const r = T.start(steps, Date.now())
      commit(r.state, r.events)
    },
    [commit],
  )
  const pause = useCallback(() => commit(T.pause(stateRef.current, Date.now())), [commit])
  const resume = useCallback(() => commit(T.resume(stateRef.current, Date.now())), [commit])
  const stop = useCallback(() => commit(T.stop(stateRef.current, Date.now())), [commit])
  const skip = useCallback(() => {
    const r = T.skip(seqRef.current, stateRef.current, Date.now())
    commit(r.state, r.events)
  }, [commit])
  const reset = useCallback(() => commit({ status: 'idle' }), [commit])

  return { state, seq, view: T.view(seq, state, now), start, pause, resume, stop, skip, reset }
}
