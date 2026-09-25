import { test, expect, type Page } from '@playwright/test'
// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared, so a
// spec that seeds only a plaintext password logs in fine and then fails at the PIN box.
// This is the seed's own constant hash of 1234, the same one MockData7 carries.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm'

// PY in the browser. Needs the emulator (slot 0) with functions; seeds its own staff, order, bill and
// credit note through Firestore REST in BL's committed bill shape. Bill = payable 60900 (₹609.00).
const RID = 'res_e2e_all_on'
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}/v1/projects/rms-app-dd875/databases/(default)/documents/restaurants/${RID}`
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }
const enc = (v: unknown): object =>
  v === null ? { nullValue: null }
    : typeof v === 'string' ? { stringValue: v }
    : typeof v === 'boolean' ? { booleanValue: v }
    : typeof v === 'number' ? { integerValue: String(v) }
    : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
    : { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, enc(x)])) } }
async function seed(path: string, obj: Record<string, unknown>) {
  const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) })
  if (!r.ok) throw new Error(`seed ${path}: ${r.status}`)
}
const staff = (name: string, role: string, email: string) => ({ name, role, status: 'active', email, password: '1234', pinHash: PIN_1234 })

let BILL = ''
let NOTE = ''
test.beforeEach(async () => {
  BILL = `pw_bill_${Date.now()}_${Math.floor(Math.random() * 1e6)}`   // a fresh bill per test: no shared state
  NOTE = `pw_cn_${BILL}`
  await seed('servers/till_manager', staff('Till Manager', 'MANAGER', 'till.manager@st.test'))
  await seed('servers/till_captain', staff('Till Captain', 'SERVER', 'till.captain@st.test'))
  await seed('orders/pw_order', { orderStatus: 'IN_PROGRESS', paymentStatus: 'unpaid' })
  await seed(`bills/${BILL}`, { payable: 60900, status: 'issued', cid: `cid_${BILL}`, number: '0417', lines: [{ lineId: 'l1', orderId: 'pw_order', countsTowardTotal: true }] })
  await seed(`bills/${NOTE}`, { payable: -8400, status: 'issued', cid: `cid_${BILL}`, number: 'CN-0007', creditNoteOf: { billId: BILL, number: '0417', issuedAt: 1 }, lines: [] })
})

async function login(page: Page, bill: string, email: string) {
  await page.goto(`/?r=${RID}&bill=${bill}`)
  await page.getByTestId('email').fill(email)
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
  await expect(page.getByTestId('outstanding')).toBeVisible()
}
const take = async (page: Page, tender: string, amount: string, ref?: string) => {
  await page.getByTestId(`tender-${tender}`).click()
  await page.getByTestId('amount').fill(amount)
  if (ref !== undefined) await page.getByTestId('ref').fill(ref)
  await page.getByTestId('take').click()
}
function bodiesOf(page: Page, endpoint: string) {
  const bodies: Record<string, unknown>[] = []
  page.on('request', r => { if (r.url().endsWith(`/${endpoint}`) && r.method() === 'POST') bodies.push(JSON.parse(r.postData() ?? '{}').data) })
  return bodies
}

// ── R8 at the keyboard: typed text → integer minor units, or nothing ──────────
test('PY-S31 the pad: "8.49" → 849 never 848; "608.99" → 60899; "608.995", "6,09", "-609", "abc" refused and Take disabled', async ({ page }) => {
  await login(page, BILL, 'till.manager@st.test')
  await page.getByTestId('tender-cash').click()
  for (const [typed, minor] of [['8.49', '849'], ['608.99', '60899'], ['609', '60900'], ['609.', '60900'], ['.5', '50']]) {
    await page.getByTestId('amount').fill(typed)
    await expect(page.getByTestId('minor')).toHaveText(minor)
  }
  for (const bad of ['608.995', '6,09', '6 0 9', '-609', 'abc']) {
    await page.getByTestId('amount').fill(bad)
    await expect(page.getByTestId('minor')).toHaveText('invalid')
    await expect(page.getByTestId('take')).toBeDisabled()
  }
})

// ── R13: the id the server trusts ───────────────────────────────────────────
test('R13 a retry after a lost response REUSES the same paymentId; the next tap mints a new one', async ({ page }) => {
  const bodies = bodiesOf(page, 'payments-take')
  let n = 0
  await page.route('**/payments-take', route => { n++; if (n === 1) route.abort('failed'); else route.continue() })
  await login(page, BILL, 'till.manager@st.test')
  await take(page, 'cash', '400')
  await expect(page.getByTestId('pay-msg')).not.toHaveText('')        // the failed call surfaced something
  await page.getByTestId('take').click()                           // the cashier taps again
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹209.00')
  expect(bodies).toHaveLength(2)
  expect(bodies[0].paymentId).toBe(bodies[1].paymentId)            // same tap, same id
  await take(page, 'cash', '209')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
  expect(bodies).toHaveLength(3)
  expect(bodies[2].paymentId).not.toBe(bodies[1].paymentId)        // new tap, new id
  expect(typeof bodies[2].tendered).toBe('number')                 // R8: an integer on the wire, never a float string
  expect(bodies[2].tendered).toBe(20900)
})

// ── the tender screen ───────────────────────────────────────────────────────
test('PY-S1 cash ₹609 exact → settled, status [paid], drawer signal fires (R10)', async ({ page }) => {
  await login(page, BILL, 'till.manager@st.test')
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹609.00')
  await take(page, 'cash', '609')
  await expect(page.getByTestId('pay-msg')).toHaveText('Recorded')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
  await expect(page.getByTestId('status')).toHaveText('[paid]')
  await expect(page.getByTestId('drawer')).toBeVisible()
  await expect(page.getByTestId('nothing-to-collect')).toHaveText('Nothing to collect')
})

test('PY-S2 cash ₹700 → change ₹91.00 previewed before confirm and reported after', async ({ page }) => {
  await login(page, BILL, 'till.manager@st.test')
  await page.getByTestId('tender-cash').click()
  await page.getByTestId('amount').fill('700')
  await expect(page.getByTestId('change')).toHaveText(' change ₹91.00')
  await page.getByTestId('take').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('Change ₹91.00')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
})

test('PY-S3 / PY-S4 split: card ₹400 leaves ₹209.00 outstanding; cash ₹200 hands back ₹91.00 change on the remaining ₹109 — never on the payable', async ({ page }) => {
  await login(page, BILL, 'till.manager@st.test')
  await take(page, 'card', '400', 'slip-1')
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹209.00')
  await expect(page.getByTestId('status')).toHaveText('[issued]')
  await expect(page.getByTestId('drawer')).toBeHidden()             // R10: a card opens nothing
  await take(page, 'card', '100', 'slip-2')
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹109.00')
  await page.getByTestId('tender-cash').click()
  await page.getByTestId('amount').fill('200')
  await expect(page.getByTestId('change')).toHaveText(' change ₹91.00')
  await page.getByTestId('take').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('Change ₹91.00')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
  await expect(page.getByTestId('rows').locator('li')).toHaveCount(3)
})

test('PY-S5 a card tender of ₹700 with the terminal in hand is refused by the server, nothing recorded', async ({ page }) => {
  await login(page, BILL, 'till.manager@st.test')
  await take(page, 'card', '700', 'slip-1')
  await expect(page.getByTestId('pay-msg')).toHaveText('More than the bill outstanding')
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹609.00')
  await expect(page.getByTestId('rows').locator('li')).toHaveCount(0)
})

test('PY-S28 a captured UPI of ₹650 against ₹609 is recorded with ₹41.00 overpaid, not refused and not change', async ({ page }) => {
  await login(page, BILL, 'till.manager@st.test')
  await page.getByTestId('tender-upi').click()
  await page.getByTestId('amount').fill('650')
  await page.getByTestId('ref').fill('upi-9981')
  await page.getByTestId('captured').check()
  await expect(page.getByTestId('change')).toHaveCount(0)
  await page.getByTestId('take').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('Overpaid ₹41.00, recorded')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
})

test('PY-S20 the card tender shows a reference field and Take stays disabled while it is empty; cash shows none', async ({ page }) => {
  await login(page, BILL, 'till.manager@st.test')
  await page.getByTestId('tender-card').click()
  await page.getByTestId('amount').fill('400')
  await expect(page.getByTestId('ref')).toBeVisible()
  await expect(page.getByTestId('take')).toBeDisabled()
  await page.getByTestId('ref').fill('slip-1')
  await expect(page.getByTestId('take')).toBeEnabled()
  await page.getByTestId('tender-cash').click()
  await expect(page.getByTestId('ref')).toHaveCount(0)
})

test('PY-S8 a comped ₹0 bill shows "Nothing to collect" and offers no tender button', async ({ page }) => {
  await seed(`bills/${BILL}`, { payable: 0, status: 'paid', paidTotal: 0, cid: `cid_${BILL}`, number: '0419', lines: [{ lineId: 'l1', orderId: 'pw_order', countsTowardTotal: true }] })
  await login(page, BILL, 'till.manager@st.test')
  await expect(page.getByTestId('nothing-to-collect')).toHaveText('Nothing to collect')
  await expect(page.getByTestId('tender-cash')).toHaveCount(0)
})

// ── the PIN challenge is ST's one interceptor ───────────────────────────────
test('PY-S12 a SERVER-role session gets "Not allowed" and NO PIN box', async ({ page }) => {
  await login(page, BILL, 'till.captain@st.test')
  await take(page, 'cash', '609')
  await expect(page.getByTestId('pay-msg')).toHaveText('Not allowed')
  await expect(page.getByTestId('pin-prompt')).toHaveCount(0)
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹609.00')
})

test('PY-S9 / PY-S30 refund ₹84 against the credit note → the shared PIN box → 1234 → refunded, ₹84.00 back outstanding', async ({ page }) => {
  await login(page, BILL, 'till.manager@st.test')
  await take(page, 'cash', '609')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
  await page.getByTestId('refund-note').fill(NOTE)
  await page.getByTestId('refund-amount').fill('84')
  await page.getByTestId('refund-tender').selectOption('cash')
  await page.getByTestId('refund-reason').selectOption('complaint')
  await page.getByTestId('refund').click()
  await expect(page.getByTestId('pin-prompt')).toBeVisible()
  await page.getByTestId('pin-input').fill('1234')
  await page.getByTestId('pin-ok').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('Refunded')
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹84.00')
  await expect(page.getByTestId('status')).toHaveText('[issued]')
  await expect(page.getByTestId('pin-prompt')).toHaveCount(0)
})

test('PY-S27 / R15 voiding the row that settled the bill puts ₹609.00 back and fires no drawer; a fresh UPI then settles it', async ({ page }) => {
  const bodies = bodiesOf(page, 'payments-take')
  await login(page, BILL, 'till.manager@st.test')
  await take(page, 'cash', '609')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
  const id = String(bodies[0].paymentId)
  await page.getByTestId(`void-${id}`).selectOption('other')
  await expect(page.getByTestId('pin-prompt')).toBeVisible()
  await page.getByTestId('pin-input').fill('1234')
  await page.getByTestId('pin-ok').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('Voided')
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹609.00')
  await expect(page.getByTestId('status')).toHaveText('[issued]')
  await expect(page.getByTestId('drawer')).toBeHidden()
  await expect(page.getByTestId(`row-${id}`)).toHaveCSS('text-decoration-line', 'line-through')
  await take(page, 'upi', '609', 'upi-1')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
})

test('PY-S24 a retry the server answers with the original row shows "Already recorded", not an error', async ({ page }) => {
  const bodies = bodiesOf(page, 'payments-take')
  let n = 0
  // Let the first call reach the server, then drop its RESPONSE: the till sees a failure the server did not.
  await page.route('**/payments-take', async route => { n++; if (n === 1) { const r = await route.fetch(); await r.body(); route.abort('failed') } else route.continue() })
  await login(page, BILL, 'till.manager@st.test')
  await take(page, 'cash', '609')
  await expect(page.getByTestId('pay-msg')).not.toHaveText('')
  await page.getByTestId('take').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('Already recorded')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
  expect(bodies[0].paymentId).toBe(bodies[1].paymentId)
  await expect(page.getByTestId('rows').locator('li')).toHaveCount(1)
})

// ── BT · on account (TD-012) and a tip ──────────────────────────────────────
test('BT-A/T ₹609 put on account for "Acme Ltd" settles the bill with no drawer; a cash ₹700 with a ₹50 tip on the next bill gives change ₹41.00', async ({ page }) => {
  // The account tender is config: set only `payments` on the settings doc, leaving every other module's keys alone.
  const TENDERS = [{ id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false }, { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true }, { id: 'account', label: 'On account', kind: 'credit', opensDrawer: false, needsRef: true }, { id: 'dineout', label: 'Dineout', kind: 'external', opensDrawer: false, needsRef: true, partner: true }]
  const r = await fetch(`${FS}/config/settings?updateMask.fieldPaths=payments`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: { payments: enc({ tenders: TENDERS }) } }) })
  if (!r.ok) throw new Error(`seed settings: ${r.status}`)
  try {
    await login(page, BILL, 'till.manager@st.test')
    await page.getByTestId('tender-account').click()
    await expect(page.getByTestId('take')).toHaveText('Put on account')
    await page.getByTestId('amount').fill('609')
    await page.getByTestId('ref').fill('Acme Ltd')
    await page.getByTestId('take').click()
    await expect(page.getByTestId('outstanding')).toHaveText('settled')
    await expect(page.getByTestId('drawer')).toBeHidden()
    await expect(page.getByTestId('rows')).toContainText('Acme Ltd')

    // the receivables screen lists it and can collect on it
    await page.goto(`/?r=${RID}&account=1`)   // a full navigation: the till keeps no session across it, so log in again
    await page.getByTestId('email').fill('till.manager@st.test')
    await page.getByTestId('password').fill('1234')
    await page.getByTestId('login').click()
    await expect(page.getByTestId('receivables')).toContainText('Acme Ltd')
    // D7: a regular's tab is never settled through a dining partner, so Dineout is not offered here
    const pick = page.getByTestId('receivables').locator('select[name="tender"]').first()
    await expect(pick.locator('option')).toHaveText(['Cash', 'Card'])

    // a fresh bill: cash 700 with a 50 tip
    const BILL2 = `${BILL}_tip`
    await seed(`bills/${BILL2}`, { payable: 60900, status: 'issued', cid: `cid_${BILL2}`, number: '0418', lines: [{ lineId: 'l1', orderId: 'pw_order', countsTowardTotal: true }] })
    await login(page, BILL2, 'till.manager@st.test')
    await page.getByTestId('tender-cash').click()
    await page.getByTestId('amount').fill('700')
    await page.getByTestId('tip').fill('50')
    await expect(page.getByTestId('change')).toHaveText(/₹41\.00/)
    await page.getByTestId('take').click()
    await expect(page.getByTestId('pay-msg')).toContainText('Change ₹41.00')
    await expect(page.getByTestId('rows')).toContainText('tip ₹50.00')
  } finally {
    await fetch(`${FS}/config/settings?updateMask.fieldPaths=payments`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: { payments: enc({ tenders: TENDERS.slice(0, 2).concat([{ id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true }]) }) } }) })
  }
})

