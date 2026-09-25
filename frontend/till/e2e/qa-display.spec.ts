import { test, expect, type Page } from '@playwright/test'

// QA display findings (moonshot/reviews/2026-09-25-qa-till-floor.md QF-*, 2026-09-25-qa-bill-screen.md QB-*).
// Each fix here changes only words or looks, never what the till sends, so the backend is faked: every
// Cloud Function call is answered from the table below. No emulator needed.

type Reply = { status?: number; body: unknown }
type Handler = (data: Record<string, unknown>) => Reply
const ok = (data: unknown): Reply => ({ body: { result: { data } } })
const refuse = (status: number, message: string, data: Record<string, unknown>): Reply =>
  ({ status, body: { error: { message, status: 'ERR', details: { data } } } })

const tile = (label: string, extra: Record<string, unknown> = {}) =>
  ({ tableIds: [`tbl_meg_${label}`], label, word: 'free', onTable: 0, unpaid: 0, drafts: 0, minutes: 0, ...extra })
const floorOf = (tiles: unknown[]) => ok({ tiles, config: { pollSeconds: 5, staleAfterSeconds: 20, settledFreeAfterMinutes: 30, takeawayTableIds: [] }, at: 0 })

/** Fakes every function; returns the bodies each endpoint was sent, so a test can check the request did not change. */
async function fake(page: Page, handlers: Record<string, Handler>) {
  const sent: Record<string, Record<string, unknown>[]> = {}
  const all: Record<string, Handler> = {
    'server-serverLogin': () => ok({ sessionId: 'sess_qa', name: 'Till', role: 'MANAGER' }),
    'approvals-config': () => ok({ reasons: ['guest left', 'complaint'] }),
    'print-status': () => ok({ stations: {}, waiting: 0, notAutoPrinted: 0, lastClaimAt: null, silentSeconds: null, at: 0 }),
    ...handlers,
  }
  await page.route(/\/us-central1\/[\w-]+$/, route => {
    const name = route.request().url().split('/').pop()!
    const data = (route.request().postDataJSON() as { data: Record<string, unknown> }).data
    ;(sent[name] ??= []).push(data)
    const r = (all[name] ?? (() => ok({})))(data)
    return route.fulfill({ status: r.status ?? 200, contentType: 'application/json', body: JSON.stringify(r.body) })
  })
  return sent
}

async function login(page: Page, query = '') {
  await page.goto(`/?r=res_qa${query}`)
  await page.getByTestId('email').fill('till@qa.test')
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
}


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

