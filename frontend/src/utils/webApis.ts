/**
 * Feature detection for optional Web APIs (Chrome desktop / Android).
 * Safe when evaluated outside a browser (e.g. tests): all flags false.
 */
const w = typeof window !== 'undefined' ? window : undefined
const nav = typeof navigator !== 'undefined' ? navigator : undefined

export const supports = {
  get barcodeDetector() {
    return Boolean(w && 'BarcodeDetector' in w)
  },
  get wakeLock() {
    return Boolean(nav && 'wakeLock' in nav)
  },
  get serial() {
    return Boolean(nav && 'serial' in nav)
  },
  get bluetooth() {
    return Boolean(nav && 'bluetooth' in nav)
  },
  get hid() {
    return Boolean(nav && 'hid' in nav)
  },
  get nfc() {
    return Boolean(w && 'NDEFReader' in w)
  },
  get backgroundSync() {
    return Boolean(
      typeof window !== 'undefined' && nav && 'serviceWorker' in nav && 'SyncManager' in window,
    )
  },
  get webPush() {
    return Boolean(nav && 'PushManager' in nav)
  },
}
