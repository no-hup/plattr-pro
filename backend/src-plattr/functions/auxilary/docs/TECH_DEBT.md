scro# Technical Debt & Pending Improvements

## Backend

### 1. Missing Firestore Index for `menus` Collection Queries
**Priority:** Medium
**Source:** menu_change_code_review_supervisor.md (Issue 3)
**Description:**
The `fetchActiveMenu` function queries `menus` collection with:
- `.where('isActive', '==', true)`
- `.where('isDefault', '==', true)`

While single-field equality queries usually don't require composite indexes, if you add ordering or additional filters later, you'll need indexes.

**Action:** Document that Firestore indexes may be needed if queries evolve.

### 2. Hardcoded Collection Names
**Priority:** Low
**Source:** menu_change_code_review_supervisor.md (Issue 9)
**Description:**
Collection names like `'menus'`, `'subcategories'`, `'menuItems'` are hardcoded throughout multiple files (e.g., `menu_fetch.js`, `getRestaurantMenu.js`, `menuHelpers.js`).

**Action:** Extract to a shared constants module (e.g., `constants.js`).
Example:
```javascript
module.exports = {
  COLLECTIONS: {
    MENUS: 'menus',
    SUBCATEGORIES: 'subcategories',
    MENU_ITEMS: 'menuItems',
    // ...
  }
};
```
