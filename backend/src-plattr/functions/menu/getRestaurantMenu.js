const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const MenuValidation = require('./menuValidation');

const getRestaurantMenu = functions.https.onCall(async (data, context) => {
  let stage = 'init';
  const setStage = s => {
    stage = s;
    console.log("poopoo stage=" + s);
  };

  try {
    setStage('parse-request');
    // Safely log only the data property to avoid circular references
    const safeDataToLog = data && typeof data === 'object' ? (data.data || 'No data property found') : data;
    console.log("poopoo data:", JSON.stringify(safeDataToLog));
    
    // Handle possible input formats directly
    let restaurantId, inStock = false;
    
    // Try to extract required parameters
    if (data && data.data && data.data.restaurantId) {
      // Standard callable format
      restaurantId = data.data.restaurantId;
      inStock = data.data.inStock !== undefined ? data.data.inStock : false;
      console.log("poopoo using standard data.data format");
    } else if (data && data.restaurantId) {
      // Direct object format
      restaurantId = data.restaurantId;
      inStock = data.inStock !== undefined ? data.inStock : false;
      console.log("poopoo using direct object format");
    } else {
      console.error("poopoo invalid request format - missing restaurantId");
      throw new functions.https.HttpsError('invalid-argument', 'Restaurant ID is required');
    }
    
    console.log("poopoo using restaurantId:", restaurantId, "inStock:", inStock);
    
    // Validate restaurantId
    if (!restaurantId) {
      throw new functions.https.HttpsError('invalid-argument', 'Restaurant ID is required');
    }

    setStage('validate-restaurant');
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Restaurant not found');
    }

    setStage('fetch-menu-components');
    const [categories, menuItems, variants, addons] = await Promise.all([
      fetchCategories(restaurantRef),
      fetchMenuItems(restaurantRef, inStock),
      fetchVariants(restaurantRef),
      fetchAddons(restaurantRef, inStock)
    ]);

    setStage('organize-menu');
    const organizedMenu = organizeMenu(categories, menuItems, variants, addons);
    organizedMenu.metadata = {
      totalCategories: categories.length,
      totalMenuItems: menuItems.length
    };

    setStage('return-response');
    return {
      success: true,
      message: 'Restaurant menu fetched successfully',
      data: organizedMenu
    };

  } catch (error) {
    console.error(`[getRestaurantMenu][stage=${stage}]`, error);
    // If it's a Firebase HttpsError, return a consistent error object
    if (error && typeof error.code === 'string' && error.code.match(/^[a-z_]+$/)) {
      return {
        success: false,
        message: error.message || 'Failed to fetch menu',
        errorCode: error.code,
        data: null
      };
    } else {
      // Wrap all other errors
      return {
        success: false,
        message: error && error.message ? error.message : 'Unable to fetch menu',
        errorCode: 'internal',
        data: null
      };
    }
  }
});

async function fetchCategories(restaurantRef) {
  try {
    const categoriesSnapshot = await restaurantRef.collection('categories').orderBy('order').get();
    return categoriesSnapshot.docs.map(doc => {
      const data = doc.data();
      if (!data.name) throw new Error('Category name is missing');
      return { id: doc.id, ...data };
    });
  } catch (error) {
    console.error('[getRestaurantMenu][fetchCategories]', error);
    throw error;
  }
}

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
    console.error('[getRestaurantMenu][fetchMenuItems]', error);
    throw error;
  }
}

async function fetchVariants(restaurantRef) {
  try {
    const variantsSnapshot = await restaurantRef.collection('variants').get();
    return variantsSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = { id: doc.id, ...doc.data() };
      return acc;
    }, {});
  } catch (error) {
    console.error('[getRestaurantMenu][fetchVariants]', error);
    throw error;
  }
}

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
    console.error('[getRestaurantMenu][fetchAddons]', error);
    throw error;
  }
}

function organizeMenu(categories, menuItems, variants, addons) {
  try {
    const organizedMenu = {
      categories,
      menuItems: {}
    };

    menuItems.forEach(item => {
      if (!organizedMenu.menuItems[item.categoryId]) {
        organizedMenu.menuItems[item.categoryId] = [];
      }

      const itemVariants = (item.variants || []).map(variant =>
        variants[variant.id] ? { ...variants[variant.id], name: variant.name } : null
      ).filter(Boolean);

      const itemAddons = (item.addons || []).map(addonId => addons[addonId]).filter(Boolean);

      organizedMenu.menuItems[item.categoryId].push({
        ...item,
        variants: itemVariants,
        addons: itemAddons
      });
    });

    return organizedMenu;
  } catch (error) {
    console.error('[getRestaurantMenu][organizeMenu]', error);
    throw error;
  }
}

module.exports = getRestaurantMenu;