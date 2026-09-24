import { test, expect, type Page, type Route } from '@playwright/test'
// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared, so a
// spec that seeds only a plaintext password logs in fine and then fails at the PIN box.
// This is the seed's own constant hash of 1234, the same one MockData7 carries.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm'

// OF in the browser. Needs the emulator (slot 2 for the OF session: FIRESTORE_EMULATOR_HOST=127.0.0.1:8280,
// VITE_FUNCTIONS_URL=http://127.0.0.1:5202/rms-app-dd875/us-central1). Seeds staff, tax config and lines
// through Firestore REST exactly as billing.spec.ts does; the connection is cut by aborting every Cloud
// Function call (the Vite dev server keeps serving) and restored with unroute.
//
// Hand-computed (rupees on screen, minor on the wire):
//   draft: pizza 50000 + coke 8000, no charges → preview "Payable ₹609.00" (BL-S1)
//   OF-S5  after the cut, a failed call and staleAfterSeconds (seeded 1) → banner "No connection since HH:MM"; restore → gone
//   OF-S6  the last preview stays on screen labelled "as of HH:MM"; Preview tap says "No connection", figures unchanged
//   OF-S7  Emergency bill needs amount + tender before Print: 609.00 cash → slip says "ESTIMATE, not a tax invoice…",
//          "₹609.00", "as of HH:MM", NO bill-number, NO CGST/SGST lines
//   OF-S14 recording and printing the slip sends zero requests to billing-*, payments-*, dayClose-*
//   OF-S16 form hidden online; hidden while a 3 s call is in flight; shown after a failed call
//   OF-S13 reload while cut → the open estimate (Reprint ₹609.00) and the cached preview survive
//   OF-S10 with 1 open estimate, ?day=1 shows "reconcile 1 estimate first" and no close form
//   OF-S20 restore → an approvals-apply {action:'estimate', cid:'est_<draft>_…'} call fires by itself, then
//          audit/<cid>_estimate exists with amount 60900 sev P1; cut and restore again → still one row
//   OF-S17 issued bill ₹609.00, cut before take → "due ₹609.00 on <billId>", records cash; reconcile does take only
//   OF-S18 reconcile: issue succeeds, take aborted once → estimate keeps its billId; second tap resends the same paymentId → paid
//   OF-S12 preview stamped 5 h old (localStorage seam) → Emergency bill refused "too old: write it by hand"
//   OF-S15 Emergency bill twice → one estimate, "Reprint"
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
async function getDoc(path: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(`${FS}/${path}`, { headers: H })
  if (r.status === 404) return null
  const j = await r.json()
  return Object.fromEntries(Object.entries(j.fields ?? {}).map(([k, f]) => { const x = f as Record<string, string>; return [k, 'integerValue' in x ? Number(x.integerValue) : x.stringValue ?? x.booleanValue ?? null] }))
}
async function listAudit(cid: string): Promise<number> {
  const j = await (await fetch(`${FS}/audit?pageSize=300`, { headers: H })).json()
  return ((j.documents ?? []) as { fields?: { cid?: { stringValue?: string } } }[]).filter(d => d.fields?.cid?.stringValue === cid).length
}
const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] }
const TENDERS = [
  { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false },
  { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true },
  { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true },
]
const line = (lineId: string, name: string, list: number, draftId: string) => ({
  lineId, cid: 'o_of', orderId: 'o_of', cartId: 'k_of', cartItemId: lineId, tableId: 't_of', sessionId: 's_of', placedAt: 1, placedBy: 'guest',
  menuItemId: 'mi_' + lineId, name, qty: 1, listPrice: list, sent: true, v: 0, countsTowardTotal: true, draftId, billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name, unitListPrice: list, taxBlockId: 'food', taxCode: '9963' }], taxBlocks: { food: FOOD }, offer: null,
})

let DRAFT = ''
test.beforeEach(async () => {
  DRAFT = `of_draft_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
  await seed('servers/till_manager', { name: 'Till Manager', role: 'MANAGER', status: 'active', email: 'till.manager@st.test', password: '1234', pinHash: PIN_1234 })
  await seed('config/settings', {
    tax: { blocks: { food: FOOD } }, seller: { name: 'PW Bar', taxId: 'GSTIN_PW' }, billing: { charges: [] }, approvals: {},
    payments: { tenders: TENDERS }, dayClose: { blindCount: false, overShortP0Above: 10000, reasons: ['opening float', 'correction'] },
    offline: { staleAfterSeconds: 1 },
  })
  await seed('orders/o_of', { orderId: 'o_of', tableId: 't_of', orderStatus: 'IN_PROGRESS', paymentStatus: 'unpaid' })
  await seed(`lines/${DRAFT}_pizza`, line(`${DRAFT}_pizza`, 'Margherita', 50000, DRAFT))
  await seed(`lines/${DRAFT}_coke`, line(`${DRAFT}_coke`, 'Coke', 8000, DRAFT))
})

const isFn = (url: string) => url.includes('/us-central1/')
const cut = (page: Page) => page.route('**/*', r => (isFn(r.request().url()) ? r.abort('failed') : r.continue()))
const restore = (page: Page) => page.unroute('**/*')
async function login(page: Page, query: string) {
  await page.goto(`/?r=${RID}&${query}`)
  await page.getByTestId('email').fill('till.manager@st.test')
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
}
async function openDraft(page: Page) {
  await login(page, `draft=${DRAFT}`)
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹609.00')
}
/** Cut the line, make one call fail, and print the ₹609.00 estimate for cash. */
async function printEstimate(page: Page) {
  await cut(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('estimate-form')).toBeVisible()
  await page.getByTestId('est-taken').fill('609')
  await page.getByTestId('est-tender').selectOption('cash')
  await page.getByTestId('est-print').click()
  await expect(page.getByTestId('estimate-print')).toBeVisible()
}
function calls(page: Page, endpoint: string) {
  const bodies: Record<string, unknown>[] = []
  page.on('request', r => { if (r.url().endsWith(`/${endpoint}`) && r.method() === 'POST') bodies.push(JSON.parse(r.postData() ?? '{}').data) })
  return bodies
}

test('OF-S5 cut the connection → banner "No connection since HH:MM" after a failed call; restore → banner gone', async ({ page }) => {
  await openDraft(page)
  await expect(page.getByTestId('offline-banner')).toHaveCount(0)
  await cut(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('offline-banner')).toHaveText(/^No connection since \d\d:\d\d$/)
  await restore(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('offline-banner')).toHaveCount(0)
})

test('OF-S6 cut mid-bill → Payable ₹609.00 stays, labelled as of HH:MM; Preview tap says No connection, figures unchanged', async ({ page }) => {
  await openDraft(page)
  await cut(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('bill-msg')).toHaveText('No connection')
  await expect(page.getByTestId('payable')).toContainText('Payable ₹609.00')
  await expect(page.getByTestId('as-of')).toHaveText(/^ as of \d\d:\d\d$/)
  await expect(page.getByTestId('block-food')).toContainText('CGST 2.5% ₹14.50')   // the cached figures, not blanks
})

test('OF-S7 Emergency bill: amount + tender required before Print; the slip has the ESTIMATE text, ₹609.00, as of, no number, no tax lines', async ({ page }) => {
  await openDraft(page)
  await cut(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('estimate-form')).toBeVisible()
  await page.getByTestId('est-print').click()
  await expect(page.getByTestId('est-msg')).toHaveText('Amount taken and tender first')
  await expect(page.getByTestId('estimate-print')).toHaveCount(0)
  await page.getByTestId('est-taken').fill('609')
  await page.getByTestId('est-tender').selectOption('cash')
  await page.getByTestId('est-print').click()
  const slip = page.getByTestId('estimate-print')
  await expect(slip.getByTestId('est-text')).toHaveText('ESTIMATE, not a tax invoice. A tax invoice will be issued.')
  await expect(slip.getByTestId('est-amount')).toHaveText('₹609.00')
  await expect(slip.getByTestId('est-asof')).toHaveText(/^as of \d\d:\d\d$/)
  await expect(slip).not.toContainText('CGST')
  await expect(slip).not.toContainText('SGST')
  await expect(page.getByTestId('bill-number')).toHaveCount(0)
})

test('OF-S14 recording and printing the estimate makes zero billing/payments/dayClose requests', async ({ page }) => {
  await openDraft(page)
  await cut(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('estimate-form')).toBeVisible()
  const money: string[] = []
  page.on('request', r => { if (/\/(billing|payments|dayClose)-/.test(r.url())) money.push(r.url()) })
  await page.getByTestId('est-taken').fill('609')
  await page.getByTestId('est-tender').selectOption('cash')
  await page.getByTestId('est-print').click()
  await expect(page.getByTestId('estimate-print')).toBeVisible()
  await page.getByTestId('reprint').click()
  await page.waitForTimeout(500)
  expect(money).toEqual([])
})

test('OF-S16 form absent online, absent while a 3 s call is in flight, present after a failed call', async ({ page }) => {
  await openDraft(page)
  await expect(page.getByTestId('estimate-form')).toHaveCount(0)
  let slow: Route | null = null
  await page.route('**/billing-preview', r => { slow = r })   // held, not answered: a slow server, not a dead one
  await page.getByTestId('preview').click()
  await page.waitForTimeout(3000)
  await expect(page.getByTestId('estimate-form')).toHaveCount(0)
  await expect(page.getByTestId('offline-banner')).toHaveCount(0)
  await slow!.continue()
  await page.unroute('**/billing-preview')
  await cut(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('estimate-form')).toBeVisible()
})

test('OF-S13 reload while cut → the open estimate ₹609.00 and the cached preview survive', async ({ page }) => {
  await openDraft(page)
  await printEstimate(page)
  await restore(page)
  // Login and config still answer; the bill's own calls stay dead.
  await page.route('**/*', r => (isFn(r.request().url()) && /\/(billing|payments|dayClose|approvals-apply)/.test(r.request().url()) ? r.abort('failed') : r.continue()))
  await page.reload()
  await login(page, `draft=${DRAFT}`)
  await expect(page.getByTestId('payable')).toContainText('Payable ₹609.00')
  await expect(page.getByTestId('as-of')).toBeVisible()
  await expect(page.getByTestId('reprint')).toHaveText('Show estimate again ₹609.00')
})

test('OF-S10 one open estimate → ?day=1 shows "reconcile 1 estimate first", no close form', async ({ page }) => {
  await openDraft(page)
  await printEstimate(page)
  await restore(page)
  await login(page, 'day=1')
  await expect(page.getByTestId('day-date')).toBeVisible()
  await expect(page.getByTestId('day-estimates')).toHaveText('reconcile 1 estimate first')
  await expect(page.getByTestId('day-close-form')).toHaveCount(0)
})

test('OF-S20 restore → approvals-apply estimate fires by itself; audit row P1 60900; cut+restore again → still one row', async ({ page }) => {
  const applies = calls(page, 'approvals-apply')
  await openDraft(page)
  await printEstimate(page)
  await restore(page)
  await page.getByTestId('preview').click()             // any answered call
  await expect.poll(() => applies.filter(b => b.action === 'estimate').length).toBeGreaterThanOrEqual(1)
  const cid = String(applies.find(b => b.action === 'estimate')!.cid)
  expect(cid).toMatch(new RegExp(`^est_${DRAFT}_\\d{8}T\\d{4}$`))
  await expect.poll(() => getDoc(`audit/${cid}_estimate`)).toMatchObject({ amount: 60900, sev: 'P1', action: 'estimate' })
  await cut(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('offline-banner')).toBeVisible()
  await restore(page)
  await page.getByTestId('preview').click()
  await expect(page.getByTestId('offline-banner')).toHaveCount(0)
  await page.waitForTimeout(500)
  expect(await listAudit(cid)).toBe(1)
})

test('OF-S17 issued then cut → "due ₹609.00 on <bill>"; reconcile sends payments-take only', async ({ page }) => {
  const BILL = `of_bill_${DRAFT}`
  await seed(`bills/${BILL}`, { payable: 60900, status: 'issued', cid: `cid_${BILL}`, number: '0417', lines: [{ lineId: 'l1', orderId: 'o_of', countsTowardTotal: true }] })
  await login(page, `bill=${BILL}`)
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹609.00')
  await cut(page)
  await page.getByTestId('tender-cash').click()
  await page.getByTestId('amount').fill('609')
  await page.getByTestId('take').click()                 // the take dies on the wire
  await expect(page.getByTestId('due-offline')).toContainText(`due ₹609.00 on ${BILL}`)
  await page.getByTestId('est-taken').fill('609')
  await page.getByTestId('est-tender').selectOption('cash')
  await page.getByTestId('est-print').click()
  await expect(page.getByTestId('estimate-print')).toBeVisible()
  await restore(page)
  const issues = calls(page, 'billing-issue')
  const takes = calls(page, 'payments-take')
  await login(page, 'reconcile=1')
  await page.getByTestId('take-only').click()
  await expect(page.getByTestId('rec-msg')).toContainText('paid; outstanding ₹0.00')
  expect(issues).toHaveLength(0)
  expect(takes).toHaveLength(1)
  expect(takes[0]).toMatchObject({ billId: BILL, tenderId: 'cash', tendered: 60900 })
  expect(String(takes[0].ref)).toMatch(new RegExp(`^est:${BILL}:\\d{8}T\\d{4}:60900$`))
  await expect(page.getByTestId('reconcile')).toContainText('Reconcile 0 estimates')
})

test('OF-S18 reconcile with take aborted once → estimate keeps its billId; retry resends the same paymentId → paid', async ({ page }) => {
  await openDraft(page)
  await printEstimate(page)
  await restore(page)
  const issues = calls(page, 'billing-issue')
  const takes = calls(page, 'payments-take')
  await login(page, 'reconcile=1')
  await page.getByTestId('check').click()
  await expect(page.getByTestId('gap')).toHaveText('now ₹609.00, no gap')
  let n = 0
  await page.route('**/payments-take', r => { n++; if (n === 1) r.abort('failed'); else r.continue() })
  await page.getByTestId('issue-take').click()
  await expect(page.getByTestId('rec-msg')).toHaveText('No connection')
  await expect(page.getByTestId('issue-take')).toHaveText('Take')     // the issue landed and is remembered
  await page.getByTestId('issue-take').click()
  await expect(page.getByTestId('rec-msg')).toContainText('paid; outstanding ₹0.00')
  expect(issues).toHaveLength(1)
  expect(takes).toHaveLength(2)
  expect(takes[0].paymentId).toBe(takes[1].paymentId)
  expect(takes[1]).toMatchObject({ tendered: 60900, tenderId: 'cash' })
  const bill = await getDoc(`bills/${takes[1].billId}`)
  expect(bill).toMatchObject({ status: 'paid', paidTotal: 60900 })
})

test('OF-S18b issue lands but its answer is lost → second tap adopts the bill the server names; one number, paid', async ({ page }) => {
  await openDraft(page)
  await printEstimate(page)
  await restore(page)
  const issues = calls(page, 'billing-issue')
  await login(page, 'reconcile=1')
  await page.getByTestId('check').click()
  let n = 0
  await page.route('**/billing-issue', async r => { n++; if (n === 1) { await r.fetch(); await r.abort('failed') } else await r.continue() })
  await page.getByTestId('issue-take').click()
  await expect(page.getByTestId('rec-msg')).toHaveText('No connection')
  await page.getByTestId('issue-take').click()
  await expect(page.getByTestId('rec-msg')).toContainText('paid; outstanding ₹0.00')
  expect(issues).toHaveLength(2)
  const pizza = await getDoc(`lines/${DRAFT}_pizza`)
  const bill = await getDoc(`bills/${pizza!.billId}`)
  expect(bill).toMatchObject({ status: 'paid', paidTotal: 60900 })
})

test('OF-S12 preview 5 h old → Emergency bill refused "too old: write it by hand"', async ({ page }) => {
  await openDraft(page)
  await page.evaluate((draft) => {
    const s = JSON.parse(localStorage.getItem('till.offline') ?? '{}')
    s.previews[draft].at = Date.now() - 5 * 3600_000
    localStorage.setItem('till.offline', JSON.stringify(s))
  }, DRAFT)
  await cut(page)
  await page.getByTestId('preview').click()
  await page.getByTestId('est-taken').fill('609')
  await page.getByTestId('est-tender').selectOption('cash')
  await page.getByTestId('est-print').click()
  await expect(page.getByTestId('est-msg')).toHaveText(/^No preview since \d\d:\d\d, too old: write it by hand$/)
  await expect(page.getByTestId('estimate-print')).toHaveCount(0)
})

test('OF-S15 Emergency bill twice → one estimate, second tap is Reprint', async ({ page }) => {
  await openDraft(page)
  await printEstimate(page)
  await expect(page.getByTestId('estimate-form')).toHaveCount(0)
  await expect(page.getByTestId('reprint')).toHaveText('Show estimate again ₹609.00')
  await page.getByTestId('reprint').click()
  await expect(page.getByTestId('estimate-print')).toBeVisible()
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem('till.offline') ?? '{}').estimates.length)
  expect(n).toBe(1)
})
