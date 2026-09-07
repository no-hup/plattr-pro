const functions = require("firebase-functions");
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { FULFILLMENT_STATUS } = require('./orderConstants');
const { mapCartStatus } = require('../utils/statusUtils');
const OrderInputValidation = require('./orderInputValidation');
const timestamp = require('../utils/timestamp');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');

/**
 * Marks a cart as served within an order.
 * Updates in transaction:
 * - cart.status → SERVED
 * - cart.assignedTo = currentServerId (for served tab filtering)
 * - All cart.items[*].status → SERVED (except CANCELLED/RETURNED)
 * - Append statusHistory entries
 * 
 * @param {Object} data - Request data containing:
 *   - restaurantId: ID of the restaurant
 *   - orderId: ID of the order containing the cart
 *   - cartIndex: Index of the cart in the order's carts array
 *   - sessionId: ID of the session (for server identification)
 * @returns {Object} Response with success status and updated cart info
 */
async function markCartAsServedHandler(data, context) {
    let stage = 'init';
    const setStage = s => (stage = s);

    try {
        setStage('parse-request');
        const requestData = data.data || data;
        console.log("markCartAsServed request:", JSON.stringify(requestData));

        setStage('input-validation');
        const { restaurantId, orderId, cartIndex, sessionId } = requestData;

        OrderInputValidation.validateRestaurantId(restaurantId);
        if (!orderId || typeof orderId !== 'string') {
            errorHandler.badRequest('orderId is required and must be a string');
        }
        if (typeof cartIndex !== 'number' || cartIndex < 0) {
            errorHandler.badRequest('cartIndex is required and must be a non-negative number');
        }
        if (!sessionId || typeof sessionId !== 'string') {
            errorHandler.badRequest('sessionId is required and must be a string');
        }

        setStage('session-validation');
        const sessionRef = db.collection('restaurants').doc(restaurantId).collection('sessions').doc(sessionId);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists || sessionDoc.data().status !== 'active') {
            errorHandler.preconditionFailed('Invalid or inactive session', {
                restaurantId,
                sessionId
            });
        }
        // Staff only: consumer table sessions live in the same collection but
        // have no entity field.
        if (sessionDoc.data().entity !== 'server') {
            errorHandler.unauthorized('Staff session required', { restaurantId, sessionId });
        }

        // Derive currentServerId from session document
        const currentServerId = sessionDoc.data().serverId || '';

        setStage('transaction');
        const result = await db.runTransaction(async (transaction) => {
            // Fetch the order
            const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
            const orderDoc = await transaction.get(orderRef);

            if (!orderDoc.exists) {
                errorHandler.notFound('Order not found', { orderId });
            }

            const orderData = orderDoc.data();
            const carts = Array.isArray(orderData.carts) ? [...orderData.carts] : [];

            if (cartIndex >= carts.length) {
                errorHandler.badRequest('Cart index out of bounds', { cartIndex, totalCarts: carts.length });
            }

            // Get the cart to update
            const cart = { ...carts[cartIndex] };
            const currentStatus = mapCartStatus(cart.status);

            // Don't allow marking cancelled/returned carts as served
            if (currentStatus === FULFILLMENT_STATUS.CANCELLED || currentStatus === FULFILLMENT_STATUS.RETURNED) {
                errorHandler.badRequest('Cannot mark cancelled or returned cart as served', { currentStatus });
            }

            // Already served - return early
            if (currentStatus === FULFILLMENT_STATUS.SERVED) {
                return { alreadyServed: true, cart };
            }

            const now = timestamp.serverTimestamp();

            // Update cart status
            cart.status = FULFILLMENT_STATUS.SERVED;
            cart.assignedTo = currentServerId; // For served tab filtering

            // Append to cart statusHistory
            cart.statusHistory = cart.statusHistory || [];
            cart.statusHistory.push({
                status: FULFILLMENT_STATUS.SERVED,
                timestamp: now,
                userId: currentServerId
            });

            // Update all items to SERVED (except CANCELLED/RETURNED)
            if (Array.isArray(cart.items)) {
                cart.items = cart.items.map(item => {
                    const itemStatus = mapCartStatus(item.status);
                    if (itemStatus === FULFILLMENT_STATUS.CANCELLED || itemStatus === FULFILLMENT_STATUS.RETURNED) {
                        return item; // Don't change cancelled/returned items
                    }
                    return {
                        ...item,
                        status: FULFILLMENT_STATUS.SERVED
                    };
                });
            }

            // Replace the cart in the array
            carts[cartIndex] = cart;

            // Update the order
            transaction.update(orderRef, {
                carts,
                updatedAt: now
            });

            return { alreadyServed: false, cart };
        });

        setStage('return-response');
        if (result.alreadyServed) {
            return ResponseBuilder.success(
                { cartStatus: FULFILLMENT_STATUS.SERVED },
                'Cart was already marked as served'
            );
        }

        return ResponseBuilder.success(
            { cartStatus: FULFILLMENT_STATUS.SERVED },
            'Cart marked as served successfully'
        );

    } catch (error) {
        console.error(`[markCartAsServed][stage=${stage}]`, error);
        errorHandler.handleError(error, 'markCartAsServed', {
            stage,
            restaurantId: data?.data?.restaurantId || data?.restaurantId,
            orderId: data?.data?.orderId || data?.orderId,
            cartIndex: data?.data?.cartIndex || data?.cartIndex
        });
    }
}

const markCartAsServed = functions.https.onCall(markCartAsServedHandler);

module.exports = { markCartAsServed, markCartAsServedHandler };
