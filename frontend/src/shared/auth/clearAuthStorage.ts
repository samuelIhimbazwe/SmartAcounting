/** Zustand persist bucket for auth (see authStore). */
export const AUTH_PERSIST_KEY = 'smartchain-auth'

const AUTH_LOCAL_STORAGE_KEYS = [
  AUTH_PERSIST_KEY,
  'smartchain-tenant-id',
  'smartaccounting-branch',
  'efd_pending_queue',
  'efd_display_status',
  'smartaccounting-intended-plan',
] as const

/** Tenant-scoped POS history entries (`smartchain_pos_sale_history_v1:<tenantId>`). */
const AUTH_LOCAL_STORAGE_PREFIXES = ['smartchain_pos_sale_history_v1:'] as const

const AUTH_SESSION_STORAGE_KEYS = ['smartchain_till_session_id', 'onboarding-invite'] as const

const AUTH_SESSION_STORAGE_PREFIXES = ['smartchain_till_cash_count_', 'tin_valid_'] as const

function removeByPrefix(storage: Storage, prefixes: readonly string[]) {
  const toRemove: string[] = []
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
      toRemove.push(key)
    }
  }
  for (const key of toRemove) {
    storage.removeItem(key)
  }
}

/** Clears persisted auth and session-scoped work data; keeps UI prefs (theme, locale, sidebar). */
export function clearAuthStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  for (const key of AUTH_LOCAL_STORAGE_KEYS) {
    window.localStorage.removeItem(key)
  }
  removeByPrefix(window.localStorage, AUTH_LOCAL_STORAGE_PREFIXES)

  for (const key of AUTH_SESSION_STORAGE_KEYS) {
    window.sessionStorage.removeItem(key)
  }
  removeByPrefix(window.sessionStorage, AUTH_SESSION_STORAGE_PREFIXES)
}
