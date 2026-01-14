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

## Frontend

### 1. Mock Data Injection in Production Code (Critical)
**Source:** `lib/pages/menuListing/menu_response.dart`
**Description:**
The `MenuItem.fromJson` factory currently contains temporary logic to inject `dietaryType` (Veg/Non-Veg) and `spiceLevel` by checking string patterns in the item name (e.g., "chicken", "spicy").
**Risk:**
- Violates separation of concerns.
- Can lead to incorrect dietary information in production if backend data is missing or logic is flawed.
- Logic executes in production builds.

**Action:**
- Move this logic to a `kDebugMode` block or a dedicated `MockDataTransformer` that only runs in development.
- Remove entirely once backend sends real `dietaryType` and `spiceLevel` fields.

### 2. Potential Null Pointer Exception in Mock Data Logic
**Source:** `lib/pages/menuListing/menu_response.dart`
**Description:**
The mock data injection logic accesses `mutableJson['meta']['name']` without proper null checks:
```dart
final name = (mutableJson['meta'] as Map<String, dynamic>)['name'].toString().toLowerCase();
```
**Risk:**
- If `meta` or `name` is null (e.g., malformed backend response), the app will crash with a runtime NPE during parsing.

**Action:**
- Add defensive null checks: `(mutableJson['meta'] as Map<String, dynamic>?)?['name']`.
- This is part of the mock data removal task above.
