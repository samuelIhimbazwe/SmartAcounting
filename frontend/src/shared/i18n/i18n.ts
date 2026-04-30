import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'

const supportedLocales = ['en', 'fr'] as const

function resolveDefaultLocale() {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const fromStorage = window.localStorage.getItem('smartchain-locale')
  if (fromStorage && supportedLocales.includes(fromStorage as (typeof supportedLocales)[number])) {
    return fromStorage
  }

  const browserLanguage = window.navigator.language.split('-')[0]?.toLowerCase()
  if (browserLanguage && supportedLocales.includes(browserLanguage as (typeof supportedLocales)[number])) {
    return browserLanguage
  }

  return 'en'
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: resolveDefaultLocale(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })
}

export { i18n }
