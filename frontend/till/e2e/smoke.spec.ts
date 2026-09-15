import { test, expect } from '@playwright/test'

test('till reaches the emulator: a bad login is answered by the functions emulator', async ({ page }) => {
  await page.goto('/?r=res_e2e_all_on&line=x')
  await page.getByTestId('email').fill('nobody@st.test')
  await page.getByTestId('password').fill('wrong')
  await page.getByTestId('login').click()
  await expect(page.getByTestId('msg')).toHaveText('Login failed: Invalid credentials')
})
