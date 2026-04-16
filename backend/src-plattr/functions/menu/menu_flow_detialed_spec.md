# Menu System - Detailed Flow Specification

## Overview

The menu system manages restaurant menus, including categories, menu items, variants, and addons. It provides APIs for fetching, creating, updating, and managing menu data with stock filtering capabilities.

---

## Database Structure

```
restaurants/{restaurantId}/
├── categories/{categoryId}     → Category entities
├── menuItems/{menuItemId}      → Menu item entities
├── variants/{variantId}        → Variant definitions (reusable across items)
└── addons/{addonId}            → Addon definitions (reusable across items)
```

---

## Entity Schemas

### MenuItem Schema
```javascript
{
  menuItemId: string,
  categoryId: string,                    // Foreign key to category
  meta: {
    name: string,                        // Required
    description: string,
    categoryName: string,
    image: string
  },
  priceInfo: {
    basePrice: number,                   // Required
    discount: number,                    // Percentage (0-100)
    finalPrice: number                   // Calculated: basePrice * (1 - discount/100)
  },
  variants: [{                           // Array of variant references
    id: string,                          // Reference to variants collection
    name: string                         // Display name for this context
  }],
  addons: string[],                      // Array of addon IDs
  nutritionalInfo: object,
  allergenTags: string[],
  isInStock: boolean,                    // Stock availability flag
  isCustomizable: boolean,               // IMP: Auto-computed based on variants/addons presence
  lastUpdated: Timestamp
}
```

### Variant Schema
```javascript
{
  variantId: string,
  meta: {
    name: string,                        // Required
    description: string,
    categoryAssociatedWith: string       // Optional category association
  },
  priceInfo: {
    basePrice: number,                   // Required
    discount: number,
    finalPrice: number
  },
  isMandatory: boolean,                  // IMP: If true, customer MUST select this variant
  respectParentDiscount: boolean,        // IMP: If true, inherits parent item's discount
  relatedMenuItems: string[],            // Menu items this variant applies to
  lastUpdated: Timestamp
}
```

### Category Schema
```javascript
{
  id: string,
  name: string,                          // Required
  order: number,                         // Required - display order
  description: string,
  image: string
}
```

### Addon Schema
```javascript
{
  id: string,
  name: string,
  priceInfo: {
    basePrice: number,
    discount: number,
    finalPrice: number
  },
  respectParentDiscount: boolean,        // IMP: If true, inherits parent item's discount
  isInStock: boolean
}
```

---

## Menu Fetch Operations

### Primary API: `getRestaurantMenu` (Cloud Function)
**Endpoint:** `menu-getRestaurantMenu`

#### Request
```javascript
{
  restaurantId: string,      // Required
  inStock: boolean           // Optional, default: false
}
```

#### Flow
1. **Parse Request** - Supports both `data.data.restaurantId` and `data.restaurantId` formats
2. **Validate Restaurant** - Check restaurant exists in Firestore
3. **Parallel Fetch** - Concurrently fetches:
   - Categories (ordered by `order` field)
   - Menu items (optionally filtered by stock)
   - Variants (all, as lookup map)
   - Addons (optionally filtered by stock)
4. **Organize Menu** - Structures data by category hierarchy
5. **Return Response** with metadata

#### Response Structure
```javascript
{
  categories: [{ id, name, order, ... }],
  menuItems: {
    [categoryId]: [{
      menuItemId,
      meta: { name, description, image },
      priceInfo: { basePrice, discount, finalPrice },
      variants: [{ id, name, priceInfo, isMandatory, respectParentDiscount }],
      addons: [{ id, name, priceInfo, isInStock, respectParentDiscount }],
      isInStock,
      isCustomizable
    }]
  },
  metadata: {
    totalCategories: number,
    totalMenuItems: number
  }
}
```

#### IMP: Stock Filtering Logic
- **When `inStock = true`:**
  - Menu items filtered by `isInStock == true`
  - Addons filtered by `isInStock == true`
  - Variants are NOT filtered (always fetched)
- **When `inStock = false` (default):**
  - Returns ALL items regardless of stock status

#### IMP: Input Format Handling
```javascript
// Supports both formats:
if (data.data?.restaurantId) {
  // Standard callable format: data.data.restaurantId
} else if (data.restaurantId) {
  // Direct object format: data.restaurantId
}
```

---

### Secondary API: `fetchMenu`
**Endpoint:** `menu-fetchMenu`

Similar to `getRestaurantMenu` but uses `MenuValidation.validateMenuFetchInput()` with stricter validation. Default `inStock` is `true` (opposite of `getRestaurantMenu`).

**IMP:** Uses inverted stock filter logic: `if (inStock !== false)` applies filter

---

## Menu Item CRUD Operations

### Create Menu Item
**Cloud Function:** `addMenuItem`

#### Request
```javascript
{
  restaurantId: string,
  menuItemData: {
    meta: { name: string, description?, categoryName?, image? },
    categoryId: string,
    priceInfo: { basePrice: number, discount?, finalPrice? },
    variants?: [...],
    addons?: string[],
    nutritionalInfo?,
    allergenTags?,
    isInStock?: boolean    // Default: true
  }
}
```

#### IMP: Auto-computed Fields
- `isCustomizable` auto-set to `true` if `variants.length > 0` OR `addons.length > 0`
- `isInStock` defaults to `true` if not provided
- `lastUpdated` set to server timestamp

---

### Update Menu Item
**Cloud Function:** `updateMenuItem`

#### Request
```javascript
{
  restaurantId: string,
  menuItemId: string,
  updateData: {
    meta?, categoryId?, priceInfo?,
    variants?, addons?, nutritionalInfo?,
    allergenTags?, isInStock?
  }
}
```

#### IMP: Recomputes `isCustomizable` on every update based on new variants/addons

---

### Delete Menu Item
**Cloud Function:** `deleteMenuItem`

- Validates existence before deletion
- No cascade delete (orphaned references may remain)

---

### Update Availability
**HTTP Endpoint:** `menu-updateMenuItemAvailability`

#### Request (HTTP POST)
```javascript
{
  restaurantId: string,
  menuItemId: string,
  isAvailable: boolean    // IMP: Must be explicit boolean, not truthy/falsy
}
```

#### IMP: Used for toggling stock status without full menu item update

---

## Category Operations

### Fetch All Categories
- **Function:** `getAllCategories()`
- **Ordering:** Sorted by `order` field ascending
- **IMP:** Category `name` is required; throws error if missing

### Fetch by Category
- **Function:** `getMenuByCategory(categoryId)`
- Returns category with its menu items

---

## Variant & Addon Relationships

### Variant-MenuItem Relationship
```
MenuItem.variants = [{ id: variantId, name: contextualName }]
                           ↓
         references → variants/{variantId}
                           ↓
                    Contains: priceInfo, isMandatory, respectParentDiscount
```

### IMP: Variant Enrichment During Fetch
```javascript
const itemVariants = (item.variants || []).map(variant =>
  variants[variant.id] 
    ? { ...variants[variant.id], name: variant.name } 
    : null
).filter(Boolean);
```
- Merges variant definition from `variants` collection with contextual `name`
- Filters out null entries (missing variants)

### Addon-MenuItem Relationship
```
MenuItem.addons = ['addonId1', 'addonId2']
                        ↓
         references → addons/{addonId}
                        ↓
                  Contains: name, priceInfo, isInStock, respectParentDiscount
```

---

## Price Calculation Logic

### Base Price Flow
```
MenuItem.basePrice
    ↓
Apply MenuItem.discount → MenuItem.finalPrice
    ↓
+ Variant.basePrice
    ↓
Apply Variant discount (or parent discount if respectParentDiscount=true)
    ↓
+ Addon.basePrice
    ↓
Apply Addon discount (or parent discount if respectParentDiscount=true)
    ↓
= Total Item Price × quantity → Cart Total
```

### IMP: `respectParentDiscount` Flag
- If `true`: Variant/Addon inherits parent MenuItem's discount percentage
- If `false`: Uses its own discount (or 0)
- Applied at cart calculation time, NOT stored in menu

---

## Stock Management

### `isInStock` Field
- Boolean flag on MenuItem, Variant, and Addon
- Updated via `updateMenuItemStock()` or `updateMenuItemAvailability`

### Stock Filtering
- **API Level:** Controlled by `inStock` parameter in fetch calls
- **Query Level:** Uses Firestore `where('isInStock', '==', true)`

### IMP: Stock Check Timing
1. **Menu Fetch:** Filter out unavailable items from display
2. **Cart Add:** Re-validate item availability
3. **Checkout:** Final stock validation before order creation

---

## Validation Layer (`menuValidation.js`)

### Key Validators
| Function | Validates |
|----------|-----------|
| `validateRestaurantId` | Non-empty restaurantId |
| `validateItemId` | Non-empty menuItemId |
| `validateCategoryId` | Non-empty categoryId |
| `validateVariantId` | Non-empty variantId |
| `validateCreateMenuItemInput` | Required: meta.name, categoryId, priceInfo.basePrice |
| `validateUpdateMenuItemInput` | Conditional: meta.name if meta provided, basePrice as number |
| `validateMenuFetchInput` | Required: data.data.restaurantId |

### IMP: Validation Errors
- Throws `functions.https.HttpsError('invalid-argument', ...)` on validation failure
- Consistent error format across all menu operations

---

## Legacy Cart Operations (in creation/)

### `menu_add.js` - `addItemToCart`
- Uses session-based cart storage
- Increments quantity if item exists, else creates new entry
- **IMP:** Deprecated approach - main cart operations in `cart/` package

### `menu_remove.js` - `removeMenuItem`
- Uses user-based cart structure (legacy)
- Matches by itemId + selectedVariants + selectedAddOns combination
- **IMP:** Marked for migration to restaurant/table-based structure

---

## Performance Considerations

### Parallel Fetching
```javascript
const [categories, menuItems, variants, addons] = await Promise.all([
  fetchCategories(restaurantRef),
  fetchMenuItems(restaurantRef, inStock),
  fetchVariants(restaurantRef),
  fetchAddons(restaurantRef, inStock)
]);
```
- All four collections fetched concurrently
- Reduces latency compared to sequential fetches

### Lookup Maps
```javascript
// Variants and Addons stored as maps for O(1) lookup
const variants = variantsSnapshot.docs.reduce((acc, doc) => {
  acc[doc.id] = { id: doc.id, ...doc.data() };
  return acc;
}, {});
```

### IMP: No Server-Side Caching
- Menu data fetched fresh on each request
- Client-side caching recommended for frequently accessed menus

---

## Error Handling

### Common Error Types
| Error Code | Scenario |
|------------|----------|
| `not-found` | Restaurant or MenuItem not found |
| `invalid-argument` | Missing required fields |
| `internal` | Database or processing errors |
| `unauthenticated` | Authentication required but missing |

### Stage-Based Logging
```javascript
const setStage = s => {
  stage = s;
  console.log("poopoo stage=" + s);  // Debug logging
};
```
- Tracks execution progress for debugging
- Included in error logs for troubleshooting

---

## Key Nuances Summary

| Area | Nuance |
|------|--------|
| Stock Filtering | `inStock=true` in `fetchMenu`, `inStock=false` (default) in `getRestaurantMenu` |
| isCustomizable | Auto-computed; don't set manually |
| respectParentDiscount | Inherited discount flag for variants/addons |
| isMandatory | Variant selection required before cart add |
| Category Order | Categories ordered by `order` field, NOT name |
| Variant Resolution | Merged from variants collection + contextual name |
| Addon Resolution | Direct lookup from addons collection |
| Input Format | Handles both `data.data.x` and `data.x` patterns |
| Validation | Centralized in `MenuValidation` class |
| Legacy Cart | `creation/` folder contains deprecated cart functions |
