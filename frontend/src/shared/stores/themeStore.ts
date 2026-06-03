import { create } from 'zustand'
import type { Theme } from '../../hooks/useTheme'

export type ResolvedTheme = Theme

interface ThemeState {
  resolved: ResolvedTheme
  setResolved: (resolved: ResolvedTheme) => void
}

export const useThemeStore = create<ThemeState>()((set) => ({
  resolved: 'light',
  setResolved: (resolved) => set({ resolved }),
}))
