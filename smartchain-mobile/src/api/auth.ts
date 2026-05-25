import axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import {apiClient, BASE_URL} from './client';
import type {AppRole} from '../utils/roles';
import {normalizeRoles} from '../utils/roles';

export interface LoginBody {
  username: string;
  password: string;
  tenantId: string;
  userId: string;
  mfaChallengeId?: string | null;
  otpCode?: string | null;
}

interface AuthResponseDto {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshToken: string;
}

interface JwtClaims {
  sub?: string;
  tenantId?: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
}

export interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  userId: string;
  roles: AppRole[];
  permissions: string[];
  userName: string | null;
}

function sessionFromTokenPair(token: string, refreshToken: string): SessionPayload {
  const claims = jwtDecode<JwtClaims>(token);
  const roles = normalizeRoles(claims.roles ?? []);
  const permissions = (claims.permissions ?? []).map(p => p.trim().toUpperCase());
  return {
    accessToken: token,
    refreshToken,
    tenantId: claims.tenantId ?? '',
    userId: claims.userId ?? '',
    roles,
    permissions,
    userName: claims.sub ?? null,
  };
}

export async function postMfaChallenge(
  body: Pick<LoginBody, 'username' | 'password' | 'tenantId' | 'userId'>,
) {
  const {data} = await apiClient.post<{
    challengeId: string;
    expiresInSeconds: number;
    delivery: string;
    debugCode: string | null;
  }>('/auth/mfa/challenge', body);
  return data;
}

export async function postLogin(body: LoginBody): Promise<SessionPayload> {
  const {data} = await apiClient.post<AuthResponseDto>('/auth/login', body);
  return sessionFromTokenPair(data.token, data.refreshToken);
}

export async function postLogout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', {refreshToken});
}

/** Token refresh — axios only (not routed through pinned apiCall). */
export async function postRefresh(refreshToken: string): Promise<SessionPayload> {
  const {data} = await axios.post<AuthResponseDto>(`${BASE_URL}/auth/refresh`, {
    refreshToken,
  });
  return sessionFromTokenPair(data.token, data.refreshToken);
}
