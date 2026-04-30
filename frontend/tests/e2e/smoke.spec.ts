import { expect, test } from '@playwright/test'

test.describe('dashboard smoke', () => {
  test('login renders selected role dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Role').selectOption('CFO')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL(/\/dashboard\/cfo/)
    await expect(page.getByText('Financial Command')).toBeVisible()
    await expect(page.getByText('Trend vs benchmark')).toBeVisible()
  })

  test('non-ceo role cannot open another role dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Role').selectOption('HR')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard\/hr/)

    await page.goto('/dashboard/marketing')
    await expect(page).toHaveURL(/\/unauthorized/)
    await expect(page.getByText('Access restricted')).toBeVisible()
  })

  test('ceo can navigate cross-role dashboards', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Role').selectOption('CEO')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard\/ceo/)

    await page.getByRole('link', { name: 'Financial Command' }).click()
    await expect(page).toHaveURL(/\/dashboard\/cfo/)
    await expect(page.getByRole('heading', { name: 'Financial Command' })).toBeVisible()
  })

  test('kpi click opens drilldown with URL state', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Role').selectOption('CFO')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard\/cfo/)

    await expect(page.getByTestId('kpi-card-0')).toBeVisible()
    await page.getByTestId('kpi-card-0').click()
    await expect(page).toHaveURL(/drill=/)
    await expect(page.getByText('Drill-down')).toBeVisible()
  })

  test('copilot sidebar is available in dashboard shell', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Role').selectOption('CEO')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('AI Copilot')).toBeVisible()
  })
})
