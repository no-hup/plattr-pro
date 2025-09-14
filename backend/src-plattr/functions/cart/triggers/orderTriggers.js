const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { admin, db } = require('../../admin/admin');
const featureFlags = require('../../singleton/FeatureFlags');
const environment = require('../../singleton/Environment');
const { sendFCMNotification } = require('../../notifications/sendNotification');
const { CART_STATUS } = require('../../orders/orderConstants');

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
            console.error(`Table ${tableId} not found in restaurant ${restaurantId}`);
            return;
        }
        
        const tableData = tableDoc.data();
        const serverId = tableData.serverId;
        
        if (!serverId) {
            console.error(`Table ${tableId} has no assigned server`);
            return;
        }
        
        // Get server document to find FCM token
        const serverRef = db.collection(COLLECTIONS.SERVERS).doc(serverId);
        const serverDoc = await serverRef.get();
        
        if (!serverDoc.exists) {
            console.error(`Server ${serverId} not found`);
            return;
        }
        
        const serverData = serverDoc.data();
        const fcmToken = serverData.fcmToken;
        
        if (!fcmToken) {
            console.error(`Server ${serverId} has no FCM token`);
            return;
        }
        
        // Send notification to server
        await sendFCMNotification(fcmToken, {
            title: 'New Order Placed',
            body: `Table ${tableId} has placed a new order`,
            data: {
                type: 'order',
                tableId: tableId,
                orderId: orderId
            }
        });
        
        console.log(`Notification sent to server ${serverId} for new order ${orderId}`);
    } catch (error) {
        console.error('Error processing order trigger:', error);
    }
});

/**
 * Triggers when an existing order document is updated.
 * Specifically checks if a cart status changed to READY and notifies the assigned server.
 */
const onOrderUpdated = onDocumentUpdated('restaurants/{restaurantId}/orders/{orderId}', async (event) => {
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
        if (cart.status === CART_STATUS.READY && (!beforeCart || beforeCart.status !== CART_STATUS.READY)) {
            indices.push(index);
        }
        return indices;
    }, []);

    if (readyCartIndices.length === 0) {
        console.log('No carts transitioned to READY status in this update.');
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
        
        if (!tableDoc.exists) {
            console.error(`Table ${tableId} not found in restaurant ${restaurantId}`);
            return;
        }
        
        const tableData = tableDoc.data();
        const serverId = tableData.serverId;
        
        if (!serverId) {
            console.error(`Table ${tableId} has no assigned server`);
            return;
        }
        
        // Get server document to find FCM token
        const serverRef = db.collection(COLLECTIONS.SERVERS).doc(serverId);
        const serverDoc = await serverRef.get();
        
        if (!serverDoc.exists) {
            console.error(`Server ${serverId} not found`);
            return;
        }
        
        const serverData = serverDoc.data();
        const fcmToken = serverData.fcmToken;
        
        if (!fcmToken) {
            console.error(`Server ${serverId} has no FCM token`);
            return;
        }
        
        // Send notification to server
        await sendFCMNotification(fcmToken, {
            title: 'Order Ready',
            body: `Order ${orderId} for table ${tableId} is ready to serve`,
            data: {
                type: 'order_ready',
                tableId: tableId,
                orderId: orderId,
                cartIndices: readyCartIndices
            }
        });
        
        console.log(`Notification sent to server ${serverId} for ready order ${orderId}`);
    } catch (error) {
        console.error('Error processing order update trigger:', error);
    }
});

// Export wrapped trigger functions
exports.onOrderPlaced = environment.wrapTriggerFunction('onOrderPlaced', onOrderPlaced);
exports.onOrderUpdated = environment.wrapTriggerFunction('onOrderUpdated', onOrderUpdated);