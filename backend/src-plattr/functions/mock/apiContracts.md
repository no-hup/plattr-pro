# Restaurant Management System - User App APIs

## Table Management

### QR Scan Verification

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-verifyQR' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001"
  }
}'
```

### Verify Table Status

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-verifyStatus' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001"
  }
}'
```

## Menu Management

### Fetch Menu

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/menu-fetchMenu-fetchMenu' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "inStock": true
  }
}'
```

## Cart Management

### Add Item to Cart

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-addItemToCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001",
    "menuItemId": "item001",
    "quantity": 1,
    "selectedVariants": {
      "variant_burger_size": "burger_size_regular"
    },
    "selectedAddons": ["addon_burger_fries"]
  }
}'
```

### Remove Item from Cart

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-removeItem' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001",
    "menuItemId": "item001"
  }
}'
```

### Fetch Cart

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-fetchCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001"
  }
}'
```

### Clear Cart

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-clearCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001"
  }
}'
```

### Checkout Cart

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-checkoutCart-checkoutCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001"
  }
}'
```

## Order Management

### Fetch Order

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/order-fetchOrder' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001"
  }
}'
```

### Cancel Order

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/order-cancelOrder' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001",
    "orderId": "order001"
  }
}'
```

### Cancel Order Item

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/order-cancelOrderItem' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001",
    "orderId": "order001",
    "menuItemId": "item001",
    "quantity": 1
  }
}'
```

## Common Request Structure

- All requests require a "data" wrapper object
- Common required fields:
  - `restaurantId`: Restaurant identifier
  - `tableId`: Table identifier (except menu fetch)

## API Naming Pattern

Format: `{service}-{action}`
Examples:

- `cart-addItemToCart`
- `menu-fetchMenu`
- `order-cancelOrder`

---

## Mock Data Guidelines

### ⚠️ IMPORTANT: Bestseller/Carousel Items

When creating menu items for special categories like "Best Sellers" (`cat_bestsellers`) that use `viewType: "carousel"`:

**❌ WRONG - Creates broken customization:**
```json
"item_bs_cappuccino": {
  "menuItemId": "item_bs_cappuccino",
  "categoryId": "cat_bestsellers",
  "variants": [],          // ← MISSING variants!
  "addons": [],            // ← MISSING addons!
  "isCustomizable": false  // ← Wrong!
}
```

**✅ CORRECT - Matches real item configuration:**
```json
"item_bs_cappuccino": {
  "menuItemId": "item_bs_cappuccino",
  "categoryId": "cat_bestsellers",
  "variants": [
    { "id": "var_coffee_size", "name": "Size" }  // Same as item_cappuccino
  ],
  "addons": ["addon_vanilla_syrup"],              // Same as item_cappuccino
  "isCustomizable": true                          // Same as item_cappuccino
}
```

### Why This Matters

1. **Customization Sheet**: If `isCustomizable: false`, the app won't show the variant/addon selection sheet
2. **API Calls**: The backend expects variant IDs (e.g., `var_coffee_size`) - empty variants cause "Variant not found" errors
3. **Cart State**: Mismatched item IDs between bestseller and regular items cause cart quantity sync issues

### Cross-Listing Alternative

Instead of duplicate items, you can cross-list existing items using `subcategoryIds`:

```json
"item_cappuccino": {
  "menuItemId": "item_cappuccino",
  "categoryId": "cat_beverages",
  "subcategoryIds": [
    "subcat_hot_drinks",
    "subcat_bestsellers"   // ← Appears in bestsellers too
  ],
  "variants": [...],
  "isCustomizable": true
}
```

This approach uses the SAME item in multiple places, avoiding duplication bugs.

