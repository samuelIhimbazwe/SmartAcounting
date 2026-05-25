/** Base URL for API calls (no trailing slash). Blank means same-origin `/api` via reverse proxy. */
export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
).replace(/\/$/, '')
