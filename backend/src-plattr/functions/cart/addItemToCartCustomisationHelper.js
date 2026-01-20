const featureFlags = require('../singleton/FeatureFlags');

/**
 * Applies fallback configuration logic for "Quick Add" scenarios.
 * If the feature flag is enabled and no explicit config is provided,
 * copies configuration from the most recently added matching item in cart.
 * 
 * This is a PURE function - no Firestore calls. It uses cart data passed in.
 * 
 * @param {Object} cart - The cart object (with items array)
 * @param {string} menuItemId - ID of the menu item being added
 * @param {Object} requestData - Original request data { selectedVariants, selectedAddons }
 * @returns {Object} Updated request data with configuration from existing item (if applicable)
 */
function applyFallbackConfiguration(cart, menuItemId, requestData) {
  // Check if feature flag is enabled
  if (!featureFlags.isEnabled('fallbackToSameCustomConfigurationForAddItem')) {
    return requestData;
  }

  // Check if request already specifies configuration
  // If user explicitly provided variants or addons, respect their choice
  const hasVariants = requestData.selectedVariants && Object.keys(requestData.selectedVariants).length > 0;
  const hasAddons = requestData.selectedAddons && requestData.selectedAddons.length > 0;

  if (hasVariants || hasAddons) {
    return requestData;
  }

  // If cart is empty or has no items, nothing to copy from
  if (!cart || !cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
    console.log(`[Cart Fallback] No existing items in cart for fallback`);
    return requestData;
  }

  // Find the most recently added item with the same menuItemId (search in reverse)
  const existingItem = [...cart.items].reverse().find(item => item.menuItemId === menuItemId);

  if (!existingItem) {
    console.log(`[Cart Fallback] No existing item found for menuItemId: ${menuItemId}`);
    return requestData;
  }

  const updatedRequestData = { ...requestData };
  let copiedVariants = false;
  let copiedAddons = false;

  // Extract selectedVariants from existing item
  if (existingItem.selectedVariantsDetails && existingItem.selectedVariantsDetails.length > 0) {
    const selectedVariants = {};

    existingItem.selectedVariantsDetails.forEach(variant => {
      if (variant.id && variant.selected_variant_id) {
        selectedVariants[variant.id] = variant.selected_variant_id;
      }
    });

    if (Object.keys(selectedVariants).length > 0) {
      updatedRequestData.selectedVariants = selectedVariants;
      copiedVariants = true;
    }
  }

  // Extract selectedAddons from existing item
  if (existingItem.selectedAddonsDetails && existingItem.selectedAddonsDetails.length > 0) {
    const selectedAddons = existingItem.selectedAddonsDetails
      .filter(addon => addon.id)
      .map(addon => addon.id);

    if (selectedAddons.length > 0) {
      updatedRequestData.selectedAddons = selectedAddons;
      copiedAddons = true;
    }
  }

  // Log what happened
  if (copiedVariants || copiedAddons) {
    console.log(`[Cart Fallback] Copied config from existing item: ${menuItemId} (variants: ${copiedVariants}, addons: ${copiedAddons})`);
  } else {
    console.log(`[Cart Fallback] Existing item ${menuItemId} has no custom configuration to copy`);
  }

  return updatedRequestData;
}

module.exports = {
  applyFallbackConfiguration
};