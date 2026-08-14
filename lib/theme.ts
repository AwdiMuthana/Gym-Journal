export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentId = 'red' | 'blue' | 'green' | 'purple' | 'pink' | 'teal'

export const THEME_STORAGE_KEY = 'gym-journal:theme'
export const ACCENT_STORAGE_KEY = 'gym-journal:accent'

export const DEFAULT_THEME_MODE: ThemeMode = 'dark'
export const DEFAULT_ACCENT: AccentId = 'red'

// Swatch hex mirrors the --color-accent value baked into globals.css for each preset.
export const ACCENT_PRESETS: { id: AccentId; label: string; swatch: string }[] = [
  { id: 'red', label: 'Red', swatch: '#ec3013' },
  { id: 'blue', label: 'Blue', swatch: '#1d4ed8' },
  { id: 'green', label: 'Green', swatch: '#0b8f3c' },
  { id: 'purple', label: 'Purple', swatch: '#925af2' },
  { id: 'pink', label: 'Pink', swatch: '#eb1386' },
  { id: 'teal', label: 'Teal', swatch: '#0b8a86' },
]

export const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Match device' },
]

export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  }
  return mode
}

export function applyTheme(mode: ThemeMode, accent: AccentId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolveThemeMode(mode))
  document.documentElement.setAttribute('data-accent', accent)
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return DEFAULT_THEME_MODE
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return DEFAULT_THEME_MODE
}

export function readStoredAccent(): AccentId {
  if (typeof localStorage === 'undefined') return DEFAULT_ACCENT
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
  if (ACCENT_PRESETS.some((p) => p.id === stored)) return stored as AccentId
  return DEFAULT_ACCENT
}

// Kept in sync by hand with the inline bootstrap script in app/layout.tsx (which
// can't import this module — it has to run as a literal string before hydration).
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem('${THEME_STORAGE_KEY}') || '${DEFAULT_THEME_MODE}';
    var accent = localStorage.getItem('${ACCENT_STORAGE_KEY}') || '${DEFAULT_ACCENT}';
    var resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : mode;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-accent', accent);
  } catch (e) {}
})();
`
