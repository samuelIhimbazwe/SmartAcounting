import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Invoice creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'accounting')
  })

  test('loads invoice form', async ({ page }) => {
    await page.goto('/transactions/invoice')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })
})
