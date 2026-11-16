import { useEffect, useState } from 'react'
import { getFlag, setFlag } from '../lib/storage'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

const FLAG = 'install-hint-dismissed'

export function isIOS(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iOS: show manual "Share → Add to Home Screen" steps. Chrome/Android: offer the native prompt. */
export function useInstallHint() {
  const [dismissed, setDismissed] = useState(() => getFlag(FLAG) || isStandalone())
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDismissed(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const mode: 'ios' | 'prompt' | null = dismissed ? null : prompt ? 'prompt' : isIOS() ? 'ios' : null

  return {
    mode,
    install: async () => {
      if (!prompt) return
      await prompt.prompt()
      setPrompt(null)
    },
    dismiss: () => {
      setFlag(FLAG)
      setDismissed(true)
    },
  }
}
