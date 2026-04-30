import { useEffect } from 'react'
import { useThemeStore, type ThemePreference, type ResolvedTheme } from '../shared/stores/themeStore'

function getResolvedTheme(preference: ThemePreference, darkQuery: MediaQueryList): ResolvedTheme {
  if (preference === 'system') {
    return darkQuery.matches ? 'dark' : 'light'
  }
  return preference
}

export function ThemeManager() {
  const preference = useThemeStore((state) => state.preference)
  const setResolved = useThemeStore((state) => state.setResolved)

  useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const resolved = getResolvedTheme(preference, darkQuery)
      setResolved(resolved)
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
    }

    applyTheme()

    const onChange = () => {
      if (preference === 'system') {
        applyTheme()
      }
    }

    darkQuery.addEventListener('change', onChange)
    return () => darkQuery.removeEventListener('change', onChange)
  }, [preference, setResolved])

  return null
}
