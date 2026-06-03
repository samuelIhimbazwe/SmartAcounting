import { useTheme } from '../hooks/useTheme'

/** Syncs theme tokens to the document root and keeps the store in sync. */
export function ThemeManager() {
  useTheme()
  return null
}
