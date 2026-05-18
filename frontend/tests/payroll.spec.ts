import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Payroll run', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'hr')
  })

  test('loads payroll page', async ({ page }) => {
    await page.goto('/hr/payroll')
    await expect(page.getByText(/payroll|attendance/i).first()).toBeVisible({
      timeout: 10000,
    })
  })
})
