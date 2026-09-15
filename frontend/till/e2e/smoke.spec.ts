import { test, expect } from '@playwright/test'

test('till reaches the emulator', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('status')).toHaveText('Connected')
})
