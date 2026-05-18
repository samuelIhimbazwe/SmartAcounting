/**
 * Lifecycle re-exports.
 *
 * Kept in a separate file so `index.ts` only imports a stable surface and so
 * we can swap implementations (e.g. mock the scanner for headless launches)
 * without touching the entry point.
 */

export { closeOfflineQueue } from './offlineQueue'
export { disconnectScanner as disconnectScannerIfAny } from './barcodeScanner'
