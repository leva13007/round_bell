import type { ReactNode } from 'react'

function Stroke({ size = 20, width = 2, children }: { size?: number; width?: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function Solid({ size = 24, children }: { size?: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      {children}
    </svg>
  )
}

type P = { size?: number }

export const BellIcon = ({ size }: P) => (
  <Stroke size={size}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Stroke>
)
export const MinusIcon = ({ size }: P) => (
  <Stroke size={size} width={2.2}>
    <path d="M5 12h14" />
  </Stroke>
)
export const PlusIcon = ({ size }: P) => (
  <Stroke size={size} width={2.2}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </Stroke>
)
export const ChevronIcon = ({ size = 18 }: P) => (
  <Stroke size={size}>
    <path d="m9 18 6-6-6-6" />
  </Stroke>
)
export const CloseIcon = ({ size = 18 }: P) => (
  <Stroke size={size}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Stroke>
)
export const ResetIcon = ({ size = 18 }: P) => (
  <Stroke size={size}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Stroke>
)
export const CheckIcon = ({ size = 20 }: P) => (
  <Stroke size={size}>
    <path d="M20 6 9 17l-5-5" />
  </Stroke>
)
export const ShareIcon = ({ size = 20 }: P) => (
  <Stroke size={size}>
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </Stroke>
)
export const SoundIcon = ({ size = 22 }: P) => (
  <Stroke size={size}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M19 5a10 10 0 0 1 0 14" />
  </Stroke>
)
export const MutedIcon = ({ size = 22 }: P) => (
  <Stroke size={size}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="m22 9-6 6" />
    <path d="m16 9 6 6" />
  </Stroke>
)
export const AwakeIcon = ({ size = 22 }: P) => (
  <Stroke size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.9 4.9 1.4 1.4" />
    <path d="m17.7 17.7 1.4 1.4" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m4.9 19.1 1.4-1.4" />
    <path d="m17.7 6.3 1.4-1.4" />
  </Stroke>
)
export const SleepIcon = ({ size = 22 }: P) => (
  <Stroke size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m3 3 18 18" />
  </Stroke>
)
export const HandIcon = ({ size = 18 }: P) => (
  <Stroke size={size}>
    <path d="M18 11V6a2 2 0 0 0-4 0" />
    <path d="M14 10V4a2 2 0 0 0-4 0v2" />
    <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </Stroke>
)
export const PlayIcon = ({ size = 24 }: P) => (
  <Solid size={size}>
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
  </Solid>
)
export const PauseIcon = ({ size = 28 }: P) => (
  <Solid size={size}>
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
  </Solid>
)
export const StopIcon = ({ size = 26 }: P) => (
  <Solid size={size}>
    <rect x="5" y="5" width="14" height="14" rx="2.5" />
  </Solid>
)
export const SkipIcon = ({ size = 26 }: P) => (
  <Solid size={size}>
    <path d="M5 5.5v13a1 1 0 0 0 1.6.8L14 14v4.5a1 1 0 0 0 1.6.8l7-6.5a1 1 0 0 0 0-1.6l-7-6.5A1 1 0 0 0 14 5.5V10L6.6 4.7A1 1 0 0 0 5 5.5z" />
  </Solid>
)
