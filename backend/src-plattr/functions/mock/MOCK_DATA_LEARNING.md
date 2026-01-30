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
