const functions = require('firebase-functions');
const admin = require('../admin/admin');
const logger = functions.logger;

const db = admin.firestore();

/**
 * Validates QR scan parameters
 * 
 * @param {Object} data - The QR scan data
 * @param {string} data.restaurantId - Restaurant ID (required)
 * @param {string} data.tableId - Table ID (required)
 * @param {string} data.userId - User ID (optional)
 * 
 * Expected data structure:
 * {
 *   restaurantId: "restaurant123", // required
 *   tableId: "table456",           // required
 *   userId: "user789"              // optional
 * }
 * 
 * @throws {functions.https.HttpsError} If validation fails
 */
const validateQRParams = async (data) => {
  if (!data?.restaurantId || !data?.tableId) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'Both restaurantId and tableId are required'
    );
  }

  // Check restaurant exists
  const restaurantRef = db.doc(`restaurants/${data.restaurantId}`);
  const restaurantDoc = await restaurantRef.get();
  if (!restaurantDoc.exists) {
    logger.error(`Restaurant not found: ${data.restaurantId}`);
    throw new functions.https.HttpsError('not-found', 'Restaurant does not exist');
  }

  // Check table exists in restaurant
  const tableRef = restaurantRef.collection('tables').doc(data.tableId);
  const tableDoc = await tableRef.get();
  if (!tableDoc.exists) {
    logger.error(`Table ${data.tableId} missing in restaurant ${data.restaurantId}`);
    throw new functions.https.HttpsError('not-found', 'Table not found in restaurant');
  }
};

/**
 * Validates order parameters
 * 
 * @param {Object} data - The order data
 * @param {string} data.orderId - Order ID (required)
 * 
 * Expected data structure:
 * {
 *   orderId: "order123" // required
 * }
 * 
 * @throws {functions.https.HttpsError} If validation fails
 * @returns {Object} Object containing orderDoc and orderId
 */
const validateOrderParams = async (data) => {
  const orderId = data?.orderId;
  if (!orderId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'orderId is required'
    );
  }
  
  const orderRef = db.doc(`orders/${orderId}`);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    logger.error(`Order document missing: ${orderId}`);
    throw new functions.https.HttpsError('not-found', 'Order does not exist');
  }
  
  return { orderDoc, orderId };
};

/**
 * Validates server exists
 * 
 * @param {string} serverId - Server ID to validate (required)
 * 
 * @throws {functions.https.HttpsError} If validation fails
 * @returns {Object} Object containing serverDoc and serverRef
 */
const validateServer = async (serverId) => {
  if (!serverId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Server ID is required'
    );
  }
  
  const serverRef = db.doc(`servers/${serverId}`);
  const serverDoc = await serverRef.get();
  
  if (!serverDoc.exists) {
    logger.error(`Server document missing: ${serverId}`);
    throw new functions.https.HttpsError(
      'not-found',
      'Server not registered'
    );
  }
  
  return { serverDoc, serverRef };
};

/**
 * Validates FCM token update parameters
 * 
 * @param {Object} data - The token update data
 * @param {string} data.serverId - Server ID (required)
 * @param {string} data.fcmToken - FCM token (required)
 * @param {Object} context - Auth context with authenticated user
 * 
 * Expected data structure:
 * {
 *   serverId: "server123", // required
 *   fcmToken: "fcm-token-string" // required
 * }
 * 
 * @throws {functions.https.HttpsError} If validation fails
 * @returns {Object} Object containing serverDoc, serverRef, serverId, and fcmToken
 */
const validateFCMTokenUpdate = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'Authentication required'
    );
  }

  const { serverId, fcmToken } = data;
  if (!serverId || !fcmToken) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing serverId or fcmToken'
    );
  }

  const { serverDoc, serverRef } = await validateServer(serverId);
  
  // Security check - only server owner can update
  const serverData = serverDoc.data();
  if (serverData.uid !== context.auth.uid) {
    logger.warn(`Unauthorized token update attempt by ${context.auth.uid} for server ${serverId}`);
    throw new functions.https.HttpsError(
      'permission-denied',
      'Not authorized to update this server'
    );
  }
  
  return { serverDoc, serverRef, serverId, fcmToken };
};

module.exports = {
  validateQRParams,
  validateOrderParams,
  validateServer,
  validateFCMTokenUpdate
}; 