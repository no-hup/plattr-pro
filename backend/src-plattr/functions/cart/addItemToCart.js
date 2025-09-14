const functions = require("firebase-functions");
const { admin, db, FieldValue, Timestamp } = require("../admin/admin");
const { calculateItemPrice } = require("./calculateCartValue");
const { calculateCartValue } = require("./calculateCartValue");
const featureFlags = require('../singleton/FeatureFlags');
const errorMessages = require('../singleton/ErrorMessages');
const { compareArraysIgnoringOrder } = require('../utils/arrayUtils');
const { sanitizeCart, safeRecalculateItemPrice } = require('../utils/dataUtils');
const { validateAddItemFields, validateSessionId } = require('./cartInputValidation');
const { getExistingItemConfiguration } = require('./addItemToCartCustomisationHelper');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const { BasicPriceInfo, CartItemPriceInfo, CartTotalPriceInfo } = require('../genericModels/priceinfo');
const {
  getCartsCollectionRef,
  getMenuItemRef,
  getNextCartItemId,
  validatePriceData,
  fixInvalidPriceInfo,
  sanitizeNumber,
  findIdenticalItemInCart,
  createDefaultCart,
  processSelectedVariants,
  processSelectedAddons,
  createCartItem,
  checkDifferentConfigExists,
  validateCartPriceInfo
} = require('./addItemToCartBoilerplateHelper');

const addItemToCart = functions.https.onCall(async (data, context) => {
  console.log("poopoo addItemToCart request received");
  validateAddItemFields(data.data);
  let {
    tableId,
    restaurantId,
    menuItemId,
    quantity,
    selectedVariants = {},
    selectedAddons = [],
    sessionId
  } = data.data;

  // Additional validation for quantity
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity < 1) {
    errorHandler.badRequest('Quantity must be a valid positive number.');
  }

  try {
    // If sessionId is provided, validate it
    if (sessionId) {
      await validateSessionId(restaurantId, sessionId);
    }
    
    // Get existing item configuration if available
    // This will update selectedVariants and selectedAddons if the item exists in cart
    const updatedRequestData = await getExistingItemConfiguration(
      restaurantId, 
      tableId, 
      menuItemId, 
      { selectedVariants, selectedAddons }
    );
    
    // Update variables with values from existing item configuration
    selectedVariants = updatedRequestData.selectedVariants;
    selectedAddons = updatedRequestData.selectedAddons;

    const cartRef = getCartsCollectionRef(db, restaurantId, tableId);
    const menuItemRef = getMenuItemRef(db, restaurantId, menuItemId);

    // Use a transaction to prevent race conditions when updating the cart
    return await db.runTransaction(async (transaction) => {
      // Fetch cart and menuItem in parallel
      const [cartDoc, menuItemDoc] = await Promise.all([
        transaction.get(cartRef),
        transaction.get(menuItemRef),
      ]).catch((error) => {
        console.error("Error fetching cart or menu item:", error);
        errorHandler.internalError("Error accessing database.", { originalError: error.message });
      });

      let cart = cartDoc.exists
        ? cartDoc.data()
        : createDefaultCart(restaurantId, tableId, sessionId);

      if (!cart.items || !Array.isArray(cart.items)) {
        console.warn("Cart missing items array, initializing empty array");
        cart.items = [];
      }

      if (!cart.priceInfo) {
        cart.priceInfo = new CartTotalPriceInfo().toObject();
      } else {
        // Sanitize price info to prevent NaN values
        cart.priceInfo = fixInvalidPriceInfo(cart.priceInfo);
      }

      if (!menuItemDoc.exists) {
        errorHandler.notFound("Menu item not found.");
      }

      const menuItem = menuItemDoc.data();

      if (!menuItem.isInStock) {
        errorHandler.preconditionFailed("Menu item is currently out of stock.");
      }

      // Validate menuItem price data
      if (!validatePriceData(menuItem.priceInfo, `menuItem.${menuItemId}`)) {
        console.error("Invalid price data in menu item:", menuItem.priceInfo);
        errorHandler.internalError("Menu item has invalid price data.", { menuItemId });
      }

      console.log("poopoo Menu Item Details:", JSON.stringify(menuItem));

      // Process selected variants and addons
      const selectedVariantsDetails = await processSelectedVariants(
        db, 
        restaurantId, 
        menuItem, 
        selectedVariants, 
        errorHandler
      );
      
      const selectedAddonsDetails = await processSelectedAddons(
        db, 
        restaurantId, 
        selectedAddons, 
        errorHandler
      );

      console.log("poopoo Selected Variants:",
        JSON.stringify(selectedVariantsDetails, null, 2)
      );
      console.log("poopoo Selected Addons:",
        JSON.stringify(selectedAddonsDetails, null, 2)
      );

      const itemPriceDetails = calculateItemPrice(
        menuItem,
        selectedVariantsDetails,
        selectedAddonsDetails
      );

      // Validate calculated price info
      if (!itemPriceDetails || !itemPriceDetails.priceInfo) {
        console.error("Price calculation failed, using defaults");
        itemPriceDetails.priceInfo = new CartItemPriceInfo({
          itemBasePrice: 0,
          itemFinalPrice: 0,
          totalVariantBasePrice: 0,
          totalVariantFinalPrice: 0,
          totalAddonBasePrice: 0,
          totalAddonFinalPrice: 0,
          totalBasePrice: 0,
          finalPrice: 0,
          discount: 0,
          discountAmount: 0
        }).toObject();
      }

      const itemToAdd = createCartItem(
        menuItemId,
        menuItem,
        selectedVariantsDetails,
        selectedAddonsDetails,
        quantity,
        itemPriceDetails,
        getNextCartItemId(cart.items)
      );

      const isMultipleConfigsSupported = featureFlags.isEnabled('isMultipleVariantOrAddonForMenuItemsSupported');
      
      // First check if identical item exists
      const existingItemIndex = findIdenticalItemInCart(cart.items, itemToAdd, compareArraysIgnoringOrder);

      // If multiple configs not supported, check if same menu item with different config exists
      if (!isMultipleConfigsSupported && existingItemIndex === -1) {
        const differentConfigError = checkDifferentConfigExists(
          cart.items, 
          menuItemId, 
          errorMessages, 
          sanitizeCart
        );
        
        if (differentConfigError) {
          return differentConfigError;
        }
      }

      if (existingItemIndex > -1) {
        // Update existing item
        const existingItem = cart.items[existingItemIndex];
        
        // Ensure existingItem.quantity is a valid number
        if (typeof existingItem.quantity !== 'number' || isNaN(existingItem.quantity)) {
          console.error(`Critical: Invalid quantity for existing item ${existingItem.menuItemId}, was: ${existingItem.quantity}, resetting to 0`);
          existingItem.quantity = 0;
        }
        
        // Store the old quantity for debugging
        const oldQuantity = existingItem.quantity;
        existingItem.quantity += quantity;
        
        // Recalculate prices using safe utility function
        existingItem.priceInfo = safeRecalculateItemPrice(existingItem, existingItem.quantity);
        
        console.log(`poopoo Updated item quantity from ${oldQuantity} to ${existingItem.quantity} with new final price: ${existingItem.priceInfo.finalPrice}`);
      } else {
        // Add new item
        cart.items.push(itemToAdd);
      }

      // Use calculateCartValue to update the cart's total values
      const updatedPriceInfo = await calculateCartValue(cart);
      
      // Validate calculated cart price info
      cart.priceInfo = validateCartPriceInfo(updatedPriceInfo);

      // Perform one final check for NaN values before saving
      const sanitizedCart = sanitizeCart(cart);
      
      // Verify no NaN values remain in price fields
      const finalCheck = JSON.stringify(sanitizedCart, (key, value) => {
        if (typeof value === 'number' && isNaN(value)) {
          console.error(`Critical: NaN value still found in key ${key} after sanitization`);
          return 0;
        }
        return value;
      });

      // Update cart within the transaction
      transaction.set(
        cartRef,
        {
          ...sanitizedCart,
          sessionId,
          lastUpdated: timestamp.now(),
        },
        { merge: true }
      );

      console.log("poopoo Sanitized cart to be saved:", JSON.stringify(sanitizedCart, null, 2));
      
      return {
        message: "Item added to cart successfully.",
        status: "success",
        data: {
          cart: sanitizedCart,
        },
      };
    });
  } catch (error) {
    // Log the full error for debugging
    console.error("Error in addItemToCart:", error);

    // Use ErrorHandler to standardize error responses
    errorHandler.handleError(error, 'addItemToCart');
  }
});

module.exports = addItemToCart;

/**
 * addItemToCart.js
 * 
 * This function adds a menu item to a user's cart in a specific restaurant.
 * 
 * - Validates input, including variants and addons belonging to the menu item.
 * - Retrieves or initializes the user's cart for the given restaurant.
 * - Updates the cart by either adding a new item or incrementing the quantity of an existing item.
 * - Recalculates the cart's total amount.
 * - Updates the cart document in Firestore.
 * - Handles errors gracefully with meaningful messages.
 * 
 * 
 * Sample response of this function with 1 item added with 2 quantity
 * 
 * {
  "message": "Item added to cart successfully.",
  "status": "success",
  "data": {
    "cart": {
      "restaurantId": "restaurant123",
      "items": [
        {
          "menuItemId": "burger123",
          "selectedVariantsDetails": [
            {
              "id": "size",
              "name": "large",
              "selected_variant_id": "large",
              "selected_variant_name": "large",
              "priceInfo": {
                "itemBasePrice": 5.0,
                "itemVariantBasePrice": 1.5,
                "itemAddonBasePrice": 3.0,
                "discount": 10.0,
                "itemFinalPrice": 8.55,
                "totalBasePrice": 10.0,
                "totalVariantBasePrice": 3.0,
                "totalAddonBasePrice": 6.0,
                "finalPrice": 17.1
              }
            }
          ],
          "selectedAddonsDetails": [
            {
              "id": "extraCheese",
              "name": "extraCheese",
              "priceInfo": {
                "itemBasePrice": 1.0,
                "itemVariantBasePrice": 0.3,
                "itemAddonBasePrice": 0.7,
                "discount": 0.0,
                "itemFinalPrice": 1.0,
                "totalBasePrice": 1.0,
                "totalVariantBasePrice": 0.3,
                "totalAddonBasePrice": 0.7,
                "finalPrice": 1.0
              },
              "respectParentDiscount": true
            },
            {
              "id": "bacon",
              "name": "bacon",
              "priceInfo": {
                "itemBasePrice": 2.0,
                "itemVariantBasePrice": 0.6,
                "itemAddonBasePrice": 1.4,
                "discount": 0.0,
                "itemFinalPrice": 2.0,
                "totalBasePrice": 2.0,
                "totalVariantBasePrice": 0.6,
                "totalAddonBasePrice": 1.4,
                "finalPrice": 2.0
              },
              "respectParentDiscount": true
            }
          ],
          "quantity": 2,
          "priceInfo": {
            "itemBasePrice": 5.0,
            "itemVariantBasePrice": 1.5,
            "itemAddonBasePrice": 3.0,
            "discount": 10.0,
            "itemFinalPrice": 8.55,
            "totalBasePrice": 10.0,
            "totalVariantBasePrice": 3.0,
            "totalAddonBasePrice": 6.0,
            "finalPrice": 17.1
          },
          "cartItemId": 1
        }
      ],
      "priceInfo": {
        "basePrice": 10.0,
        "totalVariantBasePrice": 3.0,
        "totalAddonBasePrice": 6.0,
        "finalPrice": 17.1,
        "totalDiscount": 10.0,
        "totalDiscountAmount": 1.9
      },
      "lastUpdated": "2025-01-22T13:45:00.000Z"
    }
  }
}

 * Date Created: 2024-11-23
 */
