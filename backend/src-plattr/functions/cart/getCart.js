const functions = require("firebase-functions");
const { admin, db } = require("../admin/admin");
const { validateGetCartFields, validateSessionId } = require('./cartInputValidation');
const timestamp = require('../utils/timestamp');
const { calculateCartValue } = require('./calculateCartValue');
const { HttpsError } = require('firebase-functions/v2/https');
const { BasicPriceInfo, CartItemPriceInfo, CartTotalPriceInfo } = require('../genericModels/priceinfo');

/**
 * Sanitizes numeric values to prevent NaN errors
 * @param {any} value - The value to sanitize
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} - Sanitized number
 */
function sanitizeNumber(value, defaultValue = 0) {
  return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
}

/**
 * Sanitizes a cart object to ensure all price-related fields are valid numbers
 * @param {Object} cart - The cart object to sanitize
 * @returns {Object} - The sanitized cart object
 */
function sanitizeCart(cart) {
  if (!cart) return null;
  
  try {
    // Sanitize cart price info using CartTotalPriceInfo model
    cart.priceInfo = new CartTotalPriceInfo(cart.priceInfo).toObject();
    
    // Sanitize items if they exist
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.map(item => {
        if (!item) return null;
        
        // Ensure quantity is valid
        item.quantity = sanitizeNumber(item.quantity, 1);
        
        // Sanitize item price info using CartItemPriceInfo model
        if (item.priceInfo) {
          item.priceInfo = new CartItemPriceInfo(item.priceInfo).toObject();
        }
        
        return item;
      }).filter(item => item !== null);
    } else {
      cart.items = [];
    }
    
    return cart;
  } catch (error) {
    console.error("Error sanitizing cart:", error);
    return cart; // Return original cart if sanitization fails
  }
}

/**
 * Get Cart Cloud Function
 * 
 * Retrieves a user's cart from Firestore for a specific restaurant and table.
 * If no cart exists, returns an empty cart structure.
 * 
 * @param {Object} data - Input parameters
 * @param {string} data.restaurantId - ID of the restaurant
 * @param {string} data.tableId - ID of the table
 * @param {string} [data.sessionId] - Optional session ID
 * @returns {Object} Cart details including items and price information
 */
const getCart = functions.https.onCall(async (data, context) => {
  try {
    console.log("poopoo getCart request received:", data.data);
    validateGetCartFields(data.data);
    
    const { restaurantId, tableId, sessionId } = data.data;

    // Validate session if provided
    if (sessionId) {
      await validateSessionId(restaurantId, sessionId);
    }

    const cartRef = db
      .collection("restaurants")
      .doc(restaurantId)
      .collection("carts")
      .doc(tableId);

    const cartDoc = await cartRef.get().catch((error) => {
      console.error("Error fetching cart:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to access cart document."
      );
    });

    let cart;
    if (cartDoc.exists) {
      cart = cartDoc.data();
      console.log("poopoo Cart found:", JSON.stringify(cart, null, 2));
    } else {
      cart = {
        restaurantId,
        tableId,
        sessionId,
        items: [],
        priceInfo: new CartTotalPriceInfo().toObject(),
        lastUpdated: timestamp.now(),
      };
      console.log("poopoo No existing cart, returning empty structure");
    }

    if (cart.items && Array.isArray(cart.items)) {
      cart.items = cart.items.map(item => {
        if (!item.selectedVariantsDetails) item.selectedVariantsDetails = [];
        if (!item.selectedAddonsDetails) item.selectedAddonsDetails = [];
        
        // Fix NaN quantity values
        if (item.quantity === undefined || item.quantity === null || isNaN(item.quantity)) {
          console.log(`poopoo Fixing invalid quantity for item ${item.menuItemId}, setting to 1`);
          item.quantity = 1;
        }
        
        return item;
      });
    }

    const sanitizedCart = sanitizeCart(cart);

    // Recalculate the cart value to ensure correct totals
    try {
      // Only recalculate if there are items in the cart
      if (Array.isArray(sanitizedCart.items) && sanitizedCart.items.length > 0) {
        const recalculatedPriceInfo = await calculateCartValue(sanitizedCart);
        sanitizedCart.priceInfo = recalculatedPriceInfo;
        
        // Update the cart in Firestore with recalculated values
        await cartRef.update({
          priceInfo: recalculatedPriceInfo,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error recalculating cart value:", error);
      // Continue with existing price info, but ensure it's sanitized
      sanitizedCart.priceInfo = new CartTotalPriceInfo().toObject();
    }

    return {
      message: "Cart retrieved successfully.",
      status: "success",
      data: {
        cart: sanitizedCart,
      },
    };
  } catch (error) {
    console.error("Error in getCart:", error, error.stack);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred while retrieving the cart."
    );
  }
});

module.exports = getCart;
