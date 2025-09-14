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
