const { db } = require('../admin/admin');
const featureFlags = require('../singleton/FeatureFlags');

/**
 * Helper to get existing item configuration from cart if item exists
 * 
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @param {string} menuItemId - ID of the menu item
 * @param {Object} requestData - Original request data
 * @returns {Promise<Object>} Updated request data with configuration from existing item
 */
async function getExistingItemConfiguration(restaurantId, tableId, menuItemId, requestData) {
  try {
    // Check if feature flag is enabled
    if (!featureFlags.isEnabled('fallbackToSameCustomConfigurationForAddItem')) {
      console.log('poopoo Feature flag fallbackToSameCustomConfigurationForAddItem is disabled');
      return requestData;
    }

    // Get cart document
    const cartRef = db
      .collection("restaurants")
      .doc(restaurantId)
      .collection("carts")
      .doc(tableId);

    const cartDoc = await cartRef.get();

    // If cart doesn't exist, return original request data
    if (!cartDoc.exists || !cartDoc.data().items || !Array.isArray(cartDoc.data().items)) {
      return requestData;
    }

    const cart = cartDoc.data();
    
    // Find the existing item with the same menuItemId
    const existingItem = cart.items.find(item => item.menuItemId === menuItemId);
    
    // If item not found, return original request data
    if (!existingItem) {
      return requestData;
    }

    console.log(`poopoo Found existing item in cart: ${menuItemId}, using its configuration`);
    
    const updatedRequestData = { ...requestData };
    
    // Extract selectedVariants from existing item
    if (existingItem.selectedVariantsDetails && existingItem.selectedVariantsDetails.length > 0) {
      const selectedVariants = {};
      
      existingItem.selectedVariantsDetails.forEach(variant => {
        if (variant.id && variant.selected_variant_id) {
          selectedVariants[variant.id] = variant.selected_variant_id;
        }
      });
      
      // Only update if we found any valid variants
      if (Object.keys(selectedVariants).length > 0) {
        updatedRequestData.selectedVariants = selectedVariants;
      }
    }
    
    // Extract selectedAddons from existing item
    if (existingItem.selectedAddonsDetails && existingItem.selectedAddonsDetails.length > 0) {
      const selectedAddons = existingItem.selectedAddonsDetails
        .filter(addon => addon.id)
        .map(addon => addon.id);
      
      // Only update if we found any valid addons
      if (selectedAddons.length > 0) {
        updatedRequestData.selectedAddons = selectedAddons;
      }
    }
    
    console.log('poopoo Updated request data with configuration from existing item');
    return updatedRequestData;
  } catch (error) {
    console.error('Error getting existing item configuration:', error);
    // In case of error, return original request data
    return requestData;
  }
}

module.exports = {
  getExistingItemConfiguration
}; 