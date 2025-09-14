/**
 * Variant Schema:
 * {
 *   variantId: {
 *     meta: {
 *       name: string,
 *       description: string,
 *       categoryAssociatedWith: string
 *     },
 *     priceInfo: {
 *       basePrice: number,
 *       discount: number,
 *       finalPrice: number
 *     },
 *     isMandatory: boolean,
 *     respectParentDiscount: boolean,
 *     relatedMenuItems: string[],
 *     lastUpdated: Timestamp
 *   }
 * }
 */

const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const MenuValidation = require('./menuValidation');
const timestamp = require('../utils/timestamp');

/**
 * Input: { }
 * Gets all variants
 */
async function getAllVariants() {
  try {
    const variantsSnapshot = await db.collection('variants').get();
    return variantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching variants:', error);
    throw new Error('Failed to fetch variants');
  }
}

/**
 * Input: { variantId (required) }
 * Gets a specific variant by ID
 */
async function getVariantById(variantId) {
  try {
    MenuValidation.validateVariantId(variantId);
    
    const variantDoc = await db.collection('variants').doc(variantId).get();
    if (!variantDoc.exists) {
      throw new Error('Variant not found');
    }
    return {
      id: variantDoc.id,
      ...variantDoc.data()
    };
  } catch (error) {
    console.error('Error fetching variant:', error);
    throw new Error('Failed to fetch variant');
  }
}

/**
 * Input: { 
 *   variantData: { 
 *     meta: { name (required), description, categoryAssociatedWith },
 *     priceInfo: { basePrice (required), discount, finalPrice },
 *     isMandatory, respectParentDiscount, relatedMenuItems
 *   } 
 * }
 * Creates a new variant
 */
async function createVariant(variantData) {
  try {
    MenuValidation.validateCreateVariantInput(variantData);
    
    const newVariantRef = await db.collection('variants').add({
      ...variantData,
      lastUpdated: timestamp.serverTimestamp()
    });
    return newVariantRef.id;
  } catch (error) {
    console.error('Error creating variant:', error);
    throw new Error('Failed to create variant');
  }
}

/**
 * Input: { 
 *   variantId (required),
 *   updateData: { 
 *     meta, priceInfo, isMandatory, respectParentDiscount, relatedMenuItems
 *   } 
 * }
 * Updates an existing variant
 */
async function updateVariant(variantId, updateData) {
  try {
    MenuValidation.validateVariantId(variantId);
    MenuValidation.validateUpdateVariantInput(updateData);
    
    await db.collection('variants').doc(variantId).update({
      ...updateData,
      lastUpdated: timestamp.serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating variant:', error);
    throw new Error('Failed to update variant');
  }
}

/**
 * Input: { variantId (required) }
 * Deletes a variant
 */
async function deleteVariant(variantId) {
  try {
    MenuValidation.validateVariantId(variantId);
    
    await db.collection('variants').doc(variantId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting variant:', error);
    throw new Error('Failed to delete variant');
  }
}

module.exports = {
  getAllVariants,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant
};
