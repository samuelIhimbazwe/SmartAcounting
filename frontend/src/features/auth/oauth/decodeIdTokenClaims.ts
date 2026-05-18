/** Best-effort decode of OIDC ID token payload for form prefill only; the API always re-verifies. */
export function decodeIdTokenClaims(idToken: string): { email?: string; name?: string } {
  try {
    const parts = idToken.split('.')
    if (parts.length < 2) {
      return {}
    }
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    const json = JSON.parse(atob(padded)) as Record<string, unknown>
    const email = typeof json.email === 'string' ? json.email : typeof json.preferred_username === 'string' ? json.preferred_username : undefined
    const name = typeof json.name === 'string' ? json.name : undefined
    return { email, name }
  } catch {
    return {}
  }
}
