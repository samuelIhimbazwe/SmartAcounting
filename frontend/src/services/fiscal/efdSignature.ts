import CryptoJS from 'crypto-js'

/**
 * RRA EFD signing helpers. When `deviceSecret` is set (from EFD_DEVICE_SECRET),
 * signatures use HMAC-SHA256; otherwise callers fall back to mock values.
 * Confirm exact QR pipe format with RRA EFD documentation before production.
 */
export function generateEfdSignature(
  tin: string,
  invoiceNumber: string,
  amount: number,
  dateIso: string,
  deviceSecret: string,
): string {
  const payload = `${tin}|${invoiceNumber}|${amount.toFixed(2)}|${dateIso}`
  return CryptoJS.HmacSHA256(payload, deviceSecret).toString(CryptoJS.enc.Base64)
}

export function generateEfdQrPayload(params: {
  tin: string
  invoiceNumber: string
  amount: number
  vatAmount: number
  dateIso: string
  signature: string
}): string {
  return [
    params.tin,
    params.invoiceNumber,
    params.amount.toFixed(2),
    params.vatAmount.toFixed(2),
    params.dateIso,
    params.signature,
  ].join('|')
}

export function isElectronRenderer(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  if (window.electronAPI?.getEfdSecret) {
    return true
  }
  const proc = (window as Window & { process?: { type?: string } }).process
  return proc?.type === 'renderer'
}

let cachedSecret: string | undefined | null = null

/** Sync read — Vite env only (tests, non-Electron web). */
export function resolveEfdDeviceSecret(): string | undefined {
  const fromEnv = import.meta.env.VITE_EFD_DEVICE_SECRET?.trim()
  return fromEnv || undefined
}

/**
 * Prefer Electron main-process secret (not bundled in renderer); fall back to Vite env.
 */
export async function resolveEfdDeviceSecretAsync(): Promise<string | undefined> {
  if (cachedSecret !== null) {
    return cachedSecret
  }
  if (isElectronRenderer() && window.electronAPI?.getEfdSecret) {
    try {
      const fromMain = await window.electronAPI.getEfdSecret()
      cachedSecret = fromMain?.trim() || undefined
      return cachedSecret
    } catch {
      cachedSecret = undefined
      return undefined
    }
  }
  cachedSecret = resolveEfdDeviceSecret()
  return cachedSecret
}

export function clearEfdDeviceSecretCache(): void {
  cachedSecret = null
}
