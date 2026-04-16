const functions = require("firebase-functions");
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { FULFILLMENT_STATUS, SERVED_CARTS_LOOKBACK_HOURS } = require('./orderConstants');
const { mapOrderStatus, mapCartStatus, getStatusColorHex } = require('../utils/statusUtils');
const OrderInputValidation = require('./orderInputValidation');
const timestamp = require('../utils/timestamp');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');

/**
 * Returns served carts for current server from the last SERVED_CARTS_LOOKBACK_HOURS hours.
 * 
 * Matching criteria:
 * - cart.assignedTo == currentServerId OR order.assignedServer == currentServerId
 * - Cart status is SERVED
 * - Time cutoff: Use cart statusHistory timestamp for SERVED entry, fallback to updatedAt
 * 
 * @param {Object} data - Request data containing:
 *   - restaurantId: ID of the restaurant
 *   - sessionId: ID of the session (for server identification)
 * @returns {Object} Response with served carts data
 */
async function getServedCartsForServerHandler(data, context) {
    let stage = 'init';
    const setStage = s => (stage = s);

    try {
        setStage('parse-request');
        const requestData = data.data || data;
        console.log("getServedCartsForServer request:", JSON.stringify(requestData));

        setStage('input-validation');
        const { restaurantId, sessionId } = requestData;

        OrderInputValidation.validateRestaurantId(restaurantId);
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

        // Derive currentServerId from session document
        const currentServerId = sessionDoc.data().serverId || '';

        setStage('calculate-time-cutoff');
        // Calculate lookback time cutoff
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - (SERVED_CARTS_LOOKBACK_HOURS * 60 * 60 * 1000));

        setStage('fetch-orders');
        // Fetch orders updated after cutoff time
        const ordersRef = db.collection('restaurants').doc(restaurantId).collection('orders');
        const allOrdersQuery = await ordersRef
            .where('updatedAt', '>=', cutoffTime)
            .get();

        setStage('process-orders');
        const servedCarts = [];

        for (const doc of allOrdersQuery.docs) {
            const orderData = doc.data();
            const orderId = doc.id;
            const assignedServer = orderData.assignedServer || '';

            // Process each cart
            if (!Array.isArray(orderData.carts)) continue;

            orderData.carts.forEach((cart, cartIndex) => {
                const cartStatus = mapCartStatus(cart.status);

                // Only include SERVED carts
                if (cartStatus !== FULFILLMENT_STATUS.SERVED) return;

                // Check if cart is assigned to current server OR order is assigned to current server
                const cartAssignedTo = cart.assignedTo || '';
                const isRelevantToServer = cartAssignedTo === currentServerId || assignedServer === currentServerId;

                if (!isRelevantToServer) return;

                // Check time cutoff
                // Try to get served timestamp from statusHistory, fallback to order updatedAt
                let servedTimestamp = null;
                if (Array.isArray(cart.statusHistory)) {
                    const servedEntry = cart.statusHistory.find(entry =>
                        mapCartStatus(entry.status) === FULFILLMENT_STATUS.SERVED
                    );
                    if (servedEntry && servedEntry.timestamp) {
                        servedTimestamp = timestamp.safeToDate(servedEntry.timestamp);
                    }
                }

                // Fallback to order updatedAt
                if (!servedTimestamp) {
                    servedTimestamp = timestamp.safeToDate(orderData.updatedAt) ||
                        timestamp.safeToDate(cart.checkoutTime);
                }

                // Skip if served before cutoff time
                if (servedTimestamp && servedTimestamp < cutoffTime) return;

                // Build cart summary for response
                servedCarts.push({
                    orderId,
                    tableId: orderData.tableId || '',
                    orderNumber: orderData.orderNumber || orderId,
                    cartId: cart.cartId || `${orderId}_${cartIndex}`,
                    cartIndex,
                    status: cartStatus,
                    statusColorHex: getStatusColorHex(cartStatus),
                    servedAt: servedTimestamp ? servedTimestamp.getTime() : null,
                    priceInfo: {
                        finalPrice: orderData.priceInfo?.finalPrice || 0,
                    },
                    items: Array.isArray(cart.items) ? cart.items.map(item => ({
                        menuItemId: item.menuItemId || '',
                        name: item.name || item.menuItem?.meta?.name || 'Unknown',
                        quantity: item.quantity || 1,
                        status: mapCartStatus(item.status),
                        statusColorHex: getStatusColorHex(item.status),
                    })) : []
                });
            });
        }

        // Sort by servedAt descending (most recently served first)
        servedCarts.sort((a, b) => (b.servedAt || 0) - (a.servedAt || 0));

        setStage('return-response');
        return ResponseBuilder.success(
            {
                currentServerId,
                servedCarts,
                lookbackHours: SERVED_CARTS_LOOKBACK_HOURS
            },
            'Served carts fetched successfully'
        );

    } catch (error) {
        console.error(`[getServedCartsForServer][stage=${stage}]`, error);
        errorHandler.handleError(error, 'getServedCartsForServer', {
            stage,
            restaurantId: data?.data?.restaurantId || data?.restaurantId,
            sessionId: data?.data?.sessionId || data?.sessionId
        });
    }
}

const getServedCartsForServer = functions.https.onCall(getServedCartsForServerHandler);

module.exports = { getServedCartsForServer, getServedCartsForServerHandler };
