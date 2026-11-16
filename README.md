---
status: active
category: apps
stack: React, TypeScript, Vite, PWA
---

# RoundBell

A free, ad-free round timer for boxing, kickboxing and interval training. Set rounds and rests, tweak any single slot, and train with the screen kept awake and beeps in your headphones. Runs as an installable PWA on GitHub Pages.

## where I left off

MVP implemented from the design canvas: setup with steppers and per-slot editing, Reset/Reset edits with undo, get-ready → work/rest timer with 10 s warning, pause, hold-to-stop, done/stopped summary, beeps + vibration, wake lock, offline PWA with install hint. Logic is unit-tested. Not yet tested on a real phone.

## next step

Deploy to GitHub Pages and run a real workout on the iPhone, both in Safari and from the Home Screen (wake lock, beeps in headphones, Silent mode).

## development

```bash
npm install
npm run dev      # http://localhost:5173/round_bell/
npm test
npm run build && npm run preview   # test the PWA / service worker
```

## resources

- `docs/idea.md` — product brief (problem, MVP scope, tech approach, roadmap)
- [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
