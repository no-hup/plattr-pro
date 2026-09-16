// BL · one line snapshot per placed cart item, written inside the checkout transaction.
// See moonshot/SPEC_BL_billing_and_tax.md (Objects → Line, phase 4). The mapping itself is pure and
// lives in domain/line.ts; everything here is reading config and old float money and calling it.
const { db } = require("../admin/admin");
const { placeLine } = require("../lib/domain/line");

/** Old money is float rupees; every new field is integer minor units. */
const minor = (rupees) => Math.round((Number(rupees) || 0) * 100);

/**
 * The restaurant's tax blocks, read out-of-band like the charges config (never inside the transaction).
 * Missing config is not an error here: the line is written with a null block and BL-S14 refuses to bill it.
 */
async function loadTaxBlocks(restaurantId) {
  try {
    const doc = await db.collection("restaurants").doc(restaurantId).collection("config").doc("settings").get();
    const blocks = doc.exists ? (doc.data()?.tax?.blocks || {}) : {};
    return typeof blocks === "object" && blocks !== null ? blocks : {};
  } catch (e) {
    console.warn(`lineSnapshots: could not read tax blocks for ${restaurantId}: ${e.message}`);
    return {};
  }
}

/** A cart item as domain/line.ts wants it: minor units, components split out, per-unit variant and addon prices. */
function toCartItem(item) {
  const p = item.priceInfo || {};
  // TD-014: a variant or addon flagged `respectParentDiscount` is sold at the ITEM's discount, and
  // `calculateItemPrice` applies that at cart time — but only into the cart's AGGREGATE totals. The
  // component's own `priceInfo.finalPrice` never learns about it, so reading it here quietly billed
  // the guest above the price their app quoted (₹736 quoted, ₹768 billed, on one Mutton Biryani).
  // Same arithmetic as cart/calculateCartValue.js `applyDiscount`, done in minor units.
  const parentDiscount = Number(p.discount) || 0;
  const pick = (d) => {
    const basePrice = minor(d.priceInfo?.basePrice);
    return {
      id: String(d.id || d.addonId || d.selected_variant_id || "x"),
      name: d.selected_variant_name || d.name || "",
      basePrice,
      finalPrice: d.respectParentDiscount === true
        ? Math.max(0, Math.round(basePrice * (1 - parentDiscount / 100)))
        : minor(d.priceInfo?.finalPrice ?? d.priceInfo?.basePrice),
    };
  };
  return {
    menuItemId: item.menuItemId,
    name: item.menuItem?.meta?.name || item.name || "Unknown Item",
    quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
    cartItemId: String(item.cartItemId ?? 0),
    taxBlockId: item.menuItem?.taxBlockId ?? null,
    taxCode: item.menuItem?.taxCode ?? "",
    itemBasePrice: minor(p.itemBasePrice),
    itemFinalPrice: minor(p.itemFinalPrice),
    variants: (item.selectedVariantsDetails || []).map(pick),
    addons: (item.selectedAddonsDetails || []).map(pick),
  };
}

/**
 * Writes one `restaurants/{id}/lines/{lineId}` document per live item of the cart being placed.
 * Inside the caller's transaction on purpose: a bill must never be askable for lines that do not exist yet.
 * Cancelled items are skipped, matching normalizeCartItemsForOrder.
 */
function writeLineSnapshots(transaction, restaurantId, { cartSnapshot, orderId, tableId, sessionId, placedBy, blocks, now }) {
  const cartId = cartSnapshot.cartId;
  const ctx = {
    cid: orderId, orderId, cartId, tableId,
    sessionId: sessionId || "",
    draftId: sessionId || tableId,          // one draft per sitting; BL-S12 splits by rewriting it
    placedAt: now, placedBy: placedBy || "system", blocks,
  };
  const written = [];
  for (const item of cartSnapshot.items || []) {
    if (!item.menuItemId) continue;
    if (String(item.status || "").toUpperCase() === "CANCELLED") continue;
    const lineId = `${cartId}_${item.cartItemId ?? 0}`;
    const line = placeLine(toCartItem(item), ctx, lineId);
    transaction.set(db.collection("restaurants").doc(restaurantId).collection("lines").doc(lineId), line);
    written.push(lineId);
  }
  return written;
}

module.exports = { writeLineSnapshots, loadTaxBlocks, toCartItem };
