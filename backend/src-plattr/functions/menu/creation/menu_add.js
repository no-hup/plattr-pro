// File: menu_add.js

/**
 * Requirement: Add an item to the cart
 * - Endpoint: POST /menu/add
 * - Body Parameters:
 *   - itemId: string (Required)
 *   - selectedVariants: array of strings (Optional)
 *   - selectedAddOns: array of strings (Optional)
 *   - quantity: number (Default: 1, always 1 for initial addition)
 * - Flow:
 *   - Adds an item to the user's cart.
 *   - If it's the first time adding this item and it is customizable, prompt frontend to show customization options.
 *   - If the item with the same combination already exists, increase the quantity.
 *   - If a new combination of variants/add-ons is added, create a new line item.
 * - Nuances:
 *   - Treat different combinations of variants/add-ons as unique line items.
 *   - Use flags to indicate whether customizations are required.
 */

const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const MenuValidation = require('./menuValidation');
const timestamp = require('../utils/timestamp');

exports.addItemToCart = functions.https.onCall(async (data, context) => {
    // Input validation
    if (!data || !data.restaurantId || !data.tableId || !data.sessionId || !data.item || !data.quantity) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required fields'
        );
    }

    const { restaurantId, tableId, sessionId, item, quantity } = data;

    try {
        // Get the session reference
        const sessionRef = db.collection('restaurants')
            .doc(restaurantId)
            .collection('sessions')
            .doc(sessionId);
        
        const session = await sessionRef.get();
        if (!session.exists) {
            throw new functions.https.HttpsError('not-found', 'Session not found');
        }
        
        // Check if the item already exists in the cart
        const cartItemRef = sessionRef.collection('cart').doc(item.id);
        const cartItem = await cartItemRef.get();
        
        if (cartItem.exists) {
            // Item already exists, increment quantity
            await cartItemRef.update({
                quantity: FieldValue.increment(quantity)
            });
        } else {
            // Item doesn't exist, add it to cart
            await cartItemRef.set({
                ...item,
                quantity: quantity,
                createdAt: timestamp.serverTimestamp()
            });
        }
        
        return { success: true, message: 'Item added to cart' };
    } catch (error) {
        console.error('Error adding item to cart:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
