import { apiClient } from './client'
import type { AuthSession } from './auth'
import type { Role } from '../types/roles'
import type { BillingCycle, PlanId } from '../../features/auth/subscriptionPlans'

export type SignupPlan = PlanId | 'TRIAL'

export interface PublicSignupPayload {
  businessName: string
  ownerName: string
  email: string
  phone: string
  password: string
  plan: SignupPlan
  billingCycle?: BillingCycle
}

export interface SignupApiResponse {
  tenantId: string
  userId: string
  token: string
}

interface VerifyPhoneApiResponse {
  token?: string
  tokenType?: string
  expiresInSeconds?: number
  expiresIn?: number
  refreshToken?: string
}

function toExpirySeconds(payload: VerifyPhoneApiResponse) {
  const sec = payload.expiresInSeconds ?? payload.expiresIn
  if (!sec || Number.isNaN(sec)) {
    return null
  }
  return Date.now() + sec * 1000
}

export interface PublicOAuthSignupPayload {
  provider: 'google' | 'microsoft'
  idToken: string
  businessName: string
  ownerName: string
  phone: string
  plan: SignupPlan
  billingCycle?: BillingCycle
}

export async function publicOAuthSignup(payload: PublicOAuthSignupPayload): Promise<SignupApiResponse> {
  const { data } = await apiClient.post<SignupApiResponse>('/api/v1/public/signup/oauth', payload)
  return data
}

export async function publicSignup(payload: PublicSignupPayload): Promise<SignupApiResponse> {
  const { data } = await apiClient.post<SignupApiResponse>('/api/v1/public/signup', payload)
  return data
}

export async function verifySignupPhone(
  phone: string,
  otp: string,
  role: Role = 'CEO',
): Promise<AuthSession> {
  const { data } = await apiClient.post<VerifyPhoneApiResponse>('/api/v1/public/verify-phone', {
    phone,
    otp,
  })
  const accessToken = data.token
  if (!accessToken) {
    throw new Error('Verification response missing access token')
  }
  return {
    accessToken,
    refreshToken: data.refreshToken ?? null,
    expiresAt: toExpirySeconds(data),
    role,
  }
}

export async function resendSignupOtp(phone: string): Promise<void> {
  await apiClient.post('/api/v1/public/resend-otp', { phone })
}

export interface ForgotPasswordPayload {
  email?: string
  phone?: string
}

/**
 * Requests a password-reset OTP. The backend will send a 6-digit code by SMS
 * to the phone tied to the email/phone supplied. Backend rate-limits per IP
 * and silently no-ops if no matching account is found (to prevent enumeration).
 */
export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  await apiClient.post('/api/v1/public/forgot-password', payload)
}

export interface ResetPasswordPayload {
  phone: string
  otp: string
  newPassword: string
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await apiClient.post('/api/v1/public/reset-password', payload)
}
