const admin = require('../admin/admin');

/**
 * Sends an FCM notification to a device
 * 
 * @param {string} token - FCM token to send notification to (required)
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title (optional, defaults to 'No Title')
 * @param {string} payload.body - Notification body (optional, defaults to 'No Body')
 * @param {Object} payload.data - Additional data to send with notification (optional)
 * 
 * Expected payload structure:
 * {
 *   title: "Notification Title",  // optional
 *   body: "Notification message", // optional
 *   data: {                       // optional
 *     key1: "value1",
 *     key2: "value2"
 *   }
 * }
 * 
 * @throws {Error} If sending fails
 */
const sendFCMNotification = async (token, payload) => {
  if (!token) throw new Error('No FCM token available');

  try {
    await admin.messaging().send({
      token,
      notification: {
        title: payload.title || 'No Title',
        body: payload.body || 'No Body',
      },
      data: payload.data ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)])) : {}, // Ensure all values are strings
    });

    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);

    throw new Error(JSON.stringify({
      code: 'FCM_SEND_FAILURE',
      message: 'Failed to deliver notification',
      details: { 
        token: token.slice(-6), 
        errorInfo: error.errorInfo || error.message 
      }
    }));
  }
};

module.exports = { sendFCMNotification };
