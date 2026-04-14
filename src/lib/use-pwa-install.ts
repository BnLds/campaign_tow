import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PwaPlatform = 'chromium' | 'firefox' | 'ios-safari' | 'other'

interface PwaInstallResult {
  canPrompt: boolean
  platform: PwaPlatform
  isInstalled: boolean
  promptInstall: () => Promise<void>
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null
  }
}

function detectPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios-safari'
  if (/firefox|fxios/i.test(ua)) return 'firefox'
  if (/chrome|chromium|edg|opr|samsungbrowser/i.test(ua)) return 'chromium'
  return 'other'
}

export function usePwaInstall(): PwaInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [platform, setPlatform] = useState<PwaPlatform>('other')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    if (standalone) {
      setIsInstalled(true)
      return
    }

    setPlatform(detectPlatform())

    // Récupère l'event déjà stashé par le bootstrap inline (__root.tsx)
    // au cas où il aurait été tiré avant hydration.
    if (window.__deferredPwaPrompt) {
      setDeferredPrompt(window.__deferredPwaPrompt)
    }

    const handleAvailable = () => {
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt)
      }
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('pwa-install-available', handleAvailable)
    window.addEventListener('pwa-installed', handleInstalled)

    return () => {
      window.removeEventListener('pwa-install-available', handleAvailable)
      window.removeEventListener('pwa-installed', handleInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (typeof window !== 'undefined') {
      window.__deferredPwaPrompt = null
    }
  }

  return {
    canPrompt: deferredPrompt !== null,
    platform,
    isInstalled,
    promptInstall,
  }
}
