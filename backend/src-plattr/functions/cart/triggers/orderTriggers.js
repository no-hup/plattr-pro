const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { admin, db } = require('../../admin/admin');
const featureFlags = require('../../singleton/FeatureFlags');
const environment = require('../../singleton/Environment');
const { sendFCMNotification } = require('../../notifications/sendNotification');
const { FULFILLMENT_STATUS } = require('../../orders/orderConstants');
const { mapCartStatus } = require('../../utils/statusUtils');
const { safeArrayUnion } = require('../../utils/arrayOperations');

/**
 * Helper to get or assign a random active server
 */
async function getOrAssignServer(restaurantId, tableId, existingServerId) {
    const serversCollectionRef = db.collection(COLLECTIONS.RESTAURANTS)
        .doc(restaurantId)
        .collection(COLLECTIONS.SERVERS);

    if (existingServerId) {
        const serverDoc = await serversCollectionRef.doc(existingServerId).get();
        if (serverDoc.exists) {
            return { id: serverDoc.id, ...serverDoc.data() };
        }
    }

    console.log(`Finding new server for table ${tableId}`);
    const serversSnapshot = await serversCollectionRef
        .where('status', '==', 'active')
        .limit(1)
        .get();

    if (serversSnapshot.empty) return null;

    const serverDoc = serversSnapshot.docs[0];
    const serverId = serverDoc.id;

    await Promise.all([
        db.collection(COLLECTIONS.RESTAURANTS).doc(restaurantId)
            .collection(COLLECTIONS.TABLES).doc(tableId)
            .update({ serverId }),
        serversCollectionRef.doc(serverId)
            .update({ assignedTables: safeArrayUnion(tableId) })
    ]);

    return { id: serverId, ...serverDoc.data() };
}

const COLLECTIONS = {
    RESTAURANTS: 'restaurants',
    ORDERS: 'orders',
    TABLES: 'tables',
    SERVERS: 'servers'
};

// Feature flag name
const SEND_SERVER_NOTIFICATIONS = 'sendServerNotifications';

/**
 * Triggers when a new order is placed (document created)
 */
const onOrderPlaced = onDocumentCreated('restaurants/{restaurantId}/orders/{orderId}', async (event) => {
    // Load feature flag overrides from Firestore (for test environments)
    await featureFlags.loadOverrides(db);
    // Reduce logging - only log essential info
    console.log(`Order created for restaurant: ${event.params.restaurantId}, order: ${event.params.orderId}`);

    const snapshot = event.data;
    const orderData = snapshot.data();
    const { restaurantId, orderId } = event.params;

    // Skip processing if no order data
    if (!orderData) {
        console.log('No order data found, skipping processing');
        return;
    }

    // Extract the tableId from the order data
    const { tableId } = orderData;

    if (!tableId) {
        console.error('Order does not contain a tableId, cannot process');
        return;
    }

    console.log(`Processing order for table ${tableId} in restaurant ${restaurantId}`);

    // Check feature flag first
    if (!featureFlags.isEnabled(SEND_SERVER_NOTIFICATIONS)) {
        console.log('Server notifications disabled by feature flag, skipping.');
        return;
    }

    try {
        // Get table document to find assigned server
        const tableRef = db.collection(COLLECTIONS.RESTAURANTS)
            .doc(restaurantId)
            .collection(COLLECTIONS.TABLES)
            .doc(tableId);

        const tableDoc = await tableRef.get();
        if (!tableDoc.exists) {
            console.error(`Table ${tableId} not found`);
            return;
        }

        const serverData = await getOrAssignServer(restaurantId, tableId, tableDoc.data().serverId);

        if (!serverData || !serverData.fcmToken) {
            console.error(`No valid server/token found for table ${tableId}`);
            return;
        }

        const itemNames = (orderData.items || []).map(i => i.name).join(', ') || 'Items';

        // Behind the waiter-confirmation gate this is not "an order came in", it is "a table is
        // waiting for you". Nothing is cooking until the waiter walks over and confirms, so the
        // wording has to carry that or the round sits there.
        const needsConfirming = (orderData.carts || [])
            .some(cart => mapCartStatus(cart.status) === FULFILLMENT_STATUS.AWAITING_CONFIRMATION);

        // Send notification to server
        await sendFCMNotification(serverData.fcmToken, {
            title: needsConfirming ? 'Confirm order' : 'New Order Placed',
            body: needsConfirming
                ? `Table ${tableId} is waiting for you to confirm: ${itemNames}`
                : `Table ${tableId}: ${itemNames}`,
            data: {
                type: needsConfirming ? 'order_awaiting_confirmation' : 'order',
                tableId: tableId,
                orderId: orderId
            }
        });

        console.log(`Notification sent to server ${serverData.id} for new order ${orderId}`);
    } catch (error) {
        console.error('Error processing order trigger:', error);
    }
});

/**
 * Triggers when an existing order document is updated.
 * Specifically checks if a cart status changed to READY and notifies the assigned server.
 */
const onOrderUpdated = onDocumentUpdated('restaurants/{restaurantId}/orders/{orderId}', async (event) => {
    // Load feature flag overrides from Firestore (for test environments)
    await featureFlags.loadOverrides(db);
    console.log(`Order updated for restaurant: ${event.params.restaurantId}, order: ${event.params.orderId}`);

    const beforeSnapshot = event.data.before;
    const afterSnapshot = event.data.after;

    const beforeData = beforeSnapshot.data();
    const afterData = afterSnapshot.data();
    const { restaurantId, orderId } = event.params;

    // Basic checks
    if (!beforeData || !afterData || !afterData.tableId) {
        console.log('Missing data or tableId, skipping update processing.');
        return;
    }

    // Check feature flag first
    if (!featureFlags.isEnabled(SEND_SERVER_NOTIFICATIONS)) {
        console.log('Server notifications disabled by feature flag, skipping.');
        return;
    }

    const tableId = afterData.tableId;
    const beforeCarts = beforeData.carts || [];
    const afterCarts = afterData.carts || [];

    // Find carts that transitioned to READY status
    const readyCartIndices = afterCarts.reduce((indices, cart, index) => {
        const beforeCart = beforeCarts[index];
        // Check if status changed specifically TO ready
        if (cart.status === FULFILLMENT_STATUS.READY && (!beforeCart || beforeCart.status !== FULFILLMENT_STATUS.READY)) {
            indices.push(index);
        }
        return indices;
    }, []);

    // Round two onwards appends a cart to the SAME order, so an unconfirmed round never reaches
    // onOrderCreated — this is the only trigger that sees it. Matched on cartId, not index: a
    // cart's index is stable but a new cart has no `before` at its index at all.
    const beforeCartIds = new Set(beforeCarts.map(c => c.cartId).filter(Boolean));
    const awaitingCarts = afterCarts.filter(cart =>
        mapCartStatus(cart.status) === FULFILLMENT_STATUS.AWAITING_CONFIRMATION &&
        !beforeCartIds.has(cart.cartId));

    if (readyCartIndices.length === 0 && awaitingCarts.length === 0) {
        console.log('No carts transitioned to READY or arrived awaiting confirmation.');
        return;
    }

    console.log(`Carts at indices [${readyCartIndices.join(', ')}] are now READY for order ${orderId}`);

    try {
        // Get table document to find assigned server
        const tableRef = db.collection(COLLECTIONS.RESTAURANTS)
            .doc(restaurantId)
            .collection(COLLECTIONS.TABLES)
            .doc(tableId);

        const tableDoc = await tableRef.get();
        if (!tableDoc.exists) return;

        const serverData = await getOrAssignServer(restaurantId, tableId, tableDoc.data().serverId);

        if (!serverData || !serverData.fcmToken) return;

        if (awaitingCarts.length > 0) {
            const awaitingNames = awaitingCarts
                .flatMap(cart => (cart.items || []).map(i => i.menuItem?.meta?.name || i.name))
                .filter(Boolean).join(', ') || 'Items';
            await sendFCMNotification(serverData.fcmToken, {
                title: 'Confirm order',
                body: `Table ${tableId} is waiting for you to confirm: ${awaitingNames}`,
                data: { type: 'order_awaiting_confirmation', tableId, orderId },
            });
        }

        if (readyCartIndices.length === 0) return;

        const itemNames = (afterData.items || [])
            .filter((item, index) => readyCartIndices.includes(index)) // rough approx of items in the ready carts
            .map(i => i.name).join(', ');

        // Send notification to server
        await sendFCMNotification(serverData.fcmToken, {
            title: 'Order Ready',
            body: `Table ${tableId} Ready: ${itemNames || 'Items'}`,
            data: {
                type: 'order_ready',
                tableId: tableId,
                orderId: orderId,
                cartIndices: readyCartIndices
            }
        });

        console.log(`Notification sent to server ${serverData.id} for ready order ${orderId}`);
    } catch (error) {
        console.error('Error processing order update trigger:', error);
    }
});

// Export wrapped trigger functions
exports.onOrderPlaced = environment.wrapTriggerFunction('onOrderPlaced', onOrderPlaced);
exports.onOrderUpdated = environment.wrapTriggerFunction('onOrderUpdated', onOrderUpdated);
