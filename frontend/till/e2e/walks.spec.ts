import { test, expect, type Page } from '@playwright/test'
// The QA driver's own seed module (AGENT_QA.md §5), shared on purpose: a state added for a run is there for every test.
import { setState, resetTable, list } from '../../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs'

// Cashier walks on REAL writers (TESTING.md "Seams are tested from the real writer"): every state comes from
// floorstate.mjs, which produces it through guest OTP → cart → checkout → billing-issue → payments-take, at
// MockData7's Meghana, the restaurant and menu the QA runs used. Each test owns its tables and resets them first.
//
// Hand-computed at Meghana (5 % service charge, GST 2.5 + 2.5 % exclusive, bills round to the rupee):
//   Butter Naan 6000 + SC 300 = 6300, tax 2 × 157.5 = 315 → 6615 → bill ₹66.00.  Without the SC: 6000 + 300 tax = ₹63.00.
// Open findings are marked known bug (TESTING.md): Playwright test.fail(), "[known bug]" and the ids in the title.

const RID = 'res_meghana'
const TABLES = ['3', '8', '10', '11', '12']

test.beforeEach(async () => { for (const n of TABLES) await resetTable(n) })

async function login(page: Page) {
  await page.getByTestId('email').fill('till@meg.test')
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
}
const open = async (page: Page, query = '') => { await page.goto(`/?r=${RID}${query}`); await login(page) }
// DEBT(TD-052): the till forgets its login on every page load, so a walk logs in again after each tap that
// navigates. When TD-052 is fixed the login form is gone and this fails: delete it and its callers then.
const loginAgain = login
const tap = (page: Page, label: string) => page.getByTestId(`tile-${label}`).getByRole('button').first().click()
const pin = async (page: Page) => { await page.getByTestId('pin-input').fill('1234'); await page.getByTestId('pin-ok').click() }
const billOf = async (billId: string) => (await list('bills')).find((b: { id: string }) => b.id === billId)

test('[known bug] TD-052 one login carries the cashier from the floor to the bill and back', async ({ page }) => {
  test.fail()
  await setState('10', 'ordered')
  await open(page)
  await tap(page, '10')
  await expect(page.getByTestId('bill')).toBeVisible()      // today: the login form, again
  await page.getByTestId('issue').click()
  await page.goBack()
  await expect(page.getByTestId('due-10')).toHaveText(/₹66\.00 due/)
})

test('walk: table 10 orders a ₹60 naan, is billed ₹66.00, pays ₹30 then ₹50 cash with ₹14 change, and is cleared', async ({ page }) => {
  await setState('10', 'ordered')
  await open(page)
  await expect(page.getByTestId('on-10')).toHaveText(/₹60\.00/)
  await tap(page, '10')
  await loginAgain(page)
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹66.00')
  await page.getByTestId('issue').click()
  await expect(page.getByTestId('bill-number')).toBeVisible()
  const billId = (await list('bills')).find((b: { tableIds?: string[] }) => b.tableIds?.includes('tbl_meg_10')).id
  expect(await billOf(billId)).toMatchObject({ status: 'issued', payable: 6600 })

  await page.goBack()
  await loginAgain(page)
  await expect(page.getByTestId('due-10')).toHaveText(/₹66\.00 due/)
  await tap(page, '10')
  await loginAgain(page)
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹66.00')
  await page.getByTestId('tender-cash').click()
  await page.getByTestId('amount').fill('30')
  await page.getByTestId('take').click()
  await expect(page.getByTestId('outstanding')).toHaveText('outstanding ₹36.00')
  await page.getByTestId('amount').fill('50')
  await expect(page.getByTestId('change')).toHaveText(/change ₹14\.00/)
  await page.getByTestId('take').click()
  await expect(page.getByTestId('pay-msg')).toHaveText('Change ₹14.00')
  await expect(page.getByTestId('outstanding')).toHaveText('settled')
  expect(await billOf(billId)).toMatchObject({ status: 'paid', paidTotal: 6600 })

  await page.goBack()
  await loginAgain(page)
  await expect(page.getByTestId('settled-10')).toBeVisible()
  await page.getByTestId('clear-10').click()
  await expect(page.getByTestId('tile-10')).toContainText('free')
})

test('[known bug] QB-3 TD-065 the dessert ordered after the bill can be billed from the till', async ({ page }) => {
  test.fail()
  const { guest } = await setState('10', 'dessert')
  await open(page)
  await expect(page.getByTestId('tile-10')).toContainText('₹66.00 due · ₹60.00 new')
  await tap(page, '10')
  await page.getByTestId(`pick-draft-${guest}`).click()
  await loginAgain(page)
  await page.getByTestId('issue').click()
  await expect(page.getByTestId('bill-number')).toBeVisible()   // today: "already issued <id>"
})

test('[known bug] QF-11 TD-072 FL-S27: unmerging a billed group says settle it, and does not point at a Move that is refused too', async ({ page }) => {
  test.fail()
  await setState('12', 'billed')
  await open(page)
  await page.getByTestId('start-merge').click()
  await tap(page, '12')
  await tap(page, '11')
  await page.getByTestId('confirm-pick').click()
  await expect(page.getByTestId('floor-msg')).toHaveText('Merged into 12')
  await page.getByTestId('unmerge-12+11').click()
  await expect(page.getByTestId('floor-msg')).toContainText('settle')
  await expect(page.getByTestId('floor-msg')).not.toContainText('move')   // today: "settle it or move it first"
})

test('[known bug] QB-8 TD-072 an issued draft opened again is not a live ₹0.00 draft with Generate on it', async ({ page }) => {
  test.fail()
  const { guest } = await setState('8', 'ordered')
  await open(page, `&draft=${guest}`)
  await page.getByTestId('issue').click()
  await expect(page.getByTestId('bill-number')).toBeVisible()
  await page.reload()
  await loginAgain(page)
  await expect(page.getByTestId('bill-number')).toBeVisible()  // today: "Table bill draft", Payable ₹0.00, Generate live
  await expect(page.getByTestId('issue')).toHaveCount(0)
})

test('[known bug] QB-10 TD-072 BL-S9: a service charge removed before a cancel stays removed after a reload', async ({ page }) => {
  test.fail()
  const { guest } = await setState('3', 'ordered')
  await open(page, `&draft=${guest}`)
  await page.getByTestId('toggle-charge').click()
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹63.00')
  await page.getByTestId('issue').click()
  await expect(page.getByTestId('bill-number')).toBeVisible()
  await page.getByTestId('cancel-reason').selectOption('other')
  await page.getByTestId('cancel').click()
  await pin(page)
  await expect(page.getByTestId('bill-number')).toContainText('cancelled')
  await page.reload()
  await loginAgain(page)
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹63.00')   // today: ₹66.00, the charge is back
})

test('[known bug] QB-11 TD-072 the order offer is named on the bill: "₹100 Off (min ₹499)"', async ({ page }) => {
  test.fail()
  const { guest } = await setState('12', 'offer')
  await open(page, `&draft=${guest}`)
  await expect(page.getByTestId('payable')).toBeVisible()
  await expect(page.getByTestId('bill')).toContainText('₹100 Off (min ₹499)')
})

test('[known bug] QT-4 TD-070 PY-S9: the cashier refunds credit note CN-… by the number printed on it', async ({ page }) => {
  test.fail()
  const { bill, note } = await setState('3', 'credited')
  await open(page, `&bill=${bill.billId}`)
  await page.getByTestId('refund-note').fill(`${note.series}-${note.number}`)
  await page.getByTestId('refund-amount').fill('63')
  await page.getByTestId('refund-tender').selectOption('cash')
  await page.getByTestId('refund-reason').selectOption('complaint')
  await page.getByTestId('refund').click()
  await expect(page.getByTestId('pin-input')).toBeVisible()      // today: "No such credit note", no PIN box
  await pin(page)
  await expect(page.getByTestId('pay-msg')).toHaveText('Refunded')
})
