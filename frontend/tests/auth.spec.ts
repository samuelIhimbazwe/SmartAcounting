import { test, expect } from '@playwright/test'

test.describe('auth', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in|welcome/i })).toBeVisible()
  })
})
