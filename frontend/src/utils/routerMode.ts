/**
 * Packaged Electron loads the SPA from file:// — BrowserRouter paths do not work.
 * Use hash routing and a relative Vite base (see VITE_DESKTOP_BUNDLE) for that case.
 */
export function shouldUseHashRouter(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.location.protocol === 'file:'
}
