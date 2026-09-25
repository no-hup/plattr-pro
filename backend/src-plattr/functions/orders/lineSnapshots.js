// BL · one line snapshot per placed cart item, written inside the checkout transaction.
// See moonshot/SPEC_BL_billing_and_tax.md (Objects → Line, phase 4). The mapping itself is pure and
// lives in domain/line.ts; everything here is reading config and old float money and calling it.
const { db } = require("../admin/admin");
// KT: held jobs release on the waiter's confirm (R5); a void drops or cancels them (KT-S11/S12). Compiled TS in lib/.
const print = require("../lib/adapters/firestore/print");
const { placeLine } = require("../lib/domain/line");
const { applyToLine, auditRow } = require("../lib/domain/approvals");
const { billLabel } = require("../lib/domain/billing");
const errorHandler = require("../singleton/ErrorHandler");
const { FULFILLMENT_STATUS } = require("./orderConstants");
const { mapCartStatus } = require("../utils/statusUtils");

/** Old money is float rupees; every new field is integer minor units. */
const minor = (rupees) => Math.round((Number(rupees) || 0) * 100);

/**
 * The restaurant's tax blocks and the category → block map, read out-of-band like the charges config (never inside the transaction).
 * Missing config is not an error here: the line is written with a null block and BL-S14 refuses to bill it.
 */
async function loadTaxConfig(restaurantId) {
  try {
    const doc = await db.collection("restaurants").doc(restaurantId).collection("config").doc("settings").get();
    const tax = doc.exists ? (doc.data()?.tax || {}) : {};
    const obj = (v) => (typeof v === "object" && v !== null ? v : {});
    // `assign` is the category → block map (TD-038): a dish with no block of its own takes its category's.
    return { blocks: obj(tax.blocks), assign: obj(tax.assign) };
  } catch (e) {
    // Fail closed. A MISSING settings document is a fresh restaurant and still means {} above —
    // but an UNREADABLE one is a blip we cannot tell apart from a fresh restaurant, and the cost
    // of guessing is asymmetric: lines get written with no snapshotted tax block, the kitchen
    // cooks the food, and billing-preview refuses hours later with "no tax block: Butter Chicken"
    // when the food is already on the table. Refusing the checkout is the cheap end of that.
    console.error(`lineSnapshots: could not read tax blocks for ${restaurantId}: ${e.message}`);
    errorHandler.internalError('Could not read restaurant tax configuration, order not placed', {
      restaurantId, originalError: e.message,
    });
  }
}

/** A cart item as domain/line.ts wants it: minor units, components split out, per-unit variant and addon prices. */
function toCartItem(item, assign = {}) {
  const p = item.priceInfo || {};
  // TD-038: dish → category → refuse. No default, ever: a silent guess bills an "Imported Beers"
  // category as food for weeks; a null is refused at bill preview with the cashier standing there.
  const categoryId = item.menuItem?.categoryId ?? item.categoryId ?? null;
  const own = item.menuItem?.taxBlockId ?? null;
  const taxBlockId = own ?? (categoryId && assign[categoryId]) ?? null;
  const taxSource = own ? "dish" : taxBlockId ? "category" : null;
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
    taxBlockId, taxSource, categoryId,
    taxCode: item.menuItem?.taxCode ?? "",
    note: typeof item.note === "string" ? item.note : "",   // TD-048: frozen here so the KOT can print it without the cart
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
const loadTaxBlocks = async (restaurantId) => (await loadTaxConfig(restaurantId)).blocks;

function writeLineSnapshots(transaction, restaurantId, { cartSnapshot, orderId, tableId, sessionId, placedBy, blocks, assign = {}, now, sent = true }) {
  const cartId = cartSnapshot.cartId;
  // Every line belongs to a guest sitting: the floor finds a table's money by it and a bill takes its
  // sitting from it. The only caller (checkout) has already refused a missing session. The old
  // `|| ""` / `|| tableId` fallbacks glued two parties at one table into one draft, so they are gone;
  // an order channel with no guest (the till punching a walk-in, OR) opens a sitting of its own first.
  if (!sessionId) errorHandler.throwError("failed-precondition", "a line needs the guest sitting it belongs to", { orderId, tableId });
  const ctx = {
    cid: orderId, orderId, cartId, tableId,
    sessionId,
    draftId: sessionId,                    // the sitting's first draft; BL-S12 splits by rewriting it
    placedAt: now, placedBy: placedBy || "system", blocks,
    // Placing a round normally IS telling the kitchen. False only behind the waiter-confirmation
    // gate, where markLinesSent flips it when the waiter confirms.
    sent,
  };
  const written = [];
  for (const item of cartSnapshot.items || []) {
    if (!item.menuItemId) continue;
    if (String(item.status || "").toUpperCase() === "CANCELLED") continue;
    const lineId = `${cartId}_${item.cartItemId ?? 0}`;
    const line = placeLine(toCartItem(item, assign), ctx, lineId);
    transaction.set(db.collection("restaurants").doc(restaurantId).collection("lines").doc(lineId), line);
    written.push(line);
  }
  return written;   // the placed lines themselves (KT routes them into print jobs in the same transaction)
}

/**
 * Flip `sent` on every line of a cart the waiter has just confirmed.
 *
 * Line ids are deterministic (`{cartId}_{cartItemId}`, see writeLineSnapshots), so this needs no
 * query — but each doc is still READ first: a blind `update` throws on a missing line, and a cart
 * placed before line snapshots existed has none. Reads must therefore happen before the caller's
 * first write, which is why the transaction is passed in rather than opened here.
 *
 * Returns the ids it marked, for the caller's log.
 */
async function markLinesSent(transaction, restaurantId, cartSnapshot) {
  const cartId = cartSnapshot && cartSnapshot.cartId;
  if (!cartId) return [];

  const refs = (cartSnapshot.items || [])
    .filter(item => item.menuItemId)
    .map(item => db.collection("restaurants").doc(restaurantId)
      .collection("lines").doc(`${cartId}_${item.cartItemId ?? 0}`));

  const [docs, kotJobs] = await Promise.all([Promise.all(refs.map(ref => transaction.get(ref))), print.kotJobsOfCart(transaction, restaurantId, cartId)]);
  const marked = [];
  docs.forEach((doc, i) => {
    if (!doc.exists || doc.data()?.sent === true) return;
    transaction.update(refs[i], { sent: true });
    marked.push(refs[i].id);
  });
  // KT R5: the kitchen is being told now, so the tickets' clock starts now.
  print.releaseHeld(transaction, restaurantId, kotJobs, Date.now());
  return marked;
}

/**
 * Take cancelled dishes off the bill and the kitchen, and leave a name on each.
 *
 * Cancelling a cart used to move only the old float total on the order; the line snapshots the
 * till bills from kept `countsTowardTotal: true`, so a rejected or cancelled round was still
 * billable. This is that fix, and it is here rather than at the reject path because every caller
 * has it: kitchen cancel, waiter cancel of a round or one dish, guest round rejected, and the
 * waiter's Cancel Order (several rounds, one transaction — hence `carts` is a list).
 * Pass a cart with only some of its items to void only those dishes.
 *
 * Goes through ST's own `applyToLine` so the voided shape is defined in exactly one place, and
 * writes ST's audit row (R4: the change and its row are one transaction; R5 fixes the keys).
 *
 * DECISION(D4, 2026-09-25): 20:10 a guest drops the Butter Naan the kitchen already has: the waiter's
 * cancel takes it off the bill and the kitchen with a P0 row and no PIN; whether to waste a dish in the
 * tandoor is the waiter's call, not the system's. This relaxes ST-S5/R8 for the waiter's cancel (see the
 * ST sheet's Decisions). If you change this, ask Shaurya first.
 *
 * Reads before writes, same as markLinesSent. Returns the audit ids written.
 */
async function voidCartLines(transaction, restaurantId, carts, { staffId, reason, note, now }) {
  const rest = db.collection("restaurants").doc(restaurantId);
  const rounds = (carts || []).filter(cart => cart && cart.cartId).map(cart => ({
    cart,
    refs: (cart.items || [])
      // A served dish was eaten: the order keeps it SERVED and billable, so its line keeps counting too.
      // (A cancelled round used to void it anyway, and the till billed less than the order.)
      .filter(item => item.menuItemId && ![FULFILLMENT_STATUS.SERVED, FULFILLMENT_STATUS.RETURNED].includes(mapCartStatus(item.status)))
      .map(item => rest.collection("lines").doc(`${cart.cartId}_${item.cartItemId ?? 0}`)),
  }));

  // Every read of every round first: a transaction may not read after its first write.
  const read = await Promise.all(rounds.map(async (r) => {
    const [docs, kotJobs] = await Promise.all([Promise.all(r.refs.map(ref => transaction.get(ref))), print.kotJobsOfCart(transaction, restaurantId, r.cart.cartId)]);
    return { ...r, docs, kotJobs };
  }));

  // DECISION(D4, 2026-09-25): once the bill is printed the waiter's cancel is refused; only the till's
  // Edit bill changes it (D2). An issued bill freezes its lines (BL R4), and this used to skip them
  // quietly: the kitchen lost the dish while the guest still paid for it (TD-089). Checked here, inside
  // the transaction, because a bill can be issued at the same moment. If you change this, ask Shaurya first.
  const billed = read.flatMap(r => r.docs).find(doc => doc.exists && doc.data()?.billId);
  if (billed) {
    const billId = billed.data().billId;
    const bill = await transaction.get(rest.collection("bills").doc(billId));
    errorHandler.preconditionFailed(`Bill ${bill.exists ? billLabel(bill.data()) : billId} is printed — ask the cashier to edit it on the till`, { billId });
  }

  const written = [];
  for (const { cart, refs, docs, kotJobs } of read) {
    const voidedLineIds = [];
    docs.forEach((doc, i) => {
      if (!doc.exists) return;
      const before = doc.data();
      const applied = applyToLine(before, {
        action: 'void',
        reason: reason || 'guest left',
        note: note || '',
        approverId: staffId || 'system',
      });
      if (!applied.ok) return;   // already voided — nothing to do, and no second audit row

      const auditId = `${refs[i].id}_v${applied.line.v}`;
      transaction.set(
        rest.collection("audit").doc(auditId),
        auditRow({
          ts: now, cid: cart.cartId, action: 'void', staffId: staffId || 'system',
          // P0 once the kitchen had it, P1 while it had not. Same split ST uses. The amount is the
          // dish's price even when the kitchen made it and it is wasted: that is the real loss (Q4-2).
          sev: before.sent ? 'P0' : 'P1',
          reason: reason || 'guest left', note: note || '',
          lineId: refs[i].id, before, after: applied.line,
        }),
      );
      transaction.set(refs[i], applied.line);
      written.push(auditId);
      voidedLineIds.push(refs[i].id);
    });
    // KT-S11 / R5: a held ticket is dropped (the kitchen was never told); a ticket the kitchen may have seen gets a
    // cancel ticket at its station for exactly the lines voided there. Keyed on the cart's id and this void's clock.
    if (voidedLineIds.length) {
      print.cancelForVoid(transaction, restaurantId, kotJobs, voidedLineIds, { v: `cart_${now}`, reason: reason || 'guest left', by: staffId || 'system', now });
    }
  }
  return written;
}

module.exports = { writeLineSnapshots, markLinesSent, voidCartLines, loadTaxBlocks, loadTaxConfig, toCartItem };
