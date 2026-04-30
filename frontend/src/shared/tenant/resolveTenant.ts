const TENANT_STORAGE_KEY = 'smartchain-tenant-id'
const FALLBACK_TENANT = 'public'

function sanitizeTenant(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const trimmed = value.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

function getTenantFromSubdomain(hostname: string) {
  const lowered = hostname.toLowerCase()
  if (lowered === 'localhost' || lowered.endsWith('.localhost')) {
    return null
  }

  const parts = lowered.split('.')
  if (parts.length < 3) {
    return null
  }

  return sanitizeTenant(parts[0])
}

export function resolveTenantId() {
  if (typeof window === 'undefined') {
    return FALLBACK_TENANT
  }

  const fromSubdomain = getTenantFromSubdomain(window.location.hostname)
  if (fromSubdomain) {
    return fromSubdomain
  }

  const params = new URLSearchParams(window.location.search)
  const fromQuery = sanitizeTenant(params.get('tenant'))
  if (fromQuery) {
    return fromQuery
  }

  const fromStorage = sanitizeTenant(window.localStorage.getItem(TENANT_STORAGE_KEY))
  if (fromStorage) {
    return fromStorage
  }

  const fromEnv = sanitizeTenant(import.meta.env.VITE_DEFAULT_TENANT_ID)
  if (fromEnv) {
    return fromEnv
  }

  return FALLBACK_TENANT
}

export function persistTenantId(tenantId: string) {
  if (typeof window === 'undefined') {
    return
  }
  const next = sanitizeTenant(tenantId) ?? FALLBACK_TENANT
  window.localStorage.setItem(TENANT_STORAGE_KEY, next)
}
