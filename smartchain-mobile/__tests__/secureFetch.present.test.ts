import {secureApiCall} from '../src/api/secureFetch';

jest.mock('../src/config/env', () => ({
  ENV: {ENVIRONMENT: 'production', API_BASE_URL: 'https://api.example.com/api/v1'},
}));

jest.mock('../src/config/pinning', () => ({
  SSL_PINNING_CERT_INSTALLED: true,
}));

jest.mock('react-native-ssl-pinning', () => ({
  fetch: jest.fn().mockResolvedValue({
    status: 200,
    bodyString: '{}',
  }),
}));

describe('secureApiCall with cert installed', () => {
  beforeEach(() => {
    // @ts-expect-error test override
    global.__DEV__ = false;
  });

  afterEach(() => {
    // @ts-expect-error test override
    global.__DEV__ = true;
  });

  it('passes through pinned fetch when cert flag is true', async () => {
    const {fetch: pinnedFetch} = require('react-native-ssl-pinning');
    const res = await secureApiCall('/health', {method: 'GET'});
    expect(pinnedFetch).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
