const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const { validateFCMTokenUpdate } = require('./notificationValidation');
const timestamp = require('../utils/timestamp');
const logger = functions.logger;

/**
 * Updates the FCM token for a server
 * 
 * @param {Object} data - The request data
 * @param {string} data.serverId - Server ID (required)
 * @param {string} data.fcmToken - FCM token (required)
 * @param {Object} context - Auth context with authenticated user
 * 
 * Expected data structure:
 * {
 *   serverId: "server123",       // required
 *   fcmToken: "fcm-token-string" // required
 * }
 * 
 * @returns {Object} Response with status, serverId, and updatedAt timestamp
 */
exports.updateServerFCMToken = functions.https.onCall(async (data, context) => {
  try {
    // Validate input and permissions
    const { serverRef, fcmToken } = await validateFCMTokenUpdate(data, context);

    // Perform update with timestamp
    await serverRef.update({
      fcmToken,
      lastTokenUpdate: timestamp.serverTimestamp()
    });

    logger.info(`Successfully updated FCM token for server ${data.serverId}`);
    return { 
      status: 'success',
      serverId: data.serverId,
      updatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('FCM Token Update Failed:', error);
    throw new functions.https.HttpsError(
      error.code || 'internal',
      error.message || 'Token update failed',
      {
        serverId: data?.serverId,
        authUid: context.auth?.uid,
        errorCode: error.code
      }
    );
  }
});