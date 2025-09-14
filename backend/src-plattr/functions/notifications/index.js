const functions = require('firebase-functions');
const admin = require('../admin/admin');
const { sendFCMNotification } = require('./sendNotification');
const { generateDummyOTP, getServerFcmToken } = require('./notificationUtils');
const { validateQRParams, validateOrderParams, validateServer } = require('./notificationValidation');
const logger = functions.logger;

const db = admin.firestore();

/**
 * Handles QR code scanning for tables
 * 
 * @param {Object} request - The request object
 * @param {Object} request.data - The request data
 * @param {Object} request.data.data - The QR scan data
 * @param {string} request.data.data.restaurantId - Restaurant ID (required)
 * @param {string} request.data.data.tableId - Table ID (required)
 * @param {string} request.data.data.userId - User ID (optional)
 * 
 * Expected request structure:
 * {
 *   data: {
 *     data: {
 *       restaurantId: "restaurant123", // required
 *       tableId: "table456",           // required
 *       userId: "user789"              // optional
 *     }
 *   }
 * }
 * 
 * @returns {Object} Response with status, restaurantId, tableId, and OTP
 */
const handleTableQRScan = functions.https.onCall(async (request) => {
  try {
    await validateQRParams(request.data.data);
    const { restaurantId, tableId, userId } = request.data.data;

    const tableRef = db.doc(`restaurants/${restaurantId}/tables/${tableId}`);
    const tableDoc = await tableRef.get();
    if (!tableDoc.exists) {
      logger.error(`Table document missing: ${tableId}`);
      throw new functions.https.HttpsError('failed-precondition', `Table not registered ${tableId}`);
    }

    const serverId = tableDoc.get('serverId');
    const serverRef = db.doc(`servers/${serverId}`);
    const serverDoc = await serverRef.get();
    if (!serverDoc.exists) {
      logger.error(`Server document missing: ${serverId}`);
      throw new functions.https.HttpsError('failed-precondition', `Server not registered ${serverId}`);
    }
    const token = await getServerFcmToken(serverId);
    const otp = generateDummyOTP();

    await sendFCMNotification(token, {
      title: 'Table QR Scanned',
      body: `Table ${tableId} scanned - OTP: ${otp}`,
      data: {
        restaurantId,
        tableId,
        otp,
        type: 'qr_scan'
      }
    });

    logger.log(`OTP notification sent for table ${tableId}`);
    return { 
      status: 'success',
      restaurantId,
      tableId,
      otp
    };

  } catch (error) {
    logger.error('QR Scan Failed:', error);
    throw new functions.https.HttpsError(
      error.code || 'internal',
      error.message || 'Notification failed',
      error.details || { context: 'QR_SCAN_ERROR' }
    );
  }
});

/**
 * Notifies server when a new order is placed
 * 
 * @param {Object} request - The request object
 * @param {Object} request.data - The request data
 * @param {Object} request.data.data - The order data
 * @param {string} request.data.data.orderId - Order ID (required)
 * 
 * Expected request structure:
 * {
 *   data: {
 *     data: {
 *       orderId: "order123" // required
 *     }
 *   }
 * }
 * 
 * @returns {Object} Response with status
 */
const notifyOrderPlaced = functions.https.onCall(async (request) => {
  try {
    // Validate order exists
    const { orderDoc, orderId } = await validateOrderParams(request.data.data);

    const serverId = orderDoc.get('serverId');
    if (!serverId) {
      logger.error(`Order ${orderId} has no serverId field`);
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Order not assigned to server'
      );
    }
    
    // Validate server exists
    await validateServer(serverId);

    const token = await getServerFcmToken(serverId);
    await sendFCMNotification(token, {
      title: 'New Order Placed',
      body: `Table ${orderDoc.get('tableId')} has placed a new order`,
      data: {
        type: 'order',
        tableId: orderDoc.get('tableId'),
        orderId: orderId
      }
    });

    return { status: 'success' };
  } catch (error) {
    logger.error('Order Notification Failed:', error);
    throw new functions.https.HttpsError(
      error.code || 'internal',
      error.message || 'Notification failed',
      error.details || { context: 'ORDER_NOTIFICATION_ERROR' }
    );
  }
});

module.exports = {
  handleTableQRScan,
  notifyOrderPlaced
};