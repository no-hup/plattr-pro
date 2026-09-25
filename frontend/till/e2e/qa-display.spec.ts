import { test, expect } from '@playwright/test'
import { fake, floorOf, login, ok, refuse, tile } from './fake'

// QA display findings (moonshot/reviews/2026-09-25-qa-till-floor.md QF-*, 2026-09-25-qa-bill-screen.md QB-*).
// Each fix here changes only words or looks, never what the till sends, so the backend is faked: every
// Cloud Function call is answered from a table (fake.ts). No emulator needed.

test('QF-12 FL-S1: tiles run 1, 2, 3 … 10, not 1, 10, 11, 2', async ({ page }) => {
  await fake(page, { 'floor-get': () => floorOf(['1', '10', '11', '12', '2', '3+9', '4'].map(l => tile(l))) })
  await login(page)
  await expect(page.getByTestId('tile-1')).toBeVisible()
  const order = await page.getByTestId('tiles').locator('> li').evaluateAll(li => li.map(e => e.getAttribute('data-testid')))
  expect(order).toEqual(['tile-1', 'tile-2', 'tile-3+9', 'tile-4', 'tile-10', 'tile-11', 'tile-12'])
})

test('QF-13 FL-S5: a seated table with nothing placed reads "seated" and ₹0.00', async ({ page }) => {
  await fake(page, { 'floor-get': () => floorOf([tile('1', { word: 'seated', minutes: 30 })]) })
  await login(page)
  await expect(page.getByTestId('tile-1')).toContainText('seated')
  await expect(page.getByTestId('tile-1')).toContainText('₹0.00')
})

test('QF-8 FL-S20: a billed table that ordered dessert reads "₹66.00 due · ₹60.00 new"', async ({ page }) => {
  await fake(page, { 'floor-get': () => floorOf([tile('10', { word: 'billed', unpaid: 6600, onTable: 6000, minutes: 40 })]) })
  await login(page)
  await expect(page.getByTestId('tile-10')).toContainText('₹66.00 due · ₹60.00 new')
})


test('QF-10 FL-S15: a floor gone stale is greyed, not just captioned', async ({ page }) => {
  let down = false
  await page.clock.install()
  await fake(page, { 'floor-get': () => (down ? refuse(503, 'No connection', {}) : floorOf([tile('3', { word: 'ordered', onTable: 5000, minutes: 5 })])) })
  await login(page)
  await expect(page.getByTestId('tile-3')).toBeVisible()
  const opacity = () => page.getByTestId('tiles').evaluate(u => Number(getComputedStyle(u).opacity))
  expect(await opacity()).toBe(1)
  down = true
  await page.clock.fastForward(25_000)
  await expect(page.getByTestId('floor-stale')).toBeVisible()
  expect(await opacity()).toBeLessThan(1)
})

test('QF-9 R13: picking shows which tiles are picked, and speaks in table numbers, never ids', async ({ page }) => {
  const sent = await fake(page, {
    'floor-get': () => floorOf([tile('6'), tile('7'), tile('8')]),
    'table-setMerge': () => ok({}),
  })
  await login(page)
  await page.getByTestId('start-merge').click()
  await page.getByTestId('tile-6').getByRole('button').first().click()
  await page.getByTestId('tile-7').getByRole('button').first().click()
  await expect(page.getByTestId('picking')).not.toContainText('tbl_')
  await expect(page.getByTestId('picking')).toContainText('keep 6')
  await expect(page.getByTestId('picking')).toContainText('join 7')
  const outline = (label: string) => page.getByTestId(`tile-${label}`).getByRole('button').first().evaluate(b => getComputedStyle(b).outlineStyle)
  expect(await outline('6')).not.toBe('none')
  expect(await outline('8')).toBe('none')
  await page.getByTestId('confirm-pick').click()
  await expect(page.getByTestId('floor-msg')).toHaveText('Merged into 6')
  // Display only: the act still goes out with document ids.
  expect(sent['table-setMerge'][0]).toEqual({ restaurantId: 'res_qa', staffSessionId: 'sess_qa', parentTableId: 'tbl_meg_6', childTableIds: ['tbl_meg_7'], merge: true, cid: expect.any(String) })
})
test('QF-15 FL-S21: the split chooser buttons can be told apart, and "1 item" is singular', async ({ page }) => {
  await fake(page, {
    'floor-get': () => floorOf([tile('11', { word: 'ordered', onTable: 12000, drafts: 2, minutes: 20 })]),
    'floor-open': () => ok({ tableIds: ['tbl_meg_11'], sessionId: 's11', drafts: [{ draftId: 'd1', onTable: 6000, lineIds: ['a'] }, { draftId: 'd2', onTable: 6000, lineIds: ['b'] }], bills: [] }),
  })
  await login(page)
  await page.getByTestId('tile-11').getByRole('button').first().click()
  const a = await page.getByTestId('pick-draft-d1').textContent()
  const b = await page.getByTestId('pick-draft-d2').textContent()
  expect(a).not.toBe(b)
  expect(a).not.toContain('1 items')
  expect(a).toContain('₹60.00 · 1 item')
})

test('QF-14: the PIN box says what the PIN is for in words, not a code word', async ({ page }) => {
  await fake(page, {
    'floor-get': () => floorOf([tile('4', { word: 'ordered', onTable: 23400, minutes: 50 })]),
    'floor-clear': () => refuse(400, 'this table still has money on it — bill it and settle it first', { code: 'failed-precondition', requires: 'pin', action: 'releaseUnpaid', owed: 23400 }),
  })
  page.on('dialog', d => d.accept())
  await login(page)
  await page.getByTestId('walkout-4').click()
  await expect(page.getByTestId('pin-hint')).toHaveText('Needed for freeing a table that still owes')
})

test('QB-15: after the PIN box is cancelled, the bar says "PIN required", not the box\'s last "Wrong PIN"', async ({ page }) => {
  const line = { lineId: 'l1', v: 0, name: 'Gulab jamun', qty: 1, listPrice: 6000, countsTowardTotal: true, billDiscount: 0, offer: null }
  await fake(page, {
    'billing-preview': () => ok({ lines: [line], blocks: [], charges: [], subtotal: 6000, taxTotal: 0, roundOff: 0, payable: 6000 }),
    'billing-issue': d => d.pin === undefined
      ? refuse(403, 'PIN required', { code: 'permission-denied', requires: 'pin', action: 'billDiscount', sev: 'P0' })
      : refuse(403, 'Wrong PIN', { code: 'permission-denied', requires: 'pin', wrong: true, attemptsLeft: 4, action: 'billDiscount', sev: 'P0' }),
  })
  await login(page, '&draft=d_qa')
  await expect(page.getByTestId('payable')).toHaveText('Payable ₹60.00')
  await page.getByTestId('comp-reason').selectOption('guest left')
  await page.getByTestId('comp').click()
  await page.getByTestId('pin-input').fill('9999')
  await page.getByTestId('pin-ok').click()
  await expect(page.getByTestId('pin-hint')).toHaveText('Wrong PIN, 4 left')
  await page.getByTestId('pin-cancel').click()
  await expect(page.getByTestId('bill-msg')).toHaveText('PIN required')
})
