# Restaurant Menu Onboarding Prompt

> **Usage:** Paste this prompt (or reference this file) each time you share menu photos of a new restaurant. Update the "Learnings" section after each onboarding iteration.

---

## The Prompt

```
I'm sharing photos of the menu from [RESTAURANT_NAME]. Analyze every image carefully and produce a complete Firestore-ready JSON document following the Plattr Pro schema below.

**Restaurant ID convention:** `res_[lowercase_shortname]` (e.g., `res_tonys_pizzeria`)

**Output a single JSON object with these top-level keys inside the restaurant doc:**

1. `info` — restaurant metadata
2. `menus` — menu definitions (usually one: `menu_main`)
3. `categories` — top-level groupings (e.g., Food, Bar, Beverages)
4. `subcategories` — nested under categories (e.g., Starters, Mains, Desserts)
5. `menuItems` — every item on the menu
6. `variants` — size/type choices (e.g., Small/Medium/Large, Reg/Large)
7. `addons` — optional extras (e.g., Extra Cheese, Jalapeños)
8. `kitchens` — kitchen stations that prepare different category types
9. `tables` — placeholder table setup (I'll specify count separately)
10. `servers` — placeholder staff (I'll specify separately)
```

---

## Schema Reference

### info
```json
{
  "name": "Restaurant Name",
  "address": "Full address",
  "phone": "10-digit phone",
  "email": "email@domain.com",
  "location": { "_latitude": 0.0, "_longitude": 0.0 },
  "isMultipleVariantOrAddonForMenuItemsSupported": true,
  "fallbackToSameCustomConfigurationForAddItem": true
}
```

### menus
```json
{
  "menu_main": {
    "menuId": "menu_main",
    "name": "Main Menu",
    "isActive": true,
    "isDefault": true,
    "categoryIds": ["cat_food", "cat_bar"],
    "menuItemIds": ["item_burger_1", "item_pizza_1"],
    "order": 0
  }
}
```
- `menuItemIds` must list **every** menuItem ID in the restaurant
- `categoryIds` must list **every** category ID

### categories
```json
{
  "cat_food": {
    "id": "cat_food",
    "name": "Food",
    "order": 0,
    "subcategoryIds": ["sub_starters", "sub_mains"]
  }
}
```
- ID convention: `cat_[lowercase_name]`
- `order` determines display sequence (0-based)
- `subcategoryIds` must list all child subcategory IDs

### subcategories
```json
{
  "sub_starters": {
    "id": "sub_starters",
    "name": "Starters",
    "parentCategoryId": "cat_food",
    "order": 0
  }
}
```
- ID convention: `sub_[lowercase_name]`
- Must reference valid `parentCategoryId`

### menuItems
```json
{
  "item_butter_chicken": {
    "menuItemId": "item_butter_chicken",
    "categoryId": "cat_food",
    "primarySubcategoryId": "sub_mains",
    "subcategoryIds": ["sub_mains"],
    "meta": {
      "name": "Butter Chicken",
      "description": "Rich creamy tomato-based curry",
      "categoryName": "Food",
      "image": ""
    },
    "priceInfo": {
      "basePrice": 350,
      "discount": 0,
      "finalPrice": 350
    },
    "variants": [],
    "addons": [],
    "isInStock": true,
    "isCustomizable": false
  }
}
```
- ID convention: `item_[lowercase_short_name]`
- **Prices are in the smallest currency unit displayed on the menu** (if menu says 350, use 350)
- `discount` = percentage (0-100). `finalPrice` = `basePrice * (1 - discount/100)`
- `variants` = array of `{ "id": "var_x", "name": "Size" }` objects (NOT bare id strings — `menu/menuHelpers.js` reads `variant.id`/`variant.name`; a string makes the variant silently vanish from fetchMenu). `addons` stays an array of id strings.
- `addons` = array of addon IDs (strings) if customizable
- `isCustomizable` = `true` only if the item has variants OR addons
- `image` = `""` (empty string — we don't have images at onboarding)
- `categoryName` must match the parent category's `name` exactly

### variants
```json
{
  "var_size_pizza": {
    "id": "var_size_pizza",
    "meta": {
      "name": "Size",
      "categoryAssociatedWith": ["cat_food"],
      "description": "Choose size"
    },
    "options": [
      {
        "id": "opt_medium",
        "name": "Medium",
        "priceInfo": { "basePrice": 0, "finalPrice": 0, "discount": 0 }
      },
      {
        "id": "opt_large",
        "name": "Large",
        "priceInfo": { "basePrice": 100, "finalPrice": 100, "discount": 0 }
      }
    ],
    "isMandatory": true,
    "respectParentDiscount": true,
    "itemsAssociatedWith": ["item_pizza_1"]
  }
}
```
- ID convention: `var_[what]_[item_context]` (e.g., `var_size_burger`)
- Option IDs: `opt_[lowercase_name]`
- **First option price is 0** (it's the base). Additional options have the price *difference*
- `isMandatory`: `true` if customer must pick one (e.g., size), `false` if optional (e.g., crust type)
- `respectParentDiscount`: `true` by default (variant price also gets the item's discount)
- `itemsAssociatedWith`: list of all menuItem IDs that use this variant
- A variant can be shared across items if the options/prices are identical

### addons
```json
{
  "addon_extra_cheese": {
    "id": "addon_extra_cheese",
    "meta": {
      "name": "Extra Cheese",
      "categoryAssociatedWith": ["cat_food"],
      "description": "Add extra cheese"
    },
    "priceInfo": {
      "basePrice": 30,
      "finalPrice": 30,
      "discount": 0
    },
    "isInStock": true,
    "respectParentDiscount": false,
    "isMandatory": false,
    "itemsAssociatedWith": ["item_burger_1", "item_pizza_1"]
  }
}
```
- ID convention: `addon_[lowercase_name]`
- `respectParentDiscount`: usually `false` (addon price stays fixed regardless of item discount)
- Addons can be shared across items

### kitchens
```json
{
  "kitchen_food": { "name": "Food Kitchen", "status": "active" },
  "kitchen_bar": { "name": "Bar Kitchen", "status": "active" }
}
```
- Infer from menu structure: separate kitchen per major category (Food, Bar, etc.)

### offers (Offers V2 — order-level auto-apply)
```json
{
  "offer_starters_20": {
    "id": "offer_starters_20",
    "title": "20% Off Starters",
    "description": "Get 20% off on all starters",
    "type": "PERCENTAGE",
    "scope": "CATEGORY",
    "targetIds": ["cat_starters"],
    "exclusionIds": [],
    "isActive": true,
    "validity": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2030-12-31T23:59:59Z"
    },
    "conditions": {},
    "benefit": {
      "value": 20,
      "maxDiscount": 200
    },
    "termsAndConditions": "Valid on starters only. Cannot be combined with other offers.",
    "priority": 10
  },
  "offer_bogo_burger": {
    "id": "offer_bogo_burger",
    "title": "Buy 1 Get 1 Burger",
    "description": "Buy any burger and get another free",
    "type": "BOGO",
    "scope": "ITEM",
    "targetIds": ["item_blaze_bean_burger"],
    "isActive": true,
    "validity": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2030-12-31T23:59:59Z"
    },
    "benefit": {
      "buyQuantity": 1,
      "getQuantity": 1
    }
  }
}
```
- **`type`**: `PERCENTAGE` | `FLAT` | `BOGO`
- **`scope`**: `ORDER` (entire order) | `CATEGORY` (specific categories) | `ITEM` (specific items)
- **`targetIds`**: required non-empty for CATEGORY/ITEM scope; ignored for ORDER
- **`exclusionIds`**: optional — item/category/subcategory IDs to EXCLUDE (e.g., "20% off except desserts")
- **BOGO fields**: `buyQuantity` and `getQuantity` (NOT `buyQty`/`getQty`)
- **`conditions.minOrderValue`**: optional — minimum pre-discount order total
- **`validity.endDate`**: must be in the future — offers are auto-filtered by date
- **`priority`**: lower number wins as tiebreaker when multiple offers apply equally (default 999)
- Offers auto-apply at checkout — no manual apply flow exists. Consumers see offers as display-only hints.
- Single offer per order — the system picks the one with highest discountAmount.

---

## Analysis Checklist (follow this for every menu)

1. **Read every page/image thoroughly** — don't skip sections that seem like footnotes or side panels; they often contain addons, combos, or special items
2. **Preserve the menu's own hierarchy** — use the restaurant's category/subcategory names, don't invent your own
3. **Capture every price point** — if an item has multiple sizes/portions listed, those become variants
4. **Look for shared customizations** — "Add cheese to any burger +30" means one addon linked to all burger items
5. **Veg/Non-veg markers** — note these in descriptions if visible (e.g., "[Veg]", "[Non-Veg]")
6. **Currency** — state the currency you're assuming. Prices go in as-is (if menu says 350, write 350)
7. **Cross-reference IDs** — every ID referenced in menuItems.variants must exist in top-level variants, same for addons. Every menuItem ID must appear in the menu's `menuItemIds`. Every subcategory must appear in its parent category's `subcategoryIds`
8. **Default discount to 0** unless the menu explicitly shows a discount or crossed-out price
9. **Description** — write a brief, appetizing 5-15 word description. If the menu provides one, use it verbatim

---

## Learnings Log

> Update this section after each restaurant onboarding. Format: `[DATE] [Restaurant] — What we missed or got wrong`

### [2026-04-10] Big Brewski — First onboarding

**Variant pricing — base price is the SMALLER option, not the listed "main" price:**
- When an item has half/full or 6pcs/12pcs pricing, the DB `basePrice` must be the cheapest option (half, 6pcs). The variant option prices are DELTAS from that base. We initially had to think through this carefully — it's not obvious from the source menu which price becomes the base.
- If price deltas differ per item (e.g., wings: 6→12 delta is 200 for one flavor, 230 for another), each item needs its OWN variant. Cannot share a single variant across items with different deltas.

**"Options" in source data can mean different things — classify carefully:**
- Same-price options (ice cream flavors) → mandatory variant, all at +0
- Different-price options with no base dish (Beer Paella: Veg/Chicken/Seafood) → mandatory variant, lowest price = base
- "Add-ons" that are really protein upgrades (Schezwan Noodles: +Veg/+Chicken/+Seafood) → addons (`isMandatory: false`), because the base dish is complete without them
- Ask: "Can the customer order this item with NONE of these options?" If yes → addon. If no → mandatory variant.

**Addon deduplication — same name + same price across categories can share one addon:**
- "Cheese" at ₹55 appeared in Burger and Pizza → one `addon_cheese` linked to all items in both categories
- "Bacon" at ₹95 appeared in Burger, Pizza, Pasta → one `addon_bacon` linked to 14 items
- BUT keep addons separate when the context differs meaningfully (e.g., Pizza "Chicken" topping vs Asian "Chicken protein") even if price matches — different `categoryAssociatedWith`

**Category grouping is a design decision — discuss upfront:**
- Source menus are usually flat (12 categories for Big Brewski). Our DB has category → subcategory → item (two levels).
- Decision: group into broader categories (Starters, Mains, etc.) with source categories as subcategories. This gives better test coverage for multi-level navigation.
- Preserve the restaurant's naming — don't rename "Buff" to "Beef Starters" or "Heart-Warmers" to "Curries".

**Items without descriptions — write brief generic ones:**
- Ice cream items had no descriptions in source. All other items did. Inconsistency looks bad in the app — write a brief 5-10 word description for any missing ones.

**Import-ready JSON needs more than just the menu:**
- Tables need pre-seeded OTPs with `{ _seconds, _nanoseconds }` timestamp objects (code `"123456"` for emulator)
- Servers need `email` (used as login username) and `password` — can be simple like `1234/1234`
- Must include empty collections: `sessions: {}`, `orders: {}`, `carts: {}`, `offers: {}`
- Customer docs go at root level, not inside the restaurant
- Wrapper structure must be `{ "customers": {}, "restaurants": { "res_xxx": { ... } } }`
- `_notes` field is safe at top level (import script ignores keys other than `customers` and `restaurants`)

**Generate the menu JSON first, then transform into import-ready format as a separate step:**
- First pass: focus purely on menu accuracy (categories, items, variants, addons)
- Second pass: wrap with customers, tables+OTPs, servers, offers, empty collections
- This separation prevents menu analysis from getting cluttered with infrastructure concerns

**Run cross-reference validation after generation:**
- Every menuItem ID must appear in `menu.menuItemIds`
- Every variant/addon ID referenced in menuItems must exist in top-level `variants`/`addons`
- Every subcategory must appear in its parent category's `subcategoryIds`
- Every addon's `itemsAssociatedWith` must match the items that reference it
- Automate this with a validation script — manual checking at 49+ items is error-prone

---

## Output Format

For each restaurant, output:
1. The complete JSON (ready to paste into MockData or import script)
2. A summary table: category count, subcategory count, item count, variant count, addon count
3. Any assumptions made (things not clear from the photos)
4. Questions for the restaurant owner (ambiguities that need human clarification)

> **`menuItems[].nutritionalInfo` is REQUIRED.** platter_core's `MenuItem` model lists it in
> `requiredKeys`, so the kitchen/server/admin apps refuse to render the menu without it and show
> "Required keys are missing: nutritionalInfo". Emit `{calories:0, protein:0, carbs:0, fat:0}`
> when the real values are unknown — all four default to 0 and the admin dish editor can fill
> them in later. (Missed on the first prod seed, 2026-09-09.)
