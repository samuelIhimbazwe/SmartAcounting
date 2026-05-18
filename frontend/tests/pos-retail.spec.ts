import { test, expect } from '@playwright/test'

const CEO_USER = process.env.E2E_CEO_USER ?? 'ceo'
const CEO_PASSWORD = process.env.E2E_CEO_PASSWORD ?? 'password'
const TENANT_ID = process.env.E2E_TENANT_ID ?? '11111111-1111-4111-8111-111111111111'
const USER_ID = process.env.E2E_USER_ID ?? '33333333-3333-4333-8333-333333333301'

test.describe('retail flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/username/i).fill(CEO_USER)
    await page.getByLabel(/password/i).fill(CEO_PASSWORD)
    await page.getByLabel(/tenant/i).fill(TENANT_ID)
    await page.getByLabel(/user id/i).fill(USER_ID)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })

  test('navigate to POS and retail till', async ({ page }) => {
    await page.goto('/pos')
    await expect(page.getByText(/checkout|pos|cart/i).first()).toBeVisible({
      timeout: 10000,
    })
    await page.goto('/retail')
    await expect(page.getByText(/till|register|retail/i).first()).toBeVisible({
      timeout: 10000,
    })
  })
})
