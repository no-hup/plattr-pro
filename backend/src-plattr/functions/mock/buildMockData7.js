/**
 * buildMockData7.js — Production-scale "goal-line" seed (5 big restaurants)
 * ============================================================================
 * Purpose: a deterministic, construct-rich emulator seed to serve as the
 * GOAL-LINE for the full API test suite. Five restaurants modeled on REAL
 * Bangalore menus (skeletons scraped live via Apify — see
 * productionSkeletons_bangalore.json), with the Plattr-specific constructs
 * (variants, addons, item discounts, Offers V2, charges, multi-config carts)
 * engineered as a deliberate TEST MATRIX.
 *
 * Real menus don't carry Plattr constructs (variants/respectParentDiscount,
 * Offers V2, service charges) — those are synthesized here, priced with the
 * SAME per-component math the backend uses (via mock/lib/seedKit.js), so
 * seeded carts/orders pass the checkout validators AND we can emit an
 * INDEPENDENT golden expected-value fixture the E2E suite asserts the live
 * backend against.
 *
 * OUTPUTS:
 *   MockData7ProductionMenus.json   — the seed (restaurants + customers + _system)
 *   goldenExpectedValues.json       — {scenario → expected priceInfo/grandTotal}
 *
 * USAGE:
 *   node mock/buildMockData7.js                       # writes both files
 *   node mock/buildMockData7.js --out=<path>          # custom seed path
 * Then import:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     node mock/importMockData5.js --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps
 *
 * REAL-SKELETON PROVENANCE (Swiggy live, 2026-07-07):
 *   res_meghana     Meghana Foods (Residency Road)  — FLAT ₹100 off ≥₹499
 *   res_pizzabakery The Pizza Bakery (Central)       — FLAT ₹100 off ≥₹499
 *   res_truffles    Truffles (St. Marks Road)        — FLAT ₹80 off ≥₹299
 *   res_salt        SALT Indian Restaurant (UB City) — FLAT 50% OFF
 *   res_chowman     Chowman (Koramangala)            — FLAT ₹80 off ≥₹199
 * ============================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createSeedKit } = require('./lib/seedKit');

const kit = createSeedKit();
const {
  MIN, HOUR, DAY, ts, round2, TEST_OTP, SERVER_PW,
  newRestaurant, defMenu, defCategory, defSub, defKitchen, defVariant, defAddon, defItem,
  defServer, defTable, defSession, buildCartItem, defLiveCart, cartSnapshot, defOrder, defOffer,
  stripPrivate, runIntegrity, golden, recordItemGolden, recordCheckoutGolden,
} = kit;

// ─────────────────────────────────────────────────────────────────────────────
// Backend-faithful offer evaluator (mirrors offers/offerEngine.js + strategies).
// Used to compute the offerDiscount the live backend will auto-apply, so golden
// checkout values match. Single best offer (highest discount, tiebreak priority).
// ─────────────────────────────────────────────────────────────────────────────
const NOW = kit.NOW;
function eligibleItems(offer, items) {
  const targets = offer.targetIds || [];
  const excl = offer.exclusionIds || [];
  let out = items.filter(it => {
    if (it.status === 'CANCELLED') return false;
    if (offer.scope === 'ORDER') return true;
    if (offer.scope === 'CATEGORY') {
      const subs = Array.isArray(it.subcategoryIds) ? it.subcategoryIds : [];
      return targets.includes(it.categoryId) || subs.some(s => targets.includes(s));
    }
    if (offer.scope === 'ITEM') return targets.includes(it.menuItemId);
    return false;
  });
  if (excl.length) out = out.filter(it => {
    if (excl.includes(it.menuItemId) || excl.includes(it.categoryId)) return false;
    const subs = Array.isArray(it.subcategoryIds) ? it.subcategoryIds : [];
    return !subs.some(s => excl.includes(s));
  });
  return out;
}
function offerDiscountFor(offer, items, basePrice, sessionData) {
  if (!offer.isActive) return 0;
  if (!['ORDER', 'CATEGORY', 'ITEM'].includes(offer.scope)) return 0; // CART/SUBCATEGORY invalid
  if ((offer.scope === 'CATEGORY' || offer.scope === 'ITEM') && (offer.targetIds || []).length === 0) return 0;
  const start = Date.parse(offer.validity.startDate) / 1000;
  const end = Date.parse(offer.validity.endDate) / 1000;
  if (NOW < start || NOW > end) return 0;
  const c = offer.conditions || {};
  if (c.minOrderValue && basePrice < c.minOrderValue) return 0;
  if (c.userHistory && sessionData && typeof sessionData.totalOrderCount === 'number') {
    if (c.userHistory.minOrderCount && sessionData.totalOrderCount < c.userHistory.minOrderCount) return 0;
    if (c.userHistory.activeSessionOrderCount && (sessionData.sessionOrderCount || 0) < c.userHistory.activeSessionOrderCount - 1) return 0;
  }
  const elig = eligibleItems(offer, items);
  if (elig.length === 0) return 0;
  const b = offer.benefit || {};
  const R2 = (n) => Math.round(n * 100) / 100;
  if (offer.type === 'FLAT') {
    const flat = b.value || 0; const cap = b.maxDiscount || flat;
    let d;
    if (offer.scope === 'ORDER' && !(offer.exclusionIds && offer.exclusionIds.length)) d = Math.min(flat, basePrice);
    else { const et = elig.reduce((s, i) => s + (i.priceInfo.finalPrice || 0), 0); d = Math.min(flat, et); }
    return R2(Math.min(d, cap));
  }
  if (offer.type === 'PERCENTAGE') {
    const pct = b.value || 0; const cap = b.maxDiscount || Infinity;
    let d;
    if (offer.scope === 'ORDER' && !(offer.exclusionIds && offer.exclusionIds.length)) d = basePrice * pct / 100;
    else d = elig.reduce((s, i) => s + (i.priceInfo.finalPrice || 0) * pct / 100, 0);
    return R2(Math.min(d, cap));
  }
  if (offer.type === 'BOGO' || offer.type === 'FREE_ITEM') {
    const buy = b.buyQuantity || 1, get = b.getQuantity || 1, cap = b.maxDiscount || Infinity;
    const units = [];
    for (const it of elig) { const u = (it.priceInfo.finalPrice || 0) / (it.quantity || 1); for (let q = 0; q < it.quantity; q++) units.push(u); }
    if (units.length < buy + get) return 0;
    units.sort((a, z) => a - z);
    let d = 0; for (let i = 0; i < get; i++) d += units[i];
    return R2(Math.min(d, cap));
  }
  return 0;
}
function bestOffer(R, items, basePrice, sessionData) {
  const cands = [];
  for (const o of Object.values(R.offers)) {
    const d = offerDiscountFor(o, items, basePrice, sessionData);
    if (d > 0) cands.push({ o, d });
  }
  if (!cands.length) return { offer: null, discount: 0 };
  cands.sort((a, z) => z.d !== a.d ? z.d - a.d : (a.o.priority ?? 999) - (z.o.priority ?? 999));
  return { offer: cands[0].o, discount: cands[0].d };
}
// Golden checkout that auto-picks the best offer exactly like the backend.
// DEFAULT sessionData models a FRESH session (0 prior orders): the live backend
// ALWAYS derives totalOrderCount by querying orders for the session
// (evaluateOrderOffers.js), so userHistory gates are always enforced — a null
// here would wrongly mark loyalty offers eligible. History scenarios pass an
// explicit sessionData AND must run on a session with that many seeded orders.
function goldenCheckout(R, scenarioId, description, itemSpecs, tags = [], sessionData = { totalOrderCount: 0, sessionOrderCount: 0 }) {
  const items = itemSpecs.map((s, i) => buildCartItem(R, i + 1, s.menuItemId, s.quantity || 1, 'PENDING', { selVariants: s.selVariants || [], selAddonIds: s.selAddonIds || [] }));
  const basePrice = round2(items.reduce((s, i) => s + i.priceInfo.totalBasePrice, 0));
  const { offer, discount } = bestOffer(R, items, basePrice, sessionData);
  const res = recordCheckoutGolden(R, scenarioId, description, itemSpecs, { offerId: offer ? offer.id : null, offerDiscount: discount }, tags);
  golden.scenarios[golden.scenarios.length - 1].expected.appliedOfferId = offer ? offer.id : null;
  golden.scenarios[golden.scenarios.length - 1].expected.appliedOfferTitle = offer ? offer.title : null;
  return res;
}

// ═════════════════════════════════════════════════════════════════════════════
// Shared staff/customer helpers
// ═════════════════════════════════════════════════════════════════════════════
// EASY AUTH, one rule: **the app's own name is the username**. Every staff app logs in with
// `<app>@<slug>.test` and password `1234` — `server@meg.test` in the server app, `kitchen@meg.test`
// in the kitchen app, `admin@meg.test` in the admin app. `manager@` and `server2@` are the extra
// hands for approval and two-waiter scenarios. Phone numbers are `9<idx>0000000<n>` (idx 1-5 per
// restaurant, n 0-4 per staffer), collision-free. OTP everywhere is 123456. Listed in _meta.logins.
function standardStaff(R, slug, idx) {
  const ph = (n) => `9${idx}0000000${n}`;
  defServer(R, `srv_${slug}_admin`, 'Admin', 'ADMIN', `admin@${slug}.test`, { phone: ph(0) });
  defServer(R, `srv_${slug}_mgr`, 'Manager', 'MANAGER', `manager@${slug}.test`, { phone: ph(1) });
  defServer(R, `srv_${slug}_1`, 'Server One', 'SERVER', `server@${slug}.test`, { phone: ph(2) });
  defServer(R, `srv_${slug}_2`, 'Server Two', 'SERVER', `server2@${slug}.test`, { phone: ph(3) });
  defServer(R, `srv_${slug}_kit`, 'Kitchen', 'KITCHEN', `kitchen@${slug}.test`, { phone: ph(4) });
}
function standardTables(R, slug, n = 10) {
  defTable(R, `tbl_${slug}_1`, '1', 4, 'active', { primaryCustomer: { phoneNumber: '9876543210', name: 'Customer One' }, occupiedBy: ['9876543210'], assignedServerId: `srv_${slug}_1`, otp: 'valid', section: 'Indoor' });
  defTable(R, `tbl_${slug}_2`, '2', 2, 'pending', { otp: 'valid', section: 'Indoor' });
  defTable(R, `tbl_${slug}_3`, '3', 4, 'pending', { otp: 'expired', section: 'Patio' }); // edge
  defTable(R, `tbl_${slug}_4`, '4', 6, 'reserved', { otp: 'valid' });
  defTable(R, `tbl_${slug}_5`, '5', 4, 'disabled', { otp: 'none' }); // edge
  for (let i = 6; i <= n; i++) defTable(R, `tbl_${slug}_${i}`, String(i), i % 2 ? 2 : 4, 'vacant', { otp: 'valid' });
}

const restaurants = {};

// ═════════════════════════════════════════════════════════════════════════════
// 1) MEGHANA FOODS — Biryani / Andhra / Chinese / Seafood.  SERVICE_CHARGE 5%.
//    Focus: large multi-cuisine menu; biryani portion variant (respectParent T);
//    addons respectParent FALSE (extra egg/raita); FLAT-order + CATEGORY offers.
// ═════════════════════════════════════════════════════════════════════════════
(function buildMeghana() {
  const R = newRestaurant('res_meghana',
    { name: 'Meghana Foods', address: 'Residency Road, Bengaluru', phone: '8040001111', email: 'hello@meghana.test', location: { _latitude: 12.9698, _longitude: 77.6008 }, cuisine: 'Biryani · Andhra · Chinese · Seafood', currency: 'INR', timezone: 'Asia/Kolkata' },
    [{ type: 'SERVICE_CHARGE', percentage: 5 }]);
  defKitchen(R, 'kit_meg_main', 'Main Kitchen');
  defKitchen(R, 'kit_meg_tandoor', 'Tandoor & Grill');

  defCategory(R, 'mc_biryani', 'Biryani', { order: 0, subcategoryIds: ['ms_bir_chicken', 'ms_bir_veg'] });
  defCategory(R, 'mc_starters', 'Starters', { order: 1, subcategoryIds: ['ms_st_veg', 'ms_st_nonveg'] });
  defCategory(R, 'mc_andhra', 'Andhra Mains', { order: 2, subcategoryIds: ['ms_andhra'] });
  defCategory(R, 'mc_seafood', 'Seafood', { order: 3, subcategoryIds: ['ms_seafood'] });
  defCategory(R, 'mc_breads', 'Breads & Rice', { order: 4, subcategoryIds: ['ms_breads'] });
  defCategory(R, 'mc_desserts', 'Desserts', { order: 5, subcategoryIds: ['ms_dessert'] });
  // Bar. The only liquor menu in the seed: BL's second tax block (inclusive, no GST part) has no
  // other place to be exercised against real data. Prices are inclusive of whatever the state levies.
  defCategory(R, 'mc_bar', 'Bar', { order: 6, subcategoryIds: ['ms_beer', 'ms_spirits'] });

  defSub(R, 'ms_bir_chicken', 'Chicken Biryani', 'mc_biryani', 0);
  defSub(R, 'ms_bir_veg', 'Veg Biryani', 'mc_biryani', 1);
  defSub(R, 'ms_st_veg', 'Veg Starters', 'mc_starters', 0);
  defSub(R, 'ms_st_nonveg', 'Non-Veg Starters', 'mc_starters', 1);
  defSub(R, 'ms_andhra', 'Andhra Specials', 'mc_andhra', 0);
  defSub(R, 'ms_seafood', 'Coastal Seafood', 'mc_seafood', 0);
  defSub(R, 'ms_breads', 'Breads & Rice', 'mc_breads', 0);
  defSub(R, 'ms_dessert', 'Desserts', 'mc_desserts', 0);
  defSub(R, 'ms_beer', 'Beer', 'mc_bar', 0);
  defSub(R, 'ms_spirits', 'Spirits', 'mc_bar', 1);

  // Variants: biryani portion (respectParent TRUE); Andhra spice (non-priced, respectParent irrelevant)
  defVariant(R, 'mv_bir_portion', 'Portion', { mandatory: true, respectParent: true, items: ['mi_chicken_bir', 'mi_veg_bir', 'mi_mutton_bir'], catAssoc: ['mc_biryani'], description: 'Single or family portion', options: [{ id: 'single', name: 'Single', price: 0 }, { id: 'family', name: 'Family (serves 3)', price: 260 }] });
  defVariant(R, 'mv_spice', 'Spice Level', { mandatory: false, respectParent: true, items: ['mi_andhra_chicken', 'mi_gongura_mutton'], catAssoc: ['mc_andhra'], description: 'Andhra heat', options: [{ id: 'medium', name: 'Medium', price: 0 }, { id: 'andhra_hot', name: 'Andhra Hot', price: 0 }] });

  // Addons: respectParent FALSE (own price, no inherit) — the classic per-component case
  defAddon(R, 'ma_extra_raita', 'Extra Raita', 40, { respectParent: false, items: ['mi_chicken_bir', 'mi_veg_bir', 'mi_mutton_bir'], catAssoc: ['mc_biryani'] });
  defAddon(R, 'ma_extra_egg', 'Boiled Egg', 30, { respectParent: false, items: ['mi_chicken_bir', 'mi_mutton_bir'], catAssoc: ['mc_biryani'] });
  defAddon(R, 'ma_extra_gravy', 'Extra Gravy', 60, { respectParent: true, items: ['mi_chicken_bir', 'mi_mutton_bir'], catAssoc: ['mc_biryani'], description: 'respectParent TRUE — inherits item discount' });
  defAddon(R, 'ma_oos_prawn', 'Prawn Topping (OOS)', 120, { respectParent: false, inStock: false, items: ['mi_veg_bir'], catAssoc: ['mc_biryani'] });

  // Items (base ₹, disc %) — mix of 0/10/15% item discounts
  defItem(R, 'mi_chicken_bir', 'Chicken Dum Biryani', 320, { cat: 'mc_biryani', sub: 'ms_bir_chicken', disc: 0, diet: 'NON_VEG', spice: 3, variants: ['mv_bir_portion'], addons: ['ma_extra_raita', 'ma_extra_egg', 'ma_extra_gravy'], desc: 'Signature dum biryani' });
  defItem(R, 'mi_mutton_bir', 'Mutton Biryani', 420, { cat: 'mc_biryani', sub: 'ms_bir_chicken', disc: 10, diet: 'NON_VEG', spice: 3, variants: ['mv_bir_portion'], addons: ['ma_extra_raita', 'ma_extra_egg', 'ma_extra_gravy'] });
  defItem(R, 'mi_veg_bir', 'Veg Biryani', 260, { cat: 'mc_biryani', sub: 'ms_bir_veg', disc: 0, diet: 'VEG', spice: 2, variants: ['mv_bir_portion'], addons: ['ma_extra_raita', 'ma_oos_prawn'] });
  defItem(R, 'mi_paneer65', 'Paneer 65', 240, { cat: 'mc_starters', sub: 'ms_st_veg', disc: 15, diet: 'VEG', spice: 3 });
  defItem(R, 'mi_chicken65', 'Chicken 65', 280, { cat: 'mc_starters', sub: 'ms_st_nonveg', disc: 0, diet: 'NON_VEG', spice: 4 });
  defItem(R, 'mi_apollo_fish', 'Apollo Fish', 340, { cat: 'mc_starters', sub: 'ms_st_nonveg', disc: 10, diet: 'NON_VEG', spice: 3 });
  defItem(R, 'mi_andhra_chicken', 'Andhra Chicken Curry', 320, { cat: 'mc_andhra', sub: 'ms_andhra', disc: 0, diet: 'NON_VEG', spice: 4, variants: ['mv_spice'] });
  defItem(R, 'mi_gongura_mutton', 'Gongura Mutton', 460, { cat: 'mc_andhra', sub: 'ms_andhra', disc: 0, diet: 'NON_VEG', spice: 4, variants: ['mv_spice'] });
  defItem(R, 'mi_crab_roast', 'Coastal Crab Roast', 620, { cat: 'mc_seafood', sub: 'ms_seafood', disc: 0, diet: 'NON_VEG', spice: 3 });
  defItem(R, 'mi_prawn_fry', 'Prawn Ghee Roast', 480, { cat: 'mc_seafood', sub: 'ms_seafood', disc: 10, diet: 'NON_VEG', spice: 3 });
  defItem(R, 'mi_butter_naan', 'Butter Naan', 60, { cat: 'mc_breads', sub: 'ms_breads', disc: 0, diet: 'VEG' });
  defItem(R, 'mi_gulab', 'Gulab Jamun (2 pc)', 90, { cat: 'mc_desserts', sub: 'ms_dessert', disc: 0, diet: 'VEG' });
  defItem(R, 'mi_qubani', 'Qubani ka Meetha', 140, { cat: 'mc_desserts', sub: 'ms_dessert', disc: 15, diet: 'VEG' });
  // Liquor lines: taxBlockId 'liquor', never discounted (offers must not touch alcohol), no HSN code.
  defItem(R, 'mi_kingfisher', 'Kingfisher Premium (650 ml)', 260, { cat: 'mc_bar', sub: 'ms_beer', disc: 0, diet: 'VEG', taxBlockId: 'liquor', taxCode: '' });
  defItem(R, 'mi_bira_white', 'Bira 91 White (330 ml)', 220, { cat: 'mc_bar', sub: 'ms_beer', disc: 0, diet: 'VEG', taxBlockId: 'liquor', taxCode: '' });
  defItem(R, 'mi_old_monk', 'Old Monk 60 ml', 180, { cat: 'mc_bar', sub: 'ms_spirits', disc: 0, diet: 'VEG', taxBlockId: 'liquor', taxCode: '' });

  defMenu(R, 'menu_meg', 'Meghana Menu', { categoryIds: ['mc_biryani', 'mc_starters', 'mc_andhra', 'mc_seafood', 'mc_breads', 'mc_desserts'], menuItemIds: Object.keys(R.menuItems) });

  // Offers
  defOffer(R, 'off_meg_flat100', '₹100 Off (min ₹499)', { type: 'FLAT', scope: 'ORDER', benefit: { value: 100 }, conditions: { minOrderValue: 499 }, priority: 3, description: 'REAL live offer: FLAT ₹100 off above ₹499' });
  defOffer(R, 'off_meg_bir10', '10% Off Biryani (max ₹120)', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['mc_biryani'], benefit: { value: 10, maxDiscount: 120 }, priority: 5 });
  defOffer(R, 'off_meg_bogo_paneer', 'BOGO Paneer 65', { type: 'BOGO', scope: 'ITEM', targetIds: ['mi_paneer65'], benefit: { buyQuantity: 1, getQuantity: 1 }, priority: 6, description: 'Buy one Paneer 65, get one free' });
  defOffer(R, 'off_meg_expired', 'Expired Ugadi Offer', { type: 'PERCENTAGE', scope: 'ORDER', benefit: { value: 25 }, startOffset: -120 * DAY, endOffset: -30 * DAY, description: 'NEGATIVE: expired' });
  defOffer(R, 'off_meg_inactive', 'Paused Combo', { type: 'FLAT', scope: 'ORDER', benefit: { value: 200 }, isActive: false, description: 'NEGATIVE: inactive' });

  standardStaff(R, 'meg', 1);
  standardTables(R, 'meg', 12);
  defSession(R, 'ses_meg_active', 'tbl_meg_1', '9876543210', ['9876543210'], 'active', { ageMin: 30 });

  // Live cart on active table (resume scenario)
  {
    const items = [
      buildCartItem(R, 1, 'mi_chicken_bir', 1, 'PENDING', { selVariants: [{ variantId: 'mv_bir_portion', optionId: 'single' }], selAddonIds: ['ma_extra_egg'] }),
      buildCartItem(R, 2, 'mi_paneer65', 2, 'PENDING', {}),
    ];
    defLiveCart(R, 'tbl_meg_1', 'ses_meg_active', items);
  }
  // A completed order (history) with the FLAT offer applied
  {
    const items = [
      buildCartItem(R, 1, 'mi_mutton_bir', 1, 'SERVED', { selVariants: [{ variantId: 'mv_bir_portion', optionId: 'family' }], selAddonIds: ['ma_extra_gravy'] }),
      buildCartItem(R, 2, 'mi_crab_roast', 1, 'SERVED', {}),
    ];
    const basePrice = round2(items.reduce((s, i) => s + i.priceInfo.totalBasePrice, 0));
    const { offer, discount } = bestOffer(R, items, basePrice, null);
    const snap = cartSnapshot(R, 'cart_meg_done', 'SERVED', items, { userId: '9876543210', ageMin: 120 });
    defOrder(R, 'ord_meg_completed', 'MEG-0001', { tableId: 'tbl_meg_1', sessionId: 'ses_meg_active', customerId: '9876543210', orderStatus: 'COMPLETED', paymentStatus: 'paid', snapshots: [snap], appliedOffer: offer && { id: offer.id, title: offer.title, type: offer.type, scope: offer.scope, discountAmount: discount, appliedItems: [] }, offerDiscount: discount, assignedServer: 'srv_meg_1', ageMin: 120 });
  }

  // ── Golden scenarios ──
  // Item-level: respectParent FALSE addon (egg keeps ₹30) on a 0%-disc item.
  recordItemGolden(R, 'MEG_ITEM_bir_egg', 'Chicken Biryani single + boiled egg (addon respectParent FALSE, item disc 0)', { menuItemId: 'mi_chicken_bir', selVariants: [{ variantId: 'mv_bir_portion', optionId: 'single' }], selAddonIds: ['ma_extra_egg'] }, ['addon-no-inherit', 'variant-respectparent-true']);
  // Item-level: family variant inherits 0% (no discount), addon gravy respectParent TRUE on 10% item.
  recordItemGolden(R, 'MEG_ITEM_mutton_family_gravy', 'Mutton Biryani(10%) family + extra gravy(respectParent TRUE inherits 10%)', { menuItemId: 'mi_mutton_bir', selVariants: [{ variantId: 'mv_bir_portion', optionId: 'family' }], selAddonIds: ['ma_extra_gravy'] }, ['variant-respectparent-true', 'addon-inherit', 'item-discount']);
  // Item-level: qty 3 of a 15% item.
  recordItemGolden(R, 'MEG_ITEM_paneer_qty3', 'Paneer 65 (15% off) × 3 — quantity math', { menuItemId: 'mi_paneer65', quantity: 3 }, ['quantity', 'item-discount']);
  // Checkout: FLAT ₹100 order offer applies (base ≥ 499) + 5% service charge.
  goldenCheckout(R, 'MEG_CHK_flat_service', 'Biryani family + crab → FLAT ₹100 order offer + 5% service charge', [
    { menuItemId: 'mi_chicken_bir', selVariants: [{ variantId: 'mv_bir_portion', optionId: 'family' }] },
    { menuItemId: 'mi_crab_roast' },
  ], ['offer-flat-order', 'charge-service']);
  // Checkout: small cart under ₹499 → NO order offer; CATEGORY biryani 10% wins instead.
  goldenCheckout(R, 'MEG_CHK_category_biryani', 'Single veg biryani (< ₹499) → CATEGORY 10% biryani offer, no FLAT', [
    { menuItemId: 'mi_veg_bir', selVariants: [{ variantId: 'mv_bir_portion', optionId: 'single' }] },
  ], ['offer-category-percentage', 'min-order-gate']);
  // Checkout: BOGO paneer (2 units → cheapest free).
  goldenCheckout(R, 'MEG_CHK_bogo_paneer', 'Paneer 65 × 2 → BOGO (one free)', [
    { menuItemId: 'mi_paneer65', quantity: 2 },
  ], ['offer-bogo']);

  restaurants.res_meghana = R;
})();

// ═════════════════════════════════════════════════════════════════════════════
// 2) THE PIZZA BAKERY — Pizzas / Pastas / Desserts.  SERVICE_CHARGE 5%.
//    Focus: DEEP variant trees (size + crust, respectParent TRUE) + topping
//    addons (respectParent FALSE); multi-config cart; CATEGORY dessert offer.
// ═════════════════════════════════════════════════════════════════════════════
(function buildPizzaBakery() {
  const R = newRestaurant('res_pizzabakery',
    { name: 'The Pizza Bakery', address: 'Central Bangalore', phone: '8040002222', email: 'hello@pizzabakery.test', location: { _latitude: 12.9719, _longitude: 77.6412 }, cuisine: 'Wood-Fired Pizza · Pasta · Italian', currency: 'INR', timezone: 'Asia/Kolkata' },
    [{ type: 'SERVICE_CHARGE', percentage: 5 }]);
  defKitchen(R, 'kit_pb_oven', 'Wood-Fired Oven');
  defKitchen(R, 'kit_pb_pasta', 'Pasta Station');

  defCategory(R, 'pc_pizza', 'Sourdough Pizzas', { order: 0, subcategoryIds: ['ps_pizza_veg', 'ps_pizza_nonveg'], viewType: 'carousel' });
  defCategory(R, 'pc_pasta', 'Pastas', { order: 1, subcategoryIds: ['ps_pasta'] });
  defCategory(R, 'pc_starters', 'Starters', { order: 2, subcategoryIds: ['ps_starters'] });
  defCategory(R, 'pc_desserts', 'Desserts', { order: 3, subcategoryIds: ['ps_dessert'] });

  defSub(R, 'ps_pizza_veg', 'Veg Pizzas', 'pc_pizza', 0);
  defSub(R, 'ps_pizza_nonveg', 'Non-Veg Pizzas', 'pc_pizza', 1);
  defSub(R, 'ps_pasta', 'Pastas', 'pc_pasta', 0);
  defSub(R, 'ps_starters', 'Starters', 'pc_starters', 0);
  defSub(R, 'ps_dessert', 'Desserts', 'pc_desserts', 0);

  const pizzaItems = ['pi_margherita', 'pi_funghi', 'pi_pepperoni', 'pi_chicken_tikka'];
  // Size (mandatory, respectParent TRUE) + Crust (optional, respectParent TRUE)
  defVariant(R, 'pv_size', 'Size', { mandatory: true, respectParent: true, items: pizzaItems, catAssoc: ['pc_pizza'], description: 'Regular / Medium / Large', options: [{ id: 'regular', name: 'Regular (8")', price: 0 }, { id: 'medium', name: 'Medium (11")', price: 160 }, { id: 'large', name: 'Large (14")', price: 320 }] });
  defVariant(R, 'pv_crust', 'Crust', { mandatory: false, respectParent: true, items: pizzaItems, catAssoc: ['pc_pizza'], description: 'Sourdough / Thin / Gluten-free', options: [{ id: 'sourdough', name: 'Sourdough', price: 0 }, { id: 'thin', name: 'Thin Crust', price: 0 }, { id: 'gf', name: 'Gluten-Free', price: 120 }] });
  // Toppings addons respectParent FALSE (own price, no inherit)
  defAddon(R, 'pa_cheese', 'Extra Cheese', 90, { respectParent: false, items: pizzaItems, catAssoc: ['pc_pizza'] });
  defAddon(R, 'pa_mushroom', 'Mushroom', 70, { respectParent: false, items: pizzaItems, catAssoc: ['pc_pizza'] });
  defAddon(R, 'pa_jalapeno', 'Jalapeño', 50, { respectParent: false, items: pizzaItems, catAssoc: ['pc_pizza'] });
  defAddon(R, 'pa_chicken', 'Add Grilled Chicken', 130, { respectParent: false, items: ['pi_margherita', 'pi_funghi'], catAssoc: ['pc_pizza'] });

  defItem(R, 'pi_margherita', 'Margherita', 360, { cat: 'pc_pizza', sub: 'ps_pizza_veg', disc: 0, diet: 'VEG', variants: ['pv_size', 'pv_crust'], addons: ['pa_cheese', 'pa_mushroom', 'pa_jalapeno', 'pa_chicken'] });
  defItem(R, 'pi_funghi', 'Funghi di Bosco', 440, { cat: 'pc_pizza', sub: 'ps_pizza_veg', disc: 10, diet: 'VEG', variants: ['pv_size', 'pv_crust'], addons: ['pa_cheese', 'pa_mushroom', 'pa_jalapeno', 'pa_chicken'] });
  defItem(R, 'pi_pepperoni', 'Pepperoni', 520, { cat: 'pc_pizza', sub: 'ps_pizza_nonveg', disc: 0, diet: 'NON_VEG', variants: ['pv_size', 'pv_crust'], addons: ['pa_cheese', 'pa_mushroom', 'pa_jalapeno'] });
  defItem(R, 'pi_chicken_tikka', 'Chicken Tikka', 500, { cat: 'pc_pizza', sub: 'ps_pizza_nonveg', disc: 10, diet: 'NON_VEG', variants: ['pv_size', 'pv_crust'], addons: ['pa_cheese', 'pa_mushroom', 'pa_jalapeno'] });
  defItem(R, 'pi_alfredo', 'Chicken Alfredo', 380, { cat: 'pc_pasta', sub: 'ps_pasta', disc: 0, diet: 'NON_VEG' });
  defItem(R, 'pi_arrabiata', 'Penne Arrabiata', 320, { cat: 'pc_pasta', sub: 'ps_pasta', disc: 0, diet: 'VEG' });
  defItem(R, 'pi_bruschetta', 'Bruschetta', 240, { cat: 'pc_starters', sub: 'ps_starters', disc: 0, diet: 'VEG' });
  defItem(R, 'pi_wings', 'Peri Peri Wings', 340, { cat: 'pc_starters', sub: 'ps_starters', disc: 10, diet: 'NON_VEG', spice: 3 });
  defItem(R, 'pi_tiramisu', 'Tiramisu', 260, { cat: 'pc_desserts', sub: 'ps_dessert', disc: 0, diet: 'VEG' });
  defItem(R, 'pi_brownie', 'Molten Brownie', 220, { cat: 'pc_desserts', sub: 'ps_dessert', disc: 0, diet: 'VEG' });

  defMenu(R, 'menu_pb', 'Pizza Bakery Menu', { categoryIds: ['pc_pizza', 'pc_pasta', 'pc_starters', 'pc_desserts'], menuItemIds: Object.keys(R.menuItems) });

  defOffer(R, 'off_pb_flat100', '₹100 Off (min ₹499)', { type: 'FLAT', scope: 'ORDER', benefit: { value: 100 }, conditions: { minOrderValue: 499 }, priority: 3, description: 'REAL live offer' });
  defOffer(R, 'off_pb_dessert15', '15% Off Desserts (max ₹80)', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['pc_desserts'], benefit: { value: 15, maxDiscount: 80 }, priority: 5 });
  defOffer(R, 'off_pb_pizza_excl', '10% Off Pizzas (excl Pepperoni)', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['pc_pizza'], exclusionIds: ['pi_pepperoni'], benefit: { value: 10, maxDiscount: 150 }, priority: 7, description: 'exclusion-list demo' });

  standardStaff(R, 'pb', 2);
  standardTables(R, 'pb', 10);
  defSession(R, 'ses_pb_active', 'tbl_pb_1', '9876543210', ['9876543210'], 'active', { ageMin: 20 });
  {
    const items = [
      buildCartItem(R, 1, 'pi_margherita', 1, 'PENDING', { selVariants: [{ variantId: 'pv_size', optionId: 'large' }, { variantId: 'pv_crust', optionId: 'sourdough' }], selAddonIds: ['pa_cheese'] }),
      buildCartItem(R, 2, 'pi_alfredo', 1, 'PENDING', {}),
    ];
    defLiveCart(R, 'tbl_pb_1', 'ses_pb_active', items);
  }

  // Golden: MULTI-CONFIG cart — same Margherita, three different builds (size/crust/addon).
  recordItemGolden(R, 'PB_ITEM_marg_large_cheese', 'Margherita Large(+320) sourdough + extra cheese(₹90 no-inherit), item disc 0', { menuItemId: 'pi_margherita', selVariants: [{ variantId: 'pv_size', optionId: 'large' }, { variantId: 'pv_crust', optionId: 'sourdough' }], selAddonIds: ['pa_cheese'] }, ['variant-mandatory', 'addon-no-inherit']);
  recordItemGolden(R, 'PB_ITEM_funghi_medium_gf', 'Funghi(10%) Medium(+160) Gluten-Free(+120) — variants respectParent TRUE inherit 10%', { menuItemId: 'pi_funghi', selVariants: [{ variantId: 'pv_size', optionId: 'medium' }, { variantId: 'pv_crust', optionId: 'gf' }] }, ['variant-respectparent-true', 'item-discount', 'variant-priced']);
  recordItemGolden(R, 'PB_ITEM_funghi_large_loaded', 'Funghi(10%) Large + cheese + mushroom + chicken (addons no-inherit stay full price)', { menuItemId: 'pi_funghi', selVariants: [{ variantId: 'pv_size', optionId: 'large' }], selAddonIds: ['pa_cheese', 'pa_mushroom', 'pa_chicken'] }, ['variant-respectparent-true', 'addon-no-inherit', 'mixed']);
  // Checkout: 2 large pizzas → FLAT ₹100 order offer (base ≥ 499) + 5% service.
  goldenCheckout(R, 'PB_CHK_two_large_flat', 'Two large pizzas → FLAT ₹100 + 5% service charge', [
    { menuItemId: 'pi_pepperoni', selVariants: [{ variantId: 'pv_size', optionId: 'large' }] },
    { menuItemId: 'pi_chicken_tikka', selVariants: [{ variantId: 'pv_size', optionId: 'large' }] },
  ], ['offer-flat-order', 'charge-service']);
  // Checkout: dessert-only small cart → CATEGORY 15% dessert (cap ₹80).
  goldenCheckout(R, 'PB_CHK_dessert_cap', 'Tiramisu + Brownie → 15% dessert offer capped at ₹80', [
    { menuItemId: 'pi_tiramisu' }, { menuItemId: 'pi_brownie' },
  ], ['offer-category-percentage', 'offer-cap']);

  restaurants.res_pizzabakery = R;
})();

// ═════════════════════════════════════════════════════════════════════════════
// 3) TRUFFLES — American burgers / Continental / Desserts.  SERVICE_CHARGE 5%.
//    Focus: mandatory patty variant + topping addons; multi-config carts; BOGO
//    shake; FLAT ₹80 (min ₹299) real offer.
// ═════════════════════════════════════════════════════════════════════════════
(function buildTruffles() {
  const R = newRestaurant('res_truffles',
    { name: 'Truffles', address: 'St. Marks Road, Bengaluru', phone: '8040003333', email: 'hello@truffles.test', location: { _latitude: 12.9718, _longitude: 77.6035 }, cuisine: 'American · Burgers · Continental', currency: 'INR', timezone: 'Asia/Kolkata' },
    [{ type: 'SERVICE_CHARGE', percentage: 5 }]);
  defKitchen(R, 'kit_tr_grill', 'Grill');
  defKitchen(R, 'kit_tr_dessert', 'Dessert & Shakes');

  defCategory(R, 'trc_burgers', 'Burgers', { order: 0, subcategoryIds: ['trs_burgers'] });
  defCategory(R, 'trc_mains', 'Continental Mains', { order: 1, subcategoryIds: ['trs_mains'] });
  defCategory(R, 'trc_sides', 'Sides', { order: 2, subcategoryIds: ['trs_sides'] });
  defCategory(R, 'trc_shakes', 'Shakes', { order: 3, subcategoryIds: ['trs_shakes'] });
  defCategory(R, 'trc_desserts', 'Desserts', { order: 4, subcategoryIds: ['trs_dessert'] });

  defSub(R, 'trs_burgers', 'Burgers', 'trc_burgers', 0);
  defSub(R, 'trs_mains', 'Mains', 'trc_mains', 0);
  defSub(R, 'trs_sides', 'Sides', 'trc_sides', 0);
  defSub(R, 'trs_shakes', 'Shakes', 'trc_shakes', 0);
  defSub(R, 'trs_dessert', 'Desserts', 'trc_desserts', 0);

  const burgers = ['tri_classic', 'tri_bombay', 'tri_mexican'];
  defVariant(R, 'trv_patty', 'Patty', { mandatory: true, respectParent: true, items: burgers, catAssoc: ['trc_burgers'], description: 'Choose your patty', options: [{ id: 'chicken', name: 'Chicken', price: 0 }, { id: 'mutton', name: 'Mutton', price: 70 }, { id: 'veg', name: 'Veg Patty', price: 0 }] });
  defAddon(R, 'tra_cheese', 'Cheese Slice', 40, { respectParent: false, items: burgers, catAssoc: ['trc_burgers'] });
  defAddon(R, 'tra_bacon', 'Bacon', 90, { respectParent: false, items: burgers, catAssoc: ['trc_burgers'] });
  defAddon(R, 'tra_egg', 'Fried Egg', 30, { respectParent: false, items: burgers, catAssoc: ['trc_burgers'] });
  defAddon(R, 'tra_patty', 'Extra Patty', 110, { respectParent: true, items: burgers, catAssoc: ['trc_burgers'], description: 'respectParent TRUE — inherits item discount' });

  defItem(R, 'tri_classic', 'Classic Truffles Burger', 300, { cat: 'trc_burgers', sub: 'trs_burgers', disc: 0, diet: 'NON_VEG', variants: ['trv_patty'], addons: ['tra_cheese', 'tra_bacon', 'tra_egg', 'tra_patty'] });
  defItem(R, 'tri_bombay', 'Bombay Burger', 340, { cat: 'trc_burgers', sub: 'trs_burgers', disc: 10, diet: 'NON_VEG', variants: ['trv_patty'], addons: ['tra_cheese', 'tra_bacon', 'tra_egg', 'tra_patty'] });
  defItem(R, 'tri_mexican', 'Mexican Burger', 320, { cat: 'trc_burgers', sub: 'trs_burgers', disc: 0, diet: 'NON_VEG', spice: 3, variants: ['trv_patty'], addons: ['tra_cheese', 'tra_bacon', 'tra_egg', 'tra_patty'] });
  defItem(R, 'tri_steak', 'Grilled Chicken Steak', 420, { cat: 'trc_mains', sub: 'trs_mains', disc: 0, diet: 'NON_VEG' });
  defItem(R, 'tri_fish', 'Fish & Chips', 380, { cat: 'trc_mains', sub: 'trs_mains', disc: 10, diet: 'NON_VEG' });
  defItem(R, 'tri_fries', 'Loaded Fries', 180, { cat: 'trc_sides', sub: 'trs_sides', disc: 0, diet: 'VEG' });
  defItem(R, 'tri_wings', 'Buffalo Wings', 280, { cat: 'trc_sides', sub: 'trs_sides', disc: 0, diet: 'NON_VEG', spice: 3 });
  defItem(R, 'tri_shake_choc', 'Death by Chocolate Shake', 220, { cat: 'trc_shakes', sub: 'trs_shakes', disc: 0, diet: 'VEG' });
  defItem(R, 'tri_shake_oreo', 'Oreo Shake', 200, { cat: 'trc_shakes', sub: 'trs_shakes', disc: 0, diet: 'VEG' });
  defItem(R, 'tri_brownie', 'Sizzling Brownie', 260, { cat: 'trc_desserts', sub: 'trs_dessert', disc: 0, diet: 'VEG' });

  defMenu(R, 'menu_tr', 'Truffles Menu', { categoryIds: ['trc_burgers', 'trc_mains', 'trc_sides', 'trc_shakes', 'trc_desserts'], menuItemIds: Object.keys(R.menuItems) });

  defOffer(R, 'off_tr_flat80', '₹80 Off (min ₹299)', { type: 'FLAT', scope: 'ORDER', benefit: { value: 80 }, conditions: { minOrderValue: 299 }, priority: 3, description: 'REAL live offer: FLAT ₹80 off above ₹299' });
  defOffer(R, 'off_tr_bogo_shake', 'BOGO Shakes', { type: 'BOGO', scope: 'CATEGORY', targetIds: ['trc_shakes'], benefit: { buyQuantity: 1, getQuantity: 1 }, priority: 5, description: 'Buy one shake, get the cheapest free' });
  defOffer(R, 'off_tr_burger10', '10% Off Burgers (max ₹100)', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['trc_burgers'], benefit: { value: 10, maxDiscount: 100 }, priority: 6 });

  standardStaff(R, 'tr', 3);
  standardTables(R, 'tr', 10);
  defSession(R, 'ses_tr_active', 'tbl_tr_1', '9876543210', ['9876543210'], 'active', { ageMin: 25 });
  {
    const items = [
      buildCartItem(R, 1, 'tri_classic', 1, 'PENDING', { selVariants: [{ variantId: 'trv_patty', optionId: 'mutton' }], selAddonIds: ['tra_cheese', 'tra_bacon'] }),
      buildCartItem(R, 2, 'tri_fries', 1, 'PENDING', {}),
    ];
    defLiveCart(R, 'tbl_tr_1', 'ses_tr_active', items);
  }

  // Golden: multi-config — Classic burger in 3 builds
  recordItemGolden(R, 'TR_ITEM_classic_mutton_loaded', 'Classic(0%) Mutton patty(+70) + cheese + bacon (addons no-inherit)', { menuItemId: 'tri_classic', selVariants: [{ variantId: 'trv_patty', optionId: 'mutton' }], selAddonIds: ['tra_cheese', 'tra_bacon'] }, ['variant-mandatory', 'addon-no-inherit']);
  recordItemGolden(R, 'TR_ITEM_bombay_extrapatty', 'Bombay(10%) Chicken + Extra Patty(respectParent TRUE inherits 10%) + egg(no-inherit)', { menuItemId: 'tri_bombay', selVariants: [{ variantId: 'trv_patty', optionId: 'chicken' }], selAddonIds: ['tra_patty', 'tra_egg'] }, ['addon-inherit', 'addon-no-inherit', 'item-discount']);
  recordItemGolden(R, 'TR_ITEM_classic_veg_qty2', 'Classic Veg patty × 2 — quantity + zero-price variant', { menuItemId: 'tri_classic', quantity: 2, selVariants: [{ variantId: 'trv_patty', optionId: 'veg' }] }, ['quantity', 'variant-zero-price']);
  // Checkout: burgers → FLAT ₹80 (min 299) vs 10% burger — best wins.
  goldenCheckout(R, 'TR_CHK_flat_vs_category', 'Two burgers → best of FLAT ₹80 vs 10% burgers + 5% service', [
    { menuItemId: 'tri_classic', selVariants: [{ variantId: 'trv_patty', optionId: 'chicken' }], selAddonIds: ['tra_cheese'] },
    { menuItemId: 'tri_bombay', selVariants: [{ variantId: 'trv_patty', optionId: 'mutton' }] },
  ], ['offer-competition', 'charge-service']);
  // Checkout: 2 shakes → BOGO cheapest free.
  goldenCheckout(R, 'TR_CHK_bogo_shakes', 'Choc + Oreo shake → BOGO, Oreo (cheaper) free', [
    { menuItemId: 'tri_shake_choc' }, { menuItemId: 'tri_shake_oreo' },
  ], ['offer-bogo']);

  restaurants.res_truffles = R;
})();

// ═════════════════════════════════════════════════════════════════════════════
// 4) SALT — North Indian fine dining.  SERVICE_CHARGE 8% + GST 5% (two charges).
//    Focus: high-ticket; PERCENTAGE order offer with cap; TWO charges stacking;
//    kebab half/full variant; userHistory loyalty offer.
// ═════════════════════════════════════════════════════════════════════════════
(function buildSalt() {
  const R = newRestaurant('res_salt',
    { name: 'SALT - Indian Restaurant', address: 'UB City, Bengaluru', phone: '8040004444', email: 'hello@salt.test', location: { _latitude: 12.9719, _longitude: 77.5957 }, cuisine: 'North Indian · Kebabs · Tandoori', currency: 'INR', timezone: 'Asia/Kolkata' },
    [{ type: 'SERVICE_CHARGE', percentage: 8 }, { type: 'GST', percentage: 5 }]);
  defKitchen(R, 'kit_salt_tandoor', 'Tandoor');
  defKitchen(R, 'kit_salt_curry', 'Curry Kitchen');

  defCategory(R, 'sc_kebabs', 'Kebabs', { order: 0, subcategoryIds: ['ss_kebab_veg', 'ss_kebab_nonveg'] });
  defCategory(R, 'sc_mains', 'Mains', { order: 1, subcategoryIds: ['ss_mains_veg', 'ss_mains_nonveg'] });
  defCategory(R, 'sc_biryani', 'Biryani', { order: 2, subcategoryIds: ['ss_biryani'] });
  defCategory(R, 'sc_breads', 'Breads', { order: 3, subcategoryIds: ['ss_breads'] });
  defCategory(R, 'sc_desserts', 'Desserts', { order: 4, subcategoryIds: ['ss_dessert'] });

  defSub(R, 'ss_kebab_veg', 'Veg Kebabs', 'sc_kebabs', 0);
  defSub(R, 'ss_kebab_nonveg', 'Non-Veg Kebabs', 'sc_kebabs', 1);
  defSub(R, 'ss_mains_veg', 'Veg Mains', 'sc_mains', 0);
  defSub(R, 'ss_mains_nonveg', 'Non-Veg Mains', 'sc_mains', 1);
  defSub(R, 'ss_biryani', 'Biryani', 'sc_biryani', 0);
  defSub(R, 'ss_breads', 'Breads', 'sc_breads', 0);
  defSub(R, 'ss_dessert', 'Desserts', 'sc_desserts', 0);

  const kebabs = ['si_seekh', 'si_malai_tikka', 'si_paneer_tikka'];
  defVariant(R, 'sv_portion', 'Portion', { mandatory: true, respectParent: true, items: kebabs, catAssoc: ['sc_kebabs'], description: 'Half / Full', options: [{ id: 'half', name: 'Half (3 pc)', price: 0 }, { id: 'full', name: 'Full (6 pc)', price: 220 }] });
  defAddon(R, 'sa_extra_gravy', 'Extra Gravy', 90, { respectParent: false, items: ['si_dal_makhani', 'si_butter_chicken'], catAssoc: ['sc_mains'] });
  defAddon(R, 'sa_mint', 'Mint Chutney', 30, { respectParent: false, items: kebabs, catAssoc: ['sc_kebabs'] });

  defItem(R, 'si_seekh', 'Mutton Seekh Kebab', 560, { cat: 'sc_kebabs', sub: 'ss_kebab_nonveg', disc: 0, diet: 'NON_VEG', spice: 3, variants: ['sv_portion'], addons: ['sa_mint'] });
  defItem(R, 'si_malai_tikka', 'Chicken Malai Tikka', 520, { cat: 'sc_kebabs', sub: 'ss_kebab_nonveg', disc: 0, diet: 'NON_VEG', variants: ['sv_portion'], addons: ['sa_mint'] });
  defItem(R, 'si_paneer_tikka', 'Paneer Tikka', 460, { cat: 'sc_kebabs', sub: 'ss_kebab_veg', disc: 10, diet: 'VEG', variants: ['sv_portion'], addons: ['sa_mint'] });
  defItem(R, 'si_butter_chicken', 'Butter Chicken', 620, { cat: 'sc_mains', sub: 'ss_mains_nonveg', disc: 0, diet: 'NON_VEG', addons: ['sa_extra_gravy'] });
  defItem(R, 'si_dal_makhani', 'Dal Makhani', 380, { cat: 'sc_mains', sub: 'ss_mains_veg', disc: 0, diet: 'VEG', addons: ['sa_extra_gravy'] });
  defItem(R, 'si_rogan', 'Rogan Josh', 640, { cat: 'sc_mains', sub: 'ss_mains_nonveg', disc: 10, diet: 'NON_VEG', spice: 3 });
  defItem(R, 'si_hyd_biryani', 'Hyderabadi Biryani', 540, { cat: 'sc_biryani', sub: 'ss_biryani', disc: 0, diet: 'NON_VEG', spice: 3 });
  defItem(R, 'si_naan', 'Garlic Naan', 90, { cat: 'sc_breads', sub: 'ss_breads', disc: 0, diet: 'VEG' });
  defItem(R, 'si_phirni', 'Rose Phirni', 220, { cat: 'sc_desserts', sub: 'ss_dessert', disc: 0, diet: 'VEG' });

  defMenu(R, 'menu_salt', 'SALT Menu', { categoryIds: ['sc_kebabs', 'sc_mains', 'sc_biryani', 'sc_breads', 'sc_desserts'], menuItemIds: Object.keys(R.menuItems) });

  // Real "50% OFF" modeled with a realistic cap so it doesn't zero high tickets.
  defOffer(R, 'off_salt_50cap', '50% Off (max ₹300)', { type: 'PERCENTAGE', scope: 'ORDER', benefit: { value: 50, maxDiscount: 300 }, priority: 3, description: 'REAL live offer: FLAT 50% OFF (capped ₹300 for realism)' });
  defOffer(R, 'off_salt_bogo_kebab', 'BOGO Paneer Tikka', { type: 'BOGO', scope: 'ITEM', targetIds: ['si_paneer_tikka'], benefit: { buyQuantity: 1, getQuantity: 1 }, priority: 6 });
  defOffer(R, 'off_salt_loyalty', 'Loyalty 12% (≥2 prior orders, max ₹400)', { type: 'PERCENTAGE', scope: 'ORDER', benefit: { value: 12, maxDiscount: 400 }, conditions: { userHistory: { minOrderCount: 2 } }, priority: 2, description: 'Repeat-guest reward — needs ≥2 prior orders' });

  standardStaff(R, 'salt', 4);
  standardTables(R, 'salt', 10);
  defSession(R, 'ses_salt_active', 'tbl_salt_1', '9876543210', ['9876543210'], 'active', { ageMin: 40 });

  // TWO real prior COMPLETED orders on ses_salt_active — the backend derives
  // userHistory.totalOrderCount by QUERYING orders where sessionId matches
  // (evaluateOrderOffers.js), so the loyalty offer (minOrderCount: 2) only
  // unlocks if these actually exist. Required by SALT_CHK_loyalty_history.
  {
    const prior1 = [buildCartItem(R, 1, 'si_hyd_biryani', 1, 'SERVED', {})];
    const snap1 = cartSnapshot(R, 'cart_salt_prior1', 'SERVED', prior1, { userId: '9876543210', ageMin: 180 });
    defOrder(R, 'ord_salt_prior1', 'SALT-0001', { tableId: 'tbl_salt_1', sessionId: 'ses_salt_active', customerId: '9876543210', orderStatus: 'COMPLETED', paymentStatus: 'paid', snapshots: [snap1], assignedServer: 'srv_salt_1', ageMin: 180 });
    const prior2 = [buildCartItem(R, 1, 'si_naan', 2, 'SERVED', {}), buildCartItem(R, 2, 'si_phirni', 1, 'SERVED', {})];
    const snap2 = cartSnapshot(R, 'cart_salt_prior2', 'SERVED', prior2, { userId: '9876543210', ageMin: 120 });
    defOrder(R, 'ord_salt_prior2', 'SALT-0002', { tableId: 'tbl_salt_1', sessionId: 'ses_salt_active', customerId: '9876543210', orderStatus: 'COMPLETED', paymentStatus: 'paid', snapshots: [snap2], assignedServer: 'srv_salt_1', ageMin: 120 });
  }
  {
    const items = [
      buildCartItem(R, 1, 'si_butter_chicken', 1, 'PENDING', { selAddonIds: ['sa_extra_gravy'] }),
      buildCartItem(R, 2, 'si_seekh', 1, 'PENDING', { selVariants: [{ variantId: 'sv_portion', optionId: 'full' }] }),
      buildCartItem(R, 3, 'si_naan', 2, 'PENDING', {}),
    ];
    defLiveCart(R, 'tbl_salt_1', 'ses_salt_active', items);
  }

  // Golden: kebab full portion (respectParent inherit N/A at 0%); paneer 10% half.
  recordItemGolden(R, 'SALT_ITEM_seekh_full', 'Mutton Seekh Full portion(+220, respectParent TRUE, item 0%) + mint(no-inherit)', { menuItemId: 'si_seekh', selVariants: [{ variantId: 'sv_portion', optionId: 'full' }], selAddonIds: ['sa_mint'] }, ['variant-respectparent-true', 'addon-no-inherit']);
  recordItemGolden(R, 'SALT_ITEM_paneer_full_disc', 'Paneer Tikka(10%) Full(+220 inherits 10%) — variant respectParent TRUE with discount', { menuItemId: 'si_paneer_tikka', selVariants: [{ variantId: 'sv_portion', optionId: 'full' }] }, ['variant-respectparent-true', 'item-discount']);
  // Checkout: high-ticket → 50% cap ₹300 + 8% service + 5% GST (two charges).
  goldenCheckout(R, 'SALT_CHK_50cap_twocharges', 'Butter chicken + full seekh → 50% (cap ₹300) + 8% service + 5% GST', [
    { menuItemId: 'si_butter_chicken' },
    { menuItemId: 'si_seekh', selVariants: [{ variantId: 'sv_portion', optionId: 'full' }] },
  ], ['offer-percentage-cap', 'charge-service', 'charge-gst', 'multi-charge']);
  // Checkout: userHistory-gated loyalty. Big ticket (base ₹2780 > ₹2500) so 12%
  // (=333.6, cap 400) BEATS 50%-cap-300 — loyalty is the deciding offer, and it
  // only unlocks because ses_salt_active has 2 seeded prior COMPLETED orders
  // (backend queries orders by sessionId). Runner must execute this on
  // tbl_salt_1 / ses_salt_active, NOT a fresh table.
  goldenCheckout(R, 'SALT_CHK_loyalty_history', 'Big ticket, returning guest (2 seeded prior orders) → loyalty 12% (₹333.6) beats 50%-cap (₹300)', [
    { menuItemId: 'si_seekh', selVariants: [{ variantId: 'sv_portion', optionId: 'full' }] },
    { menuItemId: 'si_malai_tikka', selVariants: [{ variantId: 'sv_portion', optionId: 'full' }] },
    { menuItemId: 'si_butter_chicken' },
    { menuItemId: 'si_rogan' },
  ], ['offer-userhistory', 'requires-session-history'], { totalOrderCount: 2, sessionOrderCount: 0 });

  restaurants.res_salt = R;
})();

// ═════════════════════════════════════════════════════════════════════════════
// 5) CHOWMAN — Premium Chinese.  SERVICE_CHARGE 6% + GLOBAL_DISCOUNT -5% (negative).
//    Focus: negative charge (Charges V1); portion variant; addon respectParent
//    FALSE; FLAT ₹80 (min ₹199) real offer + userHistory.
// ═════════════════════════════════════════════════════════════════════════════
(function buildChowman() {
  const R = newRestaurant('res_chowman',
    { name: 'Chowman', address: 'Koramangala, Bengaluru', phone: '8040005555', email: 'hello@chowman.test', location: { _latitude: 12.9345, _longitude: 77.6266 }, cuisine: 'Authentic Chinese', currency: 'INR', timezone: 'Asia/Kolkata' },
    [{ type: 'SERVICE_CHARGE', percentage: 6 }, { type: 'LOYALTY_DISCOUNT', percentage: -5 }]);
  defKitchen(R, 'kit_cw_wok', 'Wok Station');

  defCategory(R, 'cc_starters', 'Starters', { order: 0, subcategoryIds: ['cs_st_veg', 'cs_st_nonveg'] });
  defCategory(R, 'cc_mains', 'Mains', { order: 1, subcategoryIds: ['cs_noodles', 'cs_rice', 'cs_gravy'] });
  defCategory(R, 'cc_beverages', 'Beverages', { order: 2, subcategoryIds: ['cs_bev'] });

  defSub(R, 'cs_st_veg', 'Veg Starters', 'cc_starters', 0);
  defSub(R, 'cs_st_nonveg', 'Non-Veg Starters', 'cc_starters', 1);
  defSub(R, 'cs_noodles', 'Noodles', 'cc_mains', 0);
  defSub(R, 'cs_rice', 'Fried Rice', 'cc_mains', 1);
  defSub(R, 'cs_gravy', 'Gravy', 'cc_mains', 2);
  defSub(R, 'cs_bev', 'Beverages', 'cc_beverages', 0);

  const mains = ['ci_hakka', 'ci_schezwan_rice', 'ci_chilli_chicken'];
  defVariant(R, 'cv_portion', 'Portion', { mandatory: true, respectParent: true, items: mains, catAssoc: ['cc_mains'], description: 'Half / Full', options: [{ id: 'half', name: 'Half', price: 0 }, { id: 'full', name: 'Full', price: 120 }] });
  defVariant(R, 'cv_spice', 'Spice', { mandatory: false, respectParent: true, items: mains, catAssoc: ['cc_mains'], description: 'Non-priced spice level', options: [{ id: 'mild', name: 'Mild', price: 0 }, { id: 'spicy', name: 'Spicy', price: 0 }, { id: 'schezwan', name: 'Extra Schezwan', price: 0 }] });
  defAddon(R, 'ca_prawns', 'Add Prawns', 140, { respectParent: false, items: ['ci_hakka', 'ci_schezwan_rice'], catAssoc: ['cc_mains'] });
  defAddon(R, 'ca_sauce', 'Extra Schezwan Sauce', 40, { respectParent: false, items: mains, catAssoc: ['cc_mains'] });

  defItem(R, 'ci_spring_roll', 'Veg Spring Roll', 220, { cat: 'cc_starters', sub: 'cs_st_veg', disc: 0, diet: 'VEG' });
  defItem(R, 'ci_chilli_paneer', 'Chilli Paneer', 300, { cat: 'cc_starters', sub: 'cs_st_veg', disc: 10, diet: 'VEG', spice: 3 });
  defItem(R, 'ci_chicken_lollipop', 'Chicken Lollipop', 340, { cat: 'cc_starters', sub: 'cs_st_nonveg', disc: 0, diet: 'NON_VEG', spice: 3 });
  defItem(R, 'ci_hakka', 'Hakka Noodles', 280, { cat: 'cc_mains', sub: 'cs_noodles', disc: 0, diet: 'VEG', variants: ['cv_portion', 'cv_spice'], addons: ['ca_prawns', 'ca_sauce'] });
  defItem(R, 'ci_schezwan_rice', 'Schezwan Fried Rice', 300, { cat: 'cc_mains', sub: 'cs_rice', disc: 0, diet: 'VEG', spice: 3, variants: ['cv_portion', 'cv_spice'], addons: ['ca_prawns', 'ca_sauce'] });
  defItem(R, 'ci_chilli_chicken', 'Chilli Chicken Gravy', 360, { cat: 'cc_mains', sub: 'cs_gravy', disc: 10, diet: 'NON_VEG', spice: 3, variants: ['cv_portion', 'cv_spice'], addons: ['ca_sauce'] });
  defItem(R, 'ci_manchurian', 'Veg Manchurian', 280, { cat: 'cc_mains', sub: 'cs_gravy', disc: 0, diet: 'VEG', spice: 2 });
  defItem(R, 'ci_coke', 'Coke', 60, { cat: 'cc_beverages', sub: 'cs_bev', disc: 0, diet: 'VEG' });
  defItem(R, 'ci_lime_soda', 'Fresh Lime Soda', 90, { cat: 'cc_beverages', sub: 'cs_bev', disc: 0, diet: 'VEG' });

  defMenu(R, 'menu_cw', 'Chowman Menu', { categoryIds: ['cc_starters', 'cc_mains', 'cc_beverages'], menuItemIds: Object.keys(R.menuItems) });

  defOffer(R, 'off_cw_flat80', '₹80 Off (min ₹199)', { type: 'FLAT', scope: 'ORDER', benefit: { value: 80 }, conditions: { minOrderValue: 199 }, priority: 3, description: 'REAL live offer: FLAT ₹80 off above ₹199' });
  defOffer(R, 'off_cw_starters10', '10% Off Starters (max ₹80)', { type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: ['cc_starters'], benefit: { value: 10, maxDiscount: 80 }, priority: 5 });
  defOffer(R, 'off_cw_loyalty', 'Loyalty 15% (≥1 prior order, max ₹250)', { type: 'PERCENTAGE', scope: 'ORDER', benefit: { value: 15, maxDiscount: 250 }, conditions: { userHistory: { minOrderCount: 1 } }, priority: 2 });
  defOffer(R, 'off_cw_future', 'Upcoming Festival Offer', { type: 'FLAT', scope: 'ORDER', benefit: { value: 300 }, startOffset: 30 * DAY, endOffset: 90 * DAY, description: 'NEGATIVE: starts in the future' });

  standardStaff(R, 'cw', 5);
  standardTables(R, 'cw', 10);
  defSession(R, 'ses_cw_active', 'tbl_cw_1', '9876543210', ['9876543210'], 'active', { ageMin: 20 });
  {
    const items = [
      buildCartItem(R, 1, 'ci_hakka', 1, 'PENDING', { selVariants: [{ variantId: 'cv_portion', optionId: 'full' }], selAddonIds: ['ca_prawns'] }),
      buildCartItem(R, 2, 'ci_chilli_chicken', 1, 'PENDING', { selVariants: [{ variantId: 'cv_portion', optionId: 'full' }] }),
    ];
    defLiveCart(R, 'tbl_cw_1', 'ses_cw_active', items);
  }

  // Golden: full portion + prawns (no-inherit) on 0% item.
  recordItemGolden(R, 'CW_ITEM_hakka_full_prawns', 'Hakka Full(+120 respectParent TRUE, item 0%) + prawns(₹140 no-inherit) + spicy(zero-price)', { menuItemId: 'ci_hakka', selVariants: [{ variantId: 'cv_portion', optionId: 'full' }, { variantId: 'cv_spice', optionId: 'spicy' }], selAddonIds: ['ca_prawns'] }, ['variant-respectparent-true', 'addon-no-inherit', 'variant-zero-price']);
  recordItemGolden(R, 'CW_ITEM_chilli_full_disc', 'Chilli Chicken(10%) Full(+120 inherits 10%) — variant respectParent TRUE with discount', { menuItemId: 'ci_chilli_chicken', selVariants: [{ variantId: 'cv_portion', optionId: 'full' }] }, ['variant-respectparent-true', 'item-discount']);
  // Checkout: NEGATIVE charge — grand total below finalPrice. FLAT ₹80 + 6% service - 5% loyalty.
  goldenCheckout(R, 'CW_CHK_negative_charge', 'Two full mains → FLAT ₹80 + 6% service − 5% loyalty (negative charge nets ~+1%)', [
    { menuItemId: 'ci_hakka', selVariants: [{ variantId: 'cv_portion', optionId: 'full' }] },
    { menuItemId: 'ci_schezwan_rice', selVariants: [{ variantId: 'cv_portion', optionId: 'full' }] },
  ], ['offer-flat-order', 'charge-service', 'charge-negative']);
  // Checkout: offer COMPETITION — 10% starters (₹61) loses to FLAT ₹80.
  goldenCheckout(R, 'CW_CHK_starters_category', 'Chilli paneer + lollipop → FLAT ₹80 beats 10% starters (₹61); charges applied', [
    { menuItemId: 'ci_chilli_paneer' }, { menuItemId: 'ci_chicken_lollipop' },
  ], ['offer-competition', 'charge-negative']);

  restaurants.res_chowman = R;
})();

// ═════════════════════════════════════════════════════════════════════════════
// Customers + system docs
// ═════════════════════════════════════════════════════════════════════════════
const customers = {
  '9876543210': { phoneNumber: '9876543210', name: 'Customer One', email: 'c1@example.com', createdAt: ts(-200 * DAY), updatedAt: ts(-2 * HOUR), visits: [{ restaurantId: 'res_meghana', tableId: 'tbl_meg_1', startTime: ts(-40 * MIN) }], currentVisit: { restaurantId: 'res_meghana', tableId: 'tbl_meg_1', startTime: ts(-40 * MIN) }, preferences: { favoriteItems: ['mi_chicken_bir'], dietaryRestrictions: [] } },
  '9876543211': { phoneNumber: '9876543211', name: 'Customer Two', email: 'c2@example.com', createdAt: ts(-1 * DAY), updatedAt: ts(-1 * DAY), visits: [], preferences: { favoriteItems: [], dietaryRestrictions: ['VEG'] } },
  '9876543212': { phoneNumber: '9876543212', name: 'Karthik Menon', email: 'karthik@example.com', createdAt: ts(-400 * DAY), updatedAt: ts(-3 * DAY), visits: [], preferences: { favoriteItems: ['si_butter_chicken'], dietaryRestrictions: [] } },
};
const systemDocs = {
  featureFlagOverrides: { isOtpManadatoryAtScan: true, isUsernameEnabled: true, isMultiUserSupportEnabled: false, sendServerNotifications: false },
};

// ═════════════════════════════════════════════════════════════════════════════
// Assemble + integrity + write
// ═════════════════════════════════════════════════════════════════════════════
const errors = runIntegrity(Object.values(restaurants));
if (errors.length) {
  console.error(`\n❌ INTEGRITY ERRORS (${errors.length}):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

const out = {
  _meta: {
    description: '5 big Bangalore restaurants (real skeletons via Apify) with engineered Plattr construct matrix. Generated by buildMockData7.js.',
    generatedAtUnix: kit.NOW,
    testCredentials: {
      otp: TEST_OTP,
      serverPassword: SERVER_PW,
      customers: ['9876543210 (Customer One)', '9876543211 (first-time VEG)', '9876543212 (returning)'],
      // EASY LOGIN, one rule: username is `<app>@<slug>.test`, password is always `1234`.
      // So the server app takes server@meg.test, the kitchen app kitchen@meg.test, the admin
      // app admin@meg.test. manager@ and server2@ exist everywhere too, for approvals and for
      // two-waiter scenarios. Slugs: meg, pb, tr, salt, cw.
      rule: '<app>@<slug>.test / 1234',
      slugs: { res_meghana: 'meg', res_pizzabakery: 'pb', res_truffles: 'tr', res_salt: 'salt', res_chowman: 'cw' },
      roles: ['admin', 'manager', 'server', 'server2', 'kitchen'],
      example: { restaurantId: 'res_meghana', username: 'server@meg.test', password: '1234' },
    },
    goldenFixture: 'goldenExpectedValues.json',
    note: 'Run importMockData5.js with --refresh-timestamps to make timestamps relative to import time.',
  },
  _system: systemDocs,
  restaurants: Object.fromEntries(Object.entries(restaurants).map(([id, R]) => [id, stripPrivate(R)])),
  customers,
};

const outArg = process.argv.find(a => a.startsWith('--out='));
const outPath = outArg ? path.resolve(outArg.split('=')[1]) : path.join(__dirname, 'MockData7ProductionMenus.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

const goldenPath = path.join(__dirname, 'goldenExpectedValues.json');
golden.note = 'Independent expected values computed by seedKit math (mirrors backend). E2E asserts LIVE backend ↔ these. Divergence = regression or model gap.';
golden.credentials = { otp: TEST_OTP, serverPassword: SERVER_PW };
fs.writeFileSync(goldenPath, JSON.stringify(golden, null, 2));

const sum = (R) => ({ items: Object.keys(R.menuItems).length, cats: Object.keys(R.categories).length, variants: Object.keys(R.variants).length, addons: Object.keys(R.addons).length, offers: Object.keys(R.offers).length, tables: Object.keys(R.tables).length, orders: Object.keys(R.orders).length });
console.log(`✅ Wrote ${outPath}`);
for (const [id, R] of Object.entries(restaurants)) console.log(`   ${id.padEnd(18)}:`, JSON.stringify(sum(R)));
console.log(`✅ Wrote ${goldenPath}  (${golden.scenarios.length} golden scenarios)`);
console.log(`   Integrity: OK  |  Customers: ${Object.keys(customers).length}`);
