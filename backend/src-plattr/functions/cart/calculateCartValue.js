const { db } = require('../admin/admin'); // Use the exported db from admin.js
const { BasicPriceInfo, CartItemPriceInfo, CartTotalPriceInfo } = require('../genericModels/priceinfo');
const { FULFILLMENT_STATUS } = require('../orders/orderConstants');
const { mapCartStatus } = require('../utils/statusUtils');

/**
 * Is this cart/order item something the customer pays for?
 *
 * CANCELLED (never made) and RETURNED (came back) are both non-billable. This is
 * the item-level twin of `isLiveCart` in orders/createOrUpdateOrder.js and of the
 * UNBILLED pair in cart/updateCartStatus.js — keep the three in agreement.
 *
 * @param {Object} item - A cart item (or a flattened order item)
 * @returns {boolean} false when the item must be left out of totals and offers
 */
function isBillableItem(item) {
  const status = mapCartStatus(item?.status);
  return status !== FULFILLMENT_STATUS.CANCELLED && status !== FULFILLMENT_STATUS.RETURNED;
}

/**
 * Calculates the price of an item based on its base price, selected variants, and addons.
 * @param {Object} menuItem - The menu item object containing pricing information.
 * @param {Array} selectedVariants - An array of selected variant objects.
 * @param {Array} addonDetails - An array of addon objects containing pricing information.
 * @returns {Object} An object containing price information.
 */
function calculateItemPrice(menuItem, selectedVariants = [], addonDetails = []) {
  // Utility function for safe price rounding
  function roundPrice(price) {
    return Math.round(price * 100) / 100;
  }

  // Utility function to apply discount safely and log warnings for anomalies
  function applyDiscount(basePrice, discountPercentage) {
    const discountedPrice = basePrice * (1 - discountPercentage / 100);
    if (discountedPrice <= 0) {
      console.warn(`Warning: Price after discount is invalid. Base Price: ${basePrice}, Discount Percentage: ${discountPercentage}`);
    }
    return Math.max(0, discountedPrice); // Ensures no negative price
  }

  // Step 1: Validate and Extract Base Item Values
  if (!menuItem || !menuItem.priceInfo) {
    throw new Error("Invalid menu item or missing price information.");
  }

  // Use BasicPriceInfo to validate menu item price
  const itemPriceInfo = BasicPriceInfo.fromObject(menuItem.priceInfo);
  const itemBasePrice = itemPriceInfo.basePrice;
  const itemDiscount = itemPriceInfo.discount;
  const itemFinalPrice = itemPriceInfo.finalPrice;

  // Step 3: Process Variants (if any)
  let variantBaseTotal = 0;
  let variantFinalTotal = 0;

  if (selectedVariants.length > 0) {
    for (const variant of selectedVariants) {
      if (!variant || !variant.priceInfo) {
        console.warn("Invalid variant detected. Skipping...");
        continue;
      }

      // Use BasicPriceInfo to validate variant price
      const variantPriceInfo = BasicPriceInfo.fromObject(variant.priceInfo);
      const variantBasePrice = variantPriceInfo.basePrice;
      variantBaseTotal += variantBasePrice;

      let variantFinalPrice;
      if (variant.respectParentDiscount === true) {
        // Apply parent item's discount
        variantFinalPrice = applyDiscount(variantBasePrice, itemDiscount);
      } else {
        // Use variant's own final price
        variantFinalPrice = variantPriceInfo.finalPrice;
      }

      variantFinalTotal += roundPrice(variantFinalPrice);
    }
  }

  // Step 4: Process Addons (if any)
  let addonBaseTotal = 0;
  let addonFinalTotal = 0;

  if (addonDetails.length > 0) {
    for (const addon of addonDetails) {
      if (!addon || !addon.priceInfo) {
        console.warn("Invalid addon detected. Skipping...");
        continue;
      }

      // Use BasicPriceInfo to validate addon price
      const addonPriceInfo = BasicPriceInfo.fromObject(addon.priceInfo);
      const addonBasePrice = addonPriceInfo.basePrice;
      addonBaseTotal += addonBasePrice;

      let addonFinalPrice;
      if (addon.respectParentDiscount === true) {
        // Apply parent item's discount
        addonFinalPrice = applyDiscount(addonBasePrice, itemDiscount);
      } else {
        // Use addon's own final price
        addonFinalPrice = addonPriceInfo.finalPrice;
      }

      addonFinalTotal += roundPrice(addonFinalPrice);
    }
  }

  // Step 5: Calculate Totals
  const totalBasePrice = itemBasePrice + variantBaseTotal + addonBaseTotal;
  const totalFinalPrice = itemFinalPrice + variantFinalTotal + addonFinalTotal;

  // Ensure discount amount is never negative
  const totalDiscountAmount = Math.max(0, roundPrice(totalBasePrice - totalFinalPrice));

  // Create cart item price info using our model
  const cartItemPriceInfo = new CartItemPriceInfo({
    itemBasePrice: roundPrice(itemBasePrice),
    itemFinalPrice: roundPrice(itemFinalPrice),
    totalVariantBasePrice: roundPrice(variantBaseTotal),
    totalVariantFinalPrice: roundPrice(variantFinalTotal),
    totalAddonBasePrice: roundPrice(addonBaseTotal),
    totalAddonFinalPrice: roundPrice(addonFinalTotal),
    totalBasePrice: roundPrice(totalBasePrice),
    finalPrice: roundPrice(totalFinalPrice),
    discount: itemDiscount,
    discountAmount: totalDiscountAmount,
  });

  return { priceInfo: cartItemPriceInfo.toObject() };
}

/**
 * Calculates the total value of the cart.
 * @param {Object} cart - The cart object containing items and their details.
 * @returns {Object} An object containing total price information for the cart.
 */
async function calculateCartValue(cart) {
  try {
    if (!cart || !cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
      return {
        basePrice: 0,
        finalPrice: 0,
        totalVariantBasePrice: 0,
        totalAddonBasePrice: 0,
        totalDiscount: 0,
        totalDiscountAmount: 0
      };
    }

    let basePrice = 0;
    let finalPrice = 0;
    let variantTotalPrice = 0;
    let addonTotalPrice = 0;

    // Loop through all items in the cart
    for (const item of cart.items) {
      if (!item || !item.priceInfo) {
        console.warn("Invalid cart item or missing price info. Skipping...");
        continue;
      }

      // Skip non-billable items (normalised: legacy docs may store lower-case).
      // RETURNED belongs here as much as CANCELLED — food that came back is not
      // paid for. Leaving it out billed a returned cart again at COMPLETED,
      // because updateOrderStatus recomputes the bill through this function.
      if (!isBillableItem(item)) {
        continue;
      }

      // Handle invalid quantity values more robustly
      let quantity;
      if (typeof item.quantity !== 'number' || isNaN(item.quantity) || item.quantity < 1) {
        console.warn(`Invalid quantity detected for item ${item.menuItemId || 'unknown'}, using default of 1`);
        quantity = 1;
      } else {
        quantity = item.quantity;
      }

      // Use our CartItemPriceInfo model to validate item price info
      const itemPriceInfo = new CartItemPriceInfo(item.priceInfo);

      // Use validated values for accumulation
      basePrice += itemPriceInfo.totalBasePrice;
      finalPrice += itemPriceInfo.finalPrice;
      variantTotalPrice += itemPriceInfo.totalVariantBasePrice;
      addonTotalPrice += itemPriceInfo.totalAddonBasePrice;
    }

    // Offers V2: carts no longer carry offer fields. Offers are evaluated and
    // applied at the ORDER level in createOrUpdateOrder.js. The cart priceInfo
    // only reflects item-level discounts (if any).
    const itemDiscountAmount = Math.max(0, basePrice - finalPrice);
    const totalDiscountPercentage = basePrice > 0 ? (itemDiscountAmount / basePrice) * 100 : 0;

    // Create cart total price info using our model
    const cartTotalPriceInfo = new CartTotalPriceInfo({
      basePrice: roundPrice(basePrice),
      finalPrice: roundPrice(Math.max(0, finalPrice)),
      totalVariantBasePrice: roundPrice(variantTotalPrice),
      totalAddonBasePrice: roundPrice(addonTotalPrice),
      totalDiscount: roundPrice(totalDiscountPercentage),
      totalDiscountAmount: roundPrice(itemDiscountAmount)
    });

    return cartTotalPriceInfo.toObject();
  } catch (error) {
    console.error("Error calculating cart value:", error);
    throw new Error("Failed to calculate cart value.");
  }
}

// Utility for consistent rounding
function roundPrice(price) {
  return Math.round(price * 100) / 100;
}

module.exports = {
  calculateCartValue,
  calculateItemPrice,
  isBillableItem,
};
