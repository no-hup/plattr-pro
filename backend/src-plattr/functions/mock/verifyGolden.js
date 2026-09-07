/**
 * verifyGolden.js — offline verification of the golden fixture vs REAL backend code
 * ============================================================================
 * The backend's pricing/offer/charge math is pure (no DB, no emulator), so we can
 * assert goldenExpectedValues.json against the ACTUAL production functions:
 *   - cart/calculateCartValue.js → calculateItemPrice   (per-item pricing)
 *   - offers/strategies/*                                (offer discount math)
 *   - orders/calculateCharges.js → calculateCharges      (service/GST/negative)
 *
 * This is NOT the emulator E2E run — it verifies the GOAL-LINE VALUES are correct
 * against real logic before we ever hit the wire. If this passes, any later E2E
 * failure points at the API/transaction layer, not the pricing model.
 *
 * USAGE:  node mock/verifyGolden.js
 * Exit 0 = all golden scenarios reproduce with real backend code; 1 = mismatch.
 * ============================================================================
 */
'use strict';
const path = require('path');
const seed = require('./MockData7ProductionMenus.json');
const golden = require('./goldenExpectedValues.json');
const { calculateItemPrice } = require('../cart/calculateCartValue.js');
const { calculateCharges } = require('../orders/calculateCharges.js');
const PercentageStrategy = require('../offers/strategies/PercentageStrategy.js');
const FlatStrategy = require('../offers/strategies/FlatStrategy.js');
const BogoStrategy = require('../offers/strategies/BogoStrategy.js');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const TOL = 0.05;
let pass = 0, fail = 0;
const failures = [];

function near(a, b) { return Math.abs(a - b) <= TOL; }
function R(rid) { return seed.restaurants[rid]; }

// Rebuild the per-item inputs the backend calculateItemPrice expects, from the seed.
function itemInputs(rest, spec) {
  const mi = rest.menuItems[spec.menuItemId];
  const selectedVariants = (spec.selVariants || []).map(sv => {
    const v = rest.variants[sv.variantId];
    const opt = v.options.find(o => o.id === sv.optionId);
    return { priceInfo: opt.priceInfo, respectParentDiscount: v.respectParentDiscount };
  });
  const addonDetails = (spec.selAddonIds || []).map(aid => {
    const a = rest.addons[aid];
    return { priceInfo: a.priceInfo, respectParentDiscount: a.respectParentDiscount };
  });
  return { menuItem: { priceInfo: mi.priceInfo }, selectedVariants, addonDetails };
}

// Per-unit item price via REAL backend function (calculateItemPrice is per-unit).
function realItemUnit(rest, spec) {
  const { menuItem, selectedVariants, addonDetails } = itemInputs(rest, spec);
  return calculateItemPrice(menuItem, selectedVariants, addonDetails).priceInfo;
}

function strategyFor(type) {
  if (type === 'PERCENTAGE') return new PercentageStrategy();
  if (type === 'FLAT') return new FlatStrategy();
  if (type === 'BOGO' || type === 'FREE_ITEM') return new BogoStrategy();
  return null;
}

// Build a virtual cart (backend-shape) from item specs using REAL per-item pricing.
function virtualCart(rest, specs) {
  const items = specs.map((s, i) => {
    const unit = realItemUnit(rest, s);
    const q = s.quantity || 1;
    const mi = rest.menuItems[s.menuItemId];
    return {
      menuItemId: s.menuItemId, cartItemId: i + 1, quantity: q,
      categoryId: mi.categoryId, subcategoryIds: mi.subcategoryIds, status: 'PENDING',
      priceInfo: {
        totalBasePrice: round2(unit.totalBasePrice * q),
        finalPrice: round2(unit.finalPrice * q),
      },
    };
  });
  const basePrice = round2(items.reduce((s, i) => s + i.priceInfo.totalBasePrice, 0));
  return { items, priceInfo: { basePrice, finalPrice: basePrice } };
}

function check(id, label, got, exp) {
  if (near(got, exp)) { pass++; return true; }
  fail++; failures.push(`  ✗ ${id} :: ${label}  expected ${exp}, got ${round2(got)}`);
  return false;
}

for (const sc of golden.scenarios) {
  const rest = R(sc.restaurantId);
  if (sc.kind === 'item') {
    // calculateItemPrice is per-unit; golden expected is per-unit × quantity.
    const q = sc.input.quantity || 1;
    const unit = realItemUnit(rest, sc.input);
    check(sc.scenarioId, 'itemBasePrice', round2(unit.itemBasePrice * q), sc.expected.itemBasePrice);
    check(sc.scenarioId, 'itemFinalPrice', round2(unit.itemFinalPrice * q), sc.expected.itemFinalPrice);
    check(sc.scenarioId, 'totalVariantFinalPrice', round2(unit.totalVariantFinalPrice * q), sc.expected.totalVariantFinalPrice);
    check(sc.scenarioId, 'totalAddonFinalPrice', round2(unit.totalAddonFinalPrice * q), sc.expected.totalAddonFinalPrice);
    check(sc.scenarioId, 'totalBasePrice', round2(unit.totalBasePrice * q), sc.expected.totalBasePrice);
    check(sc.scenarioId, 'finalPrice', round2(unit.finalPrice * q), sc.expected.finalPrice);
    check(sc.scenarioId, 'discountAmount', round2(unit.discountAmount * q), sc.expected.discountAmount);
  } else if (sc.kind === 'checkout') {
    const cart = virtualCart(rest, sc.input.items);
    const itemFinal = round2(cart.items.reduce((s, i) => s + i.priceInfo.finalPrice, 0));
    check(sc.scenarioId, 'basePrice', cart.priceInfo.basePrice, sc.expected.basePrice);
    check(sc.scenarioId, 'itemFinalPrice(pre-offer)', itemFinal, sc.expected.itemFinalPrice);

    // Offer: run the REAL strategy for the golden's applied offer (if any).
    let offerDiscount = 0;
    if (sc.expected.appliedOfferId) {
      const offer = rest.offers[sc.expected.appliedOfferId];
      const strat = strategyFor(offer.type);
      offerDiscount = strat.calculate(offer, cart).discountAmount;
    }
    check(sc.scenarioId, 'offerDiscount', offerDiscount, sc.expected.offerDiscount);

    const postOffer = round2(Math.max(0, itemFinal - offerDiscount));
    check(sc.scenarioId, 'finalPriceAfterOffer', postOffer, sc.expected.finalPriceAfterOffer);

    // Charges: REAL calculateCharges on the restaurant's billing config.
    const chargesCfg = ((rest.config || {}).settings || {}).billing?.charges || [];
    const { chargesTotal } = calculateCharges(postOffer, chargesCfg);
    check(sc.scenarioId, 'chargesTotal', round2(chargesTotal), sc.expected.chargesTotal);
    check(sc.scenarioId, 'grandTotal', round2(postOffer + chargesTotal), sc.expected.grandTotal);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`GOLDEN ↔ REAL BACKEND CODE  —  ${golden.scenarios.length} scenarios, ${pass + fail} assertions`);
console.log('='.repeat(70));
if (fail === 0) {
  console.log(`✅ ALL ${pass} assertions reproduce with real backend pricing/offer/charge code.`);
  process.exit(0);
} else {
  console.log(`❌ ${fail} mismatch(es) (${pass} passed):`);
  failures.forEach(f => console.log(f));
  process.exit(1);
}
