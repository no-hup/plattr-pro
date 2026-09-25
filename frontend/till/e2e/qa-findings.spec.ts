import { test, expect, type Page } from '@playwright/test'
import { fake, floorOf, login, ok, refuse, tile } from './fake'

// Open QA findings that live in the screen alone: what it shows or sends, whatever the backend answers. So the
// backend is faked (fake.ts). Each is a known bug (TESTING.md): test.fail(), "[known bug]", the finding and TD ids.
// Reports: moonshot/reviews/2026-09-25-qa-till-floor.md (QF), -qa-bill-screen.md (QB), -qa-till-tender.md (QT).
// Findings whose truth is in the database are on real writers in walks.spec.ts.

const CASH = { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false }
const billState = (extra: Record<string, unknown> = {}) =>
  ({ billId: 'b10', payable: 6600, paidTotal: 0, outstanding: 6600, status: 'issued', rows: [], tenders: [CASH], ...extra })
const takeRow = (paymentId: string, amount: number) =>
  ({ row: { paymentId, kind: 'take', tenderId: 'cash', tender: CASH, amount, tendered: amount, change: 0, overpaid: 0, at: 0, by: 'till', ref: null, creditNoteId: null, refundsPaymentId: null, void: null }, bill: billState(), retry: false, opensDrawer: true })
const pick = (page: Page, label: string) => page.getByTestId(`tile-${label}`).getByRole('button').first().click()

test('[known bug] QF-4 TD-069 FL-S15: a pick started before the floor went stale cannot be confirmed', async ({ page }) => {
  test.fail()
  let down = false
  await page.clock.install()
  await fake(page, { 'floor-get': () => (down ? refuse(503, 'No connection', {}) : floorOf([tile('6'), tile('7')])) })
  await login(page)
  await page.getByTestId('start-merge').click()
  await pick(page, '6')
  await pick(page, '7')
  down = true
  await page.clock.fastForward(25_000)
  await expect(page.getByTestId('floor-stale')).toBeVisible()
  await expect(page.getByTestId('confirm-pick')).toBeDisabled()    // today: live, and merges on the old picture
})

test('[known bug] QF-7 TD-072: a double tap on Confirm merges once and says "Merged into 6"', async ({ page }) => {
  test.fail()
  let merges = 0
  const sent = await fake(page, {
    'floor-get': () => floorOf([tile('6'), tile('7')]),
    // What the real backend answers: the first merge lands, a second finds 7 already in the group.
    'table-setMerge': () => (merges++ === 0 ? ok({}) : refuse(400, 'table 7 is part of another group', { code: 'failed-precondition' })),
  })
  await login(page)
  await page.getByTestId('start-merge').click()
  await pick(page, '6')
  await pick(page, '7')
  await page.getByTestId('confirm-pick').evaluate(b => { (b as HTMLButtonElement).click(); (b as HTMLButtonElement).click() })
  await expect(page.getByTestId('floor-msg')).toHaveText('Merged into 6')   // today: "table 7 is part of another group"
  expect(sent['table-setMerge']).toHaveLength(1)
})

test('[known bug] QB-3 TD-065 BL-S9: an issued, unpaid bill can be cancelled from its tender screen', async ({ page }) => {
  test.fail()
  await fake(page, { 'payments-list': () => ok(billState()) })
  await login(page, '&bill=b10')
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹66.00')
  await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()   // today: Cancel lives only on the page that issued
})

test('[known bug] QB-6 TD-066: a draft whose preview is refused still offers Preview, not a bare heading', async ({ page }) => {
  test.fail()
  await fake(page, { 'billing-preview': () => refuse(400, 'discount exceeds bill', { code: 'failed-precondition' }) })
  await login(page, '&draft=d_naan')
  await expect(page.getByTestId('bill-msg')).toHaveText('discount exceeds bill')
  await expect(page.getByTestId('preview')).toBeVisible()          // today: nothing under the heading
})

test('[known bug] QB-14 TD-072: Comp on a draft with nothing on it says "Nothing to comp" and sends nothing', async ({ page }) => {
  test.fail()
  const sent = await fake(page, { 'billing-preview': () => ok({ lines: [], blocks: [], charges: [], subtotal: 0, taxTotal: 0, roundOff: 0, payable: 0 }) })
  await login(page, '&draft=d_empty')
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹0.00')
  await page.getByTestId('comp-reason').selectOption('guest left')
  await page.getByTestId('comp').click()
  await expect(page.getByTestId('bill-msg')).toHaveText('Nothing to comp')   // today: silence
  expect(sent['billing-issue']).toBeUndefined()
})

test('[known bug] QT-3 TD-070 PY decision 2026-09-15: after a lost answer, a new amount goes out with a new payment id', async ({ page }) => {
  test.fail()
  await fake(page, { 'payments-list': () => ok(billState()), 'payments-take': d => ok(takeRow(String(d.paymentId), Number(d.tendered))) })
  const ids: string[] = []
  let lost = true
  await page.route('**/payments-take', r => {
    ids.push((r.request().postDataJSON() as { data: { paymentId: string } }).data.paymentId)
    if (lost) { lost = false; return r.abort('failed') }    // the server may have recorded it; the till never heard
    return r.fallback()
  })
  await login(page, '&bill=b10')
  await page.getByTestId('tender-cash').click()
  await page.getByTestId('amount').fill('30')
  await page.getByTestId('take').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('No connection')
  await page.getByTestId('amount').fill('66')
  await page.getByTestId('take').click()
  await expect.poll(() => ids.length).toBe(2)
  expect(ids[1]).not.toBe(ids[0])                                   // today: the same id, so the server refuses every later take
})

test('[known bug] QT-5 TD-072 PY-S7: after "Nothing outstanding" the tender screen shows what the server holds', async ({ page }) => {
  test.fail()
  let paidElsewhere = false
  await fake(page, {
    'payments-list': () => ok(paidElsewhere ? billState({ paidTotal: 6600, outstanding: 0, status: 'paid' }) : billState()),
    // Another till settled it a moment ago.
    'payments-take': () => { paidElsewhere = true; return refuse(400, 'Nothing outstanding', { code: 'failed-precondition' }) },
  })
  await login(page, '&bill=b10')
  await page.getByTestId('tender-cash').click()
  await page.getByTestId('amount').fill('66')
  await page.getByTestId('take').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('Nothing outstanding')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')   // today: still "outstanding ₹66.00"
})

test('[known bug] QT-9 TD-072 PY-S12: a SERVER login is not offered Take or Refund', async ({ page }) => {
  test.fail()
  await fake(page, { 'payments-list': () => ok(billState()) }, 'SERVER')
  await login(page, '&bill=b10')
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹66.00')
  await expect(page.getByTestId('take')).toHaveCount(0)
  await expect(page.getByTestId('refund')).toHaveCount(0)
})

test('[known bug] QT-10 TD-072: a bill link that does not exist says so, and not "Loading bill…" forever', async ({ page }) => {
  test.fail()
  await fake(page, { 'payments-list': () => refuse(404, 'No bill issued for this table', { code: 'not-found' }) })
  await login(page, '&bill=no_such_bill')
  await expect(page.getByTestId('pay-msg')).toHaveText('No bill issued for this table')
  await expect(page.getByText('Loading bill…')).toHaveCount(0)
})
