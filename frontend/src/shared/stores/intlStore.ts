import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { i18n } from '../i18n/i18n'

type SupportedLocale = 'en' | 'fr' | 'rw'

interface IntlState {
  locale: SupportedLocale
  currency: string
  setLocale: (locale: SupportedLocale) => void
  setCurrency: (currency: string) => void
}

function normalizeLocale(value: string): SupportedLocale {
  if (value === 'fr' || value === 'rw') {
    return value
  }
  return 'en'
}

export const useIntlStore = create<IntlState>()(
  persist(
    (set) => ({
      locale: normalizeLocale(i18n.language),
      currency: 'USD',
      setLocale: (locale) => {
        void i18n.changeLanguage(locale)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('smartchain-locale', locale)
        }
        set({ locale })
      },
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'smartchain-intl',
      partialize: (state) => ({
        locale: state.locale,
        currency: state.currency,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }
        const locale = normalizeLocale(state.locale)
        state.locale = locale
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('smartchain-locale', locale)
        }
        void i18n.changeLanguage(locale)
      },
    },
  ),
)
