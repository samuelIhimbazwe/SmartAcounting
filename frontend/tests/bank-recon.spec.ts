import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Bank reconciliation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'accounting')
  })

  test('loads bank recon page', async ({ page }) => {
    await page.goto('/finance/bank-recon')
    await expect(page.locator('h1, h2').first()).toContainText(/bank|reconciliation/i, {
      timeout: 10000,
    })
  })
})
