import { test, expect, type Page } from '@playwright/test'

// ST in the browser. Needs the emulator (slot 0) with functions; seeds its own staff and line through Firestore REST.
const RID = 'res_e2e_all_on'
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}/v1/projects/rms-app-dd875/databases/(default)/documents/restaurants/${RID}`
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }
const enc = (v: unknown): object =>
  typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) } : { nullValue: null }
async function seed(path: string, obj: Record<string, unknown>, mask?: string) {
  const r = await fetch(`${FS}/${path}${mask ? `?updateMask.fieldPaths=${mask}` : ''}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) })
  if (!r.ok) throw new Error(`seed ${path}: ${r.status}`)
}
const staff = (name: string, role: string, email: string) => ({ name, role, status: 'active', email, password: '1234' })

async function login(page: Page, line: string, email: string) {
  await page.goto(`/?r=${RID}&line=${line}`)
  await page.getByTestId('email').fill(email)
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
  await expect(page.getByTestId('apply')).toBeEnabled()
}
async function discount(page: Page, amount: string, reason = 'regular') {
  await page.getByTestId('amount').fill(amount)
  await page.getByTestId('reason').selectOption(reason)
  await page.getByTestId('apply').click()
}
function countCalls(page: Page) {
  let n = 0
  page.on('request', r => { if (r.url().endsWith('/approvals-apply') && r.method() === 'POST') n++ })
  return () => n
}

let LINE = ''
test.beforeEach(async () => {
  LINE = `pw_pitcher_${Date.now()}_${Math.floor(Math.random() * 1e6)}`   // a fresh line per test: no shared state
  await seed('servers/till_manager', staff('Till Manager', 'MANAGER', 'till.manager@st.test'))
  await seed('servers/till_captain', staff('Till Captain', 'SERVER', 'till.captain@st.test'))
  await seed(`lines/${LINE}`, { listPrice: 125000, sent: true, v: 0, countsTowardTotal: true })   // paise (R9)
})

test('ST-S2 ₹251 off the ₹1,250 pitcher → PIN box appears → 1234 → line shows −₹251 and the box closes; exactly two calls', async ({ page }) => {
  const calls = countCalls(page)
  await login(page, LINE, 'till.manager@st.test')
  await discount(page, '251', 'placard')
  await expect(page.getByTestId('pin-prompt')).toBeVisible()
  await expect(page.getByTestId('pin-hint')).toHaveText('Needed for this discount')
  await page.getByTestId('pin-input').fill('1234')
  await page.getByTestId('pin-ok').click()
  await expect(page.getByTestId('msg')).toHaveText('Applied −₹251 (20.08 %)')
  await expect(page.getByTestId('pin-prompt')).toHaveCount(0)
  expect(calls()).toBe(2)
  const storage = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))
  expect(storage).not.toContain('1234')
})

test('ST-S1 ₹100 off → applied with no PIN box, one call', async ({ page }) => {
  const calls = countCalls(page)
  await login(page, LINE, 'till.manager@st.test')
  await discount(page, '100')
  await expect(page.getByTestId('msg')).toHaveText('Applied −₹100 (8 %)')
  await expect(page.getByTestId('pin-prompt')).toHaveCount(0)
  expect(calls()).toBe(1)
})

test('ST-S4 captain → "Not allowed", no PIN box', async ({ page }) => {
  await login(page, LINE, 'till.captain@st.test')
  await discount(page, '50')
  await expect(page.getByTestId('msg')).toHaveText('Not allowed')
  await expect(page.getByTestId('pin-prompt')).toHaveCount(0)
})

test('cancel the PIN box → no second call, nothing applied', async ({ page }) => {
  const calls = countCalls(page)
  await login(page, LINE, 'till.manager@st.test')
  await discount(page, '251', 'placard')
  await page.getByTestId('pin-cancel').click()
  await expect(page.getByTestId('pin-prompt')).toHaveCount(0)
  await expect(page.getByTestId('msg')).toHaveText('PIN required')
  expect(calls()).toBe(1)
})

test('ST-S6 reason list comes from config; Apply is disabled until the list is loaded', async ({ page }) => {
  await login(page, LINE, 'till.manager@st.test')
  const options = await page.getByTestId('reason').locator('option').allTextContents()
  expect(options).toContain('placard')
  expect(options).toContain('guest left')
})

test('ST-S3 wrong PIN → "Wrong PIN, 4 left", box stays; 5th → "wait 1 s"; correct PIN too soon → "Too soon"; after the wait → applied', async ({ page }) => {
  await login(page, LINE, 'till.manager@st.test')
  await discount(page, '251', 'placard')
  for (let left = 4; left >= 1; left--) {
    await page.getByTestId('pin-input').fill('0000')
    await page.getByTestId('pin-ok').click()
    await expect(page.getByTestId('pin-hint')).toHaveText(`Wrong PIN, ${left} left`)
  }
  await page.getByTestId('pin-input').fill('0000')
  await page.getByTestId('pin-ok').click()
  await expect(page.getByTestId('pin-hint')).toHaveText(/^Wrong PIN, wait \d+ s$/)
  await page.getByTestId('pin-input').fill('1234')
  await page.getByTestId('pin-ok').click()
  await expect(page.getByTestId('pin-hint')).toHaveText(/^Too soon, wait \d+ s$/)
  await expect(page.getByTestId('pin-prompt')).toBeVisible()
  await seed('servers/till_manager', { pinRetryAfter: 0 }, 'pinRetryAfter')   // the wait has passed; no sleeps
  await page.getByTestId('pin-input').fill('1234')
  await page.getByTestId('pin-ok').click()
  await expect(page.getByTestId('msg')).toHaveText('Applied −₹251 (20.08 %)')
  await expect(page.getByTestId('pin-prompt')).toHaveCount(0)
})

test('arch-5: server keeps asking for a PIN → the till gives up after 10 tries, box closes, "Too many PIN attempts"', async ({ page }) => {
  await login(page, LINE, 'till.manager@st.test')
  // R7 never locks, so a stuck server (or a bug) could re-prompt forever. Fake one that always says "needs pin".
  await page.route('**/approvals-apply', route => route.fulfill({
    status: 403, contentType: 'application/json',
    body: JSON.stringify({ error: { message: 'PIN required', status: 'PERMISSION_DENIED', details: { data: { code: 'permission-denied', requires: 'pin', action: 'discount', sev: 'P0' } } } }),
  }))
  const calls = countCalls(page)
  await discount(page, '251', 'placard')
  for (let i = 0; i < 10; i++) {
    await expect(page.getByTestId('pin-prompt')).toBeVisible()
    await page.getByTestId('pin-input').fill('1234')
    await page.getByTestId('pin-ok').click()
  }
  await expect(page.getByTestId('msg')).toHaveText('Too many PIN attempts, start again')
  await expect(page.getByTestId('pin-prompt')).toHaveCount(0)
  expect(calls()).toBe(11)   // the first call plus ten answered challenges; the eleventh challenge is refused client-side
})
