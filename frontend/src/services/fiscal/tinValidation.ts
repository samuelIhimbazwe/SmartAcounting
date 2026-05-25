import { apiClient } from '../../shared/api/client'

/** RRA_API_TODO: confirm TIN format with official RRA documentation. */
export const RRA_TIN_REGEX = /^\d{9}$/

const TIN_VALIDATE_PATH = '/api/v1/compliance/tin/validate'

export interface TinValidationResult {
  valid: boolean
  name?: string
  error?: string
}

interface TinValidationApiResponse {
  valid?: boolean
  registered?: boolean
  name?: string
  error?: string
  message?: string
}

export function isValidTinFormat(tin: string | null | undefined): boolean {
  if (!tin) {
    return true
  }
  const normalized = tin.trim()
  if (!normalized) {
    return true
  }
  return RRA_TIN_REGEX.test(normalized)
}

export function normalizeTin(tin: string): string {
  return tin.trim()
}

function tinSessionCacheKey(tin: string): string {
  return `tin_valid_${normalizeTin(tin)}`
}

function readTinCache(tin: string): TinValidationResult | null {
  try {
    const raw = sessionStorage.getItem(tinSessionCacheKey(tin))
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'valid' in parsed &&
      typeof (parsed as TinValidationResult).valid === 'boolean'
    ) {
      return parsed as TinValidationResult
    }
  } catch {
    /* ignore corrupt cache */
  }
  return null
}

function writeTinCache(tin: string, result: TinValidationResult): void {
  try {
    sessionStorage.setItem(tinSessionCacheKey(tin), JSON.stringify(result))
  } catch {
    /* private mode / quota — validation still succeeded for this call */
  }
}

function mapApiResponse(data: TinValidationApiResponse): TinValidationResult {
  const valid = data.valid ?? data.registered ?? false
  const error =
    data.error ??
    data.message ??
    (valid ? undefined : 'TIN is not registered with RRA')
  return {
    valid,
    name: data.name,
    error,
  }
}

/**
 * Validates a Rwanda TIN via the API (once per browser session per TIN).
 * Does not block sales when offline or the API is unreachable.
 */
export async function validateTin(tin: string): Promise<TinValidationResult> {
  const normalized = normalizeTin(tin)
  if (!normalized) {
    return { valid: true }
  }

  if (!isValidTinFormat(normalized)) {
    return { valid: false, error: 'TIN must be exactly 9 digits' }
  }

  const cached = readTinCache(normalized)
  if (cached) {
    return cached
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn(`[tinValidation] offline — skipping TIN lookup for ${normalized}`)
    return { valid: true }
  }

  try {
    const { data } = await apiClient.post<TinValidationApiResponse>(TIN_VALIDATE_PATH, {
      tin: normalized,
    })
    const result = mapApiResponse(data)
    writeTinCache(normalized, result)
    return result
  } catch (err) {
    console.warn('[tinValidation] backend unreachable — allowing sale', err)
    return { valid: true }
  }
}

/** @deprecated Prefer {@link validateTin} — kept for callers expecting `registered`. */
export async function verifyTinWithRra(tin: string): Promise<{ registered: boolean; name?: string }> {
  const result = await validateTin(tin)
  return { registered: result.valid, name: result.name }
}
