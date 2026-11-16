import { useEffect, useState } from 'react'
import { WARNING_MS, type Step, type TimerState, type TimerView } from '../lib/timer'
import { displaySeconds, formatClock } from '../lib/time'
import type { WakeLockStatus } from '../hooks/useWakeLock'
import { HoldButton } from './HoldButton'
import {
  BellIcon,
  CloseIcon,
  HandIcon,
  MutedIcon,
  PauseIcon,
  PlayIcon,
  SkipIcon,
  SleepIcon,
  SoundIcon,
  StopIcon,
} from './Icons'

type Visual = 'ready' | 'work' | 'rest' | 'warn' | 'paused'

const THEME_COLORS: Record<Visual, string> = {
  ready: '#0F0F12',
  work: '#D23A12',
  rest: '#1E3A8A',
  warn: '#FFB020',
  paused: '#3A1A10',
}

interface Props {
  seq: Step[]
  state: TimerState
  view: TimerView
  muted: boolean
  wakeLock: WakeLockStatus
  showSilentHint: boolean
  onDismissSilentHint: () => void
  onToggleMute: () => void
  onPause: () => void
  onResume: () => void
  onSkip: () => void
  onStop: () => void
}

function describe(step: Step): string {
  return step.phase === 'work' ? `Round ${step.round} · ${formatClock(step.duration)}` : `Rest ${formatClock(step.duration)}`
}

export function TimerScreen(p: Props) {
  const { view, seq } = p
  const { step } = view
  const paused = p.state.status === 'paused'
  const [holding, setHolding] = useState(false)
  const [wakeDismissed, setWakeDismissed] = useState(false)

  const warn = step.phase !== 'ready' && step.duration * 1000 > WARNING_MS && view.remaining <= WARNING_MS
  const visual: Visual = paused ? 'paused' : warn ? 'warn' : step.phase

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[visual])
  }, [visual])
  useEffect(
    () => () => document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS.ready),
    [],
  )

  const top =
    step.phase === 'ready' ? (
      <>
        {view.roundsTotal} rounds <span className="dim">· {formatClock(view.total / 1000)}</span>
      </>
    ) : (
      <>
        {step.phase === 'rest' ? 'After round' : 'Round'} {step.round} <span className="dim">of {view.roundsTotal}</span>
      </>
    )

  const chip = paused ? 'Paused' : warn ? 'Last 10 s' : step.phase === 'ready' ? 'Get ready' : step.phase === 'work' ? 'Work' : 'Rest'

  const next = seq[view.index + 1]
  const awake = p.wakeLock === 'on'
  const wakeAlert = p.wakeLock === 'unsupported' || p.wakeLock === 'failed'
  const subline = paused
    ? `${step.phase === 'work' ? `Work · Round ${step.round}` : step.phase === 'rest' ? 'Rest' : 'Get ready'}${awake ? ' · screen stays on' : ''}`
    : next
      ? `Next · ${describe(next)}`
      : 'Last one, finish strong'

  const clock = formatClock(displaySeconds(view.remaining))
  const progress = step.duration > 0 ? 1 - view.remaining / (step.duration * 1000) : 1
  const wakeProblem = wakeAlert && !wakeDismissed

  return (
    <div className="timer" data-phase={visual}>
      <div className="timer__top">
        <div className="timer__label">{top}</div>
        <div className="timer__status">
          <button
            type="button"
            className="status-btn"
            aria-label={p.muted ? 'Sound off, tap to unmute' : 'Sound on, tap to mute'}
            aria-pressed={p.muted}
            onClick={p.onToggleMute}
          >
            {p.muted ? <MutedIcon /> : <SoundIcon />}
          </button>
          {wakeAlert && (
            <span className="status-icon status-icon--alert" role="img" aria-label="Screen may turn off">
              <SleepIcon size={20} />
            </span>
          )}
        </div>
      </div>

      <div className="timeline" role="img" aria-label={`Step ${view.index} of ${seq.length - 1}`}>
        {seq.map((s, i) =>
          s.phase === 'ready' ? null : (
            <span
              key={i}
              className={`seg seg--${s.phase}${i < view.index ? ' seg--past' : i === view.index ? ' seg--current' : ''}`}
              style={{ flexGrow: s.duration }}
            />
          ),
        )}
      </div>
      <div className="timer__totals">
        <span>{formatClock(Math.floor(view.elapsed / 1000))} elapsed</span>
        <span>{formatClock(Math.ceil((view.total - view.elapsed) / 1000))} left</span>
      </div>

      <div className="timer__center">
        <div className="phase-chip">
          {warn && !paused && <BellIcon size={16} />}
          {paused && <PauseIcon size={14} />}
          {chip}
        </div>
        <div className={`digits${clock.length >= 5 ? ' digits--long' : ''}`} role="timer" aria-live="off">
          {clock}
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Step progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="progress__fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="timer__next">{subline}</div>
      </div>

      {(wakeProblem || p.showSilentHint) && !holding && (
        <div className="notices">
          {wakeProblem && (
            <div className="notice" role="alert">
              <SleepIcon />
              <div className="notice__text">
                <strong>Screen may turn off</strong>
                <span>This browser can't keep it awake. Set Auto-Lock to Never while you train.</span>
              </div>
              <button type="button" className="icon-btn icon-btn--ghost" aria-label="Dismiss" onClick={() => setWakeDismissed(true)}>
                <CloseIcon />
              </button>
            </div>
          )}
          {p.showSilentHint && (
            <div className="notice" role="status">
              <MutedIcon />
              <div className="notice__text">
                <strong>No beeps?</strong>
                <span>On iPhone, Silent mode mutes web audio. Turn it off with the side switch.</span>
              </div>
              <button type="button" className="icon-btn icon-btn--ghost" aria-label="Dismiss" onClick={p.onDismissSilentHint}>
                <CloseIcon />
              </button>
            </div>
          )}
        </div>
      )}

      {holding && (
        <div className="hold-hint" role="status">
          <HandIcon />
          Keep holding to end workout
        </div>
      )}

      <div className="timer__controls">
        <HoldButton className="ctrl ctrl--stop" label="Stop, press and hold" onComplete={p.onStop} onHoldingChange={setHolding}>
          <StopIcon />
          <span>{holding ? 'Stop' : 'Hold'}</span>
        </HoldButton>
        {paused ? (
          <button type="button" className="ctrl ctrl--primary ctrl--resume" disabled={holding} onClick={p.onResume}>
            <PlayIcon size={26} />
            Resume
          </button>
        ) : step.phase === 'ready' ? (
          <button type="button" className="ctrl ctrl--primary" disabled={holding} onClick={p.onSkip}>
            <SkipIcon />
            Start now
          </button>
        ) : (
          <button type="button" className="ctrl ctrl--primary" disabled={holding} onClick={p.onPause}>
            <PauseIcon />
            Pause
          </button>
        )}
      </div>
    </div>
  )
}
