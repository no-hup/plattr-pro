import { test, expect, type Page } from '@playwright/test'
// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared, so a
// spec that seeds only a plaintext password logs in fine and then fails at the PIN box.
// This is the seed's own constant hash of 1234, the same one MockData7 carries.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm'

// BL in the browser. Needs the emulator (slot 0). Seeds staff, tax config and two line snapshots through Firestore REST.
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
const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] }
const line = (lineId: string, name: string, list: number, draftId: string) => ({
  lineId, cid: 'o_pw', orderId: 'o_pw', cartId: 'k_pw', cartItemId: lineId, tableId: 't_pw', sessionId: 's_pw', placedAt: 1, placedBy: 'guest',
  menuItemId: 'mi_' + lineId, name, qty: 1, listPrice: list, sent: true, v: 0, countsTowardTotal: true, draftId, billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name, unitListPrice: list, taxBlockId: 'food', taxCode: '9963' }], taxBlocks: { food: FOOD }, offer: null,
})
async function login(page: Page, draft: string, email: string) {
  await page.goto(`/?r=${RID}&draft=${draft}`)
  await page.getByTestId('email').fill(email)
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
  await expect(page.getByTestId('payable')).toBeVisible()
}

let DRAFT = ''
test.beforeEach(async () => {
  DRAFT = `pw_draft_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
  await seed('servers/till_manager', { name: 'Till Manager', role: 'MANAGER', status: 'active', email: 'till.manager@st.test', password: '1234', pinHash: PIN_1234 })
  await seed('servers/till_captain', { name: 'Till Captain', role: 'SERVER', status: 'active', email: 'till.captain@st.test', password: '1234', pinHash: PIN_1234 })
  await seed('config/settings', { tax: { blocks: { food: FOOD } }, seller: { name: 'PW Bar', taxId: 'GSTIN_PW' }, billing: { charges: [{ type: 'SERVICE_CHARGE', percentage: 10 }] }, approvals: {} })
  await seed(`lines/${DRAFT}_pizza`, line(`${DRAFT}_pizza`, 'Margherita', 50000, DRAFT))
  await seed(`lines/${DRAFT}_coke`, line(`${DRAFT}_coke`, 'Coke', 8000, DRAFT))
})

test('BL-S1/S21/S10 draft shows pizza + coke with a 10 % service charge: ₹669.90 rounds to ₹670.00 → remove it → ₹609.00', async ({ page }) => {
  // The cashier removes it: since QB-13 (BL "Who can do what", D2 2026-09-25) a captain may look but not drop it.
  await login(page, DRAFT, 'till.manager@st.test')
  await expect(page.getByTestId('line')).toHaveCount(2)
  await expect(page.getByTestId('block-food')).toContainText('GST: ₹638.00 · CGST 2.5% ₹15.95 · SGST 2.5% ₹15.95')   // 580 + 58 charge
  await expect(page.getByTestId('charge-SERVICE_CHARGE')).toHaveText('SERVICE_CHARGE 10%: ₹58.00')
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹670.00')
  await expect(page.getByTestId('roundoff')).toHaveText('Round off +₹0.10')
  await page.getByTestId('toggle-charge').click()
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹609.00')
  await expect(page.getByTestId('charge-SERVICE_CHARGE')).toHaveCount(0)
  await expect(page.getByTestId('bill-number')).toHaveCount(0)   // a draft has no number
})

test('BL-S7/S9 manager generates the bill → number appears → cancel asks for a PIN → 1234 → cancelled; captain cannot generate', async ({ page }) => {
  await login(page, DRAFT, 'till.captain@st.test')
  await page.getByTestId('toggle-charge').click()
  await expect(page.getByTestId('bill-msg')).toHaveText('Not allowed')   // QB-13: the preview itself is refused
  await page.getByTestId('toggle-charge').click()
  await page.getByTestId('issue').click()
  await expect(page.getByTestId('bill-msg')).toHaveText('Not allowed')

  await login(page, DRAFT, 'till.manager@st.test')
  await page.getByTestId('toggle-charge').click()
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹609.00')
  await page.getByTestId('issue').click()
  await expect(page.getByTestId('bill-number')).toHaveText(/^#A-\d{4,}$/)
  await expect(page.getByTestId('bill-msg')).toHaveText(/^Bill \d{4,} issued$/)
  await expect(page.getByTestId('issue')).toHaveCount(0)

  await page.getByTestId('cancel-reason').selectOption('other')
  await page.getByTestId('cancel-note').fill('service charge removed')
  await page.getByTestId('cancel').click()
  await expect(page.getByTestId('pin-prompt')).toBeVisible()
  await expect(page.getByTestId('pin-hint')).toHaveText('Needed for cancelling the bill')
  await page.getByTestId('pin-input').fill('1234')
  await page.getByTestId('pin-ok').click()
  await expect(page.getByTestId('bill-msg')).toHaveText(/^Bill \d{4,} cancelled$/)
  await expect(page.getByTestId('bill-number')).toContainText('(cancelled)')
  await expect(page.getByTestId('cancel')).toHaveCount(0)
})

test('TD-019 / DC-S25a the guests left: comp the whole bill → the one PIN box → a numbered ₹0 bill, so the day can close over it', async ({ page }) => {
  await login(page, DRAFT, 'till.manager@st.test')
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹670.00')

  await page.getByTestId('comp-reason').selectOption('guest left')
  await page.getByTestId('comp-note').fill('walked out at 23:10')
  await page.getByTestId('comp').click()

  // The server refuses a bill discount without a PIN and the shared interceptor asks; no popup lives
  // in the bill screen. Until 2026-09-16 this went through silently, which was TD-019.
  await expect(page.getByTestId('pin-input')).toBeVisible()
  await page.getByTestId('pin-input').fill('1234')
  await page.getByTestId('pin-ok').click()

  await expect(page.getByTestId('bill-msg')).toContainText('comped to ₹0.00')
  await expect(page.getByTestId('bill-number')).toBeVisible()
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹0.00')
})

test('TD-019 a comp with the wrong PIN takes no invoice number and leaves the draft alone', async ({ page }) => {
  await login(page, DRAFT, 'till.manager@st.test')
  await page.getByTestId('comp-reason').selectOption('guest left')
  await page.getByTestId('comp').click()
  await expect(page.getByTestId('pin-input')).toBeVisible()
  await page.getByTestId('pin-input').fill('9999')
  await page.getByTestId('pin-ok').click()

  await expect(page.getByTestId('pin-input')).toBeVisible()   // ST-S3: it asks again
  await page.getByTestId('pin-cancel').click()
  await expect(page.getByTestId('bill-msg')).toHaveText('PIN required')
  await expect(page.getByTestId('bill-number')).toHaveCount(0)
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹670.00')
})
