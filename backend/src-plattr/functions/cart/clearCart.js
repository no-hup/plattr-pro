const functions = require("firebase-functions");
const { admin, db } = require('../admin/admin');
const { validateCheckoutFields, requireActiveTableSession } = require('./cartInputValidation');
const errorHandler = require('../singleton/ErrorHandler');

/**
 * Internal function to clear a cart
 * This is used by the checkoutCart function and not exposed directly as an API
 * 
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @returns {Promise<void>} - Promise that resolves when the cart is cleared
 */
async function clearCartInternal(restaurantId, tableId) {
  if (!tableId || !restaurantId) {
    throw new Error("tableId and restaurantId are required.");
  }

  // Reference to the table's cart
  const cartRef = db.collection("restaurants").doc(restaurantId).collection("carts").doc(tableId);

  // Check if the cart exists
  const cartDoc = await cartRef.get();
  if (!cartDoc.exists) {
    throw new Error("Cart not found for the table.");
  }

  // Delete the cart document
  await cartRef.delete();
  
  return;
}

/**
 * HTTP Callable function to clear a cart
 */
const clearCart = functions.https.onCall(async (data, context) => {
  validateCheckoutFields(data.data);
  const { tableId, restaurantId } = data.data;

  try {
    // Public restaurantId/tableId must not be enough to wipe a cart.
    await requireActiveTableSession(restaurantId, tableId);
    await clearCartInternal(restaurantId, tableId);
    return { message: "Cart cleared successfully." };
  } catch (error) {
    // Preserves HttpsError codes (e.g. unauthenticated → 401) instead of
    // collapsing everything to internal/500.
    errorHandler.handleError(error, 'clearCart');
  }
});

// Export both the callable function and the internal implementation
module.exports = clearCart;
module.exports.clearCartInternal = clearCartInternal;


/**
 * clearCart.js
 * 
 * This function clears all items from a user's cart for a specific restaurant.
 * 
 * - Validates input to ensure required fields are provided.
 * - Deletes the user's cart document in Firestore.
 * - Returns a success message upon completion.
 * 
 * Date Created: 2024-11-23
 */