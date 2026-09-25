const functions = require("firebase-functions");
const { admin, db } = require("../admin/admin");
const { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } = require('./orderConstants');
const OrderInputValidation = require('./orderInputValidation');
const { validateCheckoutSession, cartOfSession } = require('../cart/cartInputValidation');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const { OrderPriceInfo, CartTotalPriceInfo } = require('../genericModels/priceinfo');
const { BasicPriceInfo } = require('../genericModels/priceinfo');
const { v4: uuidv4 } = require('uuid');
const { mapOrderStatus, mapCartStatus } = require('../utils/statusUtils');
const { evaluateAndPickBestOffer, buildAppliedOfferObject } = require('../offers/evaluateOrderOffers');
const { calculateCharges, loadChargesConfig } = require('./calculateCharges');
const { validateCart } = require('../cart/validateCart');
const { calculateCartValue, isBillableItem } = require('../cart/calculateCartValue');
const { writeLineSnapshots, loadTaxConfig } = require('./lineSnapshots');
// KT: one print job per station, created in the placing transaction (R1, R4). Compiled TypeScript in lib/.
const print = require('../lib/adapters/firestore/print');
const floorStore = require('../lib/adapters/firestore/floor');   // D3: the round check, inside this transaction


/**
 * Creates a new order or updates an existing one during cart checkout
 * This is an internal helper function used by the checkoutCart cloud function
 * 
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @param {Object} cart - Cart data to be added to the order
 * @param {string} [userId='system'] - ID of the user performing the checkout (optional)
 * @param {string} [notes=''] - Special instructions for this order (optional)
 * @param {string} [sessionId=null] - ID of the session (optional)
 * @returns {Object} The created or updated order
 */
// OF R1: `requestId` is the guest app's id for one "Place order" tap. A repeat with the same id in the
// same session is the same act and answers the existing order with `retry: true`, writing nothing.
// Absent (every caller before OF) means today's behaviour, unchanged.
// `addedBy` is the device id of the diner tapping Place order. A table shares one cart doc, so
// this sends that person's own lines as a round and leaves everyone else's half-built list where
// it is. Absent (every caller before cart ownership) means the whole cart, unchanged.
exports.createOrUpdateOrder = async (restaurantId, tableId, cart, userId = 'system', notes = '', sessionId = null, requestId = null, addedBy = null) => {
  if (typeof requestId !== 'string' || requestId === '') requestId = null;
  // Validate required parameters
  try {
    // OF R1: with a requestId an empty or missing cart is not refused here; the transaction below
    // answers the existing order for a retry and refuses everything else the same way as today.
    if (requestId && !(cart && Array.isArray(cart.items) && cart.items.length > 0)) {
      if (!restaurantId || !tableId) throw new Error('Restaurant ID and table ID are required');
    } else {
      OrderInputValidation.validateCreateOrUpdateOrderFields(restaurantId, tableId, cart);
    }
    // Session validation is removed as it's already done in checkoutCart
    // This avoids duplicate validation and potential double errors
  } catch (error) {
    console.error(`createOrUpdateOrder: ${error.message}`);
    errorHandler.handleError(error, 'createOrUpdateOrder');
  }

  // Offers V2: offers are order-level and applied automatically AFTER the cart
  // snapshot is added to the order (see createNewOrder / updateExistingOrder).
  // No cart-level offer revalidation is needed here — carts no longer carry
  // offer fields in Offers V2.

  // Charges V1: rarely changes, read out-of-band (same pattern as offer configs).
  const chargesConfig = await loadChargesConfig(restaurantId);

  // BL: the tax blocks a placed line freezes. Read out-of-band for the same reason as the charges
  // config, and never re-read at billing time (SPEC_BL R12).
  const { blocks: taxBlocks, assign: taxAssign } = await loadTaxConfig(restaurantId);
  const { print: printConfig } = await print.printConfig(restaurantId);   // KT: read once, outside the transaction, like the tax config

  // Waiter confirmation gate: read out-of-band like the two configs above. Decides the
  // fulfillment status a checked-out cart is BORN with, and nothing else.
  const entryStatus = (await loadRequireWaiterConfirmation(restaurantId))
    ? FULFILLMENT_STATUS.AWAITING_CONFIRMATION
    : FULFILLMENT_STATUS.PENDING;
  // A line is "sent" once the kitchen has been told. Without the gate that is the moment of
  // checkout; with it, the waiter's confirm (cart/updateCartStatus → markLinesSent).
  const linesAreSent = entryStatus === FULFILLMENT_STATUS.PENDING;

  // The cart is re-read INSIDE the transaction below. `cart` (the caller's
  // out-of-band read) was only used for pre-checks; the live doc is authoritative
  // so an addItemToCart that lands mid-checkout either retries this transaction
  // or recreates the cart after it — it is never silently dropped.
  const cartRef = db.collection("restaurants").doc(restaurantId)
    .collection("carts").doc(tableId);

  try {
    // Begin a transaction to ensure data consistency
    return await db.runTransaction(async (transaction) => {
      // ── ALL READS FIRST ──────────────────────────────────────────
      // Firestore transactions require all reads before all writes.

      // 0. Read the live cart (locks it for the duration of the transaction)
      const liveCartDoc = await transaction.get(cartRef);
      // TD-033: an earlier sitting's unsent cart is never placed on this party's order.
      const liveCart = cartOfSession(liveCartDoc.exists ? liveCartDoc.data() : null, sessionId);

      // Split the table's shared list into what this diner is placing and what stays behind.
      // Done before the fingerprint below so a retry is judged against the same lines it sent.
      const allItems = (liveCart && Array.isArray(liveCart.items)) ? liveCart.items : [];
      const stayingItems = addedBy ? allItems.filter(i => (i && i.addedBy) !== addedBy) : [];
      if (liveCart && addedBy) liveCart.items = allItems.filter(i => (i && i.addedBy) === addedBy);

      // 1. Read this sitting's existing orders.
      // Scoped by sessionId, not tableId: the only order we can append to is one
      // from this same session (see the find below), and a table accumulates
      // orders forever — reading them all pulled every cart snapshot the table
      // ever produced into the transaction on every checkout. With no sessionId
      // nothing can match, so read nothing at all.
      const orderSnapshot = sessionId
        ? await transaction.get(
            db.collection("restaurants").doc(restaurantId)
              .collection("orders")
              .where('sessionId', '==', sessionId)
          )
        : null;

      // OF-S1 / OF-S2: a repeat of a tap that already landed. Judged BEFORE the empty-cart refusal,
      // because the first transaction deleted the cart, and that is exactly what a retry looks like.
      // Same shape as PY R13: same id and matching details → the existing thing, retry: true;
      // a different cart under the same id → refused. Only the cart snapshot on the order carries
      // the id, since the live cart it came from is gone.
      if (requestId && orderSnapshot) {
        // Nothing of ours left on the table's list reads the same as no cart at all: the first
        // tap took it. Without this a partial checkout's retry would compare against the other
        // diners' items and be refused as a different cart.
        const liveFingerprint = (liveCart && liveCart.items.length) ? cartFingerprint(liveCart) : null;
        for (const doc of orderSnapshot.docs) {
          const prior = (doc.data().carts || []).find(c => c && c.requestId === requestId);
          if (!prior) continue;
          if (liveFingerprint !== null && liveFingerprint !== prior.fingerprint) {
            errorHandler.preconditionFailed('requestId already used for a different cart', { restaurantId, tableId, requestId });
          }
          console.log(JSON.stringify({ mod: 'checkout', cid: doc.id, requestId, outcome: 'retry' }));
          return { id: doc.id, ...doc.data(), retry: true };
        }
      }

      if (!liveCart || !Array.isArray(liveCart.items) || liveCart.items.length === 0) {
        errorHandler.preconditionFailed('Cannot process an empty cart', { restaurantId, tableId });
      }

      // 2. Read table doc (needed for assignedServerId)
      const tableRef = db.collection('restaurants').doc(restaurantId)
        .collection('tables').doc(tableId);
      const tableDoc = await transaction.get(tableRef);

      // 3. Read order counter (needed for order number generation)
      const counterRef = db.collection("restaurants").doc(restaurantId)
        .collection("counters").doc("orders");
      const counterDoc = await transaction.get(counterRef);

      // 4. D3 / D2 / FL R18: a sitting whose bill is being paid, or that has paid, takes no new round. Read here, inside the transaction,
      // on the sitting's own bills, so a payment committing in the same second cannot let one round through.
      const roundRefusal = sessionId ? await floorStore.roundRefusalIn(transaction, restaurantId, sessionId, String(tableDoc.data()?.number ?? tableId)) : null;
      if (roundRefusal) errorHandler.preconditionFailed(roundRefusal, { restaurantId, tableId, sessionId });

      // ── PROCESSING (no more reads after this point) ──────────────

      // Priced here, in the processing phase: a transaction may not read after it writes.
      const stayingPriceInfo = stayingItems.length
        ? await calculateCartValue({ ...liveCart, items: stayingItems })
        : null;

      if (!validateCart(liveCart)) {
        console.error('Cart validation failed inside checkout transaction; recalculating prices.');
        liveCart.priceInfo = await calculateCartValue(liveCart);
      }

      // Prepare cart snapshot to add to order
      const cartSnapshot = {
        ...liveCart,
        cartId: `${restaurantId}_${tableId}_${uuidv4().substring(0, 8)}`, // Add a unique cartId with restaurant and table prefix
        ...(requestId ? { requestId, fingerprint: cartFingerprint(liveCart) } : {}),   // OF R1
        status: entryStatus,
        statusHistory: [{
          status: entryStatus,
          timestamp: timestamp.now(), // concrete: a serverTimestamp sentinel is rejected inside an array (carts[])
          userId
        }],
        checkoutTime: timestamp.now(),
        notes,
        estimatedPrepTime: calculateEstimatedPrepTime(liveCart.items),
        assignedTo: null
      };

      // sanitise the format of the cart items for the order. Pass the snapshot,
      // not liveCart: the snapshot carries the cartId that stamps each flat item
      // with the cart it came from (see normalizeCartItemsForOrder).
      const orderItems = normalizeCartItemsForOrder(cartSnapshot);

      // Only append to an OPEN order from this sitting. The query above already
      // scoped to this session (and is null when there is none), so all that is
      // left to check is that the order is still open. Grouping by tableId alone
      // made a new party inherit the previous party's unpaid order.
      const existingOrderDoc = (orderSnapshot?.docs || []).find(doc => {
        const data = doc.data();
        const normalizedStatus = mapOrderStatus(data.orderStatus || data.status);
        return normalizedStatus === ORDER_STATUS.IN_PROGRESS || normalizedStatus === ORDER_STATUS.PENDING;
      });

      let orderResult;

      if (!existingOrderDoc) {
        // Create new order
        const orderNumber = writeOrderCounter(transaction, counterRef, counterDoc);
        console.log(`Creating new order for table ${tableId} with order number ${orderNumber}`);
        orderResult = await createNewOrder(
          transaction,
          restaurantId,
          tableId,
          cartSnapshot,
          orderItems,
          orderNumber,
          userId,
          sessionId,
          chargesConfig,
          tableDoc
        );
      } else {
        // Update existing order
        const orderDoc = existingOrderDoc;
        console.log(`Updating existing order ${orderDoc.id} for table ${tableId}`);
        orderResult = await updateExistingOrder(
          transaction,
          restaurantId,
          orderDoc.id,
          orderDoc.data(),
          cartSnapshot,
          orderItems,
          sessionId,
          chargesConfig,
          tableDoc,
          counterRef,
          counterDoc
        );
      }

      // BL: one line snapshot per placed item, in this same transaction. A bill is summed from these,
      // so there must be no moment where the order exists and its lines do not (SPEC_BL, phase 4;
      // this is the real collection TD-008's staging doc was standing in for).
      const placedNow = Date.now();
      const placedLines = writeLineSnapshots(transaction, restaurantId, {
        cartSnapshot,
        orderId: orderResult.id,
        tableId,
        sessionId,
        placedBy: userId,
        blocks: taxBlocks,
        assign: taxAssign,
        now: placedNow,
        sent: linesAreSent,
      });
      // KT-S1..S4: a KOT job per station, in this same transaction. A line with no category routes to the
      // default station (R1: printing never blocks an order); only a station config does not know throws.
      // Held behind the waiter gate (R5): markLinesSent releases it when the waiter confirms.
      print.enqueueRound(transaction, restaurantId, printConfig, placedLines, {
        cid: orderResult.id, orderId: orderResult.id, cartId: cartSnapshot.cartId,
        orderNumber: String(orderResult.orderNumber ?? ''), cartIndex: Array.isArray(orderResult.carts) ? orderResult.carts.length : 1,
        tableLabel: (tableDoc && tableDoc.exists && tableDoc.data().number) ? String(tableDoc.data().number) : tableId,
        placedBy: userId, placedAt: placedNow, now: placedNow, held: !linesAreSent,
      });

      // The cart becomes the order atomically — no window where both exist. When other diners
      // still have unplaced items, only the placed lines leave; their list survives untouched.
      if (stayingItems.length) {
        transaction.update(cartRef, {
          items: stayingItems,
          priceInfo: stayingPriceInfo,
          lastUpdated: timestamp.now(),
        });
      } else {
        transaction.delete(cartRef);
      }

      return orderResult;
    });
  } catch (error) {
    console.error(`createOrUpdateOrder: Error processing order for table ${tableId}: ${error.message}`);
    if (error instanceof functions.https.HttpsError) throw error;
    errorHandler.internalError(`Error processing order for table ${tableId}`, {
      originalError: error.message,
      tableId,
      restaurantId
    });
  }
};

/**
 * OF R1: what "the same cart" means for a retry. Item, variants, add-ons and quantity, sorted so the
 * order the app serialised them in does not matter. Prices are deliberately not part of it: the
 * server re-prices anyway, and a menu edit between the tap and the retry must not turn one order into two.
 */
function cartFingerprint(cart) {
  return (Array.isArray(cart?.items) ? cart.items : [])
    .filter(i => i && i.menuItemId)
    .map(i => [
      i.menuItemId,
      Object.entries(i.selectedVariants || {}).sort().map(([g, v]) => `${g}=${v}`).join(','),
      (Array.isArray(i.selectedAddons) ? i.selectedAddons : []).map(a => (typeof a === 'string' ? a : a?.id ?? a?.addonId ?? '')).sort().join(','),
      typeof i.quantity === 'number' && i.quantity > 0 ? i.quantity : 1,
    ].join(':'))
    .sort()
    .join('|');
}

/**
 * Normalizes cart items into a standardized format suitable for order storage
 * @param {Object} cart - The cart object
 * @returns {Array} Array of normalized order items
 */
function normalizeCartItemsForOrder(cart) {
  if (!cart || !cart.items || !Array.isArray(cart.items)) {
    console.warn('Invalid cart structure or missing items array');
    return [];
  }

  return cart.items.map(item => {
    // Skip cancelled items
    if (mapCartStatus(item.status) === FULFILLMENT_STATUS.CANCELLED) return null;

    // Skip items without menuItemId
    if (!item.menuItemId) return null;

    // Create a simplified version of the cart item for the order using BasicPriceInfo.
    // Use PER-UNIT, ALL-INCLUSIVE prices: cart priceInfo is a line total (×qty),
    // and totalBasePrice/finalPrice include variants + addons (itemBasePrice/
    // itemFinalPrice are the base item only). getOrder.js returns this as
    // `price` and the consumer multiplies by quantity, so lines sum to the total.
    const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
    const unitBasePrice = (item.priceInfo?.totalBasePrice || 0) / qty;
    const unitFinalPrice = (item.priceInfo?.finalPrice || 0) / qty;
    const priceInfo = new BasicPriceInfo(
      unitBasePrice,
      item.priceInfo?.discount,
      unitFinalPrice
    ).toObject();

    return {
      menuItemId: item.menuItemId,
      name: item.menuItem?.meta?.name || 'Unknown Item',
      description: item.menuItem?.meta?.description || '',
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
      priceInfo: priceInfo,
      selectedVariants: item.selectedVariants || {},
      selectedVariantsDetails: Array.isArray(item.selectedVariantsDetails) ? item.selectedVariantsDetails : [],
      selectedAddons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
      selectedAddonsDetails: Array.isArray(item.selectedAddonsDetails) ? item.selectedAddonsDetails : [],
      cartItemId: item.cartItemId || 0,
      // Which cart this line came from. cartItemId alone is NOT unique across an
      // order: it restarts at 1 in every new cart (getNextCartItemId reads only
      // the live cart), so round 2's first item collides with round 1's. Writers
      // that keep this flat copy in step with carts[] must match on cartId.
      // Omitted when absent so Firestore never sees undefined; orders written
      // before this field existed simply aren't cascaded to.
      ...(cart.cartId ? { cartId: cart.cartId } : {}),
      checkoutTime: timestamp.now(), // items[] is an array: no sentinels
      // Mirror the cart this copy came from. Hardcoding PENDING here put the flat copy
      // one step ahead of carts[] the moment the confirmation gate was switched on.
      status: mapCartStatus(cart.status) || FULFILLMENT_STATUS.PENDING,
    };
  }).filter(Boolean); // Remove null items
}

/**
 * Creates a new order with the given cart
 * @param {Object} transaction - Firestore transaction
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @param {Object} cartSnapshot - Cart data to add to the order
 * @param {Array} orderItems - Extracted items from the cart
 * @param {string} orderNumber - Unique order number
 * @param {string} userId - ID of the user creating the order
 * @param {string} sessionId - ID of the session (optional)
 * @returns {Object} The created order
 */
async function createNewOrder(transaction, restaurantId, tableId, cartSnapshot, orderItems, orderNumber, userId, sessionId = null, chargesConfig = [], tableDoc = null) {
  // Use pre-read tableDoc (read in transaction body before any writes)
  const assignedServer = (tableDoc && tableDoc.exists) ? (tableDoc.data().assignedServerId || null) : null;

  // Base priceInfo from the cart snapshot (no offer discount yet)
  const baseBasePrice = cartSnapshot.priceInfo?.basePrice || 0;
  const baseFinalPrice = cartSnapshot.priceInfo?.finalPrice || 0;
  const baseTotalDiscount = cartSnapshot.priceInfo?.totalDiscount || 0;
  const baseTotalDiscountAmount = cartSnapshot.priceInfo?.totalDiscountAmount || 0;

  // Offers V2: evaluate order-level offers against the full (raw) cart items.
  // We must use raw items with categoryId / subcategoryIds intact — NOT
  // normalized `orderItems`, which strips those fields.
  const allCartItems = Array.isArray(cartSnapshot.items) ? cartSnapshot.items : [];
  const bestOffer = await evaluateAndPickBestOffer(
    restaurantId,
    allCartItems,
    baseBasePrice,
    sessionId
  );

  const offerDiscount = bestOffer ? Math.min(bestOffer.discountAmount, baseFinalPrice) : 0;
  const appliedOffer = bestOffer ? buildAppliedOfferObject(bestOffer) : null;

  // Post-offer final price — used both as the stored finalPrice AND as the
  // base for Charges V1 percentage computation.
  const postOfferFinalPrice = Math.max(0, baseFinalPrice - offerDiscount);

  // Charges V1: percentage-based overlays on top of finalPrice (service charge,
  // global discount, etc.). Empty config → no fields surfaced in priceInfo.
  const { charges, chargesTotal } = calculateCharges(postOfferFinalPrice, chargesConfig);

  const orderPriceInfo = new OrderPriceInfo({
    basePrice: baseBasePrice,
    finalPrice: postOfferFinalPrice,
    totalDiscount: baseTotalDiscount,
    totalDiscountAmount: baseTotalDiscountAmount + offerDiscount,
    offerDiscount,
    charges,
    chargesTotal
  }).toObject();

  if (appliedOffer) {
    console.log(`Offers V2: auto-applied "${appliedOffer.title}" (${appliedOffer.id}) to new order — saved ₹${offerDiscount}`);
  }

  // Create new order document
  const newOrder = {
    restaurantId,
    tableId: tableId,
    orderNumber,
    orderStatus: ORDER_STATUS.IN_PROGRESS,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    carts: [cartSnapshot],  // Store the cart directly in the order
    items: orderItems,      // Add extracted items for direct access
    priceInfo: orderPriceInfo,
    createdAt: timestamp.serverTimestamp(),
    updatedAt: timestamp.serverTimestamp(),
    isActive: true,
    assignedServer, // Use server assigned to table, not checkout user
    notes: cartSnapshot.notes || '',
    sessionId,  // Include sessionId in new order
    appliedOffer // null or { id, title, type, scope, discountAmount, appliedItems }
  };

  // Add order to collection
  const newOrderRef = db.collection("restaurants").doc(restaurantId)
    .collection("orders").doc();

  transaction.set(newOrderRef, newOrder);

  console.log(`Created new order for table ${tableId} with ID ${newOrderRef.id}`);

  // Return the order with actual Timestamp objects (not serverTimestamp placeholders)
  return {
    id: newOrderRef.id,
    ...newOrder,
    // Replace serverTimestamp placeholders with actual Timestamp objects for the returned value
    createdAt: timestamp.now(),
    updatedAt: timestamp.now()
  };
}

/**
 * Updates an existing order with a new cart
 * @param {Object} transaction - Firestore transaction
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} orderId - ID of the order to update
 * @param {Object} existingOrder - Existing order data
 * @param {Object} cartSnapshot - Cart data to add to the order
 * @param {Array} orderItems - Extracted items from the cart
 * @param {string} sessionId - ID of the session (optional)
 * @returns {Object} The updated order
 */
async function updateExistingOrder(transaction, restaurantId, orderId, existingOrder, cartSnapshot, orderItems, sessionId = null, chargesConfig = [], tableDoc = null, counterRef, counterDoc) {
  // Ensure arrays exist with fallbacks
  const existingCarts = Array.isArray(existingOrder.carts) ? existingOrder.carts : [];
  const existingItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];

  // Add new cart to existing carts
  const updatedCarts = [...existingCarts, cartSnapshot];

  // Merge new items with existing items (normalized, for order.items)
  const updatedItems = [...existingItems, ...orderItems];

  const { priceInfo: updatedPriceInfo, appliedOffer, offerDiscount } = await buildOrderPriceInfo(
    restaurantId,
    updatedCarts,
    sessionId || existingOrder.sessionId,
    chargesConfig,
    orderId
  );

  if (appliedOffer) {
    console.log(`Offers V2: auto-applied "${appliedOffer.title}" (${appliedOffer.id}) to existing order ${orderId} — saved ₹${offerDiscount}`);
  }

  // Handle notes concatenation
  let updatedNotes = existingOrder.notes || '';
  if (cartSnapshot.notes) {
    updatedNotes = updatedNotes ? `${updatedNotes}\n${cartSnapshot.notes}` : cartSnapshot.notes;
  }

  const existingCreatedAt = existingOrder.createdAt || existingOrder.timestamps?.createdAt || null;

  // Update order document
  const updates = {
    carts: updatedCarts,
    items: updatedItems,
    priceInfo: updatedPriceInfo,
    appliedOffer, // null clears any previous offer if no longer applicable
    updatedAt: timestamp.serverTimestamp(),
    notes: updatedNotes,
    orderStatus: ORDER_STATUS.IN_PROGRESS,
    isActive: true,
    ...(existingCreatedAt ? { createdAt: existingCreatedAt } : { createdAt: timestamp.serverTimestamp() })
  };

  // If order has no assignedServer, fill from pre-read tableDoc
  if (!existingOrder.assignedServer) {
    if (tableDoc && tableDoc.exists && tableDoc.data().assignedServerId) {
      updates.assignedServer = tableDoc.data().assignedServerId;
    }
  }

  let effectiveOrderNumber = existingOrder.orderNumber || existingOrder.order_number || null;
  if (!effectiveOrderNumber) {
    effectiveOrderNumber = writeOrderCounter(transaction, counterRef, counterDoc);
    updates.orderNumber = effectiveOrderNumber;
  }

  // Add sessionId to updates if provided
  if (sessionId) {
    updates.sessionId = sessionId;
  }

  // Apply updates to document
  const orderRef = db.collection("restaurants").doc(restaurantId)
    .collection("orders").doc(orderId);

  transaction.update(orderRef, updates);

  console.log(`Updated existing order ${orderId} with new cart`);

  // Return the order with actual Timestamp objects (not serverTimestamp placeholders)
  return {
    id: orderId,
    ...existingOrder,
    ...updates,
    orderNumber: effectiveOrderNumber || existingOrder.orderNumber || existingOrder.order_number || orderId,
    orderStatus: ORDER_STATUS.IN_PROGRESS,
    isActive: true,
    createdAt: existingCreatedAt || timestamp.now(),
    // Replace serverTimestamp placeholder with actual Timestamp for the returned value
    updatedAt: timestamp.now()
  };
}

/**
 * Writes the next order counter value and returns the formatted order number.
 * The counterRef and counterDoc must be pre-read in the transaction body
 * (before any writes) to satisfy Firestore's reads-before-writes constraint.
 *
 * @param {Object} transaction - Firestore transaction
 * @param {Object} counterRef - Pre-fetched Firestore document reference for the counter
 * @param {Object} counterDoc - Pre-fetched Firestore document snapshot for the counter
 * @returns {string} A unique order number (e.g. ORD-00001)
 */
// Note: synchronous — do not await. Queues a transactional write only.
function writeOrderCounter(transaction, counterRef, counterDoc) {
  let nextCount = 1;
  if (counterDoc && counterDoc.exists) {
    nextCount = counterDoc.data().currentCount + 1;
  }

  transaction.set(counterRef, { currentCount: nextCount });

  return `ORD-${nextCount.toString().padStart(5, '0')}`;
}

/**
 * Rebuilds an order's priceInfo from its cart snapshots: item totals (skipping
 * CANCELLED/RETURNED carts), best order-level offer, then Charges V1. Used by
 * checkout (append cart) and by cart cancellation so every read path sees the
 * same number the customer will pay.
 * @param {string} [orderId] - The existing order's ID, so it is not counted as its own prior order
 * @returns {Promise<{priceInfo: Object, appliedOffer: Object|null, offerDiscount: number}>}
 */
async function buildOrderPriceInfo(restaurantId, carts, sessionId, chargesConfig = [], orderId = null) {
  const basePriceInfo = calculateTotalPriceInfo(carts);

  // Offers V2: evaluate against raw items of live carts only (normalized items strip categoryId).
  const liveCarts = carts.filter(isLiveCart);
  // A dish cancelled on its own (D4) sits in a live round; it must not earn an offer it is no longer paid for.
  const allCartItems = liveCarts.flatMap(c => Array.isArray(c.items) ? c.items : []).filter(isBillableItem);
  const bestOffer = await evaluateAndPickBestOffer(
    restaurantId,
    allCartItems,
    basePriceInfo.basePrice || 0,
    sessionId,
    orderId
  );

  const baseFinalPrice = basePriceInfo.finalPrice || 0;
  const offerDiscount = bestOffer ? Math.min(bestOffer.discountAmount, baseFinalPrice) : 0;
  const appliedOffer = bestOffer ? buildAppliedOfferObject(bestOffer) : null;
  const postOfferFinalPrice = Math.max(0, baseFinalPrice - offerDiscount);

  // Charges V1 on the post-offer total; empty config → fields omitted.
  const { charges, chargesTotal } = calculateCharges(postOfferFinalPrice, chargesConfig);

  return {
    priceInfo: {
      ...basePriceInfo,
      finalPrice: postOfferFinalPrice,
      totalDiscountAmount: (basePriceInfo.totalDiscountAmount || 0) + offerDiscount,
      offerDiscount,
      ...(charges.length > 0 ? { charges, chargesTotal } : {})
    },
    appliedOffer,
    offerDiscount
  };
}

/**
 * Does this restaurant make a waiter confirm a guest-placed cart before the kitchen sees it?
 *
 * Lives in `restaurants/{id}/config/settings` under `ordering.requireWaiterConfirmation`
 * (same doc as the tax blocks), NOT in the FeatureFlags singleton: that singleton is
 * process-global and this has to be per-restaurant. Missing config means false, so every
 * existing restaurant keeps the old straight-to-kitchen behaviour.
 */
async function loadRequireWaiterConfirmation(restaurantId) {
  try {
    const doc = await db.collection('restaurants').doc(restaurantId)
      .collection('config').doc('settings').get();
    return doc.exists && doc.data()?.ordering?.requireWaiterConfirmation === true;
  } catch (e) {
    // Fail closed. A MISSING document still means false above — that is a fresh restaurant and it
    // is the honest default. An UNREADABLE one is not: falling back to false sends a guest's round
    // straight to the kitchen at a restaurant that has deliberately turned that off, and the waiter
    // never gets the chance to refuse it. We cannot tell a fresh restaurant from a broken read, so
    // we refuse rather than pick the permissive branch.
    console.error(`createOrUpdateOrder: could not read ordering config for ${restaurantId}: ${e.message}`);
    errorHandler.internalError('Could not read restaurant ordering configuration, order not placed', {
      restaurantId, originalError: e.message,
    });
  }
}

function isLiveCart(cart) {
  const status = mapCartStatus(cart?.status);
  return status !== FULFILLMENT_STATUS.CANCELLED && status !== FULFILLMENT_STATUS.RETURNED;
}

/**
 * Calculates total price information across all carts
 * @param {Array} carts - Array of cart objects
 * @returns {Object} Aggregated price information
 */
function calculateTotalPriceInfo(carts) {
  if (!carts || !Array.isArray(carts) || carts.length === 0) {
    return new OrderPriceInfo().toObject();
  }

  // Convert live cart price infos into CartTotalPriceInfo objects (cancelled/returned carts are not billed)
  const cartPriceInfos = carts.filter(isLiveCart).map(cart =>
    cart && cart.priceInfo ? new CartTotalPriceInfo(cart.priceInfo) : new CartTotalPriceInfo()
  );

  // Accumulate values. Note: carts no longer carry offer fields in Offers V2.
  // Any offerDiscount is applied by the caller after this function returns.
  const basePrice = cartPriceInfos.reduce((sum, info) => sum + info.basePrice, 0);
  const totalDiscountAmount = cartPriceInfos.reduce((sum, info) => sum + info.totalDiscountAmount, 0);
  const totalPriceInfo = new OrderPriceInfo({
    basePrice,
    finalPrice: cartPriceInfos.reduce((sum, info) => sum + info.finalPrice, 0),
    // Effective item-discount % across the order (not an average of cart %s)
    totalDiscount: basePrice > 0 ? Math.round((totalDiscountAmount / basePrice) * 10000) / 100 : 0,
    totalDiscountAmount,
    offerDiscount: 0
  });

  return totalPriceInfo.toObject();
}

/**
 * Calculates estimated preparation time based on items in cart
 * @param {Array} items - The cart items
 * @returns {number} Estimated preparation time in minutes
 */
function calculateEstimatedPrepTime(items) {
  if (!items || items.length === 0) return 10; // Default prep time

  // Base time is 10 minutes
  let baseTime = 10;

  // Add 2 minutes per item, can adjust based on business logic
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return baseTime + (itemCount * 2);
}

module.exports = {
  createOrUpdateOrder: exports.createOrUpdateOrder,
  buildOrderPriceInfo,
  normalizeCartItemsForOrder // exported for unit tests
};
