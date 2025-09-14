const functions = require("firebase-functions");
const { admin, db } = require('../admin/admin');
const { validateRemoveItemFields } = require('./cartInputValidation');
const timestamp = require('../utils/timestamp');
const { calculateCartValue } = require('./calculateCartValue');
const { CartTotalPriceInfo } = require('../genericModels/priceinfo');

/**
 * Simplified function to remove an item from cart
 */
const removeItemFromCart = functions.https.onCall(async (data, context) => {
  console.log("poopoo removeItemFromCart called with data:", JSON.stringify(data.data));
  const { tableId, restaurantId, menuItemId } = data.data;

  // Input validation
  validateRemoveItemFields(data.data);

  try {
    const cartRef = db.collection("restaurants").doc(restaurantId).collection("carts").doc(tableId);
    const cartDoc = await cartRef.get();

    if (!cartDoc.exists) {
      console.error("Cart not found for the table:", { tableId, restaurantId });
      throw new functions.https.HttpsError("not-found", "Cart not found for the table.");
    }

    let cart = cartDoc.data();
    console.log("poopoo Cart data retrieved:", Object.keys(cart));
    
    // Ensure cart.items is an array
    if (!cart.items || !Array.isArray(cart.items)) {
      console.error("Cart items is not an array or is undefined");
      throw new functions.https.HttpsError("internal", "Cart data is corrupted.");
    }
    
    // Filter out the item to remove
    const updatedItems = cart.items.filter(item => item.menuItemId !== menuItemId);
    
    // Check if any item was removed
    if (updatedItems.length === cart.items.length) {
      console.error("Item not found in cart:", menuItemId);
      throw new functions.https.HttpsError("not-found", "Item not found in cart.");
    }
    
    // Update cart object with filtered items
    cart.items = updatedItems;
    
    // Calculate new price info using the calculateCartValue function
    // which now uses our price info models internally
    let updatedPriceInfo;
    
    if (updatedItems.length > 0) {
      updatedPriceInfo = await calculateCartValue(cart);
      
      // Update cart in Firestore with calculated price info
      await cartRef.update({
        items: updatedItems,
        priceInfo: updatedPriceInfo,
        lastUpdated: timestamp.now()
      });
      
      // Prepare response with updated cart
      cart.priceInfo = updatedPriceInfo;
    } else {
      // Delete empty cart
      await cartRef.delete();
      cart.items = [];
      cart.priceInfo = new CartTotalPriceInfo().toObject();
    }

    return {
      message: "Item removed from cart successfully.",
      status: "success",
      data: { cart }
    };
    
  } catch (error) {
    console.error("Error removing item from cart:", error);
    console.error("Error stack:", error.stack);
    throw new functions.https.HttpsError("internal", "Error removing item from cart.", { originalError: error.message });
  }
});

module.exports = removeItemFromCart;

/**
 * removeItemFromCart.js
 * 
 * This function removes a menu item or decreases its quantity from a user's cart for a specific restaurant.
 * 
 * - Validates input to ensure required fields are provided.
 * - Retrieves the user's cart and checks if the item exists.
 * - Either decreases the quantity or removes the item entirely if the quantity becomes zero.
 * - Recalculates the total cart amount using calculateCartValue with our price info models.
 * - Updates the cart document in Firestore or deletes it if the cart becomes empty.
 * 
 * Date Created: 2024-11-23
 */
