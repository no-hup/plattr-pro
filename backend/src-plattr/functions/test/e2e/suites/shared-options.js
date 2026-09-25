/**
 * Suite: shared-options. D6 (Shaurya 2026-09-25, moonshot/reviews/2026-09-25-decisions-for-shaurya.md): add-ons
 * and portions are shared records (`restaurants/{id}/addons`, `/variants`) that dishes link to by id, and cart
 * pricing reads the shared record. An admin edit changes the shared record, so every linked dish follows; "only
 * this dish" copies the record and relinks that dish. Findings: TD-106 (dish save breaks add-ons), TD-107 (editor
 * edits change nothing a guest pays), QA-1/QA-2 in moonshot/reviews/2026-09-25-qa-admin-guest-api-pass.md.
 *
 * Real writers only: the admin/waiter endpoints make every change, the guest endpoints read and buy.
 * Own state: wipes res_meghana's sittings/orders/lines/bills/carts/audit and re-imports MockData7 on top, at
 * the start and again at the end (the menu edits must not leak into goalline or qa-findings). Tables 2, 3, 8, 9, 10, 11, 12.
 *
 * Hand-computed at Meghana (food × 1.05 service × 1.05 GST, rupee-rounded; ₹100 off an order ≥ ₹499 beats
 * 10 % off biryani up to ₹120 whenever the 10 % is under ₹100):
 *   Chicken Dum Biryani ₹320 + Family ₹280 = ₹600 − ₹100 = ₹500 × 1.1025 = ₹551.25 → ₹551 (today ₹529: 480 × 1.1025)
 *   Mutton Biryani ₹420 at 10 % = ₹378 + Family ₹300 at the dish's 10 % = ₹270 → ₹648 − ₹100 = ₹548 → ₹604.17 → ₹604
 *   Veg Biryani ₹260 + Extra Raita ₹40 = a ₹300 line (30000 paise); after Raita → ₹50 a fresh add is ₹310
 *   Chicken Dum Biryani Single ₹320 + a new "Mirchi ka Salan" ₹30 = a ₹350 line
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../lib/config.js';
import { call, fsFor, ok } from '../lib/rest.mjs';

const RID = 'res_meghana';
const T = n => `tbl_meg_${n}`;
const CHICKEN = 'mi_chicken_bir', MUTTON = 'mi_mutton_bir', VEG = 'mi_veg_bir';
const PORTION = 'mv_bir_portion', RAITA = 'ma_extra_raita';
const { getDoc, patchDoc, listCol, delDoc } = fsFor(RID);
const __dirname = dirname(fileURLToPath(import.meta.url));
const need = (r, what) => { if (!ok(r)) throw new Error(`${what}: ${r?.message || JSON.stringify(r).slice(0, 200)}`); return r.data ?? r; };

async function wipeAndImport() {
  for (const col of ['sessions', 'lines', 'bills', 'orders', 'carts', 'payments', 'audit']) {
    for (let docs = await listCol(col, 300); docs.length; docs = await listCol(col, 300)) for (const d of docs) await delDoc(`${col}/${d.id}`);
  }
  execSync(`node "${resolve(__dirname, '../../../mock/importMockData5.js')}" --file=mock/MockData7ProductionMenus.json --refresh-timestamps`, {
    cwd: resolve(__dirname, '../../..'), env: { ...process.env, FIRESTORE_EMULATOR_HOST: config.FIRESTORE_HOST }, stdio: 'ignore', timeout: 60000,
  });
}

const login = async who => need(await call('server-serverLogin', { restaurantId: RID, username: `${who}@meg.test`, password: '1234' }), `${who} login`).sessionId;
const seat = async n => {
  await patchDoc(`tables/${T(n)}`, { currentOTP: { code: '123456', createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  return need(await call('table-validateOTP', { restaurantId: RID, tableId: T(n), otp: '123456', phoneNumber: '9876543210', name: `D6 ${n}` }), `seat ${n}`).sessionId;
};
const add = (n, guest, menuItemId, selectedVariants, selectedAddons) =>
  call('cart-addItemToCart', { restaurantId: RID, tableId: T(n), sessionId: guest, menuItemId, quantity: 1, selectedVariants, selectedAddons });
const lineOf = (r, menuItemId) => (r?.data?.cart?.items || []).filter(i => i.menuItemId === menuItemId).pop();
// menu-getRestaurantMenu (admin + waiter) and menu-fetchMenu-fetchMenu (guest, in stock only) both group dishes by
// subcategory; a dish is cross-listed, so the first hit is enough. The guest read answers unwrapped.
const dishIn = (read, id) => Object.values(read?.data?.menuItems || read?.menuItems || {}).flat().find(i => (i.menuItemId || i.id) === id);
const guestMenu = async () => call('menu-fetchMenu-fetchMenu', { restaurantId: RID, inStock: true });
const staffMenu = async () => call('menu-getRestaurantMenu', { restaurantId: RID });
const familyOf = dish => (dish?.variants || []).flatMap(v => v.options || []).find(o => o.id === 'family')?.priceInfo?.basePrice;
const shared = (sessionId, body) => call('admin-sharedOption', { restaurantId: RID, sessionId, ...body });
// menu-updateMenuItemAvailability is onRequest: the body is the payload itself, not { data }.
const stock = async (sessionId, body) => (await fetch(`${config.BASE_URL}/menu-updateMenuItemAvailability`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId: RID, sessionId, ...body }),
})).json();
const saveDish = (sessionId, menuItemId, updateData) => call('menu-updateMenuItem', { restaurantId: RID, sessionId, menuItemId, updateData });

export default async function sharedOptionsSuite() {
  const results = { name: 'shared-options', pass: 0, fail: 0, tests: [] };
  const check = (label, cond, actual, knownBug) => {
    results.tests.push({ pass: Boolean(cond), message: `${knownBug ? `[known bug] ${knownBug} ` : ''}${label} → ${cond ? 'ok' : 'FAILED'}`, actual: cond ? undefined : actual, knownBug });
    cond ? results.pass++ : results.fail++;
  };
  const scene = async (label, fn) => { try { await fn(); } catch (e) { check(`${label}: setup failed — ${e.message}`, false); } };
  const made = [];   // records this suite creates; the re-import merges, so they are deleted by hand at the end

  await wipeAndImport();
  const manager = await login('manager');
  const waiter = await login('server');
  const till = await login('till');

  // ── Characterization: what the menu reads and the cart charge today, before any edit ──────────────────────
  await scene('C', async () => {
    const chicken = dishIn(await staffMenu(), CHICKEN);
    check('C1 the staff menu builds Chicken Biryani from the shared records: 3 add-ons, Family +₹260',
      chicken?.addons?.length === 3 && familyOf(chicken) === 260, chicken && { addons: chicken.addons.map(a => a.id), family: familyOf(chicken) });
    const kitchen = await login('kitchen');
    await stock(kitchen, { menuItemId: 'mi_prawn_fry', isAvailable: false });
    need(await saveDish(manager, 'mi_prawn_fry', { meta: { name: 'Prawn Ghee Roast', description: 'Mangalorean ghee roast' } }), 'meta-only save');
    const prawn = await getDoc('menuItems/mi_prawn_fry');
    check('C2 TD-110: a dish save that does not send isInStock leaves the kitchen\'s sold-out as it is', prawn?.isInStock === false, prawn?.isInStock);
    await stock(kitchen, { menuItemId: 'mi_prawn_fry', isAvailable: true });
  });

  // ── TD-106 · the dish save must keep add-ons as ids ──────────────────────────────────────────────────────
  await scene('TD-106 description-only save', async () => {
    need(await saveDish(manager, CHICKEN, { meta: { name: 'Chicken Dum Biryani', description: 'Signature dum biryani, now with a typo fixed' } }), 'save');
    const doc = await getDoc(`menuItems/${CHICKEN}`);
    check('C3 a description-only save keeps the three add-on ids and isCustomizable',
      JSON.stringify(doc?.addons) === JSON.stringify([RAITA, 'ma_extra_egg', 'ma_extra_gravy']) && doc?.isCustomizable === true,
      { addons: doc?.addons, isCustomizable: doc?.isCustomizable });
    // The trap under "save only what changed": the flag is computed from the request alone.
    need(await saveDish(manager, VEG, { addons: [] }), 'unlink all add-ons');
    const veg = await getDoc(`menuItems/${VEG}`);
    check('TD-106: taking every add-on off Veg Biryani keeps it customisable, its Portion is still there',
      veg?.isCustomizable === true && veg?.variants?.length === 1, { isCustomizable: veg?.isCustomizable, variants: veg?.variants });
    need(await saveDish(manager, VEG, { addons: [RAITA, 'ma_oos_prawn'] }), 'relink Veg Biryani\'s own two');
  });

  await scene('TD-106 editor-shaped save', async () => {
    const objects = [{ id: RAITA, meta: { name: 'Extra Raita' }, priceInfo: { basePrice: 40, finalPrice: 40, discount: 0 } }];
    const r = await saveDish(manager, CHICKEN, { addons: objects });
    const doc = await getDoc(`menuItems/${CHICKEN}`);
    check('TD-106: add-ons sent as objects are refused and the stored ids stay',
      !ok(r) && /add-on/i.test(r.message || '') && doc?.addons?.length === 3 && doc.addons.every(a => typeof a === 'string'),
      { r: r.message, addons: doc?.addons });
    const g = await seat(9);
    const line = lineOf(await add(9, g, CHICKEN, { [PORTION]: 'family' }, [RAITA]), CHICKEN);
    check('TD-106: after the refused save a guest still adds Chicken Biryani Family + Raita at ₹620', line?.priceInfo?.finalPrice === 620, line?.priceInfo);
  });

  await scene('TD-106 unknown add-on link', async () => {
    const r = await saveDish(manager, CHICKEN, { addons: [RAITA, 'addon_1727000000000'] });
    const doc = await getDoc(`menuItems/${CHICKEN}`);
    check('Q6-3: linking an add-on id that is no shared record (the old editor\'s addon_<ms>) is refused',
      !ok(r) && /addon_1727000000000/.test(r.message || '') && doc?.addons?.length === 3, { r: r.message, addons: doc?.addons });
  });

  // ── TD-107 · a shared portion price edit changes what every linked dish charges ───────────────────────────
  await scene('TD-107 blanket', async () => {
    const usage = await shared(manager, { action: 'usage' });
    check('D6: the portion and Raita are each on 3 dishes (Chicken, Mutton, Veg Biryani)',
      usage?.data?.variants?.[PORTION] === 3 && usage?.data?.addons?.[RAITA] === 3, usage?.data || usage?.message);
    const r = await shared(manager, { action: 'update', kind: 'variant', id: PORTION, changes: { options: [{ id: 'family', price: 280 }] } });
    check('D6: the Family ₹260 → ₹280 edit answers "on 3 dishes"', ok(r) && r.data?.usedBy === 3, r?.data || r?.message);
    const menu = await guestMenu();
    check('TD-107: the guest menu shows Family +₹280 on Chicken and on Veg Biryani',
      familyOf(dishIn(menu, CHICKEN)) === 280 && familyOf(dishIn(menu, VEG)) === 280,
      { chicken: familyOf(dishIn(menu, CHICKEN)), veg: familyOf(dishIn(menu, VEG)) });
    const g = await seat(2);
    need(await add(2, g, CHICKEN, { [PORTION]: 'family' }), 'add family');
    need(await call('cart-checkoutCart', { restaurantId: RID, tableId: T(2), sessionId: g }), 'checkout');
    const p = await call('billing-preview', { restaurantId: RID, sessionId: till, draftId: g });
    check('TD-107: Chicken Biryani Family bills ₹551 (600 − 100 = 500 × 1.1025), not ₹529', p?.data?.payable === 55100, p?.data?.payable ?? p?.message);
    const row = (await listCol('audit')).find(a => a.action === 'menuOptionEdit' && a.cid === `menu_${PORTION}`);
    check('D6: the edit leaves one audit row with the manager, before 260 and after 280',
      row && row.staffId && JSON.stringify(row.before).includes('260') && JSON.stringify(row.after).includes('280'), row);
  });

  await scene('TD-107 only this dish', async () => {
    const r = await shared(manager, { action: 'copyForDish', kind: 'variant', id: PORTION, menuItemId: MUTTON, changes: { options: [{ id: 'family', price: 300 }] } });
    const newId = r?.data?.id;
    if (newId) made.push(`variants/${newId}`);
    const mutton = await getDoc(`menuItems/${MUTTON}`);
    check('Q6-4: "Only Mutton Biryani" links Mutton to a new portion record and leaves the shared one',
      ok(r) && newId && newId !== PORTION && mutton?.variants?.[0]?.id === newId, { r: r?.data || r?.message, variants: mutton?.variants });
    const menu = await guestMenu();
    check('Q6-4: Chicken Biryani Family stays ₹280, Mutton Family is ₹300',
      familyOf(dishIn(menu, CHICKEN)) === 280 && familyOf(dishIn(menu, MUTTON)) === 300,
      { chicken: familyOf(dishIn(menu, CHICKEN)), mutton: familyOf(dishIn(menu, MUTTON)) });
    if (!newId) return;   // no copy was made: the checks above already say so, and there is nothing to bill
    const g = await seat(3);
    need(await add(3, g, MUTTON, { [newId]: 'family' }), 'add mutton family');
    need(await call('cart-checkoutCart', { restaurantId: RID, tableId: T(3), sessionId: g }), 'checkout');
    const p = await call('billing-preview', { restaurantId: RID, sessionId: till, draftId: g });
    check('Q6-4: Mutton Biryani Family bills ₹604 (378 + 270 − 100 = 548 × 1.1025)', p?.data?.payable === 60400, p?.data?.payable ?? p?.message);
    const usage = await shared(manager, { action: 'usage' });
    check('Q6-4: the shared portion is now on 2 dishes, the copy on 1',
      usage?.data?.variants?.[PORTION] === 2 && usage?.data?.variants?.[newId] === 1, usage?.data);
  });

  // ── TD-107 · add-on stock, switched by the waiter, holds on every dish ───────────────────────────────────
  await scene('TD-107 raita stock', async () => {
    const r = await stock(waiter, { addonId: RAITA, isAvailable: false });
    const menu = await guestMenu();
    const offers = id => (dishIn(menu, id)?.addons || []).some(a => a.id === RAITA);
    const listed = [CHICKEN, VEG, MUTTON].every(id => dishIn(menu, id));
    check('D6: the waiter switches Raita off and no biryani offers it on the guest menu',
      ok(r) && listed && !offers(CHICKEN) && !offers(VEG) && !offers(MUTTON), { r, listed });
    const g = await seat(10);
    const a = await add(10, g, VEG, { [PORTION]: 'single' }, [RAITA]);
    check('D6: adding Raita to Veg Biryani is refused as out of stock', !ok(a) && /out of stock/i.test(a.message || ''), a?.message);
    const back = await stock(waiter, { addonId: RAITA, isAvailable: true });
    check('D6: switched back on, the shared record reads in stock', ok(back) && (await getDoc(`addons/${RAITA}`))?.isInStock === true, back);
  });

  // ── Q6-2 · the price is fixed when the add-on goes into the cart ─────────────────────────────────────────
  await scene('Q6-2', async () => {
    const g = await seat(11);
    const added = await add(11, g, VEG, { [PORTION]: 'single' }, [RAITA]);
    const before = lineOf(added, VEG);
    check('Q6-2 setup: Veg Biryani + Raita goes in the cart at ₹300', before?.priceInfo?.finalPrice === 300, before?.priceInfo || added);
    const r = await shared(manager, { action: 'update', kind: 'addon', id: RAITA, changes: { price: 50 } });
    check('D6: Raita ₹40 → ₹50 on the shared record', ok(r) && (await getDoc(`addons/${RAITA}`))?.priceInfo?.basePrice === 50, r?.data || r?.message);
    need(await call('cart-checkoutCart', { restaurantId: RID, tableId: T(11), sessionId: g }), 'checkout');
    const line = (await listCol('lines')).find(l => l.sessionId === g && l.menuItemId === VEG);
    check('Q6-2: the round placed after the change keeps the ₹300 it was added at', ok(r) && line?.listPrice === 30000, line?.listPrice);
    const g2 = await seat(12);
    const fresh = lineOf(await add(12, g2, VEG, { [PORTION]: 'single' }, [RAITA]), VEG);
    check('D6: a fresh Veg Biryani + Raita is ₹310', fresh?.priceInfo?.finalPrice === 310, fresh?.priceInfo);
  });

  // ── Q6-3 · a new add-on made from the dish editor can be bought ──────────────────────────────────────────
  await scene('Q6-3', async () => {
    const r = await shared(manager, { action: 'create', kind: 'addon', changes: { name: 'Mirchi ka Salan', price: 30 } });
    const id = r?.data?.id;
    if (id) made.push(`addons/${id}`);
    check('Q6-3: a new add-on becomes a shared record, in stock', ok(r) && (await getDoc(`addons/${id}`))?.isInStock === true, r?.data || r?.message);
    need(await saveDish(manager, CHICKEN, { addons: [RAITA, 'ma_extra_egg', 'ma_extra_gravy', id] }), 'link salan');
    const g = await seat(8);
    const line = lineOf(await add(8, g, CHICKEN, { [PORTION]: 'single' }, [id]), CHICKEN);
    check('Q6-3: Chicken Biryani Single + Mirchi ka Salan is a ₹350 line', line?.priceInfo?.finalPrice === 350, line?.priceInfo);
  });

  // ── Refusals: nothing changes ────────────────────────────────────────────────────────────────────────────
  await scene('refusals', async () => {
    const before = (await getDoc(`addons/${RAITA}`))?.priceInfo?.basePrice;
    const w = await shared(waiter, { action: 'update', kind: 'addon', id: RAITA, changes: { price: 5 } });
    check('D6: a waiter cannot change Raita\'s price (Admin or Manager only), and it stays',
      !ok(w) && /admin or manager/i.test(w.message || '') && (await getDoc(`addons/${RAITA}`))?.priceInfo?.basePrice === before, w?.message);
    const neg = await shared(manager, { action: 'update', kind: 'addon', id: RAITA, changes: { price: -10 } });
    check('D6: a negative price is refused and Raita stays', !ok(neg) && /price/i.test(neg.message || '') && (await getDoc(`addons/${RAITA}`))?.priceInfo?.basePrice === before, neg?.message);
    const none = await shared(manager, { action: 'update', kind: 'addon', id: 'ma_no_such', changes: { price: 10 } });
    check('D6: an unknown add-on is refused by name', !ok(none) && /ma_no_such/.test(none.message || ''), none?.message);
    const opt = await shared(manager, { action: 'update', kind: 'variant', id: PORTION, changes: { options: [{ id: 'jumbo', price: 400 }] } });
    check('D6: an unknown portion option is refused by name', !ok(opt) && /jumbo/.test(opt.message || ''), opt?.message);
  });

  for (const p of made) await delDoc(p);
  await wipeAndImport();
  return results;
}
