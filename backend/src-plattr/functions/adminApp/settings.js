const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');

/**
 * Get restaurant settings (Theme and Feature Flags)
 */
exports.getRestaurantSettings = functions.https.onCall(async (data, context) => {
    const request = data?.data || data || {};
    const { restaurantId } = request;

    if (!restaurantId) {
        return errorHandler.badRequest('Restaurant ID is required');
    }

    try {
        const settingsDoc = await db.collection('restaurants')
            .doc(restaurantId)
            .collection('config')
            .doc('settings')
            .get();

        if (!settingsDoc.exists) {
            // Return default settings if not found
            return ResponseBuilder.success({
                theme: {
                    primaryColor: '#000000',
                    secondaryColor: '#FFFFFF',
                    accentColor: '#FF0000',
                    backgroundColor: '#F5F5F5',
                    surfaceColor: '#FFFFFF',
                    errorColor: '#B00020',
                    fontFamily: 'Inter'
                },
                featureFlags: {
                    isOtpMandatoryAtScan: true,
                    isUsernameEnabled: true,
                    isMultiUserSupportEnabled: false
                }
            }, 'Default settings returned');
        }

        return ResponseBuilder.success(settingsDoc.data(), 'Settings retrieved successfully');
    } catch (error) {
        console.error('Error in getRestaurantSettings:', error);
        return errorHandler.handleError(error, 'getRestaurantSettings');
    }
});

/**
 * Update restaurant settings
 */
exports.updateRestaurantSettings = functions.https.onCall(async (data, context) => {
    const request = data?.data || data || {};
    const { restaurantId, settings } = request;

    if (!restaurantId || !settings) {
        return errorHandler.badRequest('Restaurant ID and settings are required');
    }

    try {
        await db.collection('restaurants')
            .doc(restaurantId)
            .collection('config')
            .doc('settings')
            .set(settings, { merge: true });

        return ResponseBuilder.success(null, 'Settings updated successfully');
    } catch (error) {
        console.error('Error in updateRestaurantSettings:', error);
        return errorHandler.handleError(error, 'updateRestaurantSettings');
    }
});
