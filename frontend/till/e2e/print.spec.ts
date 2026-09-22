import { test, expect, type Page } from '@playwright/test'
// KT in the browser: the till is not on the print path; it is where the cashier sees that paper did not come
// out (KT-S7, KT-S23) and forces a stale ticket through (Retry). Needs the emulator. Seeds print jobs through
// the Firestore REST API, so it does not depend on a printer, a tablet, or another spec.
//
// Sheet: moonshot/SPEC_KT_print_path.md v4. The words on the line are hand-written here.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm'
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
async function listIds(col: string): Promise<string[]> {
  const j = await (await fetch(`${FS}/${col}?pageSize=300`, { headers: H })).json() as { documents?: { name: string }[] }
  return (j.documents ?? []).map(d => d.name.split('/').pop() as string)
}

const job = (jobId: string, over: Record<string, unknown>) => ({
  jobId, cid: 'cid_ktui', kind: 'kot', stationId: 'kitchen', ticketNo: '7-1', tableLabel: 'UI7', part: 1, parts: 1,
  orderId: 'order_ktui', cartId: 'cart_ktui', billId: null, paymentId: null, lineIds: ['l1'], orderNumber: '7', cartIndex: 1,
  placedBy: 'guest', placedAt: 1, n: null, reason: null, by: null, state: 'queued', createdAt: Date.now(), queuedAt: Date.now(),
  claimedBy: null, claimedUntil: null, force: false, prints: [], failures: 0, lastError: null, ...over,
})

async function reset() {
  // The status line is one number for the whole restaurant, so every job another suite left behind is cleared.
  for (const id of await listIds('printJobs')) await del(`printJobs/${encodeURIComponent(id)}`)
  await seed('servers/manager_ktui', { name: 'Manager KTUI', role: 'MANAGER', status: 'active', email: 'manager@ktui.test', password: '1234', pinHash: PIN_1234 })
}
async function login(page: Page, email = 'manager@ktui.test') {
  await page.goto(`/?r=${RID}`)
  await page.getByTestId('email').fill(email)
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
  await expect(page.getByTestId('floor')).toBeVisible()
}

test.beforeEach(reset)

test('nothing stuck → no red line at all', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('floor')).toBeVisible()
  await expect(page.getByTestId('print-status')).toHaveCount(0)
})

test('KT-S7 the bar printer is off: one failed ticket → "BAR printer not answering — 1 ticket waiting"', async ({ page }) => {
  await seed('printJobs/kot:cart_ktui:bar', job('kot:cart_ktui:bar', { stationId: 'bar', queuedAt: Date.now() - 20_000, createdAt: Date.now() - 20_000, failures: 1, lastError: 'connect timeout', prints: [{ at: Date.now() - 10_000, by: 'tab_A' }] }))
  await login(page)
  await expect(page.getByTestId('print-line').first()).toHaveText('BAR printer not answering — 1 ticket waiting')
})

test('KT-S23 six tickets queued and no agent has ever claimed → "No print agent has claimed a job since HH:MM — 6 waiting"', async ({ page }) => {
  for (let i = 0; i < 6; i++) await seed(`printJobs/kot:cart_ktui_${i}:kitchen`, job(`kot:cart_ktui_${i}:kitchen`, { cartId: `cart_ktui_${i}`, queuedAt: Date.now() - 120_000, createdAt: Date.now() - 120_000 }))
  await login(page)
  await expect(page.getByTestId('print-line').first()).toHaveText(/^No print agent has claimed a job since \d\d:\d\d — 6 waiting$/)
})

test('a ticket older than 30 minutes is "not auto-printed"; Retry with its job id forces it and the line clears', async ({ page }) => {
  await seed('printJobs/kot:cart_ktui_old:kitchen', job('kot:cart_ktui_old:kitchen', { cartId: 'cart_ktui_old', queuedAt: Date.now() - 2 * 3600_000, createdAt: Date.now() - 2 * 3600_000 }))
  await login(page)
  await expect(page.getByTestId('print-line').first()).toHaveText('KITCHEN: 1 not auto-printed')
  await page.getByTestId('retry-job').fill('kot:cart_ktui_old:kitchen')
  await page.getByTestId('retry').click()
  await expect(page.getByTestId('print-msg')).toHaveText('Queued kot:cart_ktui_old:kitchen')
  // Forced, it is waiting again (offered to the agent), so the line becomes a waiting line, not a stale count.
  await expect(page.getByTestId('print-line').first()).toHaveText(/waiting$/)
})

test('a SERVER sees the line but gets no Retry button', async ({ page }) => {
  await seed('servers/server_ktui', { name: 'Server KTUI', role: 'SERVER', status: 'active', email: 'server@ktui.test', password: '1234', pinHash: PIN_1234 })
  await seed('printJobs/kot:cart_ktui_old:kitchen', job('kot:cart_ktui_old:kitchen', { cartId: 'cart_ktui_old', queuedAt: Date.now() - 2 * 3600_000, createdAt: Date.now() - 2 * 3600_000 }))
  await login(page, 'server@ktui.test')
  await expect(page.getByTestId('print-line').first()).toHaveText('KITCHEN: 1 not auto-printed')
  await expect(page.getByTestId('retry')).toHaveCount(0)
})
