/**
 * Order-Level Offer Evaluation (Offers V2)
 *
 * Evaluates all active offers against the entire order (all items from all carts
 * combined) and returns the BEST applicable offer, along with its discount
 * calculation. Invoked from `createOrUpdateOrder.js` at checkout and from
 * `updateOrderStatus.js` at COMPLETED (safety net after cancellations).
 *
 * Design notes:
 * - Always accepts RAW cart items (with categoryId / subcategoryIds intact).
 *   Do not pass the normalized order items — normalizeCartItemsForOrder strips
 *   category fields, which would break CATEGORY / ITEM scope matching.
 * - Runs inside the caller's Firestore transaction context is safe: the only
 *   Firestore read here is the offers subcollection (small, typically <20 docs).
 * - Fails gracefully: any exception returns null. The caller treats that as
 *   "no offer applied" and the order proceeds normally.
 */

const { db } = require('../admin/admin');
const { validateOfferApplication, calculateOfferBenefit } = require('./offerEngine');
const { isOffersEnabled } = require('./offerFeatureGuard');

/**
 * Fetches session order-history data for user-history-based offers.
 * Mirrors the helper in getApplicableOffers.js — kept local to avoid a cross-
 * file require cycle when evaluateOrderOffers is called from order code paths.
 */
async function getSessionData(restaurantId, sessionId, excludeOrderId) {
    if (!sessionId) {
        return { totalOrderCount: 0, sessionOrderCount: 0 };
    }
    try {
        const snap = await db
            .collection('restaurants').doc(restaurantId)
            .collection('orders')
            .where('sessionId', '==', sessionId)
            .get();
        // "Prior" means OTHER orders: the order being (re-)evaluated must not
        // count itself, or it would unlock a history offer it didn't have at checkout.
        const priorCount = snap.docs.filter(d => d.id !== excludeOrderId).length;
        // totalOrderCount is session-scoped today (same query); a lifetime count
        // needs customer-level history — product decision pending.
        return {
            totalOrderCount: priorCount,
            sessionOrderCount: priorCount,
        };
    } catch (err) {
        console.error('evaluateOrderOffers: session data fetch failed:', err);
        return { totalOrderCount: 0, sessionOrderCount: 0 };
    }
}

/**
 * Evaluate all active offers against an order's items and return the best one.
 *
 * @param {string} restaurantId
 * @param {Array}  allItems     - Raw cart items (NOT normalized) across all carts in the order
 * @param {number} basePrice    - Pre-discount order total (for minOrderValue conditions + virtual cart)
 * @param {string} [sessionId]  - Session ID for user-history-based offers
 * @param {string} [excludeOrderId] - ID of the order being evaluated (null at first checkout);
 *                                    excluded from the prior-order count so an order never qualifies itself
 * @returns {Promise<Object|null>} { offer, discountAmount, appliedItems } | null
 */
async function evaluateAndPickBestOffer(restaurantId, allItems, basePrice, sessionId, excludeOrderId = null) {
    try {
        // 1. Restaurant-level killswitch
        const enabled = await isOffersEnabled(restaurantId);
        if (!enabled) {
            return null;
        }

        // 2. Fetch all active offers for this restaurant
        const snapshot = await db
            .collection('restaurants').doc(restaurantId)
            .collection('offers')
            .where('isActive', '==', true)
            .get();
        if (snapshot.empty) {
            return null;
        }

        // 3. Construct a "virtual cart" that the existing engine understands
        //    (items + priceInfo with basePrice). The engine is cart-shape agnostic.
        const virtualCart = {
            items: allItems || [],
            priceInfo: { basePrice, finalPrice: basePrice },
        };

        // 4. Session history (user-history-based offers)
        const sessionData = await getSessionData(restaurantId, sessionId, excludeOrderId);

        // 5. Evaluate each offer; collect applicable ones
        const candidates = [];
        for (const doc of snapshot.docs) {
            const offer = { id: doc.id, ...doc.data() };
            try {
                const validation = validateOfferApplication(offer, virtualCart, sessionData);
                if (!validation.isValid) continue;
                const { discountAmount, appliedItems } = calculateOfferBenefit(offer, virtualCart);
                if (discountAmount > 0) {
                    candidates.push({ offer, discountAmount, appliedItems });
                }
            } catch (innerErr) {
                // Never let one bad offer block the others — skip and continue.
                console.error(`evaluateOrderOffers: offer ${offer.id} eval failed:`, innerErr);
            }
        }
        if (candidates.length === 0) {
            return null;
        }

        // 6. Pick best: highest discount wins; tiebreak by priority (lower = better)
        candidates.sort((a, b) => {
            if (b.discountAmount !== a.discountAmount) {
                return b.discountAmount - a.discountAmount;
            }
            const pa = typeof a.offer.priority === 'number' ? a.offer.priority : 999;
            const pb = typeof b.offer.priority === 'number' ? b.offer.priority : 999;
            return pa - pb;
        });

        return candidates[0];
    } catch (err) {
        // Graceful fallback — order proceeds without an offer
        console.error('evaluateAndPickBestOffer failed:', err);
        return null;
    }
}

/**
 * Builds the appliedOffer object stored on the order document.
 * Kept as a helper so callers construct it consistently.
 */
function buildAppliedOfferObject(pickResult) {
    if (!pickResult || !pickResult.offer) return null;
    return {
        id: pickResult.offer.id,
        title: pickResult.offer.title,
        type: pickResult.offer.type,
        scope: pickResult.offer.scope,
        discountAmount: pickResult.discountAmount,
        appliedItems: pickResult.appliedItems || [],
    };
}

module.exports = {
    evaluateAndPickBestOffer,
    buildAppliedOfferObject,
};
