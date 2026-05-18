import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Banner that appears when vite-plugin-pwa detects a fresh service-worker
 * version. Clicking "Update now" triggers `skipWaiting` and reloads.
 *
 * Renders nothing in dev (no SW registered) and in normal steady state.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.warn('SW registration failed', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div role="alertdialog" aria-live="polite" className="pwa-update-banner">
      <span>A new version of SmartAccounting is available.</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        Update now
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss update prompt"
      >
        Later
      </button>
    </div>
  )
}
