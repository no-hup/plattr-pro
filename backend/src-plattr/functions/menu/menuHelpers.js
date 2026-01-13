/**
 * Shared helper functions for menu fetching operations
 * Used by both menu_fetch.js and getRestaurantMenu.js
 */

/**
 * Fetch the currently active menu, or fall back to default menu
 * @param {FirebaseFirestore.DocumentReference} restaurantRef
 * @returns {Promise<{menuId: string, name: string, isDefault: boolean, categoryIds: string[]} | null>}
 */
async function fetchActiveMenu(restaurantRef) {
  try {
    // First try to find menu with isActive: true
    let menusSnapshot = await restaurantRef
      .collection('menus')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!menusSnapshot.empty) {
      const doc = menusSnapshot.docs[0];
      return { menuId: doc.id, ...doc.data() };
    }

    // Fallback: find menu with isDefault: true
    menusSnapshot = await restaurantRef
      .collection('menus')
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (!menusSnapshot.empty) {
      const doc = menusSnapshot.docs[0];
      return { menuId: doc.id, ...doc.data() };
    }

    // No menus configured - return null for backward compatibility
    return null;
  } catch (error) {
    console.error('[menuHelpers][fetchActiveMenu] Error:', error);
    return null;
  }
}

/**
 * Fetch all subcategories ordered by order field
 * @param {FirebaseFirestore.DocumentReference} restaurantRef
 * @returns {Promise<Array<{id: string, name: string, parentCategoryId: string, order: number}>>}
 */
async function fetchSubcategories(restaurantRef) {
  try {
    const subcategoriesSnapshot = await restaurantRef
      .collection('subcategories')
      .orderBy('order')
      .get();

    return subcategoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    // Distinguish between missing collection/index and actual errors
    if (error.code === 'failed-precondition' || error.code === 'not-found') {
      console.log('[menuHelpers][fetchSubcategories] Subcategories collection not configured');
    } else {
      console.error('[menuHelpers][fetchSubcategories] Error:', error);
    }
    return [];
  }
}

/**
 * Filter categories based on active menu's categoryIds
 * @param {Array} categories
 * @param {{categoryIds: string[]} | null} activeMenu
 * @returns {Array}
 */
function filterCategoriesByMenu(categories, activeMenu) {
  if (!activeMenu || !activeMenu.categoryIds || activeMenu.categoryIds.length === 0) {
    // No filtering if no active menu or no categoryIds defined
    return categories;
  }

  const allowedCategoryIds = new Set(activeMenu.categoryIds);
  return categories.filter(cat => allowedCategoryIds.has(cat.id));
}

/**
 * Organize menu with subcategory support
 * - Groups menuItems by subcategoryId (cross-listing supported)
 * - Falls back to categoryId if item has no subcategories
 * - Nests subcategories under their parent categories
 * 
 * @param {Array} categories
 * @param {Array} subcategories
 * @param {Array} menuItems
 * @param {Object} variants - Map of variantId -> variant data
 * @param {Object} addons - Map of addonId -> addon data
 * @returns {{categories: Array, menuItems: Object}}
 */
function organizeMenuWithSubcategories(categories, subcategories, menuItems, variants, addons) {
  try {
    // Build subcategory lookup by parentCategoryId
    const subcategoryMap = {};
    const subcategoryById = {};

    subcategories.forEach(subcat => {
      subcategoryById[subcat.id] = subcat;

      // Validate parentCategoryId exists
      if (!subcat.parentCategoryId) {
        console.warn(`[menuHelpers] Subcategory ${subcat.id} has no parentCategoryId - skipping from parent map`);
        return; // Skip adding to subcategoryMap but keep in subcategoryById for direct lookup
      }

      if (!subcategoryMap[subcat.parentCategoryId]) {
        subcategoryMap[subcat.parentCategoryId] = [];
      }
      // Include parentCategoryId in response for Flutter model compatibility
      subcategoryMap[subcat.parentCategoryId].push({
        id: subcat.id,
        name: subcat.name,
        description: subcat.description || '',
        image: subcat.image || null,
        parentCategoryId: subcat.parentCategoryId,
        order: subcat.order || 0
      });
    });

    // Sort subcategories within each category by order
    Object.values(subcategoryMap).forEach(subcats => {
      subcats.sort((a, b) => a.order - b.order);
    });

    // Build categories with nested subcategories
    const categoriesWithSubcategories = categories.map(cat => {
      // Get subcategories from the category's subcategoryIds array (ordered) or from parentCategoryId lookup
      let categorySubcategories;

      if (cat.subcategoryIds && cat.subcategoryIds.length > 0) {
        // Use the order defined in category's subcategoryIds
        categorySubcategories = cat.subcategoryIds
          .map(subId => {
            const subcat = subcategoryById[subId];
            if (!subcat) return null;
            // Include parentCategoryId in response
            return {
              id: subcat.id,
              name: subcat.name,
              description: subcat.description || '',
              image: subcat.image || null,
              parentCategoryId: subcat.parentCategoryId || cat.id, // Fallback to current category
              order: subcat.order || 0
            };
          })
          .filter(Boolean);
      } else {
        // Fallback: use subcategories that reference this category as parent
        categorySubcategories = subcategoryMap[cat.id] || [];
      }

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        image: cat.image || null,
        order: cat.order || 0,
        viewType: cat.viewType || 'list',  // 'list' (default) or 'carousel'
        defaultExpanded: cat.defaultExpanded !== false,  // Default true if not specified
        subcategories: categorySubcategories
      };
    });

    // Process menu items with variants and addons
    const processedMenuItems = menuItems.map(item => {
      const itemVariants = (item.variants || []).map(variant =>
        variants[variant.id] ? { ...variants[variant.id], name: variant.name } : null
      ).filter(Boolean);

      const itemAddons = (item.addons || []).map(addonId => addons[addonId]).filter(Boolean);

      return {
        ...item,
        variants: itemVariants,
        addons: itemAddons
      };
    });

    // Group items by subcategoryId (or categoryId as fallback)
    const menuItemsGrouped = {};

    processedMenuItems.forEach(item => {
      const subcategoryIds = item.subcategoryIds || [];

      if (subcategoryIds.length > 0) {
        // Item belongs to one or more subcategories - add to each (cross-listing)
        subcategoryIds.forEach(subcatId => {
          if (!menuItemsGrouped[subcatId]) {
            menuItemsGrouped[subcatId] = [];
          }
          menuItemsGrouped[subcatId].push(item);
        });
      } else {
        // Fallback: group by categoryId for backward compatibility
        const categoryId = item.categoryId;
        if (categoryId) {
          if (!menuItemsGrouped[categoryId]) {
            menuItemsGrouped[categoryId] = [];
          }
          menuItemsGrouped[categoryId].push(item);
        }
      }
    });

    return {
      categories: categoriesWithSubcategories,
      menuItems: menuItemsGrouped
    };
  } catch (error) {
    console.error('[menuHelpers][organizeMenuWithSubcategories] Error:', error);
    throw error;
  }
}

/**
 * Filter menu items based on active menu's menuItemIds
 * Approach B: Menu controls its items via menuItemIds array
 * @param {Array} menuItems
 * @param {{menuItemIds: string[]} | null} activeMenu
 * @returns {Array}
 */
function filterItemsByMenu(menuItems, activeMenu) {
  if (!activeMenu || !activeMenu.menuItemIds || activeMenu.menuItemIds.length === 0) {
    // No filtering if no active menu or no menuItemIds defined (Backward Compatibility)
    return menuItems;
  }

  // console.log(`[filterItemsByMenu] Filtering ${menuItems.length} items against ${activeMenu.menuItemIds.length} IDs`); // Removed

  // Robust matching: trim and strong type conversion
  const allowedItemIds = new Set(activeMenu.menuItemIds.map(id => String(id).trim()));

  const filtered = menuItems.filter(item => {
    const itemId = String(item.id).trim();
    return allowedItemIds.has(itemId);
  });

  // console.log(`[filterItemsByMenu] Result: ${filtered.length} items`); // Removed

  if (filtered.length === 0 && menuItems.length > 0) {
    console.warn(`[filterItemsByMenu] WARNING: Filtering removed ALL items (IDs mismatch?). Returning ALL items as fallback.`);
    return menuItems;
  }

  return filtered;
}

module.exports = {
  fetchActiveMenu,
  fetchSubcategories,
  filterCategoriesByMenu,
  filterItemsByMenu,
  organizeMenuWithSubcategories
};
