import {fetch as pinnedFetch} from 'react-native-ssl-pinning';
import {ENV} from '../config/env';
import {SSL_PINNING_CERT_INSTALLED} from '../config/pinning';

function assertProductionPinningConfigured(): void {
  if (__DEV__) {
    return;
  }
  if (ENV.ENVIRONMENT !== 'production') {
    return;
  }
  if (!SSL_PINNING_CERT_INSTALLED) {
    throw new Error(
      'Production SSL pinning is not configured. Add smartaccounting-cert.cer to android/app/src/main/assets/ and set SSL_PINNING_CERT_INSTALLED = true in src/config/pinning.ts',
    );
  }
}

type PinnedMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

async function executePinnedFetch(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{status: number; bodyString?: string}> {
  const pinnedMethod = method as PinnedMethod;
  return pinnedFetch(url, {
    method: pinnedMethod as 'GET',
    headers,
    body,
    sslPinning: {
      certs: ['smartaccounting-cert'],
    },
    timeoutInterval: 15000,
  } as Parameters<typeof pinnedFetch>[1]);
}

function toResponse(pinned: {status: number; bodyString?: string}): Response {
  return {
    ok: pinned.status >= 200 && pinned.status < 300,
    status: pinned.status,
    json: async () => JSON.parse(pinned.bodyString ?? '{}'),
    text: async () => pinned.bodyString ?? '',
  } as Response;
}

export async function secureApiCall(
  endpoint: string,
  options: RequestInit & {headers?: Record<string, string>},
): Promise<Response> {
  assertProductionPinningConfigured();

  const url = `${ENV.API_BASE_URL}${endpoint}`;

  if (ENV.ENVIRONMENT !== 'production') {
    return fetch(url, options);
  }

  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers || {};
  const body = options.body as string | undefined;

  try {
    const pinned = await executePinnedFetch(url, method, headers, body);
    return toResponse(pinned);
  } catch (pinErr) {
    if (method === 'PATCH') {
      if (__DEV__) {
        console.warn(
          'Pinned PATCH failed; retrying with system fetch:',
          pinErr,
        );
      }
      return fetch(url, options);
    }
    throw pinErr;
  }
}
