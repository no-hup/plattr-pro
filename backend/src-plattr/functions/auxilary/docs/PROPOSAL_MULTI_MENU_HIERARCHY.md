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
| `subcategoryId` | string | 🆕 NEW | FK to subcategory (nullable during migration) |
| `meta.name` | string | ✅ EXISTING | Item name |
| `meta.description` | string | ✅ EXISTING | Description |
| `meta.categoryName` | string | ✅ EXISTING | Denormalized category name |
| `meta.subcategoryName` | string | 🆕 NEW | Denormalized subcategory name (nullable) |
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
    "subcategoryIds": ["subcat_burgers", "subcat_pizzas", "subcat_salads"]
  }
}
```
**Changes:** Added `subcategoryIds` field.

### 4.3 Sample Subcategory Documents (NEW)
```json
{
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

### 4.4 Sample MenuItem Document (MODIFIED)
```json
{
  "item001": {
    "menuItemId": "item001",
    "categoryId": "cat_food",
    "subcategoryId": "subcat_burgers",
    "meta": {
      "name": "Classic Cheeseburger",
      "description": "Juicy beef patty with melted cheddar",
      "categoryName": "Food",
      "subcategoryName": "Burgers",
      "image": "https://example.com/cheeseburger.jpg"
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
**Changes:** Added `subcategoryId` and `meta.subcategoryName` fields.

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
        { "id": "subcat_burgers", "name": "Burgers", "order": 1 },
        { "id": "subcat_pizzas", "name": "Pizzas", "order": 2 }
      ]
    }
  ],
  "menuItems": {
    "subcat_burgers": [
      {
        "menuItemId": "item001",
        "categoryId": "cat_food",
        "subcategoryId": "subcat_burgers",
        "meta": {
          "name": "Classic Cheeseburger",
          "categoryName": "Food",
          "subcategoryName": "Burgers"
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

#### Response Field Changes Summary

| Field | Status | Notes |
|-------|--------|-------|
| `activeMenu` | 🆕 NEW | Object with menuId, name, isDefault |
| `activeMenu.menuId` | 🆕 NEW | ID of currently active menu |
| `activeMenu.name` | 🆕 NEW | Display name |
| `activeMenu.isDefault` | 🆕 NEW | Whether fallback menu was used |
| `categories[].subcategories` | 🆕 NEW | Array of subcategory objects |
| `menuItems` key | 🔄 CHANGED | Key changes from `categoryId` to `subcategoryId` |
| `menuItems[].subcategoryId` | 🆕 NEW | FK to subcategory |
| `menuItems[].meta.subcategoryName` | 🆕 NEW | Denormalized subcategory name |
| `metadata.totalSubcategories` | 🆕 NEW | Count of subcategories |
| `metadata.activeMenuId` | 🆕 NEW | ID of active menu |

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
    String? subcategoryId,           // 🆕 NEW (nullable for backward compat)
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
    String? subcategoryName,         // 🆕 NEW (nullable for backward compat)
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
- [ ] Add `subcategoryId: null` and `meta.subcategoryName: null` to existing menuItems
- [ ] Write migration script for existing data

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

---

## 9. Legend

| Symbol | Meaning |
|--------|---------|
| 🆕 NEW | Newly added field/model |
| ✅ EXISTING | No change to this field |
| 🔄 CHANGED | Field exists but behavior/usage changed |
| 🔁 REGENERATED | Auto-generated file needs rebuild |

---

*Last Updated: January 9, 2025*
