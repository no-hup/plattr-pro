const functions = require('firebase-functions');
const { db, FieldValue } = require('../admin/admin');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const { validateAdminSession } = require('./auth');

function requireField(value, message) {
  if (value === undefined || value === null || value === '') {
    errorHandler.badRequest(message);
  }
}

async function getRestaurantRef(restaurantId) {
  requireField(restaurantId, 'Restaurant ID is required');
  const restaurantRef = db.collection('restaurants').doc(restaurantId);
  const restaurantDoc = await restaurantRef.get();
  if (!restaurantDoc.exists) {
    errorHandler.notFound('Restaurant not found', { restaurantId });
  }
  return restaurantRef;
}

exports.addCategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, category } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(category, 'Category payload is required');
    requireField(category?.name, 'Category name is required');
    requireField(category?.order, 'Category order is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    const payload = {
      name: category.name,
      order: Number(category.order) || 0,
      description: category.description || '',
      image: category.image || '',
      subcategoryIds: category.subcategoryIds || [],
    };

    const docRef = await restaurantRef.collection('categories').add(payload);
    return ResponseBuilder.success({ categoryId: docRef.id }, 'Category created');
  } catch (error) {
    console.error('Error in addCategory:', error);
    return errorHandler.handleError(error, 'addCategory');
  }
});

exports.updateCategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, categoryId, updateData } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(categoryId, 'Category ID is required');
    requireField(updateData, 'Update data is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);

    // Only include fields that are explicitly provided (not undefined)
    // This prevents overwriting existing values when fields are omitted
    const payload = {};

    if (updateData.name !== undefined) {
      payload.name = updateData.name;
    }
    if (updateData.order !== undefined) {
      payload.order = Number(updateData.order);
    }
    if (updateData.description !== undefined) {
      payload.description = updateData.description;
    }
    if (updateData.image !== undefined) {
      payload.image = updateData.image;
    }

    if (Object.keys(payload).length === 0) {
      return errorHandler.badRequest('No valid fields to update');
    }

    await restaurantRef.collection('categories').doc(categoryId).update(payload);
    return ResponseBuilder.success(null, 'Category updated');
  } catch (error) {
    console.error('Error in updateCategory:', error);
    return errorHandler.handleError(error, 'updateCategory');
  }
});

exports.deleteCategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, categoryId } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(categoryId, 'Category ID is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    await restaurantRef.collection('categories').doc(categoryId).delete();
    return ResponseBuilder.success(null, 'Category deleted');
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    return errorHandler.handleError(error, 'deleteCategory');
  }
});

exports.addSubcategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, subcategory } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(subcategory, 'Subcategory payload is required');
    requireField(subcategory?.name, 'Subcategory name is required');
    requireField(subcategory?.order, 'Subcategory order is required');
    requireField(subcategory?.parentCategoryId, 'Parent category is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    const payload = {
      name: subcategory.name,
      order: Number(subcategory.order) || 0,
      description: subcategory.description || '',
      image: subcategory.image || '',
      parentCategoryId: subcategory.parentCategoryId,
    };

    const docRef = await restaurantRef.collection('subcategories').add(payload);
    await restaurantRef.collection('categories').doc(subcategory.parentCategoryId).update({
      subcategoryIds: FieldValue.arrayUnion(docRef.id),
    });

    return ResponseBuilder.success({ subcategoryId: docRef.id }, 'Subcategory created');
  } catch (error) {
    console.error('Error in addSubcategory:', error);
    return errorHandler.handleError(error, 'addSubcategory');
  }
});

exports.updateSubcategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, subcategoryId, updateData } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(subcategoryId, 'Subcategory ID is required');
    requireField(updateData, 'Update data is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    const subcategoryRef = restaurantRef.collection('subcategories').doc(subcategoryId);
    const snapshot = await subcategoryRef.get();

    if (!snapshot.exists) {
      errorHandler.notFound('Subcategory not found', { subcategoryId });
    }

    const existing = snapshot.data() || {};
    const newParentId = updateData.parentCategoryId !== undefined
      ? updateData.parentCategoryId
      : existing.parentCategoryId;

    // Only include fields that are explicitly provided (not undefined)
    // This prevents overwriting existing values when fields are omitted
    const payload = {};

    if (updateData.name !== undefined) {
      payload.name = updateData.name;
    }
    if (updateData.order !== undefined) {
      payload.order = Number(updateData.order);
    }
    if (updateData.description !== undefined) {
      payload.description = updateData.description;
    }
    if (updateData.image !== undefined) {
      payload.image = updateData.image;
    }
    if (updateData.parentCategoryId !== undefined) {
      payload.parentCategoryId = newParentId;
    }

    if (Object.keys(payload).length === 0) {
      return errorHandler.badRequest('No valid fields to update');
    }

    await subcategoryRef.update(payload);

    if (existing.parentCategoryId && existing.parentCategoryId !== newParentId) {
      await restaurantRef.collection('categories').doc(existing.parentCategoryId).update({
        subcategoryIds: FieldValue.arrayRemove(subcategoryId),
      });
      await restaurantRef.collection('categories').doc(newParentId).update({
        subcategoryIds: FieldValue.arrayUnion(subcategoryId),
      });
    }

    return ResponseBuilder.success(null, 'Subcategory updated');
  } catch (error) {
    console.error('Error in updateSubcategory:', error);
    return errorHandler.handleError(error, 'updateSubcategory');
  }
});

exports.deleteSubcategory = functions.https.onCall(async (data, context) => {
  const request = data?.data || data || {};
  try {
    const { restaurantId, sessionId, subcategoryId } = request;
    requireField(restaurantId, 'Restaurant ID is required');
    requireField(subcategoryId, 'Subcategory ID is required');

    // Validate session and role
    await validateAdminSession(restaurantId, sessionId);

    const restaurantRef = await getRestaurantRef(restaurantId);
    const subcategoryRef = restaurantRef.collection('subcategories').doc(subcategoryId);
    const snapshot = await subcategoryRef.get();
    if (!snapshot.exists) {
      errorHandler.notFound('Subcategory not found', { subcategoryId });
    }

    const subcategory = snapshot.data() || {};
    await subcategoryRef.delete();

    if (subcategory.parentCategoryId) {
      await restaurantRef.collection('categories').doc(subcategory.parentCategoryId).update({
        subcategoryIds: FieldValue.arrayRemove(subcategoryId),
      });
    }

    return ResponseBuilder.success(null, 'Subcategory deleted');
  } catch (error) {
    console.error('Error in deleteSubcategory:', error);
    return errorHandler.handleError(error, 'deleteSubcategory');
  }
});
