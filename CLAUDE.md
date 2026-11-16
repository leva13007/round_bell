# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Scaffolded, no features yet: `src/App.tsx` is an empty shell. `docs/idea.md` (product brief, in Ukrainian) holds the problem, MVP scope, technical approach and roadmap. Read it before making product or architecture decisions.

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

## Decided stack and architecture

- **React + Vite**, with `vite-plugin-pwa` for the manifest and service worker (offline support plus install to home screen).
- **Data model:** an ordered list of slots `{ type: 'work' | 'rest', duration }`, generated from the setup form (rounds × round length + rest length). Each slot can be edited on its own after generation, and that per-slot editing is the main difference from competing apps.
- **Timer state machine:** `idle → running ⇄ paused → done`.
- **Two screens only in MVP:** setup (form + slot list) and timer.

## Non-obvious technical constraints

- **Timing accuracy:** store an absolute `endTime` and render `endTime - performance.now()`. Never decrement a counter per tick, because it drifts and breaks when the tab is throttled. Pause/resume must recompute `endTime` from the remaining time.
- **Wake lock is mandatory, not optional.** If the screen locks, browsers (especially iOS) suspend JS and the signals stop. Use the Screen Wake Lock API and re-request it on `visibilitychange`, because the lock is released when the page is hidden. Standalone iOS PWAs have had wake-lock bugs, so test both in the browser and from the home screen.
- **Audio:** Web Audio API beeps generated with `OscillatorNode`, so there are no audio files. The `AudioContext` must be created or resumed inside the Start click handler, or autoplay policies will mute it. MVP sounds: round start, 10 s warning, round end.
- **Vibration:** `navigator.vibrate()` works on Android only (iOS has no such API). Feature-detect it and treat it as a bonus.
- **Persistence:** `localStorage` holds only the last config.
- **Deploy:** GitHub Actions → GitHub Pages. `vite.config` needs `base: '/round_bell/'` to match the repo path, or assets 404.

## Scope guardrails

Out of MVP scope (don't build unless asked): accounts and sync, workout history, preset programs, running while the screen is locked, Garmin and Bluetooth integrations. These belong to roadmap stages 2–3 in `docs/idea.md`.
