const functions = require("firebase-functions");
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");
const { mapOrderStatus } = require('../utils/statusUtils');
const OrderInputValidation = require('./orderInputValidation');
const timestamp = require('../utils/timestamp');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');

/**
 * Server app: get enriched order details (BFF)
 * - Fetches order by orderId
 * - Resolves assignedServerId to assignedServerName
 */
const serverGetOrderDetails = functions.https.onCall(async (data, context) => {
  const requestData = data?.data || data || {};
  try {
    OrderInputValidation.validateGetOrderFields(requestData);

    const { restaurantId, orderId } = requestData;
    if (!orderId) {
      errorHandler.badRequest('orderId is required', { restaurantId });
    }

    const orderRef = db.collection('restaurants')
      .doc(restaurantId)
      .collection('orders')
      .doc(orderId);

    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      errorHandler.notFound('Order not found', { restaurantId, orderId });
    }

    const orderData = orderDoc.data();
    const { assignedServerId, assignedServerName } = await resolveAssignedServer(
      restaurantId,
      orderData
    );

    const sanitizedOrder = sanitizeOrderData(
      orderDoc.id,
      orderData,
      assignedServerId,
      assignedServerName
    );

    return ResponseBuilder.success(
      sanitizedOrder,
      "Order retrieved successfully"
    );
  } catch (error) {
    console.error("Error in serverGetOrderDetails:", error.message);
    errorHandler.handleError(error, "serverGetOrderDetails", {
      restaurantId: requestData?.restaurantId,
      orderId: requestData?.orderId
    });
  }
});

async function resolveAssignedServer(restaurantId, orderData) {
  let assignedServerId = orderData.assignedServer || orderData.assignedServerId || null;
  let assignedServerName = null;

  if (!assignedServerId && orderData.tableId) {
    const tableDoc = await db.collection('restaurants')
      .doc(restaurantId)
      .collection('tables')
      .doc(orderData.tableId)
      .get();
    if (tableDoc.exists) {
      assignedServerId = tableDoc.data().assignedServerId || null;
    }
  }

  if (assignedServerId) {
    const serverDoc = await db.collection('restaurants')
      .doc(restaurantId)
      .collection('servers')
      .doc(assignedServerId)
      .get();
    if (serverDoc.exists) {
      assignedServerName = serverDoc.data().name || null;
    }
  }

  return { assignedServerId, assignedServerName };
}

function sanitizeOrderData(id, orderData, assignedServerId, assignedServerName) {
  return {
    id: id,
    orderNumber: orderData.orderNumber || '',
    orderStatus: mapOrderStatus(orderData.orderStatus || orderData.status || ''),
    createdAt: orderData.createdAt instanceof Timestamp ?
      orderData.createdAt.toDate().toISOString() : orderData.createdAt || '',
    updatedAt: orderData.updatedAt instanceof Timestamp ?
      orderData.updatedAt.toDate().toISOString() : orderData.updatedAt || '',
    tableId: orderData.tableId || '',
    restaurantId: orderData.restaurantId || '',
    sessionId: orderData.sessionId || null,
    total: orderData.priceInfo?.finalPrice || 0,
    items: Array.isArray(orderData.items) ? orderData.items.map(item => ({
      menuItemId: item.menuItemId || '',
      name: item.name || (item.menuItem?.meta?.name || ''),
      quantity: item.quantity || 0,
      price: item.priceInfo?.finalPrice || 0,
      variants: item.selectedVariantsDetails || [],
      addons: item.selectedAddonsDetails || []
    })) : [],
    notes: orderData.notes || '',
    carts: Array.isArray(orderData.carts) ? orderData.carts.map(cart => ({
      ...cart,
      checkoutTime: cart.checkoutTime ? timestamp.toISOString(cart.checkoutTime) : null,
      statusHistory: Array.isArray(cart.statusHistory) ? cart.statusHistory.map(entry => ({
        ...entry,
        timestamp: entry.timestamp ? timestamp.toISOString(entry.timestamp) : null
      })) : []
    })) : [],
    assignedServerId: assignedServerId || null,
    assignedServerName: assignedServerName || null
  };
}

module.exports = { serverGetOrderDetails };
