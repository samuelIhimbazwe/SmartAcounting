import {secureApiCall} from '../src/api/secureFetch';

jest.mock('../src/config/env', () => ({
  ENV: {ENVIRONMENT: 'production', API_BASE_URL: 'https://api.example.com/api/v1'},
}));

jest.mock('../src/config/pinning', () => ({
  SSL_PINNING_CERT_INSTALLED: true,
}));

const mockPinnedFetch = jest.fn();

jest.mock('react-native-ssl-pinning', () => ({
  fetch: (...args: unknown[]) => mockPinnedFetch(...args),
}));

describe('secureApiCall PATCH', () => {
  beforeEach(() => {
    mockPinnedFetch.mockReset();
    // @ts-expect-error test override
    global.__DEV__ = false;
  });

  afterEach(() => {
    // @ts-expect-error test override
    global.__DEV__ = true;
  });

  it('falls back to system fetch when pinned PATCH fails', async () => {
    mockPinnedFetch.mockRejectedValue(new Error('PATCH not supported'));
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    } as Response);

    const res = await secureApiCall('/pos/till-sessions/x/close', {
      method: 'PATCH',
      body: JSON.stringify({closingCash: 1}),
    });

    expect(mockPinnedFetch).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
    expect(res.status).toBe(200);
    fetchMock.mockRestore();
  });
});
