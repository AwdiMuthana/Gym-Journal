'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ACCENT_PRESETS,
  ACCENT_STORAGE_KEY,
  THEME_MODES,
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredAccent,
  readStoredThemeMode,
  type AccentId,
  type ThemeMode,
} from '@/lib/theme'

export default function SettingsPage() {
  const [accent, setAccent] = useState<AccentId>('red')
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')

  // Reconcile with whatever's actually stored once we're on the client —
  // the initial render has to match the server, which has no localStorage.
  useEffect(() => {
    setAccent(readStoredAccent())
    setThemeMode(readStoredThemeMode())
  }, [])

  function selectAccent(id: AccentId) {
    setAccent(id)
    localStorage.setItem(ACCENT_STORAGE_KEY, id)
    applyTheme(themeMode, id)
  }

  function selectThemeMode(mode: ThemeMode) {
    setThemeMode(mode)
    localStorage.setItem(THEME_STORAGE_KEY, mode)
    applyTheme(mode, accent)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/log" className="text-sm font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent">
          ← Back
        </Link>
      </div>

      <h2 className="text-3xl font-black uppercase tracking-tight">Settings</h2>

      <div className="space-y-3 border-2 border-neutral-700 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">Accent color</p>
        <div className="grid grid-cols-3 gap-2">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectAccent(preset.id)}
              className={`flex flex-col items-center gap-2 border-2 py-3 ${
                accent === preset.id ? 'border-accent' : 'border-neutral-700'
              }`}
            >
              <span
                className="h-8 w-8 shrink-0"
                style={{ backgroundColor: preset.swatch }}
                aria-hidden="true"
              />
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-bg">
                {preset.label}
                {accent === preset.id ? ' ✓' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-2 border-neutral-700 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => selectThemeMode(mode.id)}
              className={`border-2 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide ${
                themeMode === mode.id ? 'border-accent text-accent' : 'border-neutral-700 text-bg'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
