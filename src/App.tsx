import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SetupScreen, type UndoToast } from './components/SetupScreen'
import { SlotSheet } from './components/SlotSheet'
import { SummaryScreen } from './components/SummaryScreen'
import { TimerScreen } from './components/TimerScreen'
import { isIOS, useInstallHint } from './hooks/useInstallHint'
import { useTimer } from './hooks/useTimer'
import { useWakeLock } from './hooks/useWakeLock'
import { Beeper } from './lib/audio'
import {
  DEFAULT_CONFIG,
  generateSlots,
  isDefaultWorkout,
  pruneOverrides,
  setSlotDuration,
  totalSeconds,
  type Config,
  type Slot,
} from './lib/slots'
import { getFlag, loadWorkout, saveWorkout, setFlag, type Workout } from './lib/storage'
import { buildSequence, type TimerEvent } from './lib/timer'
import { formatClock } from './lib/time'

const UNDO_MS = 5000
const SILENT_HINT_FLAG = 'silent-hint-dismissed'

export default function App() {
  const [workout, setWorkout] = useState<Workout>(() => loadWorkout() ?? { config: DEFAULT_CONFIG, overrides: {} })
  const { config, overrides } = workout
  const slots = useMemo(() => generateSlots(config, overrides), [config, overrides])
  const [editing, setEditing] = useState<Slot | null>(null)
  const [toast, setToast] = useState<UndoToast | null>(null)
  const [muted, setMuted] = useState(false)
  const [silentHint, setSilentHint] = useState(() => isIOS() && !getFlag(SILENT_HINT_FLAG))
  const install = useInstallHint()
  const beeperRef = useRef<Beeper | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const beeper = () => (beeperRef.current ??= new Beeper())
  const closeSheet = useCallback(() => setEditing(null), [])

  useEffect(() => saveWorkout(workout), [workout])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const onTimerEvent = useCallback((e: TimerEvent) => {
    const b = beeperRef.current
    if (!b) return
    if (e.type === 'warning') b.play('warning')
    else if (e.type === 'countdown') b.play('countdown')
    else if (e.type === 'done') b.play('done')
    else if (e.phase === 'work') b.play('round')
    else if (e.phase === 'rest') b.play('rest')
  }, [])

  const timer = useTimer(onTimerEvent)
  const active = timer.state.status === 'running' || timer.state.status === 'paused'
  const wakeLock = useWakeLock(active)

  const showToast = (message: string, previous: Workout) => {
    window.clearTimeout(toastTimer.current)
    setToast({
      message,
      onUndo: () => {
        setWorkout(previous)
        setToast(null)
        window.clearTimeout(toastTimer.current)
      },
    })
    toastTimer.current = window.setTimeout(() => setToast(null), UNDO_MS)
  }

  const changeConfig = (next: Config) => setWorkout((w) => ({ config: next, overrides: pruneOverrides(next, w.overrides) }))

  const resetAll = () => {
    const d = DEFAULT_CONFIG
    showToast(`Reset to ${d.rounds} × ${formatClock(d.work)} / ${formatClock(d.rest)}`, workout)
    setWorkout({ config: DEFAULT_CONFIG, overrides: {} })
  }

  const resetEdits = () => {
    showToast('Slot edits cleared', workout)
    setWorkout((w) => ({ ...w, overrides: {} }))
  }

  const startWorkout = () => {
    const b = beeper()
    b.unlock() // inside the tap: unlocks Web Audio on iOS/Chrome
    b.muted = muted
    setToast(null)
    timer.start(buildSequence(slots))
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    beeper().muted = next
  }

  const testSound = () => {
    const b = beeper()
    b.unlock()
    const wasMuted = b.muted
    b.muted = false
    b.play('round')
    b.muted = wasMuted
  }

  const { state, view } = timer

  if (state.status === 'finished' && view) {
    return (
      <SummaryScreen
        outcome={state.outcome}
        view={view}
        step={view.step}
        onAgain={() => {
          beeper().unlock()
          timer.start(timer.seq)
        }}
        onSetup={timer.reset}
      />
    )
  }

  if (active && view) {
    return (
      <TimerScreen
        seq={timer.seq}
        state={state}
        view={view}
        muted={muted}
        wakeLock={wakeLock}
        showSilentHint={silentHint}
        onDismissSilentHint={() => {
          setFlag(SILENT_HINT_FLAG)
          setSilentHint(false)
        }}
        onToggleMute={toggleMute}
        onPause={timer.pause}
        onResume={timer.resume}
        onSkip={timer.skip}
        onStop={timer.stop}
      />
    )
  }

  return (
    <>
      <SetupScreen
        config={config}
        slots={slots}
        totalSeconds={totalSeconds(slots)}
        canReset={!isDefaultWorkout(config, overrides)}
        hasEdits={Object.keys(overrides).length > 0}
        toast={toast}
        installMode={install.mode}
        onConfigChange={changeConfig}
        onEditSlot={setEditing}
        onResetAll={resetAll}
        onResetEdits={resetEdits}
        onTestSound={testSound}
        onInstall={() => void install.install()}
        onDismissInstall={install.dismiss}
        onStart={startWorkout}
      />
      {editing && (
        <SlotSheet
          slot={editing}
          onClose={closeSheet}
          onSave={(duration) => {
            setWorkout((w) => ({ ...w, overrides: setSlotDuration(w.overrides, editing, duration) }))
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
