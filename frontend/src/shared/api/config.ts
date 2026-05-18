/** Base URL for API calls (no trailing slash). Production builds must set VITE_API_BASE_URL. */
export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'
).replace(/\/$/, '')
