// This file should be removed as it's being replaced by functions/src/order/getOrder.js 

const functions = require("firebase-functions");
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");
const { ORDER_STATUS } = require('./orderConstants');
const { mapOrderStatus } = require('../utils/statusUtils');
const OrderInputValidation = require('./orderInputValidation');
const timestamp = require('../utils/timestamp');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');

/**
 * Unified order retrieval function that can:
 * 1. Get a specific order by ID
 * 2. Get an active order for a table
 * 3. Get all orders for a table
 * 
 * HTTP Callable function
 * 
 * @param {Object} data - Input data with restaurantId, tableId or orderId, getAllOrders (optional), activeOnly (optional), sessionId (optional)
 */
const getOrder = functions.https.onCall(async (data, context) => {
  const requestData = data?.data || data || {};
  try {
    console.log("poopoo Received order request:", JSON.stringify(requestData));
    
    // TODO: Re-enable auth check when ready
    // if (!context.auth) {
    //   throw new functions.https.HttpsError(
    //     'unauthenticated',
    //     'User must be authenticated to get order details'
    //   );
    // }
    
    OrderInputValidation.validateGetOrderFields(requestData);
    
    const { 
      restaurantId, 
      tableId, 
      orderId, 
      getAllOrders = false,
      activeOnly = true,
      sessionId
    } = requestData;

    // Validate session if provided
    if (sessionId) {
      const sessionRef = db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('sessions')
        .doc(sessionId);
      
      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists || sessionDoc.data().status !== 'active') {
        errorHandler.preconditionFailed('Invalid or inactive session', {
          restaurantId,
          sessionId
        });
      }
    }
    
    // CASE 1: Get a specific order by ID
    if (orderId) {
      console.log(`poopoo Fetching order by orderId: ${orderId}`);
      const orderRef = db.collection("restaurants").doc(restaurantId)
        .collection("orders").doc(orderId);
      
      const orderDoc = await orderRef.get();
      
      if (!orderDoc.exists) {
        errorHandler.notFound('Order not found', { restaurantId, orderId });
      }
      
      const orderData = orderDoc.data();
      const sanitizedOrder = sanitizeOrderData(orderDoc.id, orderData);
      
      console.log(`poopoo Retrieved order ${orderDoc.id} successfully`);
      
      return ResponseBuilder.success(
        sanitizedOrder,
        "Order retrieved successfully"
      );
    } 
    // CASE 2 & 3: Get orders by table
    else if (tableId) {
      // Log all orders for debugging
      console.log(`poopoo Fetching orders for tableId: ${tableId}, getAllOrders: ${getAllOrders}`);
      const allOrdersSnapshot = await db.collection("restaurants").doc(restaurantId)
        .collection("orders")
        .where("tableId", "==", tableId)
        .get();
        
      console.log(`poopoo Found ${allOrdersSnapshot.size} total orders for table ${tableId}`);
      
      if (!allOrdersSnapshot.empty) {
        allOrdersSnapshot.forEach(doc => {
          console.log(`poopoo Order ${doc.id} status: ${doc.data().orderStatus}`);
        });
      }
      
      // If getAllOrders is true, return all orders for the table
      if (getAllOrders) {
        let ordersQuery = db.collection("restaurants").doc(restaurantId)
          .collection("orders")
          .where('tableId', '==', tableId)
          .orderBy('createdAt', 'desc');

        if (activeOnly) {
          const activeStatusFilters = [
            ORDER_STATUS.PENDING,
            ORDER_STATUS.IN_PROGRESS,
            'pending',
            'in_progress',
            'PLACED',
            'PREPARING',
            'READY',
            'active',
            'ACTIVE'
          ];

          ordersQuery = ordersQuery.where('orderStatus', 'in', activeStatusFilters);
        }
        
        const ordersSnapshot = await ordersQuery.get();
        
        if (ordersSnapshot.empty) {
          return ResponseBuilder.success(
            [],
            activeOnly ? 
              "No active orders found for this table" : 
              "No orders found for this table"
          );
        }
        
        // Safely extract data from Firestore documents
        const orders = [];
        ordersSnapshot.forEach(doc => {
          const orderData = doc.data();
          const sanitizedOrder = sanitizeOrderData(doc.id, orderData);
          orders.push(sanitizedOrder);
        });
        
        console.log(`poopoo Returning ${orders.length} orders for table ${tableId}`);
        
        return ResponseBuilder.success(
          orders,
          "Orders retrieved successfully"
        );
      } 
      // Get just the most recent active order
      else {
        const ordersSnapshot = await db.collection("restaurants").doc(restaurantId)
          .collection("orders")
          .where("tableId", "==", tableId)
          .where('orderStatus', 'in', [
            ORDER_STATUS.PENDING,
            ORDER_STATUS.IN_PROGRESS,
            'pending',
            'in_progress',
            'PLACED',
            'PREPARING',
            'READY',
            'active',
            'ACTIVE'
          ])
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();
          
        if (ordersSnapshot.empty) {
          errorHandler.notFound(`No active order found for table ${tableId}`, {
            restaurantId,
            tableId
          });
        }
        
        const orderDoc = ordersSnapshot.docs[0];
        const orderData = orderDoc.data();
        const sanitizedOrder = sanitizeOrderData(orderDoc.id, orderData);
        
        console.log(`poopoo Retrieved most recent active order ${orderDoc.id} for table ${tableId}`);
        
        return ResponseBuilder.success(
          sanitizedOrder,
          "Order retrieved successfully"
        );
      }
    }
  } catch (error) {
    console.error("Error in getOrder:", error.message);
    errorHandler.handleError(error, "getOrder", {
      restaurantId: requestData?.restaurantId,
      tableId: requestData?.tableId,
      orderId: requestData?.orderId
    });
  }
});

/**
 * Helper function to sanitize order data
 * @param {string} id - Order document ID
 * @param {Object} orderData - Raw order data from Firestore
 * @returns {Object} Sanitized order object
 */
function sanitizeOrderData(id, orderData) {
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
    // Offers V2: expose full priceInfo (incl. offerDiscount) and appliedOffer
    // so the consumer UI can show a "Saved ₹X with [title]!" banner.
    priceInfo: orderData.priceInfo || null,
    offerDiscount: orderData.priceInfo?.offerDiscount || 0,
    appliedOffer: orderData.appliedOffer || null,
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
    })) : []
  };
}

module.exports = getOrder; 
