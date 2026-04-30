import axios from 'axios'

export interface ApiErrorPayload {
  message?: string
  error?: string
  code?: string
  details?: unknown
}

export class ApiError extends Error {
  status: number | null
  code: string | null
  details: unknown
  original: unknown

  constructor(message: string, options?: { status?: number | null; code?: string | null; details?: unknown; original?: unknown }) {
    super(message)
    this.name = 'ApiError'
    this.status = options?.status ?? null
    this.code = options?.code ?? null
    this.details = options?.details
    this.original = options?.original
  }
}

function messageForStatus(status: number | null) {
  if (status === 401) {
    return 'Your session expired. Please sign in again.'
  }
  if (status === 403) {
    return 'You do not have permission for this action.'
  }
  if (status === 404) {
    return 'The requested resource was not found.'
  }
  if (status === 429) {
    return 'Too many requests. Please try again in a moment.'
  }
  if (status && status >= 500) {
    return 'The server is temporarily unavailable. Please retry shortly.'
  }
  return 'Something went wrong while contacting the API.'
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error
  }

  if (!axios.isAxiosError(error)) {
    return new ApiError('Unexpected application error.', { original: error })
  }

  const status = error.response?.status ?? null
  const payload = error.response?.data as ApiErrorPayload | undefined
  const message = payload?.message ?? payload?.error ?? messageForStatus(status)
  return new ApiError(message, {
    status,
    code: payload?.code ?? error.code ?? null,
    details: payload?.details,
    original: error,
  })
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
