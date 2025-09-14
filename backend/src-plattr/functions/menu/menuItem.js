/**
 * MenuItem Schema:
 * {
 *   menuItemId: string,
 *   categoryId: string,
 *   meta: {
 *     name: string,
 *     description: string,
 *     categoryName: string,
 *     image: string
 *   },
 *   priceInfo: {
 *     basePrice: number,
 *     discount: number,
 *     finalPrice: number
 *   },
 *   variants: Array<{
 *     isMandatory: boolean,
 *     options: Array<{
 *       variantId: string,
 *       name: string,
 *       price: number,
 *       discount: number,
 *       finalPrice: number
 *     }>
 *   }>,
 *   addons: string[],
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
 *     meta: { name (required), description, categoryName, image },
 *     categoryId (required),
 *     priceInfo: { basePrice (required), discount, finalPrice },
 *     variants, addons, nutritionalInfo, allergenTags, isInStock
 *   } 
 * }
 * Creates a new menu item
 */
async function createMenuItem(restaurantId, menuItemData) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);
    MenuValidation.validateCreateMenuItemInput(menuItemData);
    
    const isCustomizable = (menuItemData.variants && menuItemData.variants.length > 0) || 
                           (menuItemData.addons && menuItemData.addons.length > 0);
    const newMenuItemRef = await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').add({
        ...menuItemData,
        isInStock: menuItemData.isInStock ?? true,
        isCustomizable: isCustomizable,
        lastUpdated: timestamp.serverTimestamp()
      });
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
 *     meta, categoryId, priceInfo, variants, addons, 
 *     nutritionalInfo, allergenTags, isInStock
 *   } 
 * }
 * Updates an existing menu item
 */
async function updateMenuItem(restaurantId, menuItemId, updateData) {
  try {
    MenuValidation.validateRestaurantId(restaurantId);
    MenuValidation.validateItemId(menuItemId);
    MenuValidation.validateUpdateMenuItemInput(updateData);
    
    const isCustomizable = (updateData.variants && updateData.variants.length > 0) || 
                           (updateData.addons && updateData.addons.length > 0);
    await db.collection('restaurants').doc(restaurantId)
      .collection('menuItems').doc(menuItemId).update({
        ...updateData,
        isCustomizable: isCustomizable,
        lastUpdated: timestamp.serverTimestamp()
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
