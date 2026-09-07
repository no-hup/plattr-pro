# Mock Data Creation Guidelines

**IMPORTANT NOTE:**  
**Refer to this document whenever creating or updating mock data files. If you encounter a new schema requirement or a common pitfall, please update this file immediately.**

## 1. Schema Consistency

The most common cause of frontend errors with mock data is schema mismatch. The Flutter frontend models often have `required` fields that might not be obvious from the backend schema alone.

### Variants (`Variant` Model)
When defining variants in `variants` collection or embedded arrays, ensure **ALL** these fields are present:

*   **`id`** (String): Unique identifier.
*   **`name`** (String): Display name.
*   **`isMandatory`** (Boolean): Whether selection is required.
*   **`respectParentDiscount`** (Boolean): **REQUIRED**. Defaults to `true`. failing to include this causes JSON parsing errors.
*   **`itemsAssociatedWith`** (Array of Strings): **REQUIRED**. List of menu item IDs this variant applies to (e.g., `["item_burger_1"]`).
*   **`meta`** (Object):
    *   **`name`** (String)
    *   **`description`** (String): **REQUIRED**. Even if empty string, it must be present.
    *   **`categoryAssociatedWith`** (Array of Strings)
*   **`options`** (Array of Objects):
    *   `id`, `name`, `priceInfo`

### Addons (`Addon` Model)
Similar to variants, addons require specific fields:

*   **`id`** (String)
*   **`isInStock`** (Boolean)
*   **`isMandatory`** (Boolean): **REQUIRED**. Defaults to `false`.
*   **`respectParentDiscount`** (Boolean): **REQUIRED**. Defaults to `false`.
*   **`itemsAssociatedWith`** (Array of Strings): **REQUIRED**.
*   **`meta`** (Object):
    *   **`name`** (String)
    *   **`description`** (String): **REQUIRED**.
    *   **`categoryAssociatedWith`** (Array of Strings)
*   **`priceInfo`** (Object)

## 2. Menu Item Structure

*   **Variants Reference**: In the `menuItems` collection, `variants` is often an array of objects containing minimal info (e.g., `id`, `name`). However, the `variants` *collection* must contain the full object.
*   **Subcategory Grouping**: The frontend expects a clear mapping between categories and subcategories. Ensure `subcategoryIds` in `menuItems` match valid subcategories in the `subcategories` map.

## 3. Data Integrity Tips

*   **Do not assume optionality**: If a field exists in the Firestore schema or `mockDataV2.json`, assume the frontend might rely on it being non-null.
*   **Check `freezed` models**: Look at the `.freezed.dart` or source `_response.dart` files in the frontend to see which fields are `required`. If it's not nullable (`?`), it **MUST** be in the JSON.
*   **Silent Failures**: JSON parsing errors in the frontend often fail silently or return empty lists/default objects (due to `try-catch` blocks in `fromJson`). If data isn't showing up, check for missing required fields first.

## 4. Updates & Maintenance
*   When a new field is added to the backend schema, check if it's required by the frontend.
*   If you find a "ghost bug" where data exists but doesn't render, check this list for missing fields.

## 5. Server Login + Offers in Mock Data

### Servers (`servers` collection)
Server login uses `server_auth.js`, which queries servers by `email` or `phoneNumber` and then compares `password`.
To keep mock login working, each server doc should include:
*   **`email` or `phoneNumber`** (String)
*   **`password`** (String)

### Offers (`offers` collection)
The offers engine expects complete offer objects with:
*   **`type`**: `PERCENTAGE`, `FLAT`, or `BOGO`
*   **`scope`**: `CART`, `CATEGORY`, or `ITEM`
*   **`targetIds`** for `CATEGORY`/`ITEM` scopes (must match category/subcategory/menuItem ids)
*   **`isActive`**, **`validity`** window, **`conditions`**, and **`benefit`**

If you add a category-scoped percentage offer (e.g., 50% off desserts), ensure `targetIds` references the dessert subcategory id (ex: `sub_dessert`) and the `benefit.value` is the percentage.

## 6. Handling Timestamps
Mock data often contains fields that drive time-based logic (e.g., "Elapsed Time" in Kitchen App, "Offer Validity", or "Session Status").

### Critical Fields to Update before Import:
*   **Firestore Timestamps (`{_seconds, _nanoseconds}`):** Used for `createdAt`, `updatedAt`, `submittedAt`.
    *   **Agent Action:** Check current local time (metadata) and update `_seconds` to a recent Unix timestamp (e.g., within the last 15-30 mins) so the orders appear "Live" and not "3 years ago".
*   **ISO Strings:** Used for `statusHistory` or `validity`.
    *   **Agent Action:** Ensure `validity.endDate` is set far in the future (e.g., 2030) to avoid offers expiring during testing.
*   **Session Status:** 
    *   **Agent Action:** Ensure `sessions` for the testing restaurant have `status: "active"`.

A good practice is to update these values in `MockData5EndToEndTesting.json` immediately before running the import script to ensure the UI feels alive.

## 7. Verified Schema Corrections (from MockData6 build — Jun 2026)

These were validated against the live backend + Flutter models. MockData5 violates
several of them; `MockData6BigRestaurants.json` (built by `buildMockData6.js`) fixes
them. **Prefer these rules for any new mock data.**

- **Fulfillment field is `status`, NOT `kitchenStatus`.** Grep confirms zero reads
  of `kitchenStatus` in the backend. Cart items and cart/order snapshots use
  `status` with the `FULFILLMENT_STATUS` enum: `PENDING`, `PREPARING`, `READY`,
  `SERVED`, `RETURNED`, `CANCELLED` (uppercase). (`orders/orderConstants.js`)
- **`ORDER_STATUS`**: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. New orders
  are born `IN_PROGRESS`. **`PAYMENT_STATUS`**: `unpaid`, `partially_paid`, `paid`.
- **Server `role` must be UPPERCASE**: `ADMIN`/`MANAGER`/`SERVER`/`KITCHEN`
  (`adminApp/auth.js`). MockData5's `"waiter"`/lowercase fails the role gate.
- **Variants need a top-level `name`** (required by the Flutter `Variant` model) in
  addition to `meta.name`.
- **Menu items need `nutritionalInfo`** `{carbs,protein,fat,calories}` (required by
  the `platter_core` MenuItem model). Also `meta.spiceLevel` is an **int**.
- **`viewType`** (`'list'`/`'carousel'`) and `defaultExpanded` live on the
  **category** doc (consumer model), not the subcategory.
- **Table status** values: `active`, `vacant`, `pending` (the value of the
  `OTP_PENDING` constant — store `"pending"`, not `"OTP_PENDING"`), `reserved`,
  `disabled`. OTP `code` is a **string**. (`table/table.js`)
- **Session doc** shape: `{tableId, primaryUserId, users[] (phone strings), status
  ('active'|'ended'|'expired'), createdAt, updatedAt, expiresAt}`. Doc id IS the
  sessionId; orders/carts reference it via `sessionId`. (`session/sessionService.js`)
- **Live cart vs order snapshot are different shapes.** The live cart doc id ==
  `tableId` and has **no** `status`/`cartId`/`statusHistory`. The cart snapshot
  inside `order.carts[]` adds `cartId`, `status`, `statusHistory`, `checkoutTime`,
  `estimatedPrepTime`, `assignedTo`. (`orders/createOrUpdateOrder.js`)
- **Cart items should carry top-level `categoryId` + `subcategoryIds`** (not only
  inside the embedded `menuItem`) so CATEGORY/ITEM offers match at checkout.
  (`offers/strategies/BaseOfferStrategy.js`)
- **Offers V2** — engine reads only these `conditions`: `minOrderValue`,
  `requiredItems:[{menuItemId,quantity}]`, `userHistory:{minOrderCount,
  activeSessionOrderCount}`. **Dead/ignored**: `isFirstTimeUser`, `minQuantity`,
  `stackable`, `code`. Types: `PERCENTAGE`/`FLAT`/`BOGO`/`FREE_ITEM`. Scopes:
  `ORDER`/`CATEGORY`/`ITEM` (**`CART`/`SUBCATEGORY` are invalid** — subcategories
  are targeted via CATEGORY scope). `validity` dates are **ISO strings**. Engine
  picks the SINGLE best offer (not stacked). (`offers/offerEngine.js`)
- **Billing charges** (`config/settings` → `billing.charges`): only
  `{type:string, percentage:number}` is supported; `percentage` may be **negative**
  (discount). Charges are a separate line list — grand total =
  `finalPrice + chargesTotal`. (`cart/.../calculateCharges.js`)
