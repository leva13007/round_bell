# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

MVP implemented. `docs/idea.md` (product brief, in Ukrainian) holds the problem, MVP scope, technical approach and roadmap. Read it before making product or architecture decisions.

## Commands

```bash
npm run dev          # Vite dev server (app at /round_bell/)
npm run build        # tsc -b && vite build, also generates sw.js + manifest
npm run preview      # serve dist/ (use this to test PWA/service worker; dev mode has no SW)
npm run lint         # oxlint (config in .oxlintrc.json)
npm test             # vitest run; tests live in src/**/*.test.ts, node environment
npx vitest run src/path/file.test.ts   # single test file
npx vitest run -t "name"               # tests matching a name
```

CI (`.github/workflows/deploy.yml`) runs lint → test → build on every push to `main` and deploys `dist/` to GitHub Pages. The repo's Pages source must be set to "GitHub Actions".

Testing scope: unit tests cover pure logic (slot generation, timer state machine), so keep that logic in plain TS modules outside React components. There are no UI/E2E tests.

## What RoundBell is

A free, ad-free round timer for boxing, kickboxing and interval training, shipped as a static PWA on GitHub Pages. No accounts, no backend. Open source (public repo). **The UI language is English**, even though the brief is in Ukrainian.

Typical use: the phone lies nearby or sits in a pocket, audio goes to headphones, and the user's hands are in gloves. Design for big digits, glanceable state colors and minimal interaction during a session.

## Architecture

- **`src/lib/`: pure logic, unit-tested, no React.**
  - `slots.ts`: `Config` (rounds, default round/rest length) plus `Overrides` (per-slot durations keyed by stable ids `w<n>` = round n, `r<n>` = rest after round n) → `generateSlots()`. Changing a default updates only non-edited slots. `pruneOverrides()` drops overrides for removed rounds or ones equal to the default. Rest 0 = no rest slots. `LIMITS` holds min/max/step.
  - `timer.ts`: the state machine `idle → running ⇄ paused → finished(done|stopped)` as pure functions (`start/tick/pause/resume/skip/stop`) over a `Step[]` sequence (`buildSequence` = 10 s get-ready + slots with duration > 0). `tick` returns `TimerEvent`s (step-start, warning, done) that the UI turns into sounds. `view()` derives remaining/elapsed/rounds for display and the summary.
  - `audio.ts` (Web Audio beeps + vibration) and `storage.ts` (validated `localStorage` for the workout and one-off UI flags).
- **`src/hooks/`:** `useTimer` (owns state, 100 ms interval, extra tick on `visibilitychange`), `useWakeLock`, `useInstallHint` (iOS manual hint / Chrome `beforeinstallprompt`), `useRepeatPress` (hold − / + to repeat).
- **`src/components/`:** `App.tsx` switches between `SetupScreen` (+ `SlotSheet`), `TimerScreen` and `SummaryScreen` based on timer status. There's no router.
- **Styling:** plain CSS. Tokens live in `index.css`, components in `App.css`. Timer colors come from `data-phase` (`ready|work|rest|warn|paused`) on `.timer`, which swaps CSS variables. Fonts are self-hosted via `@fontsource` (latin only) so they're precached for offline use.
- **Reset:** "Reset" (back to defaults plus clear edits) and "Reset edits" both apply immediately with a 5 s Undo toast. There's no confirm dialog.
- **Design source:** the canvas https://claude.ai/artifact/KN3qV7hLmRgdipgy8MUmR6 has all screens and states.

## Non-obvious technical constraints

- **Timing accuracy:** store an absolute `endAt` and render `endAt - now`. Never decrement a counter per tick, because it drifts and breaks when the tab is throttled. Each step's end is the previous end + duration, so lag doesn't accumulate. Pause stores the remaining ms, and resume recomputes `endAt`. The clock is `Date.now()`, not `performance.now()` as the brief suggested: the monotonic clock may not advance while the device sleeps, and the timer must catch up after a lock.
- **Wake lock is mandatory, not optional.** If the screen locks, browsers (especially iOS) suspend JS and the signals stop. Use the Screen Wake Lock API and re-request it on `visibilitychange`, because the lock is released when the page is hidden. Standalone iOS PWAs have had wake-lock bugs, so test both in the browser and from the home screen.
- **Audio:** Web Audio API beeps generated with `OscillatorNode`, so there are no audio files. The `AudioContext` must be created or resumed inside the Start click handler, or autoplay policies will mute it. Sounds: round start, rest start, 10 s warning (before any round or rest longer than 10 s), done. The test-sound button and Start both call `Beeper.unlock()`.
- **Vibration:** `navigator.vibrate()` works on Android only (iOS has no such API). Feature-detect it and treat it as a bonus.
- **Persistence:** `localStorage` holds the last config + slot edits, read through `parseWorkout()`, which clamps and validates. Every access is wrapped in try/catch.
- **Deploy:** GitHub Actions → GitHub Pages. `vite.config` needs `base: '/round_bell/'` to match the repo path, or assets 404.

## Scope guardrails

Out of MVP scope (don't build unless asked): accounts and sync, workout history, preset programs, running while the screen is locked, Garmin and Bluetooth integrations. These belong to roadmap stages 2–3 in `docs/idea.md`.
