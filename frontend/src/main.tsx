import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { bootstrapTheme } from './hooks/useTheme'
import './styles/global.css'
import './index.css'
import './shared/i18n/i18n'
import { App } from './app/App'
import { initSentry } from './shared/monitoring/sentry'

bootstrapTheme()
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service workers require http(s); skip in packaged Electron (file://).
if (
  'serviceWorker' in navigator &&
  window.location.protocol !== 'file:' &&
  import.meta.env.VITE_DESKTOP_BUNDLE !== 'true'
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration errors in local/dev mode.
    })
  })
}
