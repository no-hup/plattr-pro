/**
 * MenuItem Schema:
 * {
 *   menuItemId: string,
 *   categoryId: string,
 *   primarySubcategoryId: string | null,      // 🆕 NEW - the "home" subcategory
 *   subcategoryIds: string[],                 // 🆕 NEW - all subcategories (supports cross-listing)
 *   meta: {
 *     name: string,
 *     description: string,
 *     categoryName: string,
 *     primarySubcategoryName: string | null,  // 🆕 NEW - denormalized subcategory name
 *     image: string
 *   },
 *   priceInfo: {
 *     basePrice: number,
 *     discount: number,
 *     finalPrice: number
 *   },
 *   variants: Array<{ id: string, name: string }>,   // links to restaurants/{id}/variants (D6: price lives there)
 *   addons: string[],                                // ids of restaurants/{id}/addons
 *   nutritionalInfo: object,
 *   allergenTags: string[],
 *   isInStock: boolean,
 *   isCustomizable: boolean,
 *   lastUpdated: Timestamp
 * }
 */

/**
 * Function Signatures:
 * 
 * getAllMenuItems(restaurantId: string): Promise<MenuItem[]>
 * - Retrieves all menu items from the database for a specific restaurant
 * 
 * getMenuItemById(restaurantId: string, menuItemId: string): Promise<MenuItem>
 * - Fetches a single menu item by its ID for a specific restaurant
 * 
 * createMenuItem(restaurantId: string, menuItemData: object): Promise<string>
 * - Creates a new menu item for a specific restaurant and returns its ID
 * 
 * updateMenuItem(restaurantId: string, menuItemId: string, updateData: object): Promise<boolean>
 * - Updates an existing menu item for a specific restaurant
 * 
 * deleteMenuItem(restaurantId: string, menuItemId: string): Promise<boolean>
 * - Deletes a menu item from the database for a specific restaurant
 * 
 * getMenuItemsByCategory(restaurantId: string, categoryId: string): Promise<MenuItem[]>
 * - Retrieves all menu items belonging to a specific category for a specific restaurant
 * 
 * updateMenuItemStock(restaurantId: string, menuItemId: string, isInStock: boolean): Promise<boolean>
 * - Updates the stock status of a menu item for a specific restaurant
 * 
 * getInStockMenuItems(restaurantId: string): Promise<MenuItem[]>
 * - Retrieves all menu items that are currently in stock for a specific restaurant
 * 
 * getAllMenuItemsInStock(restaurantId: string): Promise<MenuItem[]>
 * - Retrieves all menu items that are currently in stock for a specific restaurant
 */

const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const MenuValidation = require('./menuValidation');
const timestamp = require('../utils/timestamp');

/**
 * Input: { restaurantId (required) }
 * Gets all menu items for a given restaurant
 */
async function getAllMenuItems(restaurantId) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);

    const menuItemsSnapshot = await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').get();
    return menuItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching menu items:', error);
    throw new Error('Failed to fetch menu items');
  }
}

/**
 * Input: { restaurantId (required), menuItemId (required) }
 * Gets a specific menu item by ID
 */
async function getMenuItemById(restaurantId, menuItemId) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);
    MenuValidation.validateItemId(menuItemId);

    const menuItemDoc = await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').doc(menuItemId).get();
    if (!menuItemDoc.exists) {
      throw new Error('Menu item not found');
    }
    return {
      id: menuItemDoc.id,
      ...menuItemDoc.data()
    };
  } catch (error) {
    console.error('Error fetching menu item:', error);
    throw new Error('Failed to fetch menu item');
  }
}

/**
 * Input: { 
 *   restaurantId (required), 
 *   menuItemData: { 
 *     meta: { name (required), description, categoryName, primarySubcategoryName (optional), image },
 *     categoryId (required),
 *     primarySubcategoryId (optional) - the "home" subcategory,
 *     subcategoryIds (optional) - array of all subcategory IDs item belongs to,
 *     priceInfo: { basePrice (required), discount, finalPrice },
 *     variants, addons, nutritionalInfo, allergenTags, isInStock
 *   } 
 * }
 * Creates a new menu item with optional subcategory support
 */
async function createMenuItem(restaurantId, menuItemData) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);
    MenuValidation.validateCreateMenuItemInput(menuItemData);

    const isCustomizable = (menuItemData.variants && menuItemData.variants.length > 0) ||
      (menuItemData.addons && menuItemData.addons.length > 0);
    
    // Build the menu item data with subcategory fields (if provided)
    const menuItemToSave = {
      ...menuItemData,
      // Ensure subcategory fields are set (nullable for backward compatibility)
      primarySubcategoryId: menuItemData.primarySubcategoryId || null,
      subcategoryIds: menuItemData.subcategoryIds || [],
      isInStock: menuItemData.isInStock ?? true,
      isCustomizable: isCustomizable,
      lastUpdated: timestamp.serverTimestamp()
    };

    // Ensure primarySubcategoryName is in meta if primarySubcategoryId is provided
    if (menuItemData.primarySubcategoryId && menuItemToSave.meta) {
      menuItemToSave.meta.primarySubcategoryName = menuItemData.meta?.primarySubcategoryName || null;
    }

    // Data integrity: ensure primarySubcategoryId is included in subcategoryIds
    if (menuItemToSave.primarySubcategoryId && 
        !menuItemToSave.subcategoryIds.includes(menuItemToSave.primarySubcategoryId)) {
      menuItemToSave.subcategoryIds.push(menuItemToSave.primarySubcategoryId);
    }

    const newMenuItemRef = await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').add(menuItemToSave);
    return newMenuItemRef.id;
  } catch (error) {
    console.error('Error creating menu item:', error);
    throw new Error('Failed to create menu item');
  }
}

/**
 * Input: { 
 *   restaurantId (required), 
 *   menuItemId (required),
 *   updateData: { 
 *     meta, categoryId, primarySubcategoryId (optional), subcategoryIds (optional),
 *     priceInfo, variants, addons, nutritionalInfo, allergenTags, isInStock
 *   } 
 * }
 * Updates an existing menu item with optional subcategory support
 */
async function updateMenuItem(restaurantId, menuItemId, updateData) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);
    MenuValidation.validateItemId(menuItemId);
    MenuValidation.validateUpdateMenuItemInput(updateData);

    const menuItemRef = db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').doc(menuItemId);

    // DECISION(D6, 2026-09-25): a description-only save must not touch add-ons, portions, stock or isCustomizable.
    // See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
    // Only the sent fields are written. isCustomizable is the server's, from the links after the save: the manager
    // takes every add-on off Veg Biryani, and it stays customisable because its Portion is still linked.
    const { isCustomizable: _ignored, ...sent } = updateData;
    const updateToSave = {
      ...sent,
      lastUpdated: timestamp.serverTimestamp()
    };
    const linksSent = sent.addons !== undefined || sent.variants !== undefined;

    // Handle subcategory updates if provided
    if (updateData.primarySubcategoryId !== undefined) {
      updateToSave.primarySubcategoryId = updateData.primarySubcategoryId || null;
    }
    
    if (updateData.subcategoryIds !== undefined) {
      updateToSave.subcategoryIds = updateData.subcategoryIds || [];
      
      // Data integrity: ensure primarySubcategoryId is included in subcategoryIds
      if (updateToSave.primarySubcategoryId && 
          !updateToSave.subcategoryIds.includes(updateToSave.primarySubcategoryId)) {
        updateToSave.subcategoryIds.push(updateToSave.primarySubcategoryId);
      }
    } else if (updateData.primarySubcategoryId !== undefined && updateData.primarySubcategoryId !== null) {
      // FIX: When only primarySubcategoryId is updated, fetch existing subcategoryIds to validate/update
      const existingDoc = await menuItemRef.get();
      if (existingDoc.exists) {
        const existingData = existingDoc.data();
        const existingSubcategoryIds = existingData.subcategoryIds || [];
        
        // If primarySubcategoryId is not in existing subcategoryIds, add it
        if (!existingSubcategoryIds.includes(updateData.primarySubcategoryId)) {
          updateToSave.subcategoryIds = [...existingSubcategoryIds, updateData.primarySubcategoryId];
        }
      }
    }

    if (!linksSent) {
      await menuItemRef.update(updateToSave);
      return true;
    }
    await db.runTransaction(async tx => {
      const stored = (await tx.get(menuItemRef)).data() || {};
      updateToSave.isCustomizable = (sent.addons ?? stored.addons ?? []).length > 0 ||
        (sent.variants ?? stored.variants ?? []).length > 0;
      tx.update(menuItemRef, updateToSave);
    });
    return true;
  } catch (error) {
    console.error('Error updating menu item:', error);
    throw new Error('Failed to update menu item');
  }
}

/**
 * Input: { restaurantId (required), menuItemId (required) }
 * Deletes a menu item
 */
async function deleteMenuItem(restaurantId, menuItemId) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);
    MenuValidation.validateItemId(menuItemId);

    await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').doc(menuItemId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw new Error('Failed to delete menu item');
  }
}

/**
 * Input: { restaurantId (required), categoryId (required) }
 * Gets all menu items for a specific category
 */
async function getMenuItemsByCategory(restaurantId, categoryId) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);
    MenuValidation.validateCategoryId(categoryId);

    const menuItemsSnapshot = await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems')
      .where('categoryId', '==', categoryId)
      .get();
    return menuItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching menu items by category:', error);
    throw new Error('Failed to fetch menu items by category');
  }
}

/**
 * Input: { restaurantId (required), menuItemId (required), isInStock (required) }
 * Updates the stock status of a menu item
 */
async function updateMenuItemStock(restaurantId, menuItemId, isInStock) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);
    MenuValidation.validateItemId(menuItemId);

    if (typeof isInStock !== 'boolean') {
      throw new Error('isInStock must be a boolean');
    }

    await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').doc(menuItemId).update({
        isInStock: isInStock,
        lastUpdated: timestamp.serverTimestamp()
      });
    return true;
  } catch (error) {
    console.error('Error updating menu item stock:', error);
    throw new Error('Failed to update menu item stock');
  }
}

/**
 * Input: { restaurantId (required) }
 * Gets all menu items that are in stock
 */
async function getAllMenuItemsInStock(restaurantId) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);

    const menuItemsSnapshot = await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems')
      .where('isInStock', '==', true)
      .get();
    return menuItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching in-stock menu items:', error);
    throw new Error('Failed to fetch in-stock menu items');
  }
}
module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuItemsByCategory,
  updateMenuItemStock,
  getAllMenuItemsInStock
};
