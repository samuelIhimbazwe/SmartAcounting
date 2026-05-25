import { create } from 'zustand'

export type ResolvedTheme = 'light'

interface ThemeState {
  resolved: ResolvedTheme
  setResolved: (resolved: ResolvedTheme) => void
}

export const useThemeStore = create<ThemeState>()((set) => ({
  resolved: 'light',
  setResolved: (resolved) => set({ resolved }),
}))
