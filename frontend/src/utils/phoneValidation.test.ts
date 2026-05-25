import { describe, expect, it } from 'vitest'
import { isValidReceiptPhone, normalizePhoneInput } from './phoneValidation'

describe('phoneValidation', () => {
  it('normalizes Rwanda local to E.164', () => {
    expect(normalizePhoneInput('0788123456')).toBe('+250788123456')
  })

  it('accepts Rwanda E.164', () => {
    expect(isValidReceiptPhone('+250788123456')).toBe(true)
  })

  it('rejects too short numbers', () => {
    expect(isValidReceiptPhone('+25078')).toBe(false)
  })
})
