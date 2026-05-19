import axios from 'axios';
import {API_BASE_URL} from '@env';
import {getItem, setItem, removeItem} from '../utils/storage';
import {secureApiCall} from './secureFetch';
import {ENV} from '../config/env';

export const BASE_URL = API_BASE_URL || 'https://api.smartchain.rw/api/v1';

const PINNED_HOSTS = new Set([
  'api.rw.smartaccounting.app',
  'api.smartaccounting.rw',
]);

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
    this.name = 'ApiError';
  }
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

function authHeaders(): Record<string, string> {
  const {store} = require('../store') as typeof import('../store');
  const state = store.getState();
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (state.auth.accessToken) {
    headers.Authorization = `Bearer ${state.auth.accessToken}`;
  }
  if (state.auth.tenantId) {
    headers['X-Tenant-Id'] = state.auth.tenantId;
  }
  if (state.auth.userId) {
    headers['X-User-Id'] = state.auth.userId;
  }
  if (state.location?.selectedLocationId) {
    headers['X-Location-Id'] = state.location.selectedLocationId;
  }
  return headers;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }
    const {data} = await axios.post<{
      token: string;
      refreshToken: string;
    }>(`${BASE_URL}/auth/refresh`, {refreshToken});
    setItem('refreshToken', data.refreshToken);
    const {store} = require('../store') as typeof import('../store');
    const {setTokens} = require('../store/slices/authSlice');
    store.dispatch(
      setTokens({
        accessToken: data.token,
        refreshToken: data.refreshToken,
      }),
    );
    return data.token;
  } catch {
    const {store} = require('../store') as typeof import('../store');
    const {logout} = require('../store/slices/authSlice');
    removeItem('refreshToken');
    store.dispatch(logout());
    return null;
  }
}

async function rawFetch(
  url: string,
  options: RequestInit & {headers?: Record<string, string>},
  retried = false,
): Promise<Response> {
  const hostname = new URL(url).hostname;
  const usePinning =
    ENV.ENVIRONMENT === 'production' && PINNED_HOSTS.has(hostname);

  const pathOnly = new URL(url).pathname.replace(/^\/api\/v1/, '') || '/';

  const res = usePinning
    ? await secureApiCall(pathOnly, {
        method: options.method || 'GET',
        headers: {...authHeaders(), ...options.headers},
        body: options.body as string | undefined,
      })
    : await fetch(url, {
        ...options,
        headers: {...authHeaders(), ...options.headers},
      });

  if (res.status === 401 && !retried) {
    const token = await refreshAccessToken();
    if (token) {
      return rawFetch(url, options, true);
    }
  }
  return res;
}

export async function apiCall<T>(
  path: string,
  options: {
    method?: string;
    body?: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const url = buildUrl(path, options.params);
  const res = await rawFetch(url, {
    method: options.method,
    body: options.body,
    headers: options.headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** Axios-compatible facade — all calls route through secureFetch when pinned. */
export const apiClient = {
  get: <T>(path: string, config?: {params?: Record<string, string>}) =>
    apiCall<T>(path, {method: 'GET', params: config?.params}).then(data => ({data})),

  post: <T>(path: string, body?: unknown, config?: {params?: Record<string, string>}) =>
    apiCall<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      params: config?.params,
    }).then(data => ({data})),

  put: <T>(path: string, body?: unknown) =>
    apiCall<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(data => ({data})),

  patch: <T>(path: string, body?: unknown) =>
    apiCall<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(data => ({data})),

  delete: <T>(path: string) =>
    apiCall<T>(path, {method: 'DELETE'}).then(data => ({data})),
};

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
