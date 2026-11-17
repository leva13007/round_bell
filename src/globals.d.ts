/** App version from package.json, injected by Vite (see vite.config.ts). */
declare const __APP_VERSION__: string

/** Audio Session API (Safari 17+). Not in TypeScript's DOM lib yet. */
type AudioSessionType = 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record'
interface Navigator {
  audioSession?: { type: AudioSessionType }
}
