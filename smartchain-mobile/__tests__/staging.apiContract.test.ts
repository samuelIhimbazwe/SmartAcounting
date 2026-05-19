/**
 * Live staging API contract checks for mobile-critical endpoints.
 * Skipped unless STAGING_API_URL is set (CI: configure repo secrets).
 *
 * Required env:
 *   STAGING_API_URL  e.g. https://staging.example.com/api/v1
 *   CONTRACT_USERNAME, CONTRACT_PASSWORD, CONTRACT_TENANT_ID, CONTRACT_USER_ID
 */

const base = process.env.STAGING_API_URL?.replace(/\/$/, '');
const hasStaging = Boolean(base);
const creds = {
  username: process.env.CONTRACT_USERNAME ?? '',
  password: process.env.CONTRACT_PASSWORD ?? '',
  tenantId: process.env.CONTRACT_TENANT_ID ?? '',
  userId: process.env.CONTRACT_USER_ID ?? '',
};
const hasCreds = Object.values(creds).every(v => v.length > 0);

const describeStaging = hasStaging ? describe : describe.skip;

async function api(
  path: string,
  init: RequestInit & {token?: string} = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (init.token) {
    headers.Authorization = `Bearer ${init.token}`;
  }
  return fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  });
}

describeStaging('staging API contract (mobile)', () => {
  it('actuator health is reachable', async () => {
    const root = base!.replace(/\/api\/v1$/, '');
    const res = await fetch(`${root}/actuator/health`);
    expect(res.ok).toBe(true);
  });

  it('till-sessions/current requires auth', async () => {
    const res = await api('/pos/till-sessions/current');
    expect([401, 403]).toContain(res.status);
  });

  (hasCreds ? it : it.skip)('login returns access and refresh tokens', async () => {
    const mfa = await api('/auth/mfa/challenge', {
      method: 'POST',
      body: JSON.stringify(creds),
    });
    expect(mfa.ok).toBe(true);
    const mfaBody = (await mfa.json()) as {challengeId?: string};
    const login = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...creds,
        mfaChallengeId: mfaBody.challengeId ?? null,
        otpCode: null,
      }),
    });
    expect(login.ok).toBe(true);
    const body = (await login.json()) as {
      token?: string;
      refreshToken?: string;
    };
    expect(typeof body.token).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  (hasCreds ? it : it.skip)('authenticated till-sessions/current returns JSON object', async () => {
    const mfa = await api('/auth/mfa/challenge', {
      method: 'POST',
      body: JSON.stringify(creds),
    });
    const mfaBody = (await mfa.json()) as {challengeId?: string};
    const login = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...creds,
        mfaChallengeId: mfaBody.challengeId ?? null,
        otpCode: null,
      }),
    });
    const {token} = (await login.json()) as {token: string};
    const res = await api('/pos/till-sessions/current', {token});
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      const session = (await res.json()) as {id?: string; posRegisterCode?: string};
      expect(session).toEqual(expect.objectContaining({id: expect.any(String)}));
    }
  });
});
