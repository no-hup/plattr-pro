const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const ResponseBuilder = require('../utils/ResponseBuilder');
const { validateAdminSession } = require('./auth');

/**
 * Get historical orders for a restaurant with date filtering and pagination
 */
exports.getHistoricalOrders = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        const { restaurantId, sessionId, startDate, endDate, pageSize = 20, cursor } = data;

        // Validate admin session
        await validateAdminSession(restaurantId, sessionId);

        // Build query
        let query = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('orders')
            .orderBy('createdAt', 'desc');

        // Apply date filters if provided
        if (startDate) {
            const startTimestamp = timestamp.fromDate(new Date(startDate));
            query = query.where('createdAt', '>=', startTimestamp);
        }

        if (endDate) {
            // Add 1 day to include the end date
            const endDateObj = new Date(endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const endTimestamp = timestamp.fromDate(endDateObj);
            query = query.where('createdAt', '<', endTimestamp);
        }

        // Apply pagination
        if (cursor) {
            // Cursor is the last order's createdAt timestamp as ISO string
            const cursorTimestamp = timestamp.fromDate(new Date(cursor));
            query = query.startAfter(cursorTimestamp);
        }

        query = query.limit(pageSize + 1); // Get one extra to check if there's more

        const ordersSnapshot = await query.get();

        const orders = [];
        let hasMore = false;
        let nextCursor = null;

        // QuerySnapshot.forEach passes no index — use the docs array
        ordersSnapshot.docs.forEach((doc, index) => {
            if (index < pageSize) {
                const orderData = doc.data();

                // Calculate order totals from carts
                // Only calculate if totalAmount is NOT already present on the order
                // to avoid double-counting when totalAmount is already the full total
                let totalAmount = 0;
                let itemCount = 0;

                // Orders store their full total at priceInfo.finalPrice (legacy docs: totalAmount)
                const storedTotal = orderData.priceInfo?.finalPrice ?? orderData.totalAmount;
                if (storedTotal !== undefined && storedTotal !== null) {
                    totalAmount = storedTotal;
                    // Still calculate itemCount from carts
                    if (orderData.carts && Array.isArray(orderData.carts)) {
                        orderData.carts.forEach(cart => {
                            if (cart.items && Array.isArray(cart.items)) {
                                itemCount += cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                            }
                        });
                    }
                } else if (orderData.carts && Array.isArray(orderData.carts)) {
                    // No totalAmount on order, calculate from carts
                    orderData.carts.forEach(cart => {
                        if (cart.total) {
                            totalAmount += cart.total.finalPayableAmount || 0;
                        }
                        if (cart.items && Array.isArray(cart.items)) {
                            itemCount += cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                        }
                    });
                }

                orders.push({
                    id: doc.id,
                    tableId: orderData.tableId || null,
                    tableNumber: orderData.tableNumber || null,
                    status: orderData.orderStatus || orderData.status || 'unknown',
                    paymentStatus: orderData.paymentStatus || 'pending',
                    totalAmount,
                    itemCount,
                    customerName: orderData.customerName || orderData.primaryCustomer?.name || null,
                    customerPhone: orderData.customerPhone || orderData.primaryCustomer?.phoneNumber || null,
                    createdAt: orderData.createdAt ? timestamp.toISOString(orderData.createdAt) : null,
                    updatedAt: orderData.updatedAt ? timestamp.toISOString(orderData.updatedAt) : null,
                    cartCount: orderData.carts?.length || 0,
                });

                // Set next cursor to last item's createdAt
                if (orderData.createdAt) {
                    nextCursor = timestamp.toISOString(orderData.createdAt);
                }
            } else {
                hasMore = true;
            }
        });

        return ResponseBuilder.success({
            restaurantId,
            orders,
            count: orders.length,
            hasMore,
            nextCursor: hasMore ? nextCursor : null,
        }, 'Orders retrieved successfully');

    } catch (error) {
        console.error('Error in getHistoricalOrders:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to retrieve orders', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

/**
 * Get order details including carts and items
 */
exports.getOrderDetails = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        const { restaurantId, sessionId, orderId } = data;

        // Validate admin session
        await validateAdminSession(restaurantId, sessionId);

        if (!orderId) {
            errorHandler.badRequest('Order ID is required', {
                details: 'orderId is required'
            });
        }

        // Get order document
        const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            errorHandler.notFound('Order not found', { orderId });
        }

        const orderData = orderDoc.data();

        // Process order data for response
        const order = {
            id: orderDoc.id,
            tableId: orderData.tableId || null,
            tableNumber: orderData.tableNumber || null,
            status: orderData.orderStatus || orderData.status || 'unknown',
            paymentStatus: orderData.paymentStatus || 'pending',
            customerName: orderData.customerName || orderData.primaryCustomer?.name || null,
            customerPhone: orderData.customerPhone || orderData.primaryCustomer?.phoneNumber || null,
            createdAt: orderData.createdAt ? timestamp.toISOString(orderData.createdAt) : null,
            updatedAt: orderData.updatedAt ? timestamp.toISOString(orderData.updatedAt) : null,
            carts: [],
        };

        // Process carts
        if (orderData.carts && Array.isArray(orderData.carts)) {
            order.carts = orderData.carts.map((cart, index) => ({
                cartNumber: index + 1,
                status: cart.status || 'unknown',
                submittedAt: cart.submittedAt ? timestamp.toISOString(cart.submittedAt) : null,
                servedAt: cart.servedAt ? timestamp.toISOString(cart.servedAt) : null,
                total: cart.total || null,
                items: (cart.items || []).map(item => ({
                    id: item.id || item.menuItemId,
                    name: item.name || item.meta?.name || 'Unknown Item',
                    quantity: item.quantity || 1,
                    price: item.price || item.priceInfo?.finalPrice || 0,
                    notes: item.notes || null,
                    selectedVariant: item.selectedVariant || null,
                    selectedAddons: item.selectedAddons || [],
                })),
            }));
        }

        return ResponseBuilder.success({
            order
        }, 'Order details retrieved successfully');

    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to retrieve order details', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

module.exports = {
    getHistoricalOrders: exports.getHistoricalOrders,
    getOrderDetails: exports.getOrderDetails,
};
