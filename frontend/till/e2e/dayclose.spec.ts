import { test, expect, type Page } from '@playwright/test'
// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared, so a
// spec that seeds only a plaintext password logs in fine and then fails at the PIN box.
// This is the seed's own constant hash of 1234, the same one MockData7 carries.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm'

// DC in the browser. Needs the emulator (slot 0). Seeds staff and config through Firestore REST.
const RID = 'res_e2e_all_on'
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}/v1/projects/rms-app-dd875/databases/(default)/documents/restaurants/${RID}`
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }
function enc(v: unknown): object {
  if (v === null) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, enc(x)])) } }
}
async function seed(path: string, obj: Record<string, unknown>) {
  const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) })
  if (!r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`)
}
const del = (path: string) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: H })

// The same three every other spec expects: this file must not narrow the restaurant's tenders,
// or the specs that run after it lose UPI.
const TENDERS = [
  { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false },
  { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true },
  { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true },
]
const REASONS = ['opening float', 'vendor payment', 'bank drop', 'correction']
// R8: the calendar day shifted back by the close hour, so this matches what the server will stamp.
const bdFor = (at: number) => new Date(at + 330 * 60_000 - 4 * 60 * 60_000).toISOString().slice(0, 10)
const PAST = '2025-03-11'        // an empty day, so the arithmetic on screen is only ours
const TODAY = bdFor(Date.now())

async function settings(blindCount: boolean) {
  await seed('config/settings', {
    tax: { blocks: { food: { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] } } },
    seller: { name: 'PW Bar', taxId: 'GSTIN_PW' }, billing: { charges: [] }, approvals: {},
    payments: { tenders: TENDERS },
    dayClose: { blindCount, overShortP0Above: 10000, reasons: REASONS },
  })
}
async function login(page: Page, day: string) {
  await page.goto(`/?r=${RID}&day=${day}`)
  await page.getByTestId('email').fill('till.manager@st.test')
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
  await expect(page.getByTestId('day-date')).toHaveText(day)
}

test.beforeEach(async () => {
  await seed('servers/till_manager', { name: 'Till Manager', role: 'MANAGER', status: 'active', email: 'till.manager@st.test', password: '1234', pinHash: PIN_1234 })
  // A day can only be closed once, so reopening it for a rerun means clearing its audit row too —
  // that row is written with `create` and would otherwise collide (test housekeeping, not a reopen).
  for (const d of [PAST, TODAY]) { await del(`dayClose/${d}`); await del(`audit/${d}_dayClose`) }
})

test('DC-S30/S3 blind: the cashier is shown no cash figure, counts ₹50 into an empty day, and the difference appears only afterwards', async ({ page }) => {
  await settings(true)
  await login(page, PAST)

  // R14 is a SERVER rule: the figure is not sent, so there is nothing on the page to hide.
  await expect(page.getByTestId('day-expected')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('should hold')

  await page.getByTestId('counted').fill('50.00')
  await page.getByTestId('close-day').click()

  await expect(page.getByTestId('day-msg')).toHaveText('Day closed, over ₹50.00')
  await expect(page.getByTestId('day-closed')).toHaveText('closed')
  await expect(page.getByTestId('day-result')).toContainText('Expected ₹0.00 · counted ₹50.00')
  await expect(page.getByTestId('day-result')).toContainText('over ₹50.00')
  // R11: no reopen, and the screen offers none.
  await expect(page.getByTestId('close-day')).toHaveCount(0)
})

test('DC-S8/S10 a ₹1,200 cash-out goes through the one PIN door, lands in the drawer list, and moves what the day expects', async ({ page }) => {
  await settings(false)                       // blind off, so the screen may show the figure it is changing
  for (const m of ['pw_dc_a', 'pw_dc_b']) await del(`drawerMovements/${m}`)
  await login(page, TODAY)

  const before = await page.getByTestId('day-expected').textContent()

  await page.getByTestId('move-kind').selectOption('out')
  await page.getByTestId('move-amount').fill('1200.00')
  await page.getByTestId('move-reason').selectOption('vendor payment')
  await page.getByTestId('move-note').fill('vegetables')
  await page.getByTestId('move').click()

  // ST's one interceptor, not a per-screen popup: the server asked, the till prompts, the call resends.
  await expect(page.getByTestId('pin-input')).toBeVisible()
  await page.getByTestId('pin-input').fill('1234')
  await page.getByTestId('pin-ok').click()

  await expect(page.getByTestId('day-msg')).toHaveText('Drawer: ₹1200.00 recorded')
  await expect(page.getByTestId('movement')).toContainText(['out ₹1200.00 · vendor payment'])
  await expect(page.getByTestId('day-expected')).not.toHaveText(before ?? '')
})

test('DC-S8 a wrong PIN is refused and no cash leaves the drawer', async ({ page }) => {
  await settings(false)
  await login(page, TODAY)
  const before = await page.getByTestId('day-expected').textContent()

  await page.getByTestId('move-amount').fill('500.00')
  await page.getByTestId('move-reason').selectOption('vendor payment')
  await page.getByTestId('move').click()
  await expect(page.getByTestId('pin-input')).toBeVisible()
  await page.getByTestId('pin-input').fill('9999')
  await page.getByTestId('pin-ok').click()

  // ST-S3: the till asks again rather than failing, so cancelling is how the cashier gets out.
  await expect(page.getByTestId('pin-input')).toBeVisible()
  await page.getByTestId('pin-cancel').click()
  await expect(page.getByTestId('day-msg')).toHaveText('PIN required')
  await expect(page.getByTestId('day-expected')).toHaveText(before ?? '')
})
