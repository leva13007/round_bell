import type { Step, TimerView } from '../lib/timer'
import { formatClock } from '../lib/time'
import { BellIcon, ResetIcon, StopIcon } from './Icons'

interface Props {
  outcome: 'done' | 'stopped'
  view: TimerView
  step: Step
  onAgain: () => void
  onSetup: () => void
}

export function SummaryScreen({ outcome, view, step, onAgain, onSetup }: Props) {
  const done = outcome === 'done'
  const where =
    step.phase === 'ready'
      ? 'Ended during get ready.'
      : `Ended in ${step.phase === 'rest' ? 'the rest after ' : ''}round ${step.round} of ${view.roundsTotal}.`

  return (
    <div className="summary">
      <div className="summary__main">
        <span className={`summary__badge${done ? '' : ' summary__badge--stopped'}`}>
          {done ? <BellIcon size={48} /> : <StopIcon size={40} />}
        </span>
        <div>
          <h1>{done ? 'Workout done' : 'Stopped'}</h1>
          <p className="muted">{done ? (view.roundsTotal === 1 ? 'Round finished.' : `All ${view.roundsTotal} rounds finished.`) : where}</p>
        </div>
        <dl className="stats">
          <div>
            <dt>Rounds</dt>
            <dd>
              {view.roundsDone}
              {!done && <span className="dim"> / {view.roundsTotal}</span>}
            </dd>
          </div>
          <div>
            <dt>Work</dt>
            <dd>{formatClock(Math.floor(view.workDone / 1000))}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatClock(Math.floor(view.elapsed / 1000))}</dd>
          </div>
        </dl>
      </div>
      <div className="summary__actions">
        <button type="button" className="btn btn--start" onClick={onAgain}>
          <ResetIcon size={22} />
          {done ? 'Same again' : 'Restart from round 1'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onSetup}>
          Back to setup
        </button>
      </div>
    </div>
  )
}
