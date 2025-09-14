/**
 * Array utility functions for common operations
 */

/**
 * Compares two arrays for equality, ignoring the order of elements
 * Uses Map for O(n) performance instead of nested loops
 * 
 * @param {Array} arr1 - First array to compare
 * @param {Array} arr2 - Second array to compare
 * @param {string} keyField - The property name to use as the key for comparison
 * @param {string} [valueField] - Optional property name to compare values (for nested objects)
 * @returns {boolean} True if arrays contain the same elements regardless of order
 * 
 * @example
 * // Compare arrays of simple objects by ID
 * compareArraysIgnoringOrder(
 *   [{id: 'a1', name: 'Item 1'}, {id: 'a2', name: 'Item 2'}],
 *   [{id: 'a2', name: 'Item 2'}, {id: 'a1', name: 'Item 1'}],
 *   'id'
 * ); // Returns true
 * 
 * @example
 * // Compare arrays with nested selection (like variants)
 * compareArraysIgnoringOrder(
 *   [{id: 'v1', selected_id: 'opt1'}, {id: 'v2', selected_id: 'opt2'}],
 *   [{id: 'v2', selected_id: 'opt2'}, {id: 'v1', selected_id: 'opt1'}],
 *   'id', 'selected_id'
 * ); // Returns true
 */
function compareArraysIgnoringOrder(arr1, arr2, keyField, valueField) {
  // Handle edge cases
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
  if (arr1.length !== arr2.length) return false;
  
  // Fast path for empty arrays
  if (arr1.length === 0 && arr2.length === 0) return true;
  
  // Fast path for single item arrays - direct comparison
  if (arr1.length === 1 && arr2.length === 1) {
    const item1 = arr1[0];
    const item2 = arr2[0];
    
    if (!item1 || !item2) return item1 === item2;
    if (!item1[keyField] || !item2[keyField]) return false;
    
    if (valueField) {
      return item1[keyField] === item2[keyField] && 
             item1[valueField] === item2[valueField];
    }
    return item1[keyField] === item2[keyField];
  }
  
  // For larger arrays, use Map for O(n) comparison
  const map1 = new Map();
  const map2 = new Map();
  
  // Populate first map
  for (const item of arr1) {
    if (!item || !item[keyField]) continue;
    
    const key = item[keyField];
    if (valueField && item[valueField] !== undefined) {
      map1.set(key, item[valueField]);
    } else {
      map1.set(key, true);
    }
  }
  
  // Populate second map
  for (const item of arr2) {
    if (!item || !item[keyField]) continue;
    
    const key = item[keyField];
    if (valueField && item[valueField] !== undefined) {
      map2.set(key, item[valueField]);
    } else {
      map2.set(key, true);
    }
  }
  
  // Quick size check
  if (map1.size !== map2.size) return false;
  
  // Compare all entries
  for (const [key, value] of map1.entries()) {
    if (!map2.has(key)) return false;
    
    if (valueField && map2.get(key) !== value) return false;
  }
  
  return true;
}

module.exports = {
  compareArraysIgnoringOrder
}; 