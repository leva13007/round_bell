import { useRepeatPress } from '../hooks/useRepeatPress'
import { MinusIcon, PlusIcon } from './Icons'

interface Props {
  label: string
  hint?: string
  value: string
  disabled?: boolean
  canDecrease: boolean
  canIncrease: boolean
  decreaseLabel: string
  increaseLabel: string
  onDecrease: () => void
  onIncrease: () => void
}

export function Stepper(props: Props) {
  const decDisabled = props.disabled || !props.canDecrease
  const incDisabled = props.disabled || !props.canIncrease
  const dec = useRepeatPress(props.onDecrease, decDisabled)
  const inc = useRepeatPress(props.onIncrease, incDisabled)

  return (
    <div className={`stepper${props.disabled ? ' stepper--disabled' : ''}`}>
      <div>
        <div className="stepper__label">{props.label}</div>
        {props.hint && <div className="stepper__hint">{props.hint}</div>}
      </div>
      <div className="stepper__controls">
        <button type="button" className="icon-btn icon-btn--step" aria-label={props.decreaseLabel} disabled={decDisabled} {...dec}>
          <MinusIcon />
        </button>
        <output className="stepper__value" aria-live="polite">
          {props.value}
        </output>
        <button type="button" className="icon-btn icon-btn--step" aria-label={props.increaseLabel} disabled={incDisabled} {...inc}>
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}
