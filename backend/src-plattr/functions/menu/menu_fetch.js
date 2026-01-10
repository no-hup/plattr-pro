const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const MenuValidation = require('./menuValidation');
const {
  fetchActiveMenu,
  fetchSubcategories,
  filterCategoriesByMenu,
  filterItemsByMenu,
  organizeMenuWithSubcategories
} = require('./menuHelpers');

/**
 * fetchMenu - Fetches menu data with multi-menu hierarchy support
 * 
 * New Response Structure:
 * - activeMenu: { menuId, name, isDefault }
 * - categories: array with nested subcategories
 * - menuItems: grouped by subcategoryId (or categoryId as fallback)
 * - metadata: includes totalSubcategories and activeMenuId
 */
exports.fetchMenu = functions.https.onCall(async (data, context) => {
  // Validate input parameters
  const validatedData = MenuValidation.validateMenuFetchInput(data);
  const { restaurantId, inStock } = validatedData;
  console.log("fetchMenu called for restaurant: " + restaurantId + ", inStock: " + inStock);

  try {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Restaurant not found');
    }

    // Fetch all data in parallel
    const [activeMenu, categories, subcategories, menuItems, variants, addons] = await Promise.all([
      fetchActiveMenu(restaurantRef),
      fetchCategories(restaurantRef),
      fetchSubcategories(restaurantRef),
      fetchMenuItems(restaurantRef, inStock),
      fetchVariants(restaurantRef),
      fetchInStockAddons(restaurantRef, inStock)
    ]);

    // Filter categories based on active menu (if menu exists and has categoryIds)
    const filteredCategories = filterCategoriesByMenu(categories, activeMenu);

    // Filter menu items based on active menu (Approach B)
    const filteredMenuItems = filterItemsByMenu(menuItems, activeMenu);

    // Organize the menu with subcategory support
    const organizedMenu = organizeMenuWithSubcategories(
      filteredCategories,
      subcategories,
      filteredMenuItems,
      variants,
      addons
    );

    // Build response
    const response = {
      ...organizedMenu,
      metadata: {
        totalCategories: filteredCategories.length,
        totalSubcategories: subcategories.length,
        totalMenuItems: menuItems.length,
        activeMenuId: activeMenu ? activeMenu.menuId : null
      }
    };

    // Add activeMenu info if available
    if (activeMenu) {
      response.activeMenu = {
        menuId: activeMenu.menuId,
        name: activeMenu.name,
        isDefault: activeMenu.isDefault || false
      };
    }

    return response;

  } catch (error) {
    console.error('Error fetching menu:', error);
    throw new functions.https.HttpsError('internal', 'Unable to fetch menu');
  }
});

/**
 * Fetch all categories ordered by order field
 */
async function fetchCategories(restaurantRef) {
  try {
    const categoriesSnapshot = await restaurantRef.collection('categories').orderBy('order').get();
    return categoriesSnapshot.docs.map(doc => {
      const data = doc.data();
      if (!data.name) {
        console.warn(`[fetchMenu] Category ${doc.id} has no name - skipping`);
        return null;
      }
      return { id: doc.id, ...data };
    }).filter(Boolean);
  } catch (error) {
    console.error('[fetchMenu][fetchCategories] Error:', error);
    throw error;
  }
}

/**
 * Fetch menu items, optionally filtered by stock status
 * Note: Only filters when inStock === true (explicit opt-in)
 */
async function fetchMenuItems(restaurantRef, inStock) {
  let query = restaurantRef.collection('menuItems');
  if (inStock === true) {
    query = query.where('isInStock', '==', true);
  }
  const menuItemsSnapshot = await query.get();
  return menuItemsSnapshot.docs.map(doc => ({
    menuItemId: doc.id,
    ...doc.data()
  }));
}

/**
 * Fetch all variants
 */
async function fetchVariants(restaurantRef) {
  const variantsSnapshot = await restaurantRef.collection('variants').get();
  return variantsSnapshot.docs.reduce((acc, doc) => {
    acc[doc.id] = { id: doc.id, ...doc.data() };
    return acc;
  }, {});
}

/**
 * Fetch addons, optionally filtered by stock status
 * Note: Only filters when inStock === true (explicit opt-in)
 */
async function fetchInStockAddons(restaurantRef, inStock) {
  let query = restaurantRef.collection('addons');
  if (inStock === true) {
    query = query.where('isInStock', '==', true);
  }
  const addonsSnapshot = await query.get();
  return addonsSnapshot.docs.reduce((acc, doc) => {
    acc[doc.id] = { id: doc.id, ...doc.data() };
    return acc;
  }, {});
}
