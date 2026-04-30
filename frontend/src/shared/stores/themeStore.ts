import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  preference: ThemePreference
  resolved: ResolvedTheme
  hasSeenThemeHint: boolean
  setPreference: (preference: ThemePreference) => void
  setResolved: (resolved: ResolvedTheme) => void
  dismissThemeHint: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      resolved: 'light',
      hasSeenThemeHint: false,
      setPreference: (preference) => set({ preference, hasSeenThemeHint: true }),
      setResolved: (resolved) => set({ resolved }),
      dismissThemeHint: () => set({ hasSeenThemeHint: true }),
    }),
    {
      name: 'smartchain-theme',
      partialize: (state) => ({
        preference: state.preference,
        hasSeenThemeHint: state.hasSeenThemeHint,
      }),
    },
  ),
)
