---
status: active
category: apps
stack: React, TypeScript, Vite, PWA
---

# RoundBell

A free, ad-free round timer for boxing, kickboxing and interval training. Set rounds and rests, tweak any single slot, and train with the screen kept awake and beeps in your headphones. Runs as an installable PWA on GitHub Pages.

## where I left off

Product brief is done (`docs/idea.md`). Project is scaffolded: React + TypeScript + Vite, `vite-plugin-pwa`, Vitest, oxlint, GitHub Pages deploy workflow, MIT license. `src/App.tsx` is an empty shell. No features yet.

## next step

Write the slot model and slot generation (`{ type: 'work' | 'rest', duration }[]` from rounds/round length/rest length) as a pure TS module with Vitest tests.

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
