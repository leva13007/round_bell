import { useEffect, useState } from 'react'

export type WakeLockStatus = 'off' | 'on' | 'unsupported' | 'failed'

/**
 * Keeps the screen on while `active`. The browser releases the lock whenever the page is hidden,
 * so it is requested again on every return to the page.
 */
export function useWakeLock(active: boolean): WakeLockStatus {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [status, setStatus] = useState<WakeLockStatus>('off')

  useEffect(() => {
    if (!active || !supported) return
    let sentinel: WakeLockSentinel | null = null
    let disposed = false

    const request = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (disposed) {
          void lock.release()
          return
        }
        sentinel = lock
        setStatus('on')
      } catch {
        if (!disposed) setStatus('failed')
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
      setStatus('off')
    }
  }, [active, supported])

  if (!supported) return active ? 'unsupported' : 'off'
  return status
}
