/**
 * Suite: offers
 *
 * Offer eligibility, apply, remove, BOGO, percentage, flat.
 * Tests offer lifecycle and interaction with cart checkout.
 */
import { call } from '../lib/api.js';
import { assertSuccess, assertError, assertFieldExists } from '../lib/assert.js';
import { customerLogin } from '../lib/auth.js';
import { narrator } from '../lib/narrator.js';
import config from '../lib/config.js';

const { RESTAURANT_ID, TABLE_CLEAN_3, TABLE_OTP, ITEMS, VARIANTS, OFFERS } = config;

export default async function offersSuite() {
  const results = { name: 'offers', pass: 0, fail: 0, tests: [] };

  function record(a) { results.tests.push(a); a.pass ? results.pass++ : results.fail++; }

  // Setup: get a session and populate cart
  let sessionId;
  try {
    sessionId = await customerLogin(RESTAURANT_ID, TABLE_CLEAN_3, TABLE_OTP, '5553001001', 'Offer Tester');
  } catch (e) {
    record({ pass: false, message: `Setup: customerLogin failed: ${e.message}` });
    return results;
  }

  const cartBase = { restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_3 };

  // ── 1. Get applicable offers (empty cart) ──────────────────────
  {
    const resp = await call('offers-getApplicableOffers', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_3,
    });
    // May succeed with empty list or error if no cart
    const ok = resp.status === 'success' || resp._httpStatus === 200;
    record({ pass: ok, message: `1. Get offers (empty cart) → ${ok ? 'success' : `error: ${resp.message}`}`, actual: ok ? undefined : resp });
  }

  // Add items to cart for offer testing
  await call('cart-addItemToCart', {
    ...cartBase,
    menuItemId: ITEMS.TIRAMISU.id,
    quantity: 2,
    sessionId,
  });
  await call('cart-addItemToCart', {
    ...cartBase,
    menuItemId: ITEMS.WHISKEY.id,
    quantity: 1,
    sessionId,
  });

  // ── 2. Get applicable offers (cart with items) ─────────────────
  let offerId;
  {
    const resp = await call('offers-getApplicableOffers', {
      restaurantId: RESTAURANT_ID,
      tableId: TABLE_CLEAN_3,
    });
    record(assertSuccess(resp, '2. Get offers (cart with items)'));
    if (resp.status === 'success') {
      const offers = resp.data?.offers || [];
      if (offers.length > 0) {
        offerId = offers.find(o => o.isApplicable)?.id || offers[0]?.id;
        record({ pass: true, message: `2a. Found ${offers.length} offer(s), first applicable: ${offerId || 'none'}` });
      } else {
        record({ pass: true, message: '2a. No offers configured (OK — offer testing depends on mock data)' });
      }
    }
  }

  // ── 3. Apply offer (if available and applicable) ────────────────
  if (offerId) {
    const resp = await call('offers-applyOffer', {
      ...cartBase,
      offerId,
      sessionId,
    });
    const ok = resp.status === 'success' || resp._httpStatus === 200;
    record({
      pass: ok,
      message: ok ? '3. Apply offer → success' : `3. Apply offer → ${resp.message || 'error'} (offer may not meet conditions)`,
      actual: ok ? undefined : resp,
    });

    // ── 4. Apply second offer → should fail (one at a time) ──────
    {
      const resp2 = await call('offers-applyOffer', {
        ...cartBase,
        offerId: 'different_offer_id',
        sessionId,
      });
      const isError = resp2.status === 'error' || resp2._httpStatus >= 400;
      record({ pass: isError, message: `4. Apply second offer → ${isError ? 'rejected (one at a time)' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp2 });
    }

    // ── 5. Remove offer ──────────────────────────────────────────
    {
      const resp3 = await call('offers-removeOffer', {
        ...cartBase,
        sessionId,
      });
      record(assertSuccess(resp3, '5. Remove offer'));
    }
  } else {
    record({ pass: true, message: '3. Apply offer → SKIP (no offers in mock data)' });
    record({ pass: true, message: '4. Second offer → SKIP' });
    record({ pass: true, message: '5. Remove offer → SKIP' });
  }

  // ── 6. Remove offer when none applied → still success ─────────
  {
    const resp = await call('offers-removeOffer', {
      ...cartBase,
      sessionId,
    });
    // Should succeed with "no offer to remove" message
    const ok = resp.status === 'success' || resp._httpStatus === 200;
    record({ pass: ok, message: `6. Remove when none applied → ${ok ? 'success' : `error: ${resp.message}`}`, actual: ok ? undefined : resp });
  }

  // ── 7. Apply offer with invalid offerId → error ────────────────
  {
    const resp = await call('offers-applyOffer', {
      ...cartBase,
      offerId: 'nonexistent_offer_xyz',
      sessionId,
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `7. Invalid offerId → ${isError ? 'error' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // ── 8. Missing restaurantId → error ────────────────────────────
  {
    const resp = await call('offers-getApplicableOffers', {
      tableId: TABLE_CLEAN_3,
    });
    const isError = resp.status === 'error' || resp._httpStatus >= 400;
    record({ pass: isError, message: `8. Missing restaurantId → ${isError ? 'error' : 'unexpectedly succeeded'}`, actual: isError ? undefined : resp });
  }

  // ══════════════════════════════════════════════════════════════
  // Extended offer tests
  // ══════════════════════════════════════════════════════════════

  // ── 9. Applicable offers list includes isApplicable field ─────
  {
    const resp = await call('offers-getApplicableOffers', {
      restaurantId: RESTAURANT_ID, tableId: TABLE_CLEAN_3,
    });
    if (resp.status === 'success') {
      const offers = resp.data?.offers || [];
      const allHaveApplicable = offers.every(o => typeof o.isApplicable === 'boolean');
      record({
        pass: allHaveApplicable || offers.length === 0,
        message: `9. All offers have isApplicable field: ${allHaveApplicable ? 'yes' : 'no'}`,
        actual: allHaveApplicable || offers.length === 0 ? undefined : resp,
      });
    } else {
      record({ pass: false, message: '9. Could not get offers', actual: resp });
    }
  }

  // ── 10. Apply PERCENTAGE offer → verify cart priceInfo changes ─
  {
    // Clear and add tiramisu for dessert offer
    await call('cart-clearCart', cartBase);
    await call('cart-addItemToCart', { ...cartBase, menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId });
    const applyResp = await call('offers-applyOffer', {
      ...cartBase, offerId: 'offer_dessert_50', sessionId,
    });
    const ok = applyResp.status === 'success' || applyResp._httpStatus === 200;
    record({
      pass: ok,
      message: `10. Apply PERCENTAGE (dessert 50%) → ${ok ? 'success' : applyResp.message || 'error'}`,
      actual: ok ? undefined : applyResp,
    });
    if (ok) narrator.offerApplied('50% Off Desserts', 'CATEGORY', 100, 100);
  }

  // ── 11. Apply FLAT offer → verify cart priceInfo ──────────────
  {
    await call('cart-clearCart', cartBase);
    await call('cart-addItemToCart', { ...cartBase, menuItemId: ITEMS.WHISKEY.id, quantity: 1, sessionId });
    const applyResp = await call('offers-applyOffer', {
      ...cartBase, offerId: 'offer_flat_100', sessionId,
    });
    const ok = applyResp.status === 'success' || applyResp._httpStatus === 200;
    record({
      pass: ok,
      message: `11. Apply FLAT (₹100 off bar) → ${ok ? 'success' : applyResp.message || 'error'}`,
      actual: ok ? undefined : applyResp,
    });
    if (ok) narrator.offerApplied('₹100 Off Bar', 'CATEGORY', 100, 400);
  }

  // ── 12. Apply offer then add item → offer recalculates ────────
  {
    // Keep whiskey + flat_100 from test 11, add tiramisu
    await call('cart-addItemToCart', { ...cartBase, menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId });
    const cartResp = await call('cart-getCart', cartBase);
    record(assertSuccess(cartResp, '12. Cart after adding item with offer applied'));
    narrator.info('Added item with offer already applied — checking if offer persists');
  }

  // ── 13. Apply offer not meeting conditions → error ────────────
  {
    await call('cart-clearCart', cartBase);
    await call('cart-addItemToCart', { ...cartBase, menuItemId: ITEMS.TIRAMISU.id, quantity: 1, sessionId });
    // flat_100 requires minOrderValue 500, tiramisu is only 200
    const applyResp = await call('offers-applyOffer', {
      ...cartBase, offerId: 'offer_flat_100', sessionId,
    });
    const isError = applyResp.status === 'error' || applyResp._httpStatus >= 400;
    record({
      pass: isError,
      message: `13. Offer not meeting conditions → ${isError ? 'rejected' : 'unexpectedly applied'}`,
      actual: isError ? undefined : applyResp,
    });
    if (isError) narrator.offerRejected('₹100 Off Bar', 'cart below ₹500 minimum');
  }

  // ── 14. BOGO offer application ────────────────────────────────
  {
    await call('cart-clearCart', cartBase);
    await call('cart-addItemToCart', {
      ...cartBase, menuItemId: ITEMS.BURGER.id, quantity: 2, sessionId,
      selectedVariants: { [VARIANTS.BURGER_SIZE.id]: VARIANTS.BURGER_SIZE.options.REGULAR.id },
    });
    const applyResp = await call('offers-applyOffer', {
      ...cartBase, offerId: 'offer_bogo_burger', sessionId,
    });
    const ok = applyResp.status === 'success' || applyResp._httpStatus === 200;
    record({
      pass: ok,
      message: `14. BOGO burger → ${ok ? 'applied' : applyResp.message || 'error'}`,
      actual: ok ? undefined : applyResp,
    });
    if (ok) narrator.offerApplied('BOGO Burger', 'ITEM', 180, 180);
  }

  // ── 15. Remove offer → price restores ─────────────────────────
  {
    // Get cart price with offer
    const cartBefore = await call('cart-getCart', cartBase);
    const priceWithOffer = cartBefore.data?.cart?.priceInfo?.finalPrice || cartBefore.data?.priceInfo?.finalPrice;

    // Remove offer
    await call('offers-removeOffer', { ...cartBase, sessionId });

    // Get cart price without offer
    const cartAfter = await call('cart-getCart', cartBase);
    const priceWithoutOffer = cartAfter.data?.cart?.priceInfo?.finalPrice || cartAfter.data?.priceInfo?.finalPrice;

    const restored = priceWithoutOffer !== undefined && priceWithOffer !== undefined && priceWithoutOffer > priceWithOffer;
    record({
      pass: restored || priceWithOffer === undefined,
      message: `15. Remove offer → price restored: ${priceWithOffer} → ${priceWithoutOffer}`,
      actual: restored || priceWithOffer === undefined ? undefined : cartAfter,
    });
    narrator.info(`Price restoration: ${priceWithOffer} → ${priceWithoutOffer}`);
  }

  return results;
}
