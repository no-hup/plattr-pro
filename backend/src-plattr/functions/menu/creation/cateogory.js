const { admin, db } = require('../../admin/admin');
const MenuValidation = require('../menuValidation');

/**
 * Input: { }
 * Gets all categories ordered by the order field
 */
async function getAllCategories() {
  try {
    const categoriesSnapshot = await db.collection('categories').orderBy('order').get();
    return categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

/**
 * Input: { categoryId (required) }
 * Gets a specific category by ID
 */
async function getCategoryById(categoryId) {
  try {
    MenuValidation.validateCategoryId(categoryId);
    
    const categoryDoc = await db.collection('categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      throw new Error('Category not found');
    }
    return {
      id: categoryDoc.id,
      ...categoryDoc.data()
    };
  } catch (error) {
    console.error('Error getting category:', error);
    throw error;
  }
}

/**
 * Input: { categoryData: { name (required), order (required), description, image } }
 * Creates a new category
 */
async function createCategory(categoryData) {
  try {
    MenuValidation.validateCreateCategoryInput(categoryData);
    
    const newCategoryRef = await db.collection('categories').add(categoryData);
    return newCategoryRef.id;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

/**
 * Input: { categoryId (required), updateData: { name, order, description, image } }
 * Updates an existing category
 */
async function updateCategory(categoryId, updateData) {
  try {
    MenuValidation.validateCategoryId(categoryId);
    MenuValidation.validateUpdateCategoryInput(updateData);
    
    await db.collection('categories').doc(categoryId).update(updateData);
    return true;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Input: { categoryId (required) }
 * Deletes a category
 */
async function deleteCategory(categoryId) {
  try {
    MenuValidation.validateCategoryId(categoryId);
    
    await db.collection('categories').doc(categoryId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}
module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};