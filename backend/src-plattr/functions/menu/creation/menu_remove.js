// File: menu_remove.js

/**
 * Requirement: Remove an item from the cart
 * - Endpoint: POST /menu/remove
 * - Body Parameters:
 *   - itemId: string (Required)
 *   - selectedVariants: array of strings (Optional)
 *   - selectedAddOns: array of strings (Optional)
 * - Flow:
 *   - Removes an item or reduces the quantity of an item in the user's cart.
 *   - If there are multiple combinations of variants/add-ons, frontend may need to prompt user to select which combination to remove.
 * - Nuances:
 *   - If quantity > 1, decrement by 1.
 *   - If quantity is 1, remove the item from the cart.
 */

// This function is kept for backward compatibility but consider migrating to removeItemFromCart.js
// which uses the restaurant/table-based structure instead of user-based structure

const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const MenuValidation = require('./menuValidation');

exports.removeMenuItem = functions.https.onCall(async (data, context) => {
  // Validate user authentication and input parameters
  const userId = MenuValidation.validateAuthentication(context);
  const validatedData = MenuValidation.validateMenuRemoveInput(data);
  
  const { itemId, selectedVariants, selectedAddOns } = validatedData;

  try {
    const userCartRef = db.collection('users').doc(userId).collection('cart');
    const existingItemsSnapshot = await userCartRef
      .where('itemId', '==', itemId)
      .where('selectedVariants', '==', selectedVariants)
      .where('selectedAddOns', '==', selectedAddOns)
      .limit(1)
      .get();

    if (existingItemsSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'Item not found in cart');
    }

    const existingItem = existingItemsSnapshot.docs[0];
    const currentQuantity = existingItem.data().quantity;

    if (currentQuantity > 1) {
      await userCartRef.doc(existingItem.id).update({
        quantity: FieldValue.increment(-1)
      });
    } else {
      await userCartRef.doc(existingItem.id).delete();
    }

    return { status: 'success' };
  } catch (error) {
    console.error('Error removing item from cart:', error);
    throw new functions.https.HttpsError('internal', 'Error removing item from cart');
  }
});
