/**
 * Utility module to provide safe implementations of Firestore array operations with fallbacks
 * 
 * This handles cases where FieldValue operations might be unavailable in the current environment.
 */
const { admin, FieldValue } = require('../admin/admin');

/**
 * Safe implementation of arrayUnion that falls back to manual array manipulation if FieldValue is unavailable
 * 
 * @param {*} elements - One or more elements to add to the array
 * @returns {Object|Array} - FieldValue.arrayUnion result or fallback array with added elements
 */
const safeArrayUnion = (...elements) => {
  try {
    // Check if FieldValue is properly initialized and arrayUnion is available
    if (FieldValue && typeof FieldValue.arrayUnion === 'function') {
      return FieldValue.arrayUnion(...elements);
    }
  } catch (error) {
    console.error('Error using FieldValue.arrayUnion:', error);
  }

  // Return a function that receives the current array and adds elements
  // This will be used for manual array updates in the client code
  console.log('poopoo Using fallback implementation for arrayUnion');
  return (currentArray) => {
    const array = Array.isArray(currentArray) ? [...currentArray] : [];
    elements.forEach(element => {
      if (!array.includes(element)) {
        array.push(element);
      }
    });
    return array;
  };
};

/**
 * Safe implementation of arrayRemove that falls back to manual array filtering if FieldValue is unavailable
 * 
 * @param {*} elements - One or more elements to remove from the array
 * @returns {Object|Array} - FieldValue.arrayRemove result or fallback array with elements removed
 */
const safeArrayRemove = (...elements) => {
  try {
    // Check if FieldValue is properly initialized and arrayRemove is available
    if (FieldValue && typeof FieldValue.arrayRemove === 'function') {
      return FieldValue.arrayRemove(...elements);
    }
  } catch (error) {
    console.error('Error using FieldValue.arrayRemove:', error);
  }

  // Return a function that receives the current array and removes elements
  console.log('poopoo Using fallback implementation for arrayRemove');
  return (currentArray) => {
    if (!Array.isArray(currentArray)) return [];
    return currentArray.filter(item => !elements.includes(item));
  };
};

/**
 * Helper function to apply array operations when using fallback implementation
 * 
 * @param {Object} updateData - The Firestore update object being prepared
 * @param {string} field - The field name to update
 * @param {Array} currentValue - The current array value from the document
 * @param {Function} operation - The fallback operation function from safeArrayUnion or safeArrayRemove
 */
const applyArrayOperation = (updateData, field, currentValue, operation) => {
  if (typeof operation === 'function') {
    // This is a fallback implementation, apply it to the current array
    updateData[field] = operation(currentValue);
  } else {
    // This is a direct FieldValue operation, assign it directly
    updateData[field] = operation;
  }
};

module.exports = {
  safeArrayUnion,
  safeArrayRemove,
  applyArrayOperation
}; 