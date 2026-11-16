import { useEffect, useRef, useState } from 'react'
import { LIMITS, QUICK_DURATIONS, type Slot } from '../lib/slots'
import { clamp, formatClock } from '../lib/time'
import { useRepeatPress } from '../hooks/useRepeatPress'
import { CloseIcon, MinusIcon, PlusIcon, ResetIcon } from './Icons'

interface Props {
  slot: Slot
  onSave: (duration: number) => void
  onClose: () => void
}

export function SlotSheet({ slot, onSave, onClose }: Props) {
  const [value, setValue] = useState(slot.duration)
  const limits = slot.type === 'work' ? LIMITS.work : LIMITS.rest
  const sheetRef = useRef<HTMLElement>(null)
  const title = slot.type === 'work' ? `Round ${slot.round}` : `Rest after round ${slot.round}`

  const change = (delta: number) => setValue((v) => clamp(v + delta, limits.min, limits.max))
  const dec = useRepeatPress(() => change(-limits.step), value <= limits.min)
  const inc = useRepeatPress(() => change(limits.step), value >= limits.max)

  useEffect(() => {
    sheetRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-layer">
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <section ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-label={`Edit ${title}`} tabIndex={-1}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__head">
          <div className="sheet__title">
            {slot.type === 'work' ? (
              <span className="tag tag--lg">R{slot.round}</span>
            ) : (
              <span className="tag tag--lg tag--rest" aria-hidden="true" />
            )}
            <div>
              <h2>{title}</h2>
              <div className="muted">
                {slot.type === 'work' ? 'Work' : 'Rest'} · default {formatClock(slot.defaultDuration)}
              </div>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet__value-row">
          <button type="button" className="big-step" aria-label="Minus 15 seconds" disabled={value <= limits.min} {...dec}>
            <MinusIcon size={24} />
            <span>15 s</span>
          </button>
          <output className={`sheet__value${value !== slot.defaultDuration ? ' is-edited' : ''}`} aria-live="polite">
            {formatClock(value)}
          </output>
          <button type="button" className="big-step" aria-label="Plus 15 seconds" disabled={value >= limits.max} {...inc}>
            <PlusIcon size={24} />
            <span>15 s</span>
          </button>
        </div>
        {slot.type === 'rest' && value === 0 && <p className="sheet__note">0:00 skips this rest.</p>}

        <div className="chips" role="group" aria-label="Quick durations">
          {QUICK_DURATIONS[slot.type].map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={value === d} onClick={() => setValue(d)}>
              {formatClock(d)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="link-btn sheet__reset"
          disabled={value === slot.defaultDuration}
          onClick={() => setValue(slot.defaultDuration)}
        >
          <ResetIcon size={16} />
          Reset to default {formatClock(slot.defaultDuration)}
        </button>

        <div className="sheet__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--light" onClick={() => onSave(value)}>
            Save
          </button>
        </div>
      </section>
    </div>
  )
}
