import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

interface Props {
  className?: string
  label: string
  holdMs?: number
  onComplete: () => void
  onHoldingChange?: (holding: boolean) => void
  children: ReactNode
}

/** Fires only after being held for `holdMs`: a stray tap with a glove can't end the workout. */
export function HoldButton({ className, label, holdMs = 1000, onComplete, onHoldingChange, children }: Props) {
  const [progress, setProgress] = useState(0)
  const frame = useRef(0)
  const startedAt = useRef<number | null>(null)

  const end = () => {
    cancelAnimationFrame(frame.current)
    if (startedAt.current !== null) onHoldingChange?.(false)
    startedAt.current = null
    setProgress(0)
  }

  const begin = () => {
    if (startedAt.current !== null) return
    startedAt.current = performance.now()
    onHoldingChange?.(true)
    const loop = (t: number) => {
      if (startedAt.current === null) return
      const p = (t - startedAt.current) / holdMs
      if (p >= 1) {
        end()
        onComplete()
        return
      }
      setProgress(p)
      frame.current = requestAnimationFrame(loop)
    }
    frame.current = requestAnimationFrame(loop)
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (down && !e.repeat) begin()
    if (!down) end()
  }

  return (
    <button
      type="button"
      className={`hold ${progress > 0 ? 'hold--active ' : ''}${className ?? ''}`}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        begin()
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={(e) => onKey(e, true)}
      onKeyUp={(e) => onKey(e, false)}
      onBlur={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold__fill" aria-hidden="true" style={{ height: `${progress * 100}%` }} />
      <span className="hold__content">{children}</span>
    </button>
  )
}
