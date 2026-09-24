import { test, expect, type Page } from '@playwright/test'
// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared, so a
// spec that seeds only a plaintext password logs in fine and then fails at the PIN box.
// This is the seed's own constant hash of 1234, the same one MockData7 carries.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm'

// FL in the browser. Needs the emulator. Seeds its own tables, sessions, lines and bills through
// the Firestore REST API, so it does not depend on another spec having run.
//
// Sheet: moonshot/SPEC_FL_floor_and_moves.md. The screen's job is a picture that is never trusted
// (R1): the poll paints, the tap re-reads. Money is integer minor units on the wire.
//
// Hand-computed: table 12 reads ₹1,470.00 (tikka 32000 + pitcher 125000 less 10000; the voided
// 45000 biryani is not in it). Table 7 reads ₹600.00 due (bill 100000, 40000 taken).
const RID = 'res_e2e_all_on'
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}/v1/projects/rms-app-dd875/databases/(default)/documents/restaurants/${RID}`
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }

function enc(v: unknown): object {
  if (v === null) return { nullValue: null }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
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

const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] }
const line = (lineId: string, name: string, list: number, sessionId: string, extra: Record<string, unknown> = {}) => ({
  lineId, cid: 'cid_flui', orderId: 'order_flui', cartId: 'cart_flui', cartItemId: lineId,
  tableId: 'tbl_ui_12', sessionId, placedAt: 1, placedBy: 'guest',
  menuItemId: 'mi_' + lineId, name, qty: 1, listPrice: list, sent: true, v: 0,
  countsTowardTotal: true, draftId: sessionId, billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name, unitListPrice: list, taxBlockId: 'food', taxCode: '9963' }],
  taxBlocks: { food: FOOD }, offer: null, ...extra,
})

const TABLES = ['tbl_ui_12', 'tbl_ui_7', 'tbl_ui_5', 'tbl_ui_6', 'tbl_ui_19', 'tbl_ui_4', 'tbl_ui_9', 'tbl_ui_p1']
const LINES = ['flui_tikka', 'flui_pitcher', 'flui_biryani', 'flui_7', 'flui_4', 'flui_split_a', 'flui_split_b', 'flui_p1']
const SESSIONS = ['sess_ui_12', 'sess_ui_7', 'sess_ui_4', 'sess_ui_p1']

async function reset() {
  for (const t of TABLES) await del(`tables/${t}`)
  for (const l of LINES) await del(`lines/${l}`)
  for (const s of SESSIONS) await del(`sessions/${s}`)
  await del('bills/flui_0701')

  const hourAgo = new Date(Date.now() - 3600_000)
  const sitting = (tableId: string) => ({ tableId, status: 'active', users: ['g1'], primaryUserId: 'g1', createdAt: hourAgo, updatedAt: hourAgo, expiresAt: new Date(Date.now() + 3600_000) })

  await seed('tables/tbl_ui_12', { number: '12', capacity: 4, status: 'active' })
  await seed('tables/tbl_ui_7', { number: '7', capacity: 2, status: 'active' })
  await seed('tables/tbl_ui_5', { number: '5', capacity: 4, status: 'vacant' })
  await seed('tables/tbl_ui_6', { number: '6', capacity: 4, status: 'vacant' })
  await seed('tables/tbl_ui_19', { number: '19', capacity: 2, status: 'vacant' })
  await seed('tables/tbl_ui_4', { number: '4', capacity: 4, status: 'active' })
  await seed('tables/tbl_ui_9', { number: '9', capacity: 4, status: 'vacant' })
  // BT / OR-3: a counter ticket is a table doc named in ordering.takeawayTableIds; the floor draws it in the Parcels strip.
  await seed('tables/tbl_ui_p1', { number: 'PC1', capacity: 0, status: 'active', charges: ['PACKING'] })   // not 'P1': the shared seed already has a table numbered P1

  await seed('sessions/sess_ui_12', sitting('tbl_ui_12'))
  await seed('sessions/sess_ui_7', sitting('tbl_ui_7'))
  await seed('sessions/sess_ui_4', sitting('tbl_ui_4'))
  await seed('sessions/sess_ui_p1', sitting('tbl_ui_p1'))

  await seed('lines/flui_tikka', line('flui_tikka', 'Paneer Tikka', 32000, 'sess_ui_12'))
  await seed('lines/flui_pitcher', line('flui_pitcher', 'Pitcher', 125000, 'sess_ui_12', { offer: { id: 'hh', name: 'Happy Hour', amount: 10000 } }))
  await seed('lines/flui_biryani', line('flui_biryani', 'Biryani', 45000, 'sess_ui_12', { countsTowardTotal: false, void: { reason: 'sent back', note: '', approverId: 'm' } }))
  await seed('lines/flui_7', line('flui_7', 'Dosa', 100000, 'sess_ui_7', { tableId: 'tbl_ui_7', billId: 'flui_0701' }))
  await seed('lines/flui_4', line('flui_4', 'Biryani', 168000, 'sess_ui_4', { tableId: 'tbl_ui_4' }))
  await seed('lines/flui_p1', line('flui_p1', 'Masala Dosa', 18000, 'sess_ui_p1', { tableId: 'tbl_ui_p1' }))
  await seed('bills/flui_0701', { billId: 'flui_0701', sittingId: 'sess_ui_7', payable: 100000, paidTotal: 40000, status: 'issued', cid: 'cid_flui7', number: 'flui_0701', tableIds: ['tbl_ui_7'] })

  // The screen's own clock, turned down so the grey arrives inside a test's patience rather than
  // after the twenty seconds a real Friday would want.
  const settings = await (await fetch(`${FS}/config/settings`, { headers: H })).json().catch(() => ({}))
  await seed('config/settings', { ...(settings?.fields ? {} : {}), floor: { pollSeconds: 1, staleAfterSeconds: 2, settledFreeAfterMinutes: 30 }, ordering: { takeawayTableIds: ['tbl_ui_p1'] } })

  await seed('servers/mgr_flui', { name: 'Manager UI', role: 'MANAGER', status: 'active', email: 'manager@flui.test', password: '1234', pinHash: PIN_1234 })
  await seed('servers/srv_flui', { name: 'Server UI', role: 'SERVER', status: 'active', email: 'server@flui.test', password: '1234', pinHash: PIN_1234 })
}

async function login(page: Page, email = 'manager@flui.test') {
  await page.goto(`/?r=${RID}`)
  await page.getByTestId('email').fill(email)
  await page.getByTestId('password').fill('1234')
  await page.getByTestId('login').click()
  await expect(page.getByTestId('floor')).toBeVisible()
}

test.beforeEach(reset)

test.describe('the floor is the home screen', () => {
  test('FL-S1 logging in with no other URL param lands on the floor, not a blank page', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('tiles')).toBeVisible()
  })

  test('FL-S19 table 12 reads ₹1,470.00 — the voided ₹450 biryani is not in it, and neither is service charge', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('on-12')).toHaveText(/₹1,?470\.00/)
    await expect(page.getByTestId('tile-12')).toHaveAttribute('data-word', 'ordered')
  })

  test('FL-S22 a part-paid table reads ₹600.00 due, and the word "paid" appears nowhere on it', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('due-7')).toHaveText(/₹600\.00 due/)
    await expect(page.getByTestId('tile-7')).not.toContainText('paid')
  })

  test('BT parcel: the counter ticket PC1 with ₹180.00 on it sits in the Parcels strip, not among the tables', async ({ page }) => {
    await login(page)
    const strip = page.getByTestId('parcels')
    await expect(strip).toBeVisible()
    await expect(strip.getByTestId('tile-PC1')).toBeVisible()
    await expect(strip.getByTestId('on-PC1')).toHaveText(/₹180\.00/)
    await expect(page.getByTestId('tiles').getByTestId('tile-PC1')).toHaveCount(0)
  })

  test('FL-S1 an empty table reads free with no money on it', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('tile-19')).toContainText('free')
    await expect(page.getByTestId('on-19')).toHaveCount(0)
  })

  test('FL-S20 a table billed AND still ordering shows both numbers, not one word (R11)', async ({ page }) => {
    await seed('lines/flui_jamun', line('flui_jamun', 'Gulab Jamun', 30000, 'sess_ui_7', { tableId: 'tbl_ui_7' }))
    await login(page)
    await expect(page.getByTestId('due-7')).toHaveText(/₹600\.00 due/)
    await expect(page.getByTestId('on-7')).toHaveText(/₹300\.00/)
    await del('lines/flui_jamun')
  })
})

test.describe('the tap is a read of the truth (R1)', () => {
  test('FL-S2 tapping table 12 lands on its draft; no table number is typed', async ({ page }) => {
    await login(page)
    await page.getByTestId('tile-12').getByRole('button').first().click()
    await page.waitForURL(/draft=sess_ui_12/)
  })

  test('FL-S3 tapping table 7, whose bill is printed, lands on tender and not a second draft', async ({ page }) => {
    await login(page)
    await page.getByTestId('tile-7').getByRole('button').first().click()
    await page.waitForURL(/bill=flui_0701/)
  })

  test('FL-S4 tapping an empty table says nothing is open there, and does not navigate', async ({ page }) => {
    await login(page)
    await page.getByTestId('tile-19').getByRole('button').first().click()
    await expect(page.getByTestId('floor-msg')).toContainText('Nothing open at 19')
    expect(page.url()).not.toContain('draft=')
  })

  test('FL-S21 a sitting with two drafts lists both and waits; it never picks one', async ({ page }) => {
    await seed('lines/flui_split_a', line('flui_split_a', 'Half A', 100000, 'sess_ui_4', { tableId: 'tbl_ui_4', draftId: 'draft_ui_a' }))
    await seed('lines/flui_split_b', line('flui_split_b', 'Half B', 100000, 'sess_ui_4', { tableId: 'tbl_ui_4', draftId: 'draft_ui_b' }))
    await login(page)
    await expect(page.getByTestId('drafts-4')).toContainText('3 drafts')
    await page.getByTestId('tile-4').getByRole('button').first().click()
    await expect(page.getByTestId('floor-picker')).toBeVisible()
    await expect(page.getByTestId('pick-draft-draft_ui_a')).toBeVisible()
    await expect(page.getByTestId('pick-draft-draft_ui_b')).toBeVisible()
    expect(page.url()).not.toContain('draft=')
  })
})

test.describe('picking mode — merge and move (R13, R16)', () => {
  test('FL-S23 with Merge armed, tapping a tile selects it instead of opening its money', async ({ page }) => {
    await login(page)
    await page.getByTestId('start-merge').click()
    await page.getByTestId('tile-12').getByRole('button').first().click()
    await expect(page.getByTestId('tile-12')).toHaveAttribute('data-picked', 'true')
    expect(page.url()).not.toContain('draft=')
  })

  test('FL-S23 Cancel restores tap-to-bill on the very next tap', async ({ page }) => {
    await login(page)
    await page.getByTestId('start-merge').click()
    await page.getByTestId('cancel-pick').click()
    await page.getByTestId('tile-12').getByRole('button').first().click()
    await page.waitForURL(/draft=sess_ui_12/)
  })

  test('FL-S7 Merge → pick 5 → pick 6 → Confirm turns two tiles into one reading 5+6', async ({ page }) => {
    await login(page)
    await page.getByTestId('start-merge').click()
    await page.getByTestId('tile-5').getByRole('button').first().click()
    await page.getByTestId('tile-6').getByRole('button').first().click()
    await page.getByTestId('confirm-pick').click()
    await expect(page.getByTestId('tile-5+6')).toBeVisible()
    await expect(page.getByTestId('tile-6')).toHaveCount(0)
  })

  test('FL-S9 merging a table that has its own party is refused, in words, on screen', async ({ page }) => {
    await login(page)
    await page.getByTestId('start-merge').click()
    await page.getByTestId('tile-5').getByRole('button').first().click()
    await page.getByTestId('tile-12').getByRole('button').first().click()
    await page.getByTestId('confirm-pick').click()
    // The refusal names the table the cashier is looking at, and says what is wrong with it.
    await expect(page.getByTestId('floor-msg')).toContainText(/table 12 has a party at it/i)
  })

  test('FL-S8 Unmerge appears on the group tile and releases it when nothing is owed', async ({ page }) => {
    await login(page)
    await page.getByTestId('start-merge').click()
    await page.getByTestId('tile-5').getByRole('button').first().click()
    await page.getByTestId('tile-6').getByRole('button').first().click()
    await page.getByTestId('confirm-pick').click()
    await page.getByTestId('unmerge-5+6').click()
    await expect(page.getByTestId('tile-5')).toBeVisible()
    await expect(page.getByTestId('tile-6')).toBeVisible()
  })

  test('FL-S10 Move → pick 4 → pick 9 carries the money to 9 and leaves 4 free', async ({ page }) => {
    await login(page)
    await page.getByTestId('start-move').click()
    await page.getByTestId('tile-4').getByRole('button').first().click()
    await page.getByTestId('tile-9').getByRole('button').first().click()
    await page.getByTestId('confirm-pick').click()
    await expect(page.getByTestId('on-9')).toHaveText(/₹1,?680\.00/)
    await expect(page.getByTestId('tile-4')).toContainText('free')
  })

  test('FL-S11 moving onto a table that has a party is refused, and says so', async ({ page }) => {
    await login(page)
    await page.getByTestId('start-move').click()
    await page.getByTestId('tile-4').getByRole('button').first().click()
    await page.getByTestId('tile-12').getByRole('button').first().click()
    await page.getByTestId('confirm-pick').click()
    await expect(page.getByTestId('floor-msg')).toContainText(/party at it/i)
  })

  test('FL-S24 moving a party whose bill is printed is refused, and the reason names the bill', async ({ page }) => {
    await login(page)
    await page.getByTestId('start-move').click()
    await page.getByTestId('tile-7').getByRole('button').first().click()
    await page.getByTestId('tile-9').getByRole('button').first().click()
    await page.getByTestId('confirm-pick').click()
    await expect(page.getByTestId('floor-msg')).toContainText(/printed bill/i)
  })
})

test.describe('who may act (R16)', () => {
  test('FL-S29 a SERVER login sees no Merge or Move control at all', async ({ page }) => {
    await login(page, 'server@flui.test')
    await expect(page.getByTestId('tiles')).toBeVisible()
    await expect(page.getByTestId('start-merge')).toHaveCount(0)
    await expect(page.getByTestId('start-move')).toHaveCount(0)
  })

  test('FL-S29 a MANAGER login sees both', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('start-merge')).toBeVisible()
    await expect(page.getByTestId('start-move')).toBeVisible()
  })
})

test.describe('FL-Q1 a settled table, and Clear', () => {
  test('a settled table reads settled and offers Clear; Clear frees it', async ({ page }) => {
    await seed('bills/flui_0701', { billId: 'flui_0701', sittingId: 'sess_ui_7', payable: 100000, paidTotal: 100000, status: 'paid', cid: 'cid_flui7', number: 'flui_0701', tableIds: ['tbl_ui_7'] })
    await login(page)
    await expect(page.getByTestId('settled-7')).toBeVisible()
    await page.getByTestId('clear-7').click()
    await expect(page.getByTestId('tile-7')).toContainText('free')
  })

  test('a table that still owes offers no Clear, so money cannot be hidden by a tap', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('clear-7')).toHaveCount(0)
  })
})

test.describe('when the answer is old (R15, R19)', () => {
  test('FL-S15 with the network down the floor keeps its last answer, greys, and says since when', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('on-12')).toBeVisible()
    await page.route('**/floor-get', route => route.abort())
    await expect(page.getByTestId('floor-stale')).toBeVisible()
    await expect(page.getByTestId('on-12')).toBeVisible()        // still painted, not blanked
    await expect(page.getByTestId('tiles')).toHaveClass(/stale/)
  })

  test('FL-S15 merge and move are refused while the answer is stale', async ({ page }) => {
    await login(page)
    await page.route('**/floor-get', route => route.abort())
    await expect(page.getByTestId('floor-stale')).toBeVisible()
    await expect(page.getByTestId('start-merge')).toBeDisabled()
    await expect(page.getByTestId('start-move')).toBeDisabled()
  })
})
