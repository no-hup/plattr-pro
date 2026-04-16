# Proposal: Multi-Menu & Subcategory Hierarchy

This document outlines the strategy for evolving the Plattr menu system from a flat 2-level hierarchy to a robust 4-level taxonomy that supports multiple menus based on context (time/day) and section-based UI grouping (subcategories).

---

## 1. The Strategy: "Layered Context"

Instead of just grouping items under categories, we introduce a **Menu** layer that acts as a filter. This allows the same Category (e.g., "Appetizers") to appear in different Menus (e.g., "Lunch" vs. "Happy Hour") with different visibility or even different prices (future scope).

### The Hierarchy
1. **Menu** (Context Layer): Defines *when* something is shown.
   - Example: "Sunday Brunch", "Late Night Menu".
2. **Category** (Semantic Layer): Wide groupings.
   - Example: "Food", "Bar", "Desserts".
3. **Subcategory** (Display Layer): Specific UI sections.
   - Example: "Pizzas", "Burgers", "Signature Cocktails".
4. **MenuItem** (Content Layer): The actual item.

### Cross-Listing Support (Best Sellers / Trending)

Items can belong to **multiple subcategories** via `subcategoryIds` array. This enables:

| Subcategory | Items |
|-------------|-------|
| Best Sellers | Zinger Burger, Farmhouse Pizza, Tiramisu |
| Burgers | Zinger Burger, Classic Cheese, BBQ Bacon |
| Pizzas | Farmhouse Pizza, Margherita, Pepperoni |
| Desserts | Tiramisu, Cheesecake, Brownie |

The same "Zinger Burger" appears in both **Best Sellers** and **Burgers** tabs.

- `primarySubcategoryId`: The "home" subcategory (Burgers)
- `subcategoryIds`: All subcategories including virtual ones (["subcat_burgers", "subcat_bestsellers"])

---

## 2. Implementation Approach: Full Normalization

### New Database Structure
```
restaurants/{restaurantId}/
├── menus/{menuId}                    → NEW collection
├── categories/{categoryId}           → MODIFIED collection
├── subcategories/{subcategoryId}     → NEW collection
└── menuItems/{menuItemId}            → MODIFIED collection
```

---

## 3. Schema Changes (Field-Level)

### 3.1 NEW COLLECTION: `menus`
**Path:** `restaurants/{restaurantId}/menus/{menuId}`

| Field | Type | Status | Description |
|-------|------|--------|-------------|
| `menuId` | string | 🆕 NEW | Unique identifier |
| `name` | string | 🆕 NEW | Display name ("Lunch Menu", "Happy Hour") |
| `description` | string | 🆕 NEW | Optional description |
| `isActive` | boolean | 🆕 NEW | **Currently active menu** (only one true at a time) |
| `isDefault` | boolean | 🆕 NEW | Fallback menu when no schedule matches |
| `categoryIds` | string[] | 🆕 NEW | Categories visible in this menu |
| `order` | number | 🆕 NEW | Display order when listing menus |
| `createdAt` | timestamp | 🆕 NEW | Creation time |
| `updatedAt` | timestamp | 🆕 NEW | Last update time |

### 3.2 MODIFIED COLLECTION: `categories`
**Path:** `restaurants/{restaurantId}/categories/{categoryId}`

| Field | Type | Status | Description |
|-------|------|--------|-------------|
| `id` | string | ✅ EXISTING | Unique identifier |
| `name` | string | ✅ EXISTING | Semantic name ("Food", "Bar", "Desserts") |
| `description` | string | ✅ EXISTING | Category description |
| `image` | string | ✅ EXISTING | Category image URL |
| `order` | number | ✅ EXISTING | Display order within menu |
| `subcategoryIds` | string[] | 🆕 NEW | Ordered list of subcategory IDs under this category |

### 3.3 NEW COLLECTION: `subcategories`
**Path:** `restaurants/{restaurantId}/subcategories/{subcategoryId}`

| Field | Type | Status | Description |
|-------|------|--------|-------------|
| `id` | string | 🆕 NEW | Unique identifier |
| `name` | string | 🆕 NEW | Display name ("Pizzas", "Burgers", "Cocktails") |
| `description` | string | 🆕 NEW | Optional description |
| `image` | string | 🆕 NEW | Optional image URL |
| `parentCategoryId` | string | 🆕 NEW | FK to parent category |
| `order` | number | 🆕 NEW | Display order within category |
| `createdAt` | timestamp | 🆕 NEW | Creation time |

### 3.4 MODIFIED COLLECTION: `menuItems`
**Path:** `restaurants/{restaurantId}/menuItems/{menuItemId}`

| Field | Type | Status | Description |
|-------|------|--------|-------------|
| `menuItemId` | string | ✅ EXISTING | Unique identifier |
| `categoryId` | string | ✅ EXISTING | FK to category |
| `subcategoryIds` | string[] | 🆕 NEW | Array of subcategory IDs item belongs to (supports cross-listing) |
| `primarySubcategoryId` | string | 🆕 NEW | The "home" subcategory for this item |
| `meta.name` | string | ✅ EXISTING | Item name |
| `meta.description` | string | ✅ EXISTING | Description |
| `meta.categoryName` | string | ✅ EXISTING | Denormalized category name |
| `meta.primarySubcategoryName` | string | 🆕 NEW | Denormalized primary subcategory name (nullable) |
| `meta.image` | string | ✅ EXISTING | Image URL |
| `priceInfo.basePrice` | number | ✅ EXISTING | Base price |
| `priceInfo.discount` | number | ✅ EXISTING | Discount percentage |
| `priceInfo.finalPrice` | number | ✅ EXISTING | Calculated final price |
| `variants` | array | ✅ EXISTING | Variant references |
| `addons` | string[] | ✅ EXISTING | Addon IDs |
| `nutritionalInfo` | object | ✅ EXISTING | Nutritional data |
| `allergenTags` | string[] | ✅ EXISTING | Allergen identifiers |
| `isInStock` | boolean | ✅ EXISTING | Stock status |
| `isCustomizable` | boolean | ✅ EXISTING | Has variants/addons |
| `lastUpdated` | timestamp | ✅ EXISTING | Last modification time |

**Note on IDs:** Categories, subcategories, and menus all use **document IDs** (not names) as their unique identifiers, consistent with the existing category implementation. The `name` field is for display purposes only and should not be used as an identifier.

**Data Integrity Rule:** `primarySubcategoryId` must always be included in the `subcategoryIds` array.
**Admin Responsibility:** It is assumed that the admin will manually configure the hierarchy correctly (e.g., ensuring "Best Sellers" has the correct `parentCategoryId` and items are linked properly). Complex auto-resolution logic is not required.

---

## 4. Mock Data Structure

### 4.1 Sample Menu Documents (NEW)
```json
{
  "menu_lunch": {
    "menuId": "menu_lunch",
    "name": "Lunch Menu",
    "description": "Available Monday-Friday 11am-3pm",
    "isActive": true,
    "isDefault": false,
    "categoryIds": ["cat_food", "cat_beverages"],
    "order": 1
  },
  "menu_default": {
    "menuId": "menu_default",
    "name": "All Day Menu",
    "description": "Our full selection",
    "isActive": false,
    "isDefault": true,
    "categoryIds": ["cat_food", "cat_beverages", "cat_bar"],
    "order": 0
  }
}
```

### 4.2 Sample Category Document (MODIFIED)
```json
{
  "cat_food": {
    "id": "cat_food",
    "name": "Food",
    "description": "Main food items",
    "image": "https://example.com/food.jpg",
    "order": 1,
    "subcategoryIds": ["subcat_bestsellers", "subcat_burgers", "subcat_pizzas", "subcat_salads"]
  }
}
```
**Changes:** Added `subcategoryIds` field (array defines display order in UI tabs).

### 4.3 Sample Subcategory Documents (NEW)
```json
{
  "subcat_bestsellers": {
    "id": "subcat_bestsellers",
    "name": "Best Sellers",
    "description": "Our most popular items",
    "image": "https://example.com/bestsellers.jpg",
    "parentCategoryId": "cat_food",
    "order": 0
  },
  "subcat_burgers": {
    "id": "subcat_burgers",
    "name": "Burgers",
    "description": "Handcrafted burgers",
    "image": "https://example.com/burgers.jpg",
    "parentCategoryId": "cat_food",
    "order": 1
  },
  "subcat_pizzas": {
    "id": "subcat_pizzas",
    "name": "Pizzas",
    "description": "Wood-fired pizzas",
    "image": "https://example.com/pizzas.jpg",
    "parentCategoryId": "cat_food",
    "order": 2
  }
}
```

> **Note:** "Best Sellers" is a regular subcategory - items are cross-listed into it via `subcategoryIds` array on the menuItem.

### 4.4 Sample MenuItem Document (MODIFIED)
```json
{
  "item001": {
    "menuItemId": "item001",
    "categoryId": "cat_food",
    "primarySubcategoryId": "subcat_burgers",
    "subcategoryIds": ["subcat_burgers", "subcat_bestsellers"],
    "meta": {
      "name": "Zinger Burger",
      "description": "Crispy fried chicken with spicy mayo",
      "categoryName": "Food",
      "primarySubcategoryName": "Burgers",
      "image": "https://example.com/zinger-burger.jpg"
    },
    "priceInfo": {
      "basePrice": 100,
      "discount": 10,
      "finalPrice": 90
    },
    "isInStock": true,
    "isCustomizable": true,
    "variants": [],
    "addons": []
  }
}
```
**Changes:** 
- Added `primarySubcategoryId` - the "home" subcategory
- Added `subcategoryIds` array - all subcategories this item appears in (supports Best Sellers, Trending, etc.)
- Renamed `meta.subcategoryName` to `meta.primarySubcategoryName`

---

## 5. API Impact Analysis

### 5.1 Affected APIs (No New Endpoints)

| API | File | Impact | Description |
|-----|------|--------|-------------|
| `menu-fetchMenu` | `menu/menu_fetch.js` | 🔄 MODIFIED | Returns active menu with subcategories |
| `menu-getRestaurantMenu` | `menu/getRestaurantMenu.js` | 🔄 MODIFIED | Same as above |
| `menu-addMenuItem` | `menu/creation/menu_add.js` | 🔄 MODIFIED | Accept optional `subcategoryId` |
| `menu-removeMenuItem` | `menu/creation/menu_remove.js` | ✅ UNCHANGED | No schema impact |

### 5.2 Request Changes: `fetchMenu`

**Current Request:**
```json
{
  "restaurantId": "rest001",
  "inStock": true
}
```

**New Request (backward compatible):**
```json
{
  "restaurantId": "rest001",
  "inStock": true
}
```
> No change - backend automatically determines which menu is active via `isActive: true`

### 5.3 Response Changes: `fetchMenu`

**Current Response:**
```json
{
  "categories": [
    { "id": "cat_1_food", "name": "Burgers", "order": 1 }
  ],
  "menuItems": {
    "cat_1_food": [ { "menuItemId": "item001" } ]
  },
  "metadata": { 
    "totalCategories": 2, 
    "totalMenuItems": 10 
  }
}
```

**New Response:**
```json
{
  "activeMenu": {
    "menuId": "menu_lunch",
    "name": "Lunch Menu",
    "isDefault": false
  },
  "categories": [
    {
      "id": "cat_food",
      "name": "Food",
      "order": 1,
      "subcategories": [
        { "id": "subcat_bestsellers", "name": "Best Sellers", "order": 0 },
        { "id": "subcat_burgers", "name": "Burgers", "order": 1 },
        { "id": "subcat_pizzas", "name": "Pizzas", "order": 2 }
      ]
    }
  ],
  "menuItems": {
    "subcat_bestsellers": [
      {
        "menuItemId": "item001",
        "categoryId": "cat_food",
        "primarySubcategoryId": "subcat_burgers",
        "subcategoryIds": ["subcat_burgers", "subcat_bestsellers"],
        "meta": {
          "name": "Zinger Burger",
          "categoryName": "Food",
          "primarySubcategoryName": "Burgers"
        }
      }
    ],
    "subcat_burgers": [
      {
        "menuItemId": "item001",
        "categoryId": "cat_food",
        "primarySubcategoryId": "subcat_burgers",
        "subcategoryIds": ["subcat_burgers", "subcat_bestsellers"],
        "meta": {
          "name": "Zinger Burger",
          "categoryName": "Food",
          "primarySubcategoryName": "Burgers"
        }
      }
    ]
  },
  "metadata": {
    "totalCategories": 2,
    "totalSubcategories": 5,
    "totalMenuItems": 10,
    "activeMenuId": "menu_lunch"
  }
}
```

> **Note:** Same item (`item001`) appears in both `subcat_bestsellers` and `subcat_burgers` because its `subcategoryIds` array contains both. The `primarySubcategoryId` indicates its "home" subcategory.

#### Response Field Changes Summary

| Field | Status | Notes |
|-------|--------|-------|
| `activeMenu` | 🆕 NEW | Object with menuId, name, isDefault |
| `activeMenu.menuId` | 🆕 NEW | ID of currently active menu |
| `activeMenu.name` | 🆕 NEW | Display name |
| `activeMenu.isDefault` | 🆕 NEW | Whether fallback menu was used |
| `categories[].subcategories` | 🆕 NEW | Array of subcategory objects |
| `menuItems` key | 🔄 CHANGED | Key changes from `categoryId` to `subcategoryId` |
| `menuItems[].primarySubcategoryId` | 🆕 NEW | The "home" subcategory for this item |
| `menuItems[].subcategoryIds` | 🆕 NEW | All subcategories this item belongs to |
| `menuItems[].meta.primarySubcategoryName` | 🆕 NEW | Denormalized primary subcategory name |
| `metadata.totalSubcategories` | 🆕 NEW | Count of subcategories |
| `metadata.activeMenuId` | 🆕 NEW | ID of active menu |

> **Cross-listing behavior:** An item with `subcategoryIds: ["subcat_burgers", "subcat_bestsellers"]` will appear in BOTH the "Burgers" tab and the "Best Sellers" tab. The full item object is duplicated under each subcategory key for frontend simplicity.

---

## 6. Flutter Frontend Data Model Changes

### 6.1 Affected Files

| File | Change Type |
|------|-------------|
| `lib/pages/menuListing/menu_response.dart` | 🔄 MODIFIED |
| `lib/pages/menuListing/menu_response.freezed.dart` | 🔁 REGENERATED |
| `lib/pages/menuListing/menu_response.g.dart` | 🔁 REGENERATED |

### 6.2 Model Changes

#### NEW MODEL: `ActiveMenu`
```dart
@freezed
class ActiveMenu with _$ActiveMenu {
  factory ActiveMenu({
    required String menuId,        // 🆕 NEW
    required String name,          // 🆕 NEW
    @Default(false) bool isDefault, // 🆕 NEW
  }) = _ActiveMenu;

  factory ActiveMenu.fromJson(Map<String, dynamic> json) =>
      _$ActiveMenuFromJson(json);
}
```

#### NEW MODEL: `Subcategory`
```dart
@freezed
class Subcategory with _$Subcategory {
  factory Subcategory({
    required String id,              // 🆕 NEW
    required String name,            // 🆕 NEW
    String? description,             // 🆕 NEW
    String? image,                   // 🆕 NEW
    required String parentCategoryId, // 🆕 NEW
    required int order,              // 🆕 NEW
  }) = _Subcategory;

  factory Subcategory.fromJson(Map<String, dynamic> json) =>
      _$SubcategoryFromJson(json);
}
```

#### MODIFIED MODEL: `Category`
```dart
@freezed
class Category with _$Category {
  factory Category({
    required String id,              // ✅ EXISTING
    required String name,            // ✅ EXISTING
    required String description,     // ✅ EXISTING
    required int order,              // ✅ EXISTING
    String? image,                   // ✅ EXISTING
    @Default([]) List<Subcategory> subcategories, // 🆕 NEW
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) =>
      _$CategoryFromJson(json);
}
```

#### MODIFIED MODEL: `MenuItem`
```dart
@freezed
class MenuItem with _$MenuItem {
  factory MenuItem({
    @JsonKey(name: 'menuItemId') required String id, // ✅ EXISTING
    required String categoryId,      // ✅ EXISTING
    String? primarySubcategoryId,    // 🆕 NEW - the "home" subcategory
    @Default([]) List<String> subcategoryIds, // 🆕 NEW - all subcategories (for cross-listing)
    required MenuItemMeta meta,      // ✅ EXISTING
    required PriceInfo priceInfo,    // ✅ EXISTING
    required bool isInStock,         // ✅ EXISTING
    required bool isCustomizable,    // ✅ EXISTING
    @Default([]) List<Variant> variants,  // ✅ EXISTING
    @Default([]) List<Addon> addons,      // ✅ EXISTING
    NutritionalInfo? nutritionalInfo,     // ✅ EXISTING
    @Default([]) List<String> allergenTags, // ✅ EXISTING
    @Default(0) int quantity,        // ✅ EXISTING
  }) = _MenuItem;

  factory MenuItem.fromJson(Map<String, dynamic> json) =>
      _$MenuItemFromJson(json);
}
```

#### MODIFIED MODEL: `MenuItemMeta`
```dart
@freezed
class MenuItemMeta with _$MenuItemMeta {
  factory MenuItemMeta({
    required String name,            // ✅ EXISTING
    required String description,     // ✅ EXISTING
    required String categoryName,    // ✅ EXISTING
    String? primarySubcategoryName,  // 🆕 NEW (nullable for backward compat)
    String? image,                   // ✅ EXISTING
  }) = _MenuItemMeta;

  factory MenuItemMeta.fromJson(Map<String, dynamic> json) =>
      _$MenuItemMetaFromJson(json);
}
```

#### MODIFIED MODEL: `MenuData`
```dart
@freezed
class MenuData with _$MenuData {
  factory MenuData({
    ActiveMenu? activeMenu,          // 🆕 NEW (nullable for backward compat)
    required List<Category> categories, // ✅ EXISTING
    required Map<String, List<MenuItem>> menuItems, // 🔄 CHANGED: key is now subcategoryId
    required MenuMetadata metadata,  // ✅ EXISTING
  }) = _MenuData;
}
```

#### MODIFIED MODEL: `MenuMetadata`
```dart
@freezed
class MenuMetadata with _$MenuMetadata {
  factory MenuMetadata({
    required int totalCategories,    // ✅ EXISTING
    @Default(0) int totalSubcategories, // 🆕 NEW
    required int totalMenuItems,     // ✅ EXISTING
    String? activeMenuId,            // 🆕 NEW (nullable for backward compat)
  }) = _MenuMetadata;

  factory MenuMetadata.fromJson(Map<String, dynamic> json) =>
      _$MenuMetadataFromJson(json);
}
```

---

## 7. Implementation Phases

### Phase 1: Backend Schema & Migration
- [ ] Create `menus` collection with one default menu (`isActive: true`, `isDefault: true`)
- [ ] Create `subcategories` collection
- [ ] Add `subcategoryIds: []` to existing categories
- [ ] Add `primarySubcategoryId: null`, `subcategoryIds: []`, and `meta.primarySubcategoryName: null` to existing menuItems
- [ ] Write migration script for existing data (SKIPPED - Not required for now)

### Phase 2: Backend API Updates
- [ ] Modify `fetchMenu` to fetch active menu (`isActive: true`)
- [ ] Modify `fetchMenu` to include subcategories nested under categories
- [ ] Modify `fetchMenu` response to group menuItems by `subcategoryId`
- [ ] Modify `addMenuItem` to accept optional `subcategoryId`
- [ ] Update mock data with new structure

### Phase 3: Flutter Model Updates
- [ ] Add new models: `ActiveMenu`, `Subcategory`
- [ ] Modify existing models: `Category`, `MenuItem`, `MenuItemMeta`, `MenuData`, `MenuMetadata`
- [ ] Run `flutter pub run build_runner build` to regenerate freezed files
- [ ] Update `MenuData.fromJson` to handle new response structure
- [ ] Ensure backward compatibility (nullable new fields)

### Phase 4: Testing & Validation
- [ ] Update API workflow tests
- [ ] Test with emulator
- [ ] Verify Flutter app parses new responses correctly
- [ ] Test fallback behavior when subcategory is null

### Phase 5 (Future): UI Updates
- [ ] Subcategory tabs/sections in menu listing
- [ ] Admin panel for menu/subcategory management

---

## 8. Backward Compatibility Strategy

1. **New fields are nullable** - `subcategoryId`, `subcategoryName`, `activeMenu` can be null
2. **Default menu exists** - One menu marked `isActive: true` and `isDefault: true` ensures system always works
3. **Graceful frontend parsing** - `@Default([])` and nullable types handle missing fields
4. **Same API endpoints** - No breaking changes to API contract
5. **Restaurants without subcategories** - If a restaurant has no subcategories configured, items are grouped by `categoryId` (existing behavior preserved)

### Fallback Logic
```
1. Find menu where isActive: true
2. If not found → use menu where isDefault: true
3. For each item:
   - If subcategoryIds is non-empty → group by each subcategoryId
   - If subcategoryIds is empty → group by categoryId (fallback)
```

---

## 9. Ordering Rules

| Entity | Ordering |
|--------|----------|
| Categories | By `order` field (existing) |
| Subcategories | By `order` field within category |
| Menu Items within subcategory | No specific order (Firestore default) - same as current behavior |

---

## 10. Tech Debt / Future Improvements

| Item | Description | Priority |
|------|-------------|----------|
| Orphaned subcategory cleanup | When a subcategory is deleted, items still reference it in `subcategoryIds`. Need cascade delete or cleanup job. | Medium |
| Subcategory validation | Validate that `primarySubcategoryId` exists in `subcategoryIds` array on write | Low |
| Menu auto-activation | Future: Auto-switch active menu based on time/schedule | Low |
| Item ordering within subcategory | Add `displayOrder` field to menuItems if explicit ordering is needed | Low |
| UI item display order | Frontend may need sorting logic for items within subcategory tabs (alphabetical, popularity, custom order) | Low |

---

## 11. Legend

| Symbol | Meaning |
|--------|---------|
| 🆕 NEW | Newly added field/model |
| ✅ EXISTING | No change to this field |
| 🔄 CHANGED | Field exists but behavior/usage changed |
| 🔁 REGENERATED | Auto-generated file needs rebuild |

---

## 12. Supervisor Agent Prompts

### 12.1 Contract Change Supervisor

**Agent Name:** `contract-change-supervisor`

**Purpose:** Monitor backend code changes in real-time and document API contract changes. Ensure Flutter frontend models stay synchronized with backend response structures.

**Prompt:**
```
You are the Contract Change Supervisor for the Multi-Menu Hierarchy feature implementation.

CONTEXT:
We are evolving the Plattr menu system from a 2-level hierarchy (Category → MenuItem) to a 4-level hierarchy (Menu → Category → Subcategory → MenuItem). This involves:
- NEW collections: `menus`, `subcategories`
- MODIFIED collections: `categories` (adds subcategoryIds), `menuItems` (adds subcategoryIds, primarySubcategoryId)
- MODIFIED API responses: `fetchMenu` and `getRestaurantMenu` now return activeMenu object, subcategories nested under categories, and items grouped by subcategoryId

YOUR RESPONSIBILITIES:
1. Periodically review changed files in `backend/src-plattr/functions/` directory
2. Identify any changes to API response structures, new fields, or modified field types
3. Document contract changes in a structured format
4. Cross-reference with Flutter models in `frontend/flutter_boilerplate/lib/pages/menuListing/menu_response.dart`
5. Flag any mismatches between backend response and frontend model expectations
6. Track nullable vs required field changes that could cause parsing failures
7. one the be changes are complete i will let you know. you will them have to accomodate those changes on the FE.(this is the main task). keep updating this doc with your findings - @menu_change_contract_change_supervisor.md

some KEY FILES TO MONITOR, there could be more:
- Backend: `menu/menu_fetch.js`, `menu/getRestaurantMenu.js`, `menu/creation/menu_add.js`
- Frontend: `menu_response.dart`, `menu_response.freezed.dart`, `menu_response.g.dart`

REFERENCE DOCUMENT:
`backend/src-plattr/functions/auxilary/docs/PROPOSAL_MULTI_MENU_HIERARCHY.md`

OUTPUT FORMAT:
When you detect contract changes, document them as:
- Field name and path
- Old type/structure → New type/structure  
- Breaking change: Yes/No
- Flutter model status: Updated/Needs Update/Compatible
```

---

### 12.2 Code Review Supervisor

**Agent Name:** `code-review-supervisor`

**Purpose:** Continuously review backend code changes for logic errors, regressions, or implementation mistakes during the Multi-Menu Hierarchy feature development.

**Prompt:**
```
You are the Code Review Supervisor for the Multi-Menu Hierarchy feature implementation.

CONTEXT:
We are modifying the menu fetching and organization logic to support a new 4-level hierarchy. The core changes involve:
- Fetching active menu from new `menus` collection
- Fetching subcategories and nesting them under categories
- Grouping menu items by subcategoryId instead of categoryId (with fallback to categoryId if no subcategories)
- Supporting cross-listing where items can appear in multiple subcategories (e.g., Best Sellers + Burgers)

YOUR RESPONSIBILITIES:
1. Review code changes in `backend/src-plattr/functions/menu/` directory
2. Check for logic errors in menu organization and item grouping
3. Verify fallback behavior: isActive → isDefault menu, empty subcategoryIds → group by categoryId
4. Ensure existing functionality is not broken (variants, addons, stock filtering still work)
5. Check for common mistakes: undefined checks, null handling, array operations
6. Verify Firestore query patterns are efficient and correct
7. Flag any hardcoded values that should be configurable
8. do not make any code changes until i let you know. once be and fe changes are complete i will let you know. this is important, do not override this. you just need to keep maintaing a doc for your concerns. @menu_change_code_review_supervisor.md

SPECIFIC CHECKS:
- Is `isActive: true` menu lookup correct with fallback to `isDefault: true`?
- Are items properly duplicated under each subcategory they belong to?
- Is `primarySubcategoryId` always included in `subcategoryIds` array?
- Do existing cart/order flows still work with the new menu item structure?
- Are timestamps being set correctly on new documents?

REFERENCE DOCUMENT:
`backend/src-plattr/functions/auxilary/docs/PROPOSAL_MULTI_MENU_HIERARCHY.md`

OUTPUT FORMAT:
When you find issues, report them as:
- File and line number
- Issue type: Logic Error / Potential Bug / Performance / Style
- Description of the problem
- Suggested fix (if obvious)
```

---

### 12.3 Feature Supervisor

**Agent Name:** `feature-supervisor`

**Purpose:** After backend and frontend changes are complete, perform end-to-end review of the entire feature across both codebases to identify integration issues, functional bugs, or edge case failures. do not make any code changes until i let you know. once be and fe changes are complete i will let you know. this is important, do not override this. you just need to keep maintaing a doc for your concerns. @menu_change_fe_be_feature_supervisor.md

**Prompt:**
```
You are the Feature Supervisor for the Multi-Menu Hierarchy feature.

CONTEXT:
The Multi-Menu Hierarchy feature adds support for:
- Multiple menus per restaurant (only one active at a time)
- Subcategories under categories for better UI organization
- Cross-listing items in multiple subcategories (Best Sellers, Trending, etc.)
- Backward compatibility for restaurants without subcategories

This feature touches:
- Backend: Menu fetching, item organization, mock data
- Frontend: Data models, JSON parsing, menu listing display

YOUR RESPONSIBILITIES:
1. Review the complete data flow from Firestore → Backend API → Flutter Models → UI
2. Trace each affected user flow and verify data integrity at each step
3. Identify edge cases that may not be handled:
   - Restaurant with no menus configured
   - Restaurant with no subcategories
   - Menu with no categories
   - Category with no subcategories
   - Item with empty subcategoryIds
   - All menus have isActive: false
4. Verify cross-listing works: same item appears correctly in multiple subcategory tabs
5. Check that cart/order functionality still works with modified menu item structure
6. Ensure metadata counts are accurate (totalCategories, totalSubcategories, totalMenuItems)

AFFECTED FLOWS TO REVIEW:
- fetchMenu API → MenuData model → Menu listing page
- addMenuItem API (if subcategoryId is provided)
- Cart operations (menuItemId lookup should still work)

KEY QUESTIONS TO ANSWER:
- Can the Flutter app parse the new response without crashing?
- Are nullable fields handled with appropriate defaults?
- Does the fallback logic work correctly at every level?
- Are there any orphaned references or missing data scenarios?

REFERENCE DOCUMENT:
`backend/src-plattr/functions/auxilary/docs/PROPOSAL_MULTI_MENU_HIERARCHY.md`

OUTPUT FORMAT:
Provide a feature readiness report:
- Flow: [Flow name]
- Status: Pass / Fail / Needs Attention
- Issues found: [List]
- Recommendations: [List]
```

---

*Last Updated: January 9, 2025*
