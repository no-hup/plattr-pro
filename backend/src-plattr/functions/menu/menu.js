/**
 * Function Signatures:
 * 
 * getFullMenu(): Promise<{ categories: Category[], menuItems: MenuItem[] }>
 * - Retrieves the full menu structure with categories and menu items
 * 
 * getMenuByCategory(categoryId: string): Promise<{ category: Category, menuItems: MenuItem[] }>
 * - Fetches menu items for a specific category
 * 
 * searchMenu(query: string): Promise<MenuItem[]>
 * - Searches for menu items based on a query string
 * 
 * getPopularItems(limit: number = 10): Promise<MenuItem[]>
 * - Retrieves the most popular menu items
 * 
 * getSpecialOffers(): Promise<MenuItem[]>
 * - Fetches menu items with active discounts or special offers
 *
 * Cloud Functions:
 * 
 * addMenuItem(data): Promise<Object>
 * - Cloud function to add a new menu item
 * 
 * updateMenuItem(data): Promise<Object>
 * - Cloud function to update an existing menu item
 * 
 * deleteMenuItem(data): Promise<Object>
 * - Cloud function to delete a menu item
 */

const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const MenuValidation = require('./menuValidation');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const { validateAdminSession, validateStaffSession } = require('../adminApp/auth');
const { menuAuditRow } = require('../adminApp/menu_admin');
const timestamp = require('../utils/timestamp');

const { getAllCategories, getCategoryById } = require('./creation/cateogory');
const { getAllMenuItems, getMenuItemsByCategory, createMenuItem, updateMenuItem: updateMenuItemUtil, deleteMenuItem: deleteMenuItemUtil, getMenuItemById, updateMenuItemStock } = require('./menuItem');

/**
 * TD-038: a dish may name a tax block, and if it does the block must exist on this restaurant's
 * config. Refused here, where the admin is still standing at the form, not at bill preview.
 * `null`/absent is allowed: the dish then takes its category's block (`tax.assign`) at placement.
 */
async function assertKnownTaxBlock(restaurantId, taxBlockId) {
  if (taxBlockId === undefined || taxBlockId === null) return;
  const doc = await db.collection('restaurants').doc(restaurantId).collection('config').doc('settings').get();
  const blocks = (doc.exists && doc.data()?.tax?.blocks) || {};
  if (typeof taxBlockId !== 'string' || !blocks[taxBlockId]) {
    errorHandler.badRequest(`Unknown tax block "${taxBlockId}"; set it up under tax.blocks first`, {
      restaurantId, taxBlockId, known: Object.keys(blocks),
    });
  }
}

/**
 * D6 / TD-106: a dish links add-ons by id and portions as {id, name}; the price lives on the shared record.
 * An object-shaped add-on (the old editor's full copy) or an id with no record (the old editor's `addon_<ms>`)
 * is refused here, with the manager at the form: the menu read would drop it and the cart refuse it, and
 * Raita would vanish from Chicken Biryani with nobody told why.
 */
async function assertKnownOptionLinks(restaurantId, data) {
  MenuValidation.validateOptionLinks(data);
  const rest = db.collection('restaurants').doc(restaurantId);
  const check = async (ids, col, label) => {
    const docs = await Promise.all(ids.map(id => rest.collection(col).doc(id).get()));
    const missing = ids.filter((id, i) => !docs[i].exists);
    if (missing.length) errorHandler.badRequest(`Unknown ${label} ${missing.join(', ')}: create it first`, { restaurantId, missing });
  };
  if (data.addons) await check(data.addons, 'addons', 'add-on');
  if (data.variants) await check(data.variants.map(v => v.id), 'variants', 'portion');
}

/**
 * Input: { }
 * Gets the full menu structure with categories and menu items
 */
async function getFullMenu() {
  try {
    const [categories, menuItems] = await Promise.all([
      getAllCategories(),
      getAllMenuItems()
    ]);
    return { categories, menuItems };
  } catch (error) {
    console.error('Error fetching full menu:', error);
    throw new Error('Failed to fetch full menu');
  }
}

/**
 * Input: { categoryId (required) }
 * Gets menu items for a specific category
 */
async function getMenuByCategory(categoryId) {
  try {
    MenuValidation.validateCategoryId(categoryId);
    
    const [category, menuItems] = await Promise.all([
      getCategoryById(categoryId),
      getMenuItemsByCategory(categoryId)
    ]);
    return { category, menuItems };
  } catch (error) {
    console.error('Error fetching menu by category:', error);
    throw new Error('Failed to fetch menu by category');
  }
}

/**
 * Input: { query (required) }
 * Searches for menu items based on a query string
 */
async function searchMenu(query) {
  try {
    if (!query) {
      throw new Error('Search query is required');
    }
    
    const menuItemsSnapshot = await db.collection('menuItems')
      .where('meta.name', '>=', query)
      .where('meta.name', '<=', query + '\uf8ff')
      .get();
    return menuItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error searching menu:', error);
    throw new Error('Failed to search menu');
  }
}

/**
 * Input: { limit (optional) = 10 }
 * Gets the most popular menu items
 */
async function getPopularItems(limit = 10) {
  try {
    // Assuming we have a 'popularity' field to sort by
    const menuItemsSnapshot = await db.collection('menuItems')
      .orderBy('popularity', 'desc')
      .limit(limit)
      .get();
    return menuItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching popular items:', error);
    throw new Error('Failed to fetch popular items');
  }
}

/**
 * Input: { }
 * Gets menu items with active discounts or special offers
 */
async function getSpecialOffers() {
  try {
    const menuItemsSnapshot = await db.collection('menuItems')
      .where('priceInfo.discount', '>', 0)
      .get();
    return menuItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching special offers:', error);
    throw new Error('Failed to fetch special offers');
  }
}

/**
 * Cloud function to add a menu item
 * Endpoint: /menu/add-item
 */
const addMenuItem = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    // Log the function call
    console.log('addMenuItem function called with request:', request);
    
    // Validate input
    if (!request.restaurantId || !request.menuItemData) {
      console.error('Invalid request: restaurantId and menuItemData are required');
      errorHandler.badRequest('Restaurant ID and menu item data are required', {
        hasRestaurantId: !!request.restaurantId
      });
    }
    
    const { restaurantId, menuItemData } = request;

    await validateAdminSession(restaurantId, request.sessionId);


    // Check if required fields exist in menuItemData
    if (!menuItemData.meta || !menuItemData.meta.name || !menuItemData.categoryId || 
        !menuItemData.priceInfo || menuItemData.priceInfo.basePrice === undefined) {
      console.error('Menu item data missing required fields');
      errorHandler.badRequest('Menu item data is missing required fields', {
        restaurantId
      });
    }
    
    // Create the menu item
    await assertKnownTaxBlock(restaurantId, menuItemData.taxBlockId);
    await assertKnownOptionLinks(restaurantId, menuItemData);
    const menuItemId = await createMenuItem(restaurantId, menuItemData);
    
    // Get the created menu item
    const menuItem = await getMenuItemById(restaurantId, menuItemId);
    
    console.log(`Successfully created menu item: ${menuItemId} for restaurant: ${restaurantId}`);
    return ResponseBuilder.success(
      {
        menuItemId,
        menuItem
      },
      'Menu item added successfully'
    );
    
  } catch (error) {
    console.error('Error in addMenuItem:', error);
    errorHandler.handleError(error, 'addMenuItem', {
      restaurantId: request?.restaurantId,
      menuItemId: request?.menuItemId
    });
  }
});

/**
 * Cloud function to update a menu item
 * Endpoint: /menu/update-item
 */
const updateMenuItem = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    // Log the function call
    console.log('updateMenuItem function called with request:', request);
    
    // Validate input
    if (!request.restaurantId || !request.menuItemId || !request.updateData) {
      console.error('Invalid request: restaurantId, menuItemId and updateData are required');
      errorHandler.badRequest('Restaurant ID, menu item ID and update data are required', {
        hasRestaurantId: !!request.restaurantId,
        hasMenuItemId: !!request.menuItemId
      });
    }
    
    const { restaurantId, menuItemId, updateData } = request;

    await validateAdminSession(restaurantId, request.sessionId);


    // Check if the menu item exists
    const menuItemRef = db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').doc(menuItemId);
    const menuItemDoc = await menuItemRef.get();
    
    if (!menuItemDoc.exists) {
      console.error(`Menu item not found with ID: ${menuItemId}`);
      errorHandler.notFound('Menu item not found', { restaurantId, menuItemId });
    }
    
    // Update the menu item
    await assertKnownTaxBlock(restaurantId, updateData.taxBlockId);
    await assertKnownOptionLinks(restaurantId, updateData);
    await updateMenuItemUtil(restaurantId, menuItemId, updateData);
    
    // Get the updated menu item
    const updatedMenuItem = await getMenuItemById(restaurantId, menuItemId);
    
    console.log(`Successfully updated menu item: ${menuItemId} for restaurant: ${restaurantId}`);
    return ResponseBuilder.success(
      {
        menuItemId,
        menuItem: updatedMenuItem
      },
      'Menu item updated successfully'
    );
    
  } catch (error) {
    console.error('Error in updateMenuItem:', error);
    errorHandler.handleError(error, 'updateMenuItem', {
      restaurantId: request?.restaurantId,
      menuItemId: request?.menuItemId
    });
  }
});

/**
 * Cloud function to delete a menu item
 * Endpoint: /menu/delete-item
 */
const deleteMenuItem = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    // Log the function call
    console.log('deleteMenuItem function called with request:', request);
    
    // Validate input
    if (!request.restaurantId || !request.menuItemId) {
      console.error('Invalid request: restaurantId and menuItemId are required');
      errorHandler.badRequest('Restaurant ID and menu item ID are required', {
        hasRestaurantId: !!request.restaurantId
      });
    }
    
    const { restaurantId, menuItemId } = request;

    await validateAdminSession(restaurantId, request.sessionId);


    // Check if the menu item exists
    const menuItemRef = db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').doc(menuItemId);
    const menuItemDoc = await menuItemRef.get();
    
    if (!menuItemDoc.exists) {
      console.error(`Menu item not found with ID: ${menuItemId}`);
      errorHandler.notFound('Menu item not found', { restaurantId, menuItemId });
    }
    
    // Delete the menu item
    await deleteMenuItemUtil(restaurantId, menuItemId);
    
    console.log(`Successfully deleted menu item: ${menuItemId} for restaurant: ${restaurantId}`);
    return ResponseBuilder.success(
      {
        menuItemId
      },
      'Menu item deleted successfully'
    );
    
  } catch (error) {
    console.error('Error in deleteMenuItem:', error);
    errorHandler.handleError(error, 'deleteMenuItem', {
      restaurantId: request?.restaurantId,
      menuItemId: request?.menuItemId
    });
  }
});

/**
 * Cloud function to update a menu item's availability, or a shared add-on's (D6: send `addonId` instead of
 * `menuItemId`). Any staff session: 20:00 the kitchen runs out of raita, and the waiter who hears it switches
 * Extra Raita off once; it leaves every biryani on the guest menu and the cart refuses it.
 * Endpoint: /menu-updateMenuItemAvailability
 */
const updateMenuItemAvailability = functions.https.onRequest(async (req, res) => {
  try {
    console.log('updateMenuItemAvailability function called with request:', req.body);
    
    // Validate input
    const { restaurantId, sessionId, menuItemId, addonId, isAvailable } = req.body || {};
    
    if (!restaurantId || !menuItemId === !addonId || typeof isAvailable !== 'boolean') {
      console.error('Invalid request: restaurantId, menuItemId, and isAvailable (boolean) are required');
      return res
        .status(400)
        .json(
          ResponseBuilder.error(
            'invalid_argument',
            'Restaurant ID, one of menu item ID or add-on ID, and availability status (boolean) are required',
            { restaurantId, menuItemId, addonId }
          )
        );
    }
    
    // Staff-only mutation (called by both admin and waiter apps)
    let staffId;
    try {
      ({ serverId: staffId } = await validateStaffSession(restaurantId, sessionId));
    } catch (authErr) {
      return res
        .status(401)
        .json(
          ResponseBuilder.error('unauthorized', 'Valid staff session required', {
            restaurantId,
          })
        );
    }

    if (addonId) {
      // DECISION(D6, 2026-09-25): Raita out of stock is refused on every dish, guest app first; the admin app and
      // the waiter's stock screen switch the same shared record. See moonshot/reviews/2026-09-25-decisions-for-shaurya.md.
      // If you change this, ask Shaurya first.
      const addonRef = db.collection('restaurants').doc(restaurantId).collection('addons').doc(addonId);
      const audit = db.collection('restaurants').doc(restaurantId).collection('audit');
      const found = await db.runTransaction(async tx => {
        const snap = await tx.get(addonRef);
        if (!snap.exists) return false;
        tx.update(addonRef, { isInStock: isAvailable, lastUpdated: timestamp.serverTimestamp() });
        tx.create(audit.doc(), menuAuditRow(staffId, 'menuOptionStock', `menu_${addonId}`,
          { isInStock: snap.data().isInStock }, { isInStock: isAvailable }, 'addon'));
        return true;
      });
      if (!found) {
        return res.status(404).json(ResponseBuilder.error('not_found', 'Add-on not found', { restaurantId, addonId }));
      }
      console.log(JSON.stringify({ cid: `menu_${addonId}`, action: 'menuOptionStock', restaurantId, isAvailable, staffId }));
      return res.status(200).json(ResponseBuilder.success({ addonId, isAvailable }, 'Add-on availability updated successfully'));
    }

    // Check if the menu item exists
    const menuItemRef = db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').doc(menuItemId);
    const menuItemDoc = await menuItemRef.get();

    if (!menuItemDoc.exists) {
      console.error(`Menu item not found with ID: ${menuItemId}`);
      return res
        .status(404)
        .json(
          ResponseBuilder.error(
            'not_found',
            'Menu item not found',
            { restaurantId, menuItemId }
          )
        );
    }
    
    // Update the menu item stock using the existing utility function
    await updateMenuItemStock(restaurantId, menuItemId, isAvailable);
    
    // Get the updated menu item
    const updatedMenuItem = await getMenuItemById(restaurantId, menuItemId);
    
    console.log(`Successfully updated menu item availability: ${menuItemId} for restaurant: ${restaurantId}`);
    return res
      .status(200)
      .json(
        ResponseBuilder.success(
          {
            menuItemId,
            isAvailable,
            menuItem: updatedMenuItem
          },
          'Menu item availability updated successfully'
        )
      );
    
  } catch (error) {
    console.error('Error in updateMenuItemAvailability:', error);
    try {
      errorHandler.handleError(error, 'updateMenuItemAvailability', {
        restaurantId: req?.body?.restaurantId,
        menuItemId: req?.body?.menuItemId
      });
    } catch (handledError) {
      const statusCode = handledError.details?.data?.httpCode || 500;
      return res
        .status(statusCode)
        .json(
          handledError.details ||
          ResponseBuilder.error('internal_error', 'Failed to update menu item availability')
        );
    }
  }
});

module.exports = {
  getFullMenu,
  getMenuByCategory,
  searchMenu,
  getPopularItems,
  getSpecialOffers,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateMenuItemAvailability
};
