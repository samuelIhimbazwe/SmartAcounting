import type { Page } from '@playwright/test'

const ROLE_CREDENTIALS: Record<string, { email: string; password: string }> = {
  ceo: {
    email: process.env.E2E_CEO_EMAIL ?? 'ceo@demo.com',
    password: process.env.E2E_PASSWORD ?? 'password',
  },
  cfo: {
    email: process.env.E2E_CFO_EMAIL ?? 'cfo@demo.com',
    password: process.env.E2E_PASSWORD ?? 'password',
  },
  accounting: {
    email: process.env.E2E_ACCT_EMAIL ?? 'acct@demo.com',
    password: process.env.E2E_PASSWORD ?? 'password',
  },
  hr: {
    email: process.env.E2E_HR_EMAIL ?? 'hr@demo.com',
    password: process.env.E2E_PASSWORD ?? 'password',
  },
  cashier: {
    email: process.env.E2E_CASHIER_EMAIL ?? 'cashier@demo.com',
    password: process.env.E2E_PASSWORD ?? 'password',
  },
}

export const loginAs = async (page: Page, role: keyof typeof ROLE_CREDENTIALS) => {
  const { email, password } = ROLE_CREDENTIALS[role]
  const tenantId = process.env.E2E_TENANT_ID ?? '11111111-1111-4111-8111-111111111111'
  const userId = process.env.E2E_USER_ID ?? '33333333-3333-4333-8333-333333333301'

  await page.goto('/login')
  await page.getByLabel(/username|email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  const tenant = page.getByLabel(/tenant/i)
  if (await tenant.isVisible()) {
    await tenant.fill(tenantId)
  }
  const user = page.getByLabel(/user id/i)
  if (await user.isVisible()) {
    await user.fill(userId)
  }
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
}
