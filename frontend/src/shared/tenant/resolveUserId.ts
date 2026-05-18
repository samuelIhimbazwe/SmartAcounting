/** Stable default user UUID for API login when self-service DB users are not used (matches demo docs). */
const FALLBACK_USER = '33333333-3333-4333-8333-333333333301'

function sanitize(value: string | null | undefined) {
  const t = value?.trim()
  return t && t.length > 0 ? t : null
}

export function resolveUserId() {
  if (typeof window === 'undefined') {
    return FALLBACK_USER
  }
  const fromEnv = sanitize(import.meta.env.VITE_DEFAULT_USER_ID)
  if (fromEnv) {
    return fromEnv
  }
  const params = new URLSearchParams(window.location.search)
  const fromQuery = sanitize(params.get('user'))
  if (fromQuery) {
    return fromQuery
  }
  return FALLBACK_USER
}
