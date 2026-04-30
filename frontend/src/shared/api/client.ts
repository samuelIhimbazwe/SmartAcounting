import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { normalizeApiError } from './errors'
import { useAuthStore } from '../stores/authStore'
import { captureError } from '../monitoring/sentry'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface RefreshResponse {
  accessToken?: string
  token?: string
  refreshToken?: string
  expiresIn?: number
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  const { accessToken, tenantId, userId } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  config.headers['X-Tenant-Id'] = tenantId
  config.headers['X-User-Id'] = userId
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshSessionToken() {
  const { refreshToken, tenantId, userId, setTokens, clearSession } = useAuthStore.getState()
  if (!refreshToken) {
    clearSession()
    return null
  }

  try {
    const response = await axios.post<RefreshResponse>(
      `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/auth/refresh`,
      { refreshToken, tenantId, userId },
      {
        timeout: 15_000,
        headers: {
          'X-Tenant-Id': tenantId,
          'X-User-Id': userId,
        },
      },
    )
    const nextAccessToken = response.data.accessToken ?? response.data.token
    if (!nextAccessToken) {
      throw new Error('Refresh response missing access token')
    }

    const expiresAt = response.data.expiresIn ? Date.now() + response.data.expiresIn * 1000 : null
    setTokens({
      accessToken: nextAccessToken,
      refreshToken: response.data.refreshToken ?? refreshToken,
      expiresAt,
    })

    return nextAccessToken
  } catch {
    clearSession()
    return null
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status

    if (status === 401 && config && !config._retry) {
      config._retry = true

      if (!refreshPromise) {
        refreshPromise = refreshSessionToken().finally(() => {
          refreshPromise = null
        })
      }

      const refreshedToken = await refreshPromise
      if (refreshedToken) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${refreshedToken}`
        return apiClient(config)
      }
    }

    const normalized = normalizeApiError(error)
    if (status === undefined || status >= 500) {
      captureError(normalized, {
        source: 'apiClient',
        method: config?.method,
        url: config?.url,
        status: status ?? 'network',
      })
    }

    throw normalized
  },
)
