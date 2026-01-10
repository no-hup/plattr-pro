const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const MenuValidation = require('./menuValidation');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const {
  fetchActiveMenu,
  fetchSubcategories,
  filterCategoriesByMenu,
  filterItemsByMenu,
  organizeMenuWithSubcategories
} = require('./menuHelpers');

/**
 * getRestaurantMenu - Fetches menu data with multi-menu hierarchy support
 * 
 * New Response Structure:
 * - activeMenu: { menuId, name, isDefault }
 * - categories: array with nested subcategories
 * - menuItems: grouped by subcategoryId (or categoryId as fallback)
 * - metadata: includes totalSubcategories and activeMenuId
 */
const getRestaurantMenu = functions.https.onCall(async (data, context) => {
  let stage = 'init';
  let restaurantId;

  const setStage = s => {
    stage = s;
    console.log("getRestaurantMenu stage=" + s);
  };

  try {
    setStage('parse-request');
    // Safely log only the data property to avoid circular references
    const safeDataToLog = data && typeof data === 'object' ? (data.data || 'No data property found') : data;
    console.log("getRestaurantMenu data:", JSON.stringify(safeDataToLog));

    // Handle possible input formats directly
    let inStock = false;

    // Try to extract required parameters
    if (data && data.data && data.data.restaurantId) {
      // Standard callable format
      restaurantId = data.data.restaurantId;
      inStock = data.data.inStock !== undefined ? data.data.inStock : false;
      console.log("Using standard data.data format");
    } else if (data && data.restaurantId) {
      // Direct object format
      restaurantId = data.restaurantId;
      inStock = data.inStock !== undefined ? data.inStock : false;
      console.log("Using direct object format");
    } else {
      console.error("Invalid request format - missing restaurantId");
      errorHandler.badRequest('Restaurant ID is required');
    }

    console.log("Using restaurantId:", restaurantId, "inStock:", inStock);

    // Validate restaurantId
    if (!restaurantId) {
      errorHandler.badRequest('Restaurant ID is required');
    }

    setStage('validate-restaurant');
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      errorHandler.notFound('Restaurant not found', { restaurantId });
    }

    setStage('fetch-menu-components');
    const [activeMenu, categories, subcategories, menuItems, variants, addons] = await Promise.all([
      fetchActiveMenu(restaurantRef),
      fetchCategories(restaurantRef),
      fetchSubcategories(restaurantRef),
      fetchMenuItems(restaurantRef, inStock),
      fetchVariants(restaurantRef),
      fetchAddons(restaurantRef, inStock)
    ]);

    setStage('organize-menu');
    // Filter categories based on active menu
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

    // Build metadata
    organizedMenu.metadata = {
      totalCategories: filteredCategories.length,
      totalSubcategories: subcategories.length,
      totalMenuItems: filteredMenuItems.length,
      activeMenuId: activeMenu ? activeMenu.menuId : null
    };

    // Add activeMenu info if available
    if (activeMenu) {
      organizedMenu.activeMenu = {
        menuId: activeMenu.menuId,
        name: activeMenu.name,
        isDefault: activeMenu.isDefault || false
      };
    }

    setStage('return-response');
    return ResponseBuilder.success(
      organizedMenu,
      'Restaurant menu fetched successfully'
    );
  } catch (error) {
    console.error(`[getRestaurantMenu][stage=${stage}]`, error);
    errorHandler.handleError(error, 'getRestaurantMenu', {
      stage,
      restaurantId
    });
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
        console.warn(`[getRestaurantMenu] Category ${doc.id} has no name - skipping`);
        return null;
      }
      return { id: doc.id, ...data };
    }).filter(Boolean);
  } catch (error) {
    console.error('[getRestaurantMenu][fetchCategories] Error:', error);
    throw error;
  }
}

/**
 * Fetch menu items, optionally filtered by stock status
 */
async function fetchMenuItems(restaurantRef, inStock) {
  try {
    let query = restaurantRef.collection('menuItems');
    if (inStock === true) {
      query = query.where('isInStock', '==', true);
    }
    const menuItemsSnapshot = await query.get();
    return menuItemsSnapshot.docs.map(doc => ({
      menuItemId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('[getRestaurantMenu][fetchMenuItems] Error:', error);
    throw error;
  }
}

/**
 * Fetch all variants
 */
async function fetchVariants(restaurantRef) {
  try {
    const variantsSnapshot = await restaurantRef.collection('variants').get();
    return variantsSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = { id: doc.id, ...doc.data() };
      return acc;
    }, {});
  } catch (error) {
    console.error('[getRestaurantMenu][fetchVariants] Error:', error);
    throw error;
  }
}

/**
 * Fetch addons, optionally filtered by stock status
 */
async function fetchAddons(restaurantRef, inStock) {
  try {
    let query = restaurantRef.collection('addons');
    if (inStock === true) {
      query = query.where('isInStock', '==', true);
    }
    const addonsSnapshot = await query.get();
    return addonsSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = { id: doc.id, ...doc.data() };
      return acc;
    }, {});
  } catch (error) {
    console.error('[getRestaurantMenu][fetchAddons] Error:', error);
    throw error;
  }
}

module.exports = getRestaurantMenu;
