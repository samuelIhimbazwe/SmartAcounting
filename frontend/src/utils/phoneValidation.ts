/** Rwanda mobile: +250 7XX XXX XXX */
const RW_E164 = /^\+2507\d{8}$/

/** Loose international E.164 */
const E164 = /^\+[1-9]\d{6,14}$/

export function normalizePhoneInput(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, '')
  if (!trimmed) {
    return ''
  }
  if (trimmed.startsWith('+')) {
    return trimmed
  }
  if (trimmed.startsWith('250')) {
    return `+${trimmed}`
  }
  if (trimmed.startsWith('0') && trimmed.length >= 10) {
    return `+25${trimmed}`
  }
  if (/^7\d{8}$/.test(trimmed)) {
    return `+250${trimmed}`
  }
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`
}

export function isValidReceiptPhone(raw: string): boolean {
  const normalized = normalizePhoneInput(raw)
  if (!normalized) {
    return false
  }
  if (RW_E164.test(normalized)) {
    return true
  }
  return E164.test(normalized)
}

export const RECEIPT_PHONE_HINT = '+250 7XX XXX XXX'

export type RwandaMobileCarrier = 'MTN' | 'AIRTEL' | 'UNKNOWN'

/** Rwanda RURA-style prefixes: MTN 78/79, Airtel 72/73. */
export function detectRwandaMobileCarrier(raw: string): RwandaMobileCarrier {
  const phone = normalizePhoneInput(raw)
  const digits = phone.replace(/\D/g, '')
  let national = ''
  if (digits.startsWith('250') && digits.length >= 12) {
    national = digits.slice(3, 12)
  } else if (digits.startsWith('0') && digits.length >= 10) {
    national = digits.slice(1, 10)
  } else if (digits.length === 9) {
    national = digits
  }
  if (national.length !== 9) {
    return 'UNKNOWN'
  }
  const prefix = national.slice(0, 2)
  if (prefix === '78' || prefix === '79') {
    return 'MTN'
  }
  if (prefix === '72' || prefix === '73') {
    return 'AIRTEL'
  }
  return 'UNKNOWN'
}

/** Mask for display on OTP screens, e.g. +250 7XX XXX XX42 */
export function maskPhoneForDisplay(normalized: string): string {
  const phone = normalizePhoneInput(normalized)
  if (!phone || phone.length <= 4) {
    return phone
  }
  const lastTwo = phone.slice(-2)
  if (phone.startsWith('+250') && phone.length >= 12) {
    return `+250 7XX XXX XX${lastTwo}`
  }
  const prefix = phone.slice(0, Math.min(4, phone.length - 2))
  return `${prefix} *** *** **${lastTwo}`
}
