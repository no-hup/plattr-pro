const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const { validateFCMTokenUpdate } = require('./notificationValidation');
const timestamp = require('../utils/timestamp');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
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
    return ResponseBuilder.success(
      { 
        serverId: data.serverId,
        updatedAt: new Date().toISOString()
      },
      'FCM token updated successfully'
    );

  } catch (error) {
    logger.error('FCM Token Update Failed:', error);
    errorHandler.handleError(error, 'updateServerFCMToken', {
      serverId: data?.serverId,
      authUid: context.auth?.uid
    });
  }
});