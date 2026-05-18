import {fetch as pinnedFetch} from 'react-native-ssl-pinning';
import {ENV} from '../config/env';

export async function secureApiCall(
  endpoint: string,
  options: RequestInit & {headers?: Record<string, string>},
): Promise<Response> {
  const url = `${ENV.API_BASE_URL}${endpoint}`;

  if (ENV.ENVIRONMENT !== 'production') {
    return fetch(url, options);
  }

  const method = (options.method || 'GET').toUpperCase() as
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE';
  const pinned = await pinnedFetch(url, {
    method,
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
