# Cart API Workflow & Validation

## Overview

This document provides a series of `curl` commands and expected responses to test and validate the cart functionality implemented via Google Cloud Functions for the local Firebase emulator. Use these tests to verify correct behavior, particularly focusing on price calculations and item management.

**Base URL (Local Emulator):**
`http://127.0.0.1:5002/rms-app-dd875/us-central1/`
PORT MIGHT CHANGE - 5001, 5000, 5002 etc(try with various ports where firebase emulators generally might run)

**Test Identifiers:**
- `restaurantId`: "rest001"
- `tableId`: "table001" (primary test table)
- `tableId`: "table002" (alternate test table)
- `sessionId`: "session001" (for table001)
- `sessionId`: "session002" (for table002)

**Important: Before Testing**
1. Clear the cart before running sequential tests to ensure a clean starting state
2. Use the actual item IDs from `functions/mock/mockData.json` for real testing:
   - Classic Cheeseburger: "item001"
   - Gourmet Coffee: "item002" 
   - Veggie Burger: "item003"

## Core API Endpoints

### 1. `cart-clearCart`: Clear all items from a cart

```bash
curl --location -X POST 'http://127.0.0.1:5002/rms-app-dd875/us-central1/cart-clearCart' \
-H 'Content-Type: application/json' \
-d '{
    "data": {
        "restaurantId": "rest001",
        "tableId": "table001",
        "sessionId": "session001"
    }
}'
```
**Expected Response:**
```json
{
    "result": {
        "message": "Cart cleared successfully."
    }
}
```

### 2. `cart-addItemToCart`: Add or update an item in the cart

```bash
curl --location -X POST 'http://127.0.0.1:5002/rms-app-dd875/us-central1/cart-addItemToCart' \
-H 'Content-Type: application/json' \
-d '{
    "data": {
        "restaurantId": "rest001",
        "tableId": "table001",
        "menuItemId": "item001",
        "quantity": 1,
        "selectedVariants": {
            "variant_burger_size": "burger_size_regular"
        },
        "selectedAddons": [],
        "sessionId": "session001"
    }
}'
```
**Expected Response:** Cart object containing the added item and updated price information

### 3. `cart-getCart`: Retrieve the current cart

```bash
curl --location -X POST 'http://127.0.0.1:5002/rms-app-dd875/us-central1/cart-getCart' \
-H 'Content-Type: application/json' \
-d '{
    "data": {
        "restaurantId": "rest001",
        "tableId": "table001",
        "sessionId": "session001"
    }
}'
```
**Expected Response:** Cart object with all current items and price calculations

### 4. `cart-checkoutCart`: Complete the cart and create an order

```bash
curl --location -X POST 'http://127.0.0.1:5002/rms-app-dd875/us-central1/cart-checkoutCart' \
-H 'Content-Type: application/json' \
-d '{
    "data": {
        "restaurantId": "rest001",
        "tableId": "table001",
        "sessionId": "session001", 
        "notes": "Extra napkins please"
    }
}'
```
**Expected Response:** 
```json
{
    "result": {
        "message": "Checkout completed successfully.",
        "status": "success",
        "data": {
            "orderId": "...",
            "orderNumber": "ORD-XXXXX",
            "orderStatus": "active",
            "timestamp": "..."
        }
    }
}
```
**Post-Condition:** Cart should be empty after successful checkout

### 5. `order-getOrder`: Retrieve the order created after checkout

```bash
curl --location -X POST 'http://127.0.0.1:5002/rms-app-dd875/us-central1/order-getOrder' \
-H 'Content-Type: application/json' \
-d '{
    "data": {
        "restaurantId": "rest001",
        "orderId": "ORDER_ID_FROM_CHECKOUT_RESPONSE"
    }
}'
```
**Expected Response:** Order object containing all items, their variants, addons, and pricing information from the checkout

**Note:** Replace `ORDER_ID_FROM_CHECKOUT_RESPONSE` with the actual `orderId` received from the checkout response.

## Test Scenarios by Category

### Basic Cart Operations

1. **Standard Item Addition**
   - Add a Classic Cheeseburger with Regular Size
   - Verify correct price calculation with 10% discount
   - Expect base price of 100, final price of 90

2. **Empty Cart Checkout**
   - Try to checkout an empty cart
   - Expect error: "Cannot checkout an empty cart"

3. **Post-Checkout Cart State**
   - Add items to cart
   - Checkout successfully
   - Verify cart is empty after checkout

### Variant Validation Tests

1. **Missing Mandatory Variant**
   - Try adding Coffee with temperature but without size variant
   - Expect error: "Mandatory variant must be selected"

2. **Single Variant Selection**
   - Add Burger with size variant only
   - Verify variant price is correctly added to total

3. **Multiple Variant Selection**
   - Add Coffee with both temperature and size variants
   - Verify both variant prices are correctly calculated

### Add-on Validation Tests

1. **Single Add-on**
   - Add Burger with Fries add-on
   - Verify add-on price is correctly added

2. **Multiple Add-ons**
   - Add Coffee with both Hazelnut and Vanilla syrups
   - Verify combined add-on price is correct

3. **Respect Parent Discount**
   - Add items with add-ons marked as "respectParentDiscount": true
   - Verify the add-on price receives the same percentage discount as the parent item

### Cart Item Identification Tests

1. **Identical Item Quantity Increment**
   - Add Veggie Burger with Large Size and Fries
   - Add another identical Veggie Burger configuration
   - Verify a single entry with quantity = 2

2. **Different Configuration as Separate Entry**
   - Add Veggie Burger with Large Size and Fries
   - Add Veggie Burger with Regular Size (different configuration)
   - Verify two separate entries for the same menu item

### Edge Cases

1. **Invalid Quantity**
   - Try adding item with quantity = 0
   - Expect validation error

2. **Missing Required Fields**
   - Omit restaurantId, tableId, or menuItemId
   - Expect appropriate error message

### Price Calculation Tests

1. **Multiple Item Pricing**
   - Add multiple items with various variants and add-ons
   - Verify cart total price is correctly calculated
   - Verify all discounts are properly applied

2. **Discount Propagation**
   - Add items with discounts and add-ons that respect parent discounts
   - Verify discounts are correctly propagated to qualifying add-ons

## Example Complete Test Flow

1. Clear cart for table001
2. Add Classic Cheeseburger with regular size
3. Add Gourmet Coffee with large size and vanilla syrup
4. Verify cart contains both items with correct pricing
5. Checkout cart
6. Verify cart is now empty
7. Retrieve order using the orderId from checkout
8. Validate order contains all items from the cart

This flow validates the complete lifecycle of cart operations from creation to checkout and order retrieval.