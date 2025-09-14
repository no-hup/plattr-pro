const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const timestamp = require('../utils/timestamp');

// Update chef information
exports.updateChef = functions.https.onCall(async (data, context) => {
    // TODO: Add authentication check here

    const { kitchenId, chefId, name, role, fcmToken } = data;

    // Validate input
    if (!kitchenId || !chefId) {
        throw new functions.https.HttpsError('invalid-argument', 'Kitchen ID and Chef ID are required');
    }

    try {
        const chefRef = db.collection('restaurants').doc('rest001').collection('kitchens').doc(kitchenId).collection('chefs').doc(chefId);
        const chefDoc = await chefRef.get();

        if (!chefDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Chef not found');
        }

        // Prepare update data
        const updateData = {};
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (fcmToken !== undefined) updateData.fcmToken = fcmToken; // Allow updating fcmToken to an empty string

        // Update the chef document
        await chefRef.update({
            ...updateData,
            updatedAt: timestamp.serverTimestamp() // Update the timestamp
        });

        return { message: 'Chef updated successfully' };
    } catch (error) {
        console.error('Error updating chef:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update chef');
    }
});
