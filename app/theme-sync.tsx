'use client'

import { useEffect } from 'react'
import { applyTheme, readStoredAccent, readStoredThemeMode, THEME_STORAGE_KEY, ACCENT_STORAGE_KEY } from '@/lib/theme'

// Renders nothing. Keeps data-theme/data-accent live: re-resolves "system" when
// the OS preference changes, and stays in sync if another tab updates Settings.
export default function ThemeSync() {
  useEffect(() => {
    function sync() {
      applyTheme(readStoredThemeMode(), readStoredAccent())
    }

    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', sync)

    function onStorage(e: StorageEvent) {
      if (e.key === THEME_STORAGE_KEY || e.key === ACCENT_STORAGE_KEY) sync()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      media.removeEventListener('change', sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return null
}
