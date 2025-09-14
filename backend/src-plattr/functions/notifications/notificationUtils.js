const admin = require('../admin/admin');
const functions = require('firebase-functions');
const { validateServer } = require('./notificationValidation');
const logger = functions.logger;

const db = admin.firestore();

/**
 * Gets the FCM token for a server
 * 
 * @param {string} serverId - Server ID (required)
 * @returns {string} The FCM token for the server
 * @throws {Error} If server not found or token is invalid
 */
const getServerFcmToken = async (serverId) => {
  try {
    const { serverDoc } = await validateServer(serverId);
    
    const token = serverDoc.data().fcmToken;
    if (!token || typeof token !== 'string') {
      logger.warn(`Invalid FCM token for server ${serverId}`);
      throw new Error(JSON.stringify({
        code: 'INVALID_FCM_TOKEN',
        message: 'FCM token is missing or invalid',
        details: { serverId }
      }));
    }
    
    return token;
  } catch (error) {
    logger.error('FCM Token Fetch Error:', error);
    throw error;
  }
};

/**
 * Generates a dummy OTP for testing
 * 
 * @returns {string} A dummy OTP value
 */
const generateDummyOTP = () => {
  try {
    // Todo Replace with actual OTP logic later
    return '12345';
  } catch (error) {
    logger.error('Dummy OTP Generation Error:', error);
    throw error;
  }
};

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

module.exports = {
  validateQRParams,
  getServerFcmToken,
  generateDummyOTP
};
