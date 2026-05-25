import { useEffect } from 'react'
import { useThemeStore } from '../shared/stores/themeStore'

export function ThemeManager() {
  const setResolved = useThemeStore((state) => state.setResolved)

  useEffect(() => {
    setResolved('light')
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
  }, [setResolved])

  return null
}
