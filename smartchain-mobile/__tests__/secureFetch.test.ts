import {secureApiCall} from '../src/api/secureFetch';

jest.mock('../src/config/env', () => ({
  ENV: {ENVIRONMENT: 'production', API_BASE_URL: 'https://api.example.com/api/v1'},
}));

jest.mock('../src/config/pinning', () => ({
  SSL_PINNING_CERT_INSTALLED: false,
}));

jest.mock('react-native-ssl-pinning', () => ({
  fetch: jest.fn(),
}));

describe('secureApiCall', () => {
  beforeEach(() => {
    // @ts-expect-error test override
    global.__DEV__ = false;
  });

  afterEach(() => {
    // @ts-expect-error test override
    global.__DEV__ = true;
  });

  it('throws when production cert flag is false', async () => {
    await expect(
      secureApiCall('/health', {method: 'GET'}),
    ).rejects.toThrow(/SSL pinning is not configured/);
  });
});
