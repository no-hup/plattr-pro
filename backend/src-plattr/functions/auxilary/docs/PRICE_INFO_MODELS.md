# Price Info Models Documentation

This document describes the standardized price information models used throughout the application. These models ensure consistent validation, formatting, and structure for all price-related data.

## Why Use Price Info Models?

- **Data Consistency**: Ensures all price-related data follows the same structure
- **Built-in Validation**: Automatically validates and sanitizes numeric values
- **Error Prevention**: Prevents NaN values and malformed price data
- **Clear Intent**: Makes code more readable by using descriptive model names
- **Maintainability**: Centralizes price structure definitions in one place

## Available Models

### BasicPriceInfo

The simplest price model used for menu items, variants, addons, and other basic price structures.

```javascript
{
  basePrice: 10.99,     // Original price
  discount: 15,         // Discount percentage (0-100)
  finalPrice: 9.34      // Price after discount
}
```

**Usage Examples:**

```javascript
// Create new price info
const price = new BasicPriceInfo(10.99, 15);
console.log(price.toObject());

// Validate existing price info
const validatedPrice = BasicPriceInfo.fromObject(existingPriceObj);
```

### CartItemPriceInfo

Detailed price breakdown for cart items, including separate pricing for variants and addons.

```javascript
{
  itemBasePrice: 10.99,          // Original menu item price
  itemFinalPrice: 9.34,          // Menu item price after discount
  totalVariantBasePrice: 2.50,   // Sum of all variant prices
  totalVariantFinalPrice: 2.50,  // Sum of variant prices after discount
  totalAddonBasePrice: 1.00,     // Sum of all addon prices
  totalAddonFinalPrice: 1.00,    // Sum of addon prices after discount
  totalBasePrice: 14.49,         // Total original price
  finalPrice: 12.84,             // Final price after all discounts
  discount: 15,                  // Original discount percentage
  discountAmount: 1.65           // Total discount amount in currency
}
```

**Usage Examples:**

```javascript
// Create from component prices
const itemPrice = CartItemPriceInfo.fromComponents(
  { basePrice: 10.99, discount: 15 }, // menu item price
  2.50,  // variant price
  1.00   // addon price
);

// Validate existing cart item price info
const validItemPrice = new CartItemPriceInfo(existingItemPriceInfo);
```

### CartTotalPriceInfo

Aggregate price information for an entire cart.

```javascript
{
  basePrice: 28.98,              // Total original price
  finalPrice: 25.68,             // Total price after discounts
  totalVariantBasePrice: 5.00,   // Total price from variants
  totalAddonBasePrice: 2.00,     // Total price from addons
  totalDiscount: 11.39,          // Overall discount percentage
  totalDiscountAmount: 3.30      // Total discount amount in currency
}
```

**Usage Examples:**

```javascript
// Create empty cart price info
const emptyCartPrice = new CartTotalPriceInfo().toObject();

// Calculate from cart items
const cartTotal = CartTotalPriceInfo.fromCartItems(cartItems);
```

### OrderPriceInfo

Simplified price information used for order records.

```javascript
{
  basePrice: 28.98,              // Total original price
  finalPrice: 25.68,             // Total price after discounts
  totalDiscount: 11.39,          // Overall discount percentage
  totalDiscountAmount: 3.30      // Total discount amount in currency
}
```

**Usage Examples:**

```javascript
// Create order price info from cart total
const cartTotalPrice = new CartTotalPriceInfo(cartData.priceInfo);
const orderPrice = OrderPriceInfo.fromCartTotal(cartTotalPrice);
```

## Integration Points

The price info models are integrated in these key areas:

1. **Menu Items**: `BasicPriceInfo` for menu item prices
2. **Variants & Addons**: `BasicPriceInfo` for variant and addon prices
3. **Cart Items**: `CartItemPriceInfo` for individual cart items
4. **Cart Totals**: `CartTotalPriceInfo` for cart totals
5. **Orders**: `OrderPriceInfo` for order records

## Best Practices

1. **Always use `.toObject()`** when returning data to API clients or storing in Firestore
2. **Use factory methods** to create models from existing data (`fromObject`, `fromComponents`, etc.)
3. **Use validation methods** to ensure incoming data is properly formatted
4. **Keep model usage consistent** across similar functions

## Common Operations

### Validating Price Data

```javascript
function validatePriceData(priceInfo, context = 'unknown') {
  try {
    // Use BasicPriceInfo to validate
    const validatedPriceInfo = BasicPriceInfo.fromObject(priceInfo);
    return true;
  } catch (error) {
    console.error(`Invalid price data in ${context}. Error: ${error.message}`);
    return false;
  }
}
```

### Creating Default Price Info

```javascript
// Create default price info for a menu item
const defaultPrice = new BasicPriceInfo().toObject();

// Create default cart item price info
const defaultCartItemPrice = new CartItemPriceInfo().toObject();

// Create default cart total price info
const defaultCartTotal = new CartTotalPriceInfo().toObject();
```

### Calculating Cart Totals

```javascript
// Calculate cart totals from cart items
const updatedPriceInfo = await calculateCartValue(cart);
cart.priceInfo = updatedPriceInfo;
``` 