/**
 * Live staging API contract checks for mobile-critical endpoints.
 *
 * NOT a device/E2E test — runs in Node/Jest against a real staging URL.
 * The whole suite is skipped when STAGING_API_URL is unset (local dev default).
 * Individual login/session cases also skip when CONTRACT_* creds are missing.
 *
 * To run locally or in CI:
 *   STAGING_API_URL=https://staging.example.com/api/v1
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

// STAGING_ENV_REQUIRED: whole suite skipped when STAGING_API_URL is unset (local default).
// Not hardware — run in CI or locally with staging URL + CONTRACT_* creds (see file header).
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

  // STAGING_ENV_REQUIRED: needs CONTRACT_USERNAME, CONTRACT_PASSWORD, CONTRACT_TENANT_ID, CONTRACT_USER_ID
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

  // STAGING_ENV_REQUIRED: same CONTRACT_* env vars as login case above
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
