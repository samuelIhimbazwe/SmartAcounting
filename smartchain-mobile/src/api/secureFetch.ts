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
  // react-native-ssl-pinning does not support PATCH; use system fetch for PATCH only.
  if (method === 'PATCH') {
    return fetch(url, options);
  }
  const pinned = await pinnedFetch(url, {
    method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
    headers: options.headers || {},
    body: options.body as string | undefined,
    sslPinning: {
      certs: ['smartaccounting-cert'],
    },
    timeoutInterval: 15000,
  });

  return {
    ok: pinned.status >= 200 && pinned.status < 300,
    status: pinned.status,
    json: async () => JSON.parse(pinned.bodyString ?? '{}'),
    text: async () => pinned.bodyString ?? '',
  } as Response;
}
