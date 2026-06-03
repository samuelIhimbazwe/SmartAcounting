import { useCallback, useEffect, useState } from 'react'
import { useThemeStore } from '../shared/stores/themeStore'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'smartaccounting-theme'

function readStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark') {
      return raw
    }
  } catch {
    /* ignore */
  }
  return null
}

function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  useThemeStore.getState().setResolved(theme)
}

function initialTheme(): Theme {
  return readStoredTheme() ?? systemTheme()
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => initialTheme())

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (readStoredTheme() != null) {
        return
      }
      const next = media.matches ? 'dark' : 'light'
      setTheme(next)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(current => (current === 'light' ? 'dark' : 'light'))
  }, [])

  const setThemePreference = useCallback((next: Theme) => {
    setTheme(next)
  }, [])

  return { theme, toggleTheme, setTheme: setThemePreference }
}

/** Apply saved/system theme before React mounts (optional bootstrap). */
export function bootstrapTheme() {
  applyTheme(initialTheme())
}
