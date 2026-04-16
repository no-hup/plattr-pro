const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const { validateAdminSession, transformDotPathsToNested, deepMerge } = require('./auth');

/**
 * Get restaurant settings (Theme and Feature Flags)
 * Requires ADMIN or MANAGER role.
 */
exports.getRestaurantSettings = functions.https.onCall(async (data, context) => {
    const request = data?.data || data || {};
    const { restaurantId, sessionId } = request;

    if (!restaurantId) {
        return errorHandler.badRequest('Restaurant ID is required');
    }

    try {
        // Validate session and role
        await validateAdminSession(restaurantId, sessionId);

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
 * Requires ADMIN or MANAGER role.
 * 
 * Supports dot-path keys (e.g., 'theme.primaryColor', 'featureFlags.dineInEnabled')
 * which are transformed into nested objects before merging.
 */
exports.updateRestaurantSettings = functions.https.onCall(async (data, context) => {
    const request = data?.data || data || {};
    const { restaurantId, sessionId, settings } = request;

    if (!restaurantId || !settings) {
        return errorHandler.badRequest('Restaurant ID and settings are required');
    }

    try {
        // Validate session and role
        await validateAdminSession(restaurantId, sessionId);

        const settingsRef = db.collection('restaurants')
            .doc(restaurantId)
            .collection('config')
            .doc('settings');

        // Get current settings
        const currentDoc = await settingsRef.get();
        const currentSettings = currentDoc.exists ? currentDoc.data() : {};

        // Transform dot-path keys to nested objects
        // e.g., { 'theme.primaryColor': '#FF0000' } => { theme: { primaryColor: '#FF0000' } }
        const nestedSettings = transformDotPathsToNested(settings);

        // Deep merge with current settings
        const mergedSettings = deepMerge(currentSettings, nestedSettings);

        // Write the merged settings
        await settingsRef.set(mergedSettings);

        return ResponseBuilder.success(null, 'Settings updated successfully');
    } catch (error) {
        console.error('Error in updateRestaurantSettings:', error);
        return errorHandler.handleError(error, 'updateRestaurantSettings');
    }
});
