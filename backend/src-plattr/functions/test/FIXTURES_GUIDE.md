# Fixtures Guide

## Purpose
Fixtures provide consistent, reusable data states for testing. They reside in `backend/src-plattr/functions/test/fixtures/`.

## Available Fixtures

### `cart.fixtures.js`
- `empty`: a fresh cart with no items.
- `withOneItem`: cart containing 'item001'.
- `withCancelledItem`: cart containing a cancelled item.

### `menuItem.fixtures.js`
- `simple`: basic item (price 100).
- `discounted`: item with discount.
- `withVariants`: item with variants (e.g., Size).
- `withAddons`: item with addons.
- `outOfStock`: item with `isInStock: false`.

### `session.fixtures.js`
- `active`: valid active session.
- `expired`: session past expiration time.
- `inactive`: session with status 'closed'.

## Usage
Import directly in tests:
```javascript
const cartFixtures = require('../../fixtures/cart.fixtures');
const myCart = JSON.parse(JSON.stringify(cartFixtures.withOneItem)); // Deep copy recommended
```

## Maintenance
- When adding new fields to data models, update fixtures to reflect them (e.g., `selectedVariantsDetails`).
- Keep fixtures minimal but representative.
