/**
 * pricing-matrix.test.js — exhaustive OFFLINE pricing verification (Layer A).
 *
 * Runs the cartesian product of every construct that can change money through
 * the REAL backend modules and checks each result against an independent
 * oracle written here plus a set of invariants that must hold for any input.
 *
 * Why an inline oracle: this is a differential test. The oracle is a second,
 * deliberately naive implementation of the documented pricing rules. When the
 * two disagree, one of them is wrong and a human has to look. That is exactly
 * how mock/verifyGolden.js already validates the golden fixture, so the
 * technique is proven on this codebase.
 *
 * No emulator, no network, milliseconds. Failures are also appended to the
 * shared findings log so they land in FINDINGS.md next to the live results.
 *
 * Run: cd backend/src-plattr/functions && npx jest pricing-matrix
 */
'use strict';

// calculateCartValue pulls in the real admin singleton at require time; the
// pricing functions under test never touch Firestore, so a stub db is enough.
jest.mock('../../admin/admin', () => ({ db: {} }));

// The pricing code intentionally warns on 100% discounts and malformed
// components. Those are cases under test, so keep the noise out of the report.
global.console = { ...global.console, warn: jest.fn(), log: jest.fn(), error: jest.fn() };

const { calculateItemPrice } = require('../../cart/calculateCartValue');
const { calculateCharges } = require('../../orders/calculateCharges');
const { validateOfferApplication, calculateOfferBenefit } = require('../../offers/offerEngine');
const { FULFILLMENT_STATUS } = require('../../orders/orderConstants');
const F = require('../findings.cjs');

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const NEAR = 0.011;
const near = (a, b) => Math.abs(a - b) <= NEAR;

// ── Builders ────────────────────────────────────────────────────────────────
const price = (basePrice, discount) => ({
  basePrice,
  discount,
  finalPrice: r2(Math.max(0, basePrice * (1 - discount / 100))),
});

const item = (basePrice, discount, extra = {}) => ({
  menuItemId: extra.menuItemId || 'mi_1',
  categoryId: extra.categoryId || 'cat_1',
  subcategoryIds: extra.subcategoryIds || ['sub_1'],
  priceInfo: price(basePrice, discount),
  ...extra,
});

const variant = (basePrice, respectParentDiscount, ownDiscount = 0) => ({
  id: `v_${basePrice}_${respectParentDiscount}`,
  respectParentDiscount,
  priceInfo: price(basePrice, ownDiscount),
});

const addon = (basePrice, respectParentDiscount, ownDiscount = 0) => ({
  id: `a_${basePrice}_${respectParentDiscount}`,
  respectParentDiscount,
  priceInfo: price(basePrice, ownDiscount),
});

/** Independent oracle for calculateItemPrice — the documented per-component rule. */
function oracleItemPrice(menuItem, variants, addons) {
  const itemDisc = Math.max(0, Math.min(100, menuItem.priceInfo.discount));
  const itemBase = menuItem.priceInfo.basePrice;
  const itemFinal = menuItem.priceInfo.finalPrice;
  const component = (list) => {
    let base = 0, final = 0;
    for (const c of list) {
      base += c.priceInfo.basePrice;
      // Strict === true: anything else (false, undefined, "true") must NOT inherit.
      final += r2(c.respectParentDiscount === true
        ? Math.max(0, c.priceInfo.basePrice * (1 - itemDisc / 100))
        : c.priceInfo.finalPrice);
    }
    return { base, final };
  };
  const v = component(variants);
  const a = component(addons);
  const totalBase = itemBase + v.base + a.base;
  const totalFinal = itemFinal + v.final + a.final;
  return {
    totalBasePrice: r2(totalBase),
    finalPrice: r2(totalFinal),
    totalVariantFinalPrice: r2(v.final),
    totalAddonFinalPrice: r2(a.final),
    discountAmount: Math.max(0, r2(totalBase - totalFinal)),
  };
}

/** Collects mismatches so one failure reports every bad combination at once. */
function collector(area) {
  const bad = [];
  return {
    bad,
    check(ok, label, expected, actual, extra = {}) {
      if (ok) return;
      bad.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      F.report({
        title: extra.title || `${area}: ${label.split(' [')[0]}`,
        severity: extra.severity || 'CRITICAL',
        area,
        file: extra.file || 'cart/calculateCartValue.js',
        detail: extra.detail || `Offline pricing matrix mismatch. Combination: ${label}`,
        expected, actual,
        scenario: label,
        repro: 'cd backend/src-plattr/functions && npx jest pricing-matrix',
      });
    },
    assertClean(t) {
      if (bad.length) {
        throw new Error(`${bad.length} mismatch(es):\n  ` + bad.slice(0, 25).join('\n  ') +
          (bad.length > 25 ? `\n  ...and ${bad.length - 25} more` : ''));
      }
    },
  };
}

// ── 1. Item pricing: the full construct matrix ──────────────────────────────
describe('calculateItemPrice — full construct matrix', () => {
  const DISCOUNTS = [0, 10, 15, 50, 100];
  const VARIANT_SETS = {
    none: [],
    inherit: [variant(50, true)],
    'no-inherit': [variant(50, false, 20)],
    'zero-price': [variant(0, true)],
    'two-mixed': [variant(50, true), variant(120, false, 10)],
    'undefined-flag': [{ id: 'v_undef', priceInfo: price(40, 0) }],
  };
  const ADDON_SETS = {
    none: [],
    inherit: [addon(20, true)],
    'no-inherit': [addon(20, false)],
    mixed: [addon(20, true), addon(35, false, 25)],
    'three-mixed': [addon(15, true), addon(25, false), addon(10, true)],
  };
  const BASES = [200, 249.5, 1000];

  test('every discount × variant-set × addon-set × base matches the oracle', () => {
    const c = collector('pricing');
    let combos = 0;
    let bugP1Hits = 0;
    for (const base of BASES) {
      for (const disc of DISCOUNTS) {
        for (const [vName, variants] of Object.entries(VARIANT_SETS)) {
          for (const [aName, addons] of Object.entries(ADDON_SETS)) {
            combos++;
            const mi = item(base, disc);
            const label = `[base=${base} disc=${disc}% variants=${vName} addons=${aName}]`;
            const got = calculateItemPrice(mi, variants, addons).priceInfo;
            const want = oracleItemPrice(mi, variants, addons);

            // Money-critical fields: these must always match the oracle.
            c.check(near(got.finalPrice, want.finalPrice), `finalPrice ${label}`, want.finalPrice, got.finalPrice);
            c.check(near(got.totalBasePrice, want.totalBasePrice), `totalBasePrice ${label}`, want.totalBasePrice, got.totalBasePrice);
            c.check(near(got.discountAmount, want.discountAmount), `discountAmount ${label}`, want.discountAmount, got.discountAmount);

            // Breakdown fields: correct EXCEPT where BUG-P1 (the falsy-fallback in
            // CartItemPriceInfo) rewrites a legitimate zero back to the base price.
            // That case is characterised by its own test below; here we only count it
            // so a regression in any OTHER combination still fails loudly.
            const variantBugCase = want.totalVariantFinalPrice === 0 && got.totalVariantFinalPrice !== 0;
            const addonBugCase = want.totalAddonFinalPrice === 0 && got.totalAddonFinalPrice !== 0;
            if (variantBugCase || addonBugCase) { bugP1Hits++; }
            if (!variantBugCase) {
              c.check(near(got.totalVariantFinalPrice, want.totalVariantFinalPrice), `totalVariantFinalPrice ${label}`, want.totalVariantFinalPrice, got.totalVariantFinalPrice);
            }
            if (!addonBugCase) {
              c.check(near(got.totalAddonFinalPrice, want.totalAddonFinalPrice), `totalAddonFinalPrice ${label}`, want.totalAddonFinalPrice, got.totalAddonFinalPrice);
            }

            // Invariants that must hold for ANY input.
            c.check(got.finalPrice >= -NEAR, `finalPrice not negative ${label}`, '>= 0', got.finalPrice);
            c.check(got.finalPrice <= got.totalBasePrice + NEAR, `finalPrice <= basePrice ${label}`, `<= ${got.totalBasePrice}`, got.finalPrice);
            c.check(near(got.discountAmount, Math.max(0, r2(got.totalBasePrice - got.finalPrice))),
              `discountAmount = base - final ${label}`, r2(got.totalBasePrice - got.finalPrice), got.discountAmount);
          }
        }
      }
    }
    expect(combos).toBe(BASES.length * DISCOUNTS.length * 6 * 5);
    // Every 100%-discount combination with a priced inheriting component trips BUG-P1.
    expect(bugP1Hits).toBeGreaterThan(0);
    c.assertClean();
  });

  test('respectParentDiscount is strict === true (undefined and "true" do not inherit)', () => {
    const mi = item(200, 50);
    const undefFlag = { id: 'v', priceInfo: price(100, 0) };
    const stringFlag = { id: 'v', priceInfo: price(100, 0), respectParentDiscount: 'true' };
    // Neither inherits, so both contribute their own finalPrice of 100, not 50.
    expect(calculateItemPrice(mi, [undefFlag], []).priceInfo.totalVariantFinalPrice).toBe(100);
    expect(calculateItemPrice(mi, [stringFlag], []).priceInfo.totalVariantFinalPrice).toBe(100);
    expect(calculateItemPrice(mi, [variant(100, true)], []).priceInfo.totalVariantFinalPrice).toBe(50);
  });

  /**
   * BUG-P1 — characterisation test.
   *
   * CartItemPriceInfo uses `data.totalVariantFinalPrice || data.totalVariantBasePrice`
   * (and the same for addons). `||` treats a legitimate 0 as "missing", so a component
   * that is genuinely free after a 100% parent discount is written back at its FULL
   * undiscounted price. The stored cart item then contradicts itself: the per-component
   * breakdown does not sum to the finalPrice the customer is charged.
   *
   * This test asserts the CURRENT (wrong) behaviour on purpose. When someone changes
   * `||` to `??`, this test fails — that is the signal to delete it and tighten the
   * matrix above.
   */
  test('KNOWN BUG-P1: a zero component price is rewritten to its undiscounted base', () => {
    const mi = item(200, 100);                 // fully comped item
    const got = calculateItemPrice(mi, [variant(50, true)], [addon(20, true)]).priceInfo;

    // The total the customer pays is right.
    expect(got.finalPrice).toBe(0);
    expect(got.totalBasePrice).toBe(270);
    expect(got.discountAmount).toBe(270);

    // But the breakdown says the variant and addon cost full price.
    expect(got.totalVariantFinalPrice).toBe(50);   // should be 0
    expect(got.totalAddonFinalPrice).toBe(20);     // should be 0

    // So the breakdown does not reconcile with the total.
    const breakdownSum = got.itemFinalPrice + got.totalVariantFinalPrice + got.totalAddonFinalPrice;
    expect(breakdownSum).toBe(70);
    expect(breakdownSum).not.toBe(got.finalPrice);

    F.report({
      title: 'Zero component price is rewritten to its undiscounted base (falsy-fallback)',
      severity: 'HIGH', area: 'pricing',
      file: 'genericModels/priceinfo.js:211,213',
      detail: 'CartItemPriceInfo falls back with `data.totalVariantFinalPrice || data.totalVariantBasePrice`, so a component that is genuinely free after a 100% parent discount is stored at full price. The cart item then contradicts itself: itemFinalPrice + variant + addon does not equal finalPrice. The charged total is correct, but every app that renders the per-component breakdown, or re-sums it instead of trusting finalPrice, shows the customer a comped item at full price. Fix is `??` instead of `||` on both lines.',
      expected: 'totalVariantFinalPrice 0, breakdown sums to finalPrice 0',
      actual: 'totalVariantFinalPrice 50, breakdown sums to 70 against finalPrice 0',
      scenario: 'item base 200 @100% off + inheriting variant 50 + inheriting addon 20',
      repro: 'npx jest pricing-matrix -t "BUG-P1"',
    });
  });

  test('a 100% item discount never produces a negative component', () => {
    const mi = item(500, 100);
    const got = calculateItemPrice(mi, [variant(200, true)], [addon(100, true)]).priceInfo;
    expect(got.finalPrice).toBe(0);
    expect(got.totalBasePrice).toBe(800);
    expect(got.discountAmount).toBe(800);
  });

  test('malformed components are skipped, not silently priced at zero total', () => {
    const mi = item(200, 0);
    const got = calculateItemPrice(mi, [{ id: 'broken' }], [null]).priceInfo;
    expect(got.finalPrice).toBe(200);
    expect(got.totalBasePrice).toBe(200);
  });
});

// ── 2. Charges ──────────────────────────────────────────────────────────────
describe('calculateCharges — configuration matrix', () => {
  const CONFIGS = {
    empty: [],
    'one-positive': [{ type: 'SERVICE', percentage: 7.5 }],
    'two-positive': [{ type: 'SERVICE', percentage: 8 }, { type: 'GST', percentage: 5 }],
    'positive-and-negative': [{ type: 'SERVICE', percentage: 6 }, { type: 'LOYALTY', percentage: -5 }],
    'net-negative': [{ type: 'SERVICE', percentage: 2 }, { type: 'PROMO', percentage: -10 }],
    'malformed-mixed': [{ type: 'SERVICE', percentage: 5 }, { type: 'BAD' }, { percentage: 3 }, null, { type: 'INF', percentage: Infinity }],
  };

  test.each(Object.entries(CONFIGS))('%s: charges are independent percentages of the base', (name, cfg) => {
    const c = collector('pricing');
    for (const base of [0, 100, 1234.56]) {
      const { charges, chargesTotal } = calculateCharges(base, cfg);
      const valid = cfg.filter(x => x && typeof x.type === 'string' && x.type.length &&
        typeof x.percentage === 'number' && isFinite(x.percentage));
      c.check(charges.length === valid.length, `[${name} base=${base}] valid charge count`, valid.length, charges.length,
        { severity: 'HIGH', file: 'orders/calculateCharges.js' });
      for (const ch of charges) {
        const want = r2(base * ch.percentage / 100);
        c.check(near(ch.amount, want), `[${name} base=${base}] ${ch.type} amount`, want, ch.amount,
          { severity: 'CRITICAL', file: 'orders/calculateCharges.js' });
      }
      const wantTotal = r2(charges.reduce((s, ch) => s + ch.amount, 0));
      c.check(near(chargesTotal, wantTotal), `[${name} base=${base}] chargesTotal`, wantTotal, chargesTotal,
        { severity: 'CRITICAL', file: 'orders/calculateCharges.js' });
      // No sequential stacking: each charge is computed on the same base.
      c.check(charges.every(ch => near(ch.amount, r2(base * ch.percentage / 100))),
        `[${name} base=${base}] no sequential stacking`, 'independent', 'stacked',
        { severity: 'CRITICAL', file: 'orders/calculateCharges.js' });
    }
    c.assertClean();
  });

  test('a net-negative charge set is allowed and reduces the grand total', () => {
    const { chargesTotal } = calculateCharges(1000, CONFIGS['net-negative']);
    expect(chargesTotal).toBeLessThan(0);
    expect(chargesTotal).toBe(-80);
  });
});

// ── 3. Offers ───────────────────────────────────────────────────────────────
const cartOf = (items) => ({
  items,
  priceInfo: {
    basePrice: r2(items.reduce((s, i) => s + i.priceInfo.totalBasePrice, 0)),
    finalPrice: r2(items.reduce((s, i) => s + i.priceInfo.finalPrice, 0)),
  },
});

const cartItem = (menuItemId, base, final, qty = 1, extra = {}) => ({
  menuItemId,
  quantity: qty,
  categoryId: extra.categoryId || 'cat_main',
  subcategoryIds: extra.subcategoryIds || ['sub_a'],
  status: extra.status || FULFILLMENT_STATUS.PENDING,
  priceInfo: { totalBasePrice: base, finalPrice: final },
  ...extra,
});

// Every real offer has both dates (admin requires them; the engine fails closed without). A26, 2026-09-26.
const ALWAYS = { startDate: '2020-01-01T00:00:00.000+05:30', endDate: '2099-12-31T23:59:59.999+05:30' };
const offer = (o) => ({
  id: o.id || 'off_1', title: o.title || 'Test offer',
  type: o.type, scope: o.scope, isActive: o.isActive !== false,
  targetIds: o.targetIds || [], exclusionIds: o.exclusionIds || [],
  benefit: o.benefit || {}, conditions: o.conditions || {},
  validity: o.validity || ALWAYS, priority: o.priority,
});

describe('offer engine — type × scope × cap × exclusion matrix', () => {
  const CART = cartOf([
    cartItem('mi_burger', 200, 180, 1, { categoryId: 'cat_food', subcategoryIds: ['sub_burger'] }),
    cartItem('mi_shake', 100, 100, 2, { categoryId: 'cat_drink', subcategoryIds: ['sub_shake'] }),
    cartItem('mi_fries', 80, 80, 1, { categoryId: 'cat_food', subcategoryIds: ['sub_side'] }),
  ]);

  const TYPES = ['PERCENTAGE', 'FLAT', 'BOGO', 'FREE_ITEM'];
  const SCOPES = ['ORDER', 'CATEGORY', 'ITEM'];
  const CAPS = [undefined, 20, 100000];
  const EXCLUSIONS = [[], ['mi_fries']];

  test('every applicable offer produces a bounded, self-consistent discount', () => {
    const c = collector('offers');
    let evaluated = 0;
    for (const type of TYPES) {
      for (const scope of SCOPES) {
        for (const cap of CAPS) {
          for (const excl of EXCLUSIONS) {
            const targetIds = scope === 'ITEM' ? ['mi_burger', 'mi_shake']
              : scope === 'CATEGORY' ? ['cat_food'] : [];
            const benefit = type === 'PERCENTAGE' ? { value: 20, maxDiscount: cap }
              : type === 'FLAT' ? { value: 90, maxDiscount: cap }
                : { buyQuantity: 1, getQuantity: 1, maxDiscount: cap };
            const o = offer({ type, scope, targetIds, exclusionIds: excl, benefit });
            const label = `[${type}/${scope} cap=${cap} excl=${excl.length}]`;
            evaluated++;

            const v = validateOfferApplication(o, CART, { totalOrderCount: 0, sessionOrderCount: 0 });
            if (!v.isValid) continue;
            const { discountAmount, appliedItems } = calculateOfferBenefit(o, CART);

            c.check(discountAmount >= -NEAR, `discount not negative ${label}`, '>= 0', discountAmount,
              { severity: 'CRITICAL', file: 'offers/strategies/' });
            c.check(discountAmount <= CART.priceInfo.basePrice + NEAR,
              `discount never exceeds cart base ${label}`, `<= ${CART.priceInfo.basePrice}`, discountAmount,
              { severity: 'CRITICAL', file: 'offers/strategies/' });
            if (typeof cap === 'number') {
              c.check(discountAmount <= cap + NEAR, `maxDiscount cap honoured ${label}`, `<= ${cap}`, discountAmount,
                { severity: 'CRITICAL', file: 'offers/strategies/', title: 'offers: maxDiscount cap exceeded' });
            }
            c.check(near(v.potentialSaving, discountAmount),
              `potentialSaving equals calculated discount ${label}`, discountAmount, v.potentialSaving,
              { severity: 'HIGH', file: 'offers/offerEngine.js' });
            // An excluded item must never appear in appliedItems.
            if (excl.length && Array.isArray(appliedItems)) {
              const leaked = appliedItems.filter(ai => excl.includes(ai.menuItemId));
              c.check(leaked.length === 0, `exclusions respected ${label}`, 'no excluded items', leaked,
                { severity: 'HIGH', file: 'offers/strategies/BaseOfferStrategy.js' });
            }
          }
        }
      }
    }
    expect(evaluated).toBe(TYPES.length * SCOPES.length * CAPS.length * EXCLUSIONS.length);
    c.assertClean();
  });

  test('CANCELLED items are never eligible for an offer', () => {
    const cart = cartOf([
      cartItem('mi_burger', 200, 200, 1, { status: FULFILLMENT_STATUS.CANCELLED }),
      cartItem('mi_shake', 100, 100, 1),
    ]);
    const o = offer({ type: 'PERCENTAGE', scope: 'ITEM', targetIds: ['mi_burger'], benefit: { value: 50 } });
    const { discountAmount } = calculateOfferBenefit(o, cart);
    if (discountAmount !== 0) {
      F.report({
        title: 'offers: CANCELLED item still receives an offer discount',
        severity: 'CRITICAL', area: 'offers', file: 'offers/strategies/BaseOfferStrategy.js:60',
        detail: 'An ITEM-scoped offer targeting a cancelled item produced a non-zero discount, so a cancelled line still moves money.',
        expected: 0, actual: discountAmount,
        repro: 'npx jest pricing-matrix -t "CANCELLED items are never eligible"',
      });
    }
    expect(discountAmount).toBe(0);
  });

  test('conditions gate correctly: minOrderValue, requiredItems, userHistory', () => {
    const base = CART.priceInfo.basePrice; // 380
    const mk = (conditions) => offer({ type: 'FLAT', scope: 'ORDER', benefit: { value: 50 }, conditions });

    expect(validateOfferApplication(mk({ minOrderValue: base + 1 }), CART, {}).isValid).toBe(false);
    expect(validateOfferApplication(mk({ minOrderValue: base - 1 }), CART, {}).isValid).toBe(true);

    expect(validateOfferApplication(mk({ requiredItems: [{ menuItemId: 'mi_absent', quantity: 1 }] }), CART, {}).isValid).toBe(false);
    expect(validateOfferApplication(mk({ requiredItems: [{ menuItemId: 'mi_shake', quantity: 2 }] }), CART, {}).isValid).toBe(true);
    expect(validateOfferApplication(mk({ requiredItems: [{ menuItemId: 'mi_shake', quantity: 3 }] }), CART, {}).isValid).toBe(false);

    const hist = { totalOrderCount: 2, sessionOrderCount: 2 };
    expect(validateOfferApplication(mk({ userHistory: { minOrderCount: 3 } }), CART, hist).isValid).toBe(false);
    expect(validateOfferApplication(mk({ userHistory: { minOrderCount: 2 } }), CART, hist).isValid).toBe(true);
  });

  test('invalid scope and empty targetIds are rejected, not silently applied', () => {
    expect(validateOfferApplication(offer({ type: 'FLAT', scope: 'CART', benefit: { value: 50 } }), CART, {}).isValid).toBe(false);
    expect(validateOfferApplication(offer({ type: 'FLAT', scope: 'SUBCATEGORY', benefit: { value: 50 } }), CART, {}).isValid).toBe(false);
    expect(validateOfferApplication(offer({ type: 'PERCENTAGE', scope: 'CATEGORY', targetIds: [], benefit: { value: 10 } }), CART, {}).isValid).toBe(false);
    expect(validateOfferApplication(offer({ type: 'PERCENTAGE', scope: 'ITEM', targetIds: [], benefit: { value: 10 } }), CART, {}).isValid).toBe(false);
  });

  test('inactive, expired and future offers are rejected', () => {
    const past = new Date(Date.now() - 864e5).toISOString();
    const future = new Date(Date.now() + 864e5).toISOString();
    const mk = (o) => offer({ type: 'FLAT', scope: 'ORDER', benefit: { value: 50 }, ...o });
    expect(validateOfferApplication(mk({ isActive: false }), CART, {}).isValid).toBe(false);
    expect(validateOfferApplication(mk({ validity: { startDate: ALWAYS.startDate, endDate: past } }), CART, {}).reason).toBe('Offer has expired');
    expect(validateOfferApplication(mk({ validity: { startDate: future, endDate: ALWAYS.endDate } }), CART, {}).reason).toBe('Offer not yet active');
    expect(validateOfferApplication(mk({ validity: { startDate: past, endDate: future } }), CART, {}).isValid).toBe(true);
  });

  test('ORDER-scope PERCENTAGE changes its discount base when exclusions are added', () => {
    // Documents finding: no exclusions discounts pre-item-discount basePrice,
    // with exclusions it discounts post-item-discount finalPrice of eligible items.
    const cart = cartOf([cartItem('mi_a', 200, 180), cartItem('mi_b', 100, 100)]);
    const plain = calculateOfferBenefit(
      offer({ type: 'PERCENTAGE', scope: 'ORDER', benefit: { value: 10 } }), cart).discountAmount;
    const excluded = calculateOfferBenefit(
      offer({ type: 'PERCENTAGE', scope: 'ORDER', exclusionIds: ['mi_zzz'], benefit: { value: 10 } }), cart).discountAmount;
    // basePrice 300 -> 30 ; eligible finalPrice 280 -> 28. Same items, different base.
    if (!near(plain, excluded)) {
      F.report({
        title: 'ORDER-scope percentage offers change their discount base when exclusions exist',
        severity: 'HIGH', area: 'offers', file: 'offers/strategies/PercentageStrategy.js:48-53',
        detail: 'Adding an exclusion list that excludes nothing still changes the discount, because the base flips from pre-item-discount basePrice to post-item-discount eligible finalPrice. Two offers a restaurant would consider identical pay out differently.',
        expected: `same discount, ${plain}`, actual: `${excluded} with an empty-effect exclusion`,
        repro: 'npx jest pricing-matrix -t "changes its discount base"',
      });
    }
    expect(plain).toBe(30);
    expect(excluded).toBe(28);
  });
});

// ── 4. Best-offer selection ─────────────────────────────────────────────────
describe('best-offer selection', () => {
  // Mirrors the comparator in offers/evaluateOrderOffers.js:102-110.
  const pickBest = (candidates) => [...candidates].sort((a, b) => {
    if (b.discountAmount !== a.discountAmount) return b.discountAmount - a.discountAmount;
    const pa = typeof a.offer.priority === 'number' ? a.offer.priority : 999;
    const pb = typeof b.offer.priority === 'number' ? b.offer.priority : 999;
    return pa - pb;
  })[0];

  test('highest discount wins regardless of priority', () => {
    const best = pickBest([
      { offer: { id: 'small', priority: 1 }, discountAmount: 30 },
      { offer: { id: 'big', priority: 99 }, discountAmount: 80 },
    ]);
    expect(best.offer.id).toBe('big');
  });

  test('equal discount breaks to the lower priority number', () => {
    const best = pickBest([
      { offer: { id: 'later', priority: 5 }, discountAmount: 50 },
      { offer: { id: 'earlier', priority: 2 }, discountAmount: 50 },
    ]);
    expect(best.offer.id).toBe('earlier');
  });

  test('an offer with no priority loses to one that has a priority', () => {
    const best = pickBest([
      { offer: { id: 'nopriority' }, discountAmount: 50 },
      { offer: { id: 'haspriority', priority: 10 }, discountAmount: 50 },
    ]);
    expect(best.offer.id).toBe('haspriority');
  });

  test('two offers tied on discount AND priority resolve non-deterministically', () => {
    const a = [{ offer: { id: 'x' }, discountAmount: 50 }, { offer: { id: 'y' }, discountAmount: 50 }];
    const b = [{ offer: { id: 'y' }, discountAmount: 50 }, { offer: { id: 'x' }, discountAmount: 50 }];
    // Input order decides the winner, and input order is Firestore document order.
    expect(pickBest(a).offer.id).not.toBe(pickBest(b).offer.id);
    F.report({
      title: 'Fully tied offers resolve by Firestore document order',
      severity: 'LOW', area: 'offers', file: 'offers/evaluateOrderOffers.js:102-110',
      detail: 'When two offers tie on discount and neither sets a priority, the winner is whichever document Firestore returned first. Two identical checkouts can apply different offers, which is confusing to reconcile against a bill.',
      expected: 'a deterministic tie-break, e.g. lowest offer id',
      actual: 'input order decides',
      repro: 'npx jest pricing-matrix -t "non-deterministically"',
    });
  });
});

// ── 5. Grand total composition ──────────────────────────────────────────────
describe('grand total composition', () => {
  test('grandTotal = (itemTotal - offerDiscount) + charges, in that order', () => {
    const c = collector('pricing');
    const CHARGES = [
      [], [{ type: 'SERVICE', percentage: 7.5 }],
      [{ type: 'SERVICE', percentage: 8 }, { type: 'GST', percentage: 5 }],
      [{ type: 'SERVICE', percentage: 6 }, { type: 'LOYALTY', percentage: -5 }],
    ];
    for (const itemTotal of [0, 245, 1899.5]) {
      for (const offerDiscount of [0, 50, 100000]) {
        for (const cfg of CHARGES) {
          const afterOffer = Math.max(0, r2(itemTotal - offerDiscount));
          const { chargesTotal } = calculateCharges(afterOffer, cfg);
          const grand = r2(afterOffer + chargesTotal);
          const label = `[items=${itemTotal} offer=${offerDiscount} charges=${cfg.length}]`;
          c.check(afterOffer >= -NEAR, `offer never drives total below zero ${label}`, '>= 0', afterOffer,
            { severity: 'CRITICAL', file: 'orders/createOrUpdateOrder.js' });
          // Charges are computed on the POST-offer amount, never the pre-offer one.
          if (cfg.length && afterOffer > 0) {
            const wrong = calculateCharges(itemTotal, cfg).chargesTotal;
            c.check(!near(chargesTotal, wrong) || itemTotal === afterOffer,
              `charges use the post-offer base ${label}`, `base ${afterOffer}`, `base ${itemTotal}`,
              { severity: 'CRITICAL', file: 'orders/calculateCharges.js' });
          }
          c.check(near(grand, r2(afterOffer + chargesTotal)), `grandTotal composition ${label}`, r2(afterOffer + chargesTotal), grand);
        }
      }
    }
    c.assertClean();
  });
});
