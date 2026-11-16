import { LIMITS, type Config, type Slot } from '../lib/slots'
import { clamp, formatClock } from '../lib/time'
import { BellIcon, CheckIcon, ChevronIcon, CloseIcon, PlayIcon, ResetIcon, ShareIcon, SoundIcon } from './Icons'
import { Stepper } from './Stepper'

export interface UndoToast {
  message: string
  onUndo: () => void
}

interface Props {
  config: Config
  slots: Slot[]
  totalSeconds: number
  canReset: boolean
  hasEdits: boolean
  toast: UndoToast | null
  installMode: 'ios' | 'prompt' | null
  onConfigChange: (config: Config) => void
  onEditSlot: (slot: Slot) => void
  onResetAll: () => void
  onResetEdits: () => void
  onTestSound: () => void
  onInstall: () => void
  onDismissInstall: () => void
  onStart: () => void
}

export function SetupScreen(p: Props) {
  const { config } = p
  const set = (key: keyof Config, delta: number) => {
    const l = LIMITS[key]
    p.onConfigChange({ ...config, [key]: clamp(config[key] + delta, l.min, l.max) })
  }
  const restUnused = config.rounds === 1

  return (
    <div className="setup">
      <div className="setup__body">
        <header className="setup__header">
          <div className="brand">
            <span className="brand__mark">
              <BellIcon />
            </span>
            <h1>RoundBell</h1>
          </div>
          <div className="setup__actions">
            <button type="button" className="icon-btn" aria-label="Test sound" onClick={p.onTestSound}>
              <SoundIcon size={20} />
            </button>
            <button type="button" className="pill-btn" disabled={!p.canReset} onClick={p.onResetAll}>
              <ResetIcon />
              Reset
            </button>
          </div>
        </header>

        {p.installMode && (
          <aside className="card install" aria-label="Install the app">
            <span className="install__icon">
              <ShareIcon />
            </span>
            <div className="install__text">
              <div className="install__title">Add RoundBell to your Home Screen</div>
              {p.installMode === 'ios' ? (
                <p>Tap Share, then Add to Home Screen. Opens full screen and works offline in the gym.</p>
              ) : (
                <>
                  <p>Opens full screen and works offline in the gym.</p>
                  <button type="button" className="link-btn" onClick={p.onInstall}>
                    Install
                  </button>
                </>
              )}
            </div>
            <button type="button" className="icon-btn icon-btn--ghost" aria-label="Dismiss install hint" onClick={p.onDismissInstall}>
              <CloseIcon />
            </button>
          </aside>
        )}

        <section className="card settings" aria-label="Workout settings">
          <Stepper
            label="Rounds"
            value={String(config.rounds)}
            canDecrease={config.rounds > LIMITS.rounds.min}
            canIncrease={config.rounds < LIMITS.rounds.max}
            decreaseLabel="Fewer rounds"
            increaseLabel="More rounds"
            onDecrease={() => set('rounds', -LIMITS.rounds.step)}
            onIncrease={() => set('rounds', LIMITS.rounds.step)}
          />
          <Stepper
            label="Round"
            value={formatClock(config.work)}
            canDecrease={config.work > LIMITS.work.min}
            canIncrease={config.work < LIMITS.work.max}
            decreaseLabel="Shorter rounds"
            increaseLabel="Longer rounds"
            onDecrease={() => set('work', -LIMITS.work.step)}
            onIncrease={() => set('work', LIMITS.work.step)}
          />
          <Stepper
            label="Rest"
            hint={restUnused ? 'Not used with 1 round' : config.rest === 0 ? 'Rounds back to back' : undefined}
            value={formatClock(config.rest)}
            disabled={restUnused}
            canDecrease={config.rest > LIMITS.rest.min}
            canIncrease={config.rest < LIMITS.rest.max}
            decreaseLabel="Shorter rest"
            increaseLabel="Longer rest"
            onDecrease={() => set('rest', -LIMITS.rest.step)}
            onIncrease={() => set('rest', LIMITS.rest.step)}
          />
        </section>

        <div className="section-head">
          <h2>Slots · tap to edit</h2>
          {p.hasEdits && (
            <button type="button" className="link-btn" onClick={p.onResetEdits}>
              Reset edits
            </button>
          )}
        </div>

        <ul className="slot-list">
          {p.slots.map((slot) => (
            <li key={slot.id}>
              <button type="button" className={`slot slot--${slot.type}`} onClick={() => p.onEditSlot(slot)}>
                {slot.type === 'work' ? (
                  <span className="tag">R{slot.round}</span>
                ) : (
                  <span className="slot__dot" aria-hidden="true" />
                )}
                <span className="slot__label">{slot.type === 'work' ? `Round ${slot.round}` : 'Rest'}</span>
                {slot.edited && <span className="badge">Edited</span>}
                <span className={`slot__time${slot.edited ? ' is-edited' : ''}`}>
                  {slot.duration === 0 ? 'skip' : formatClock(slot.duration)}
                </span>
                <span className="slot__chevron">
                  <ChevronIcon />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="app-version">RoundBell v{__APP_VERSION__}</p>
      </div>

      {p.toast && (
        <div className="toast" role="status">
          <CheckIcon />
          <span className="toast__text">{p.toast.message}</span>
          <button type="button" className="toast__action" onClick={p.toast.onUndo}>
            Undo
          </button>
        </div>
      )}

      <div className="setup__footer">
        <button type="button" className="btn btn--start" onClick={p.onStart}>
          <PlayIcon size={22} />
          Start
          <span className="btn__time">{formatClock(p.totalSeconds)}</span>
        </button>
      </div>
    </div>
  )
}
