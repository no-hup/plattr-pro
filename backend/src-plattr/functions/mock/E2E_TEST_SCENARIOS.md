# E2E Test Scenarios – MockData5EndToEndTesting.json

> **Last Updated:** 2026-01-30 | **Mock File:** `MockData5EndToEndTesting.json`

---

## 📊 Data Overview

| Entity | Details |
|--------|---------|
| **Customers** | `9876543210` (has active session), `9876543211` (fresh) |
| **Restaurants** | 3 configs (see below) |
| **Tables** | 2 per restaurant, OTP: `1234` |
| **Servers** | 2 per restaurant, password: `1234` |

### Restaurant Configurations

| ID | isMultiVariant | fallbackConfig | Purpose |
|----|----------------|----------------|---------|
| `res_e2e_all_on` | ✅ ON | ✅ ON | Baseline – all features, has active session/order |
| `res_e2e_multi_variant_off` | ❌ OFF | ✅ ON | Single variant per item |
| `res_e2e_fallback_off` | ✅ ON | ❌ OFF | Forces customization on re-add |

---

## ✅ Testable Scenarios

### 1. Menu & Items

| Scenario | Item/Entity | Expected |
|----------|-------------|----------|
| **Out-of-stock item** | `item_beer_1` | Grayed out, cannot add to cart |
| **Item with image** | `item_burger_1` | Image renders from Unsplash URL |
| **Discounted item** | Burger (10%), Pizza (10%) | Show strike-through + final price |
| **Non-customizable** | Tiramisu, Whiskey | Direct add, no customization sheet |

### 2. Variants

| Scenario | Item | Variant | Expected |
|----------|------|---------|----------|
| **Mandatory variant** | Burger | `var_size_burger` | Must select before add |
| **Mandatory variant** | Pizza | `var_size_pizza` (Size) | Must select before add |
| **Optional variant** | Pizza | `var_crust_pizza` (Crust) | Can skip, add without selection |
| **Variant with price** | Pizza Large | +₹100 | Price correctly added |
| **Variant with price** | Pizza Stuffed Crust | +₹75 | Price correctly added |

### 3. Addons

| Scenario | Item | Addons | Expected |
|----------|------|--------|----------|
| **Multiple addons** | Pizza | Olives (₹30), Jalapeños (₹25) | Both appear, multi-select works |
| **Single addon** | Burger | Extra Cheese (₹20) | Toggle on/off |
| **respectParentDiscount: true** | Jalapeños | Parent 10% discount | Addon price discounted |
| **respectParentDiscount: false** | Olives, Cheese | No parent discount | Full addon price |

### 4. Offers & Discounts

| Offer ID | Type | Scope | Condition | Test |
|----------|------|-------|-----------|------|
| `offer_dessert_50` | PERCENTAGE | Subcategory | None | Tiramisu ₹200 → ₹100 |
| `offer_flat_100` | FLAT | Category (Bar) | `minOrderValue: 500` | Order ₹400 bar → no discount; ₹500+ → ₹100 off |
| `offer_first_time_20` | PERCENTAGE | Order-wide | `isFirstTimeUser: true` | Customer `9876543211` gets 20% off |

### 5. Pre-existing Session/Cart/Order (Resume Testing)

**Restaurant:** `res_e2e_all_on` | **Table:** `table_1` | **Customer:** `9876543210`

| Entity | ID | Status | Details |
|--------|-----|--------|---------|
| **Session** | `session_active_1` | active | Has 2 carts attached |
| **Cart 1** | `cart_served_1` | served | Burger (Regular + Cheese) – already served |
| **Cart 2** | `cart_pending_1` | in_kitchen | Pizza (Large + Olives) + 2× Whiskey – preparing |
| **Order** | `order_active_1` | in_progress | Total: ₹1780 |

#### Consumer App Tests:
- Scan QR for table_1 → should resume `session_active_1`
- Cart history shows both carts with correct statuses
- Can add more items → creates new cart

#### Server App Tests:
- Table 1 shows as occupied (has active session)
- Order view shows 2 carts: 1 served, 1 in-progress
- Can mark items in `cart_pending_1` as served

#### Kitchen App Tests:
- `kitchen_food` sees Pizza from `cart_pending_1` (preparing)
- `kitchen_bar` sees 2× Whiskey (pending)
- Marking served updates cart status

---

## 🔄 Feature Flag Permutations

Run **same add-to-cart flow** on all 3 restaurants:

| Action | `res_e2e_all_on` | `res_e2e_multi_variant_off` | `res_e2e_fallback_off` |
|--------|-----------------|---------------------------|----------------------|
| Add Burger (Regular) | ✓ Added | ✓ Added | ✓ Added |
| Add Burger (Large) again | Separate line item | Same item, qty++ OR blocked | Opens customization again |
| Add same config again | Reuses config | Reuses config | Opens customization |

---

## 💰 Price Calculation Test Cases

### Burger (Large + Cheese)
```
Base:      ₹200
Discount:  10% → ₹180
Variant:   Large +₹50 (gets 10% discount → ₹45)
Addon:     Cheese ₹20 (NO parent discount)
─────────────────────────
Total:     ₹180 + ₹45 + ₹20 = ₹245
```

### Pizza (Large + Stuffed + Olives + Jalapeños)
```
Base:      ₹500
Discount:  10% → ₹450
Variant 1: Large +₹100 (10% → ₹90)
Variant 2: Stuffed +₹75 (10% → ₹67.50 ≈ ₹68)
Addon 1:   Olives ₹30 (NO discount)
Addon 2:   Jalapeños ₹25 (HAS discount → ₹22.50 ≈ ₹23)
─────────────────────────────
Total:     ₹450 + ₹90 + ₹68 + ₹30 + ₹23 = ₹661
```

---

## 🧪 Edge Cases to Verify

| # | Edge Case | How to Test |
|---|-----------|-------------|
| 1 | Add out-of-stock item | Tap Beer → should be blocked |
| 2 | Skip optional variant | Add Pizza without selecting Crust |
| 3 | Remove addon after adding | Toggle off Olives before confirming |
| 4 | Min order not met for offer | Order ₹400 bar items → no flat_100 discount |
| 5 | Min order met | Order ₹500+ bar items → ₹100 off applies |
| 6 | First-time user offer | Use Customer `9876543211` → 20% off |
| 7 | Returning user offer | Customer `9876543210` → 20% off NOT applied |
| 8 | Resume session | Scan table_1 QR with existing session |
| 9 | Mixed cart statuses | Check order view shows served vs in-progress |
| 10 | Add to existing order | Add item while `order_active_1` is in progress |

---

## 📱 App-wise Test Matrix

| Test | Consumer | Server | Kitchen | Admin |
|------|:--------:|:------:|:-------:|:-----:|
| Menu browsing | ✅ | - | - | ✅ |
| Out-of-stock visibility | ✅ | - | - | ✅ |
| Add to cart | ✅ | - | - | - |
| Optional variant skip | ✅ | - | - | - |
| Multiple addons | ✅ | - | - | - |
| View order with mixed cart statuses | ✅ | ✅ | - | - |
| Mark items served | - | ✅ | ✅ | - |
| Kitchen routing (food vs bar) | - | - | ✅ | - |
| Offer eligibility | ✅ | - | - | - |
| Session resume | ✅ | - | - | - |

---

## 📝 Notes for QA

1. **Timestamps:** Pre-existing session/cart use epoch timestamps (~Jan 2025). Consider refreshing if testing time-sensitive logic.
2. **OTP:** All tables use `1234` for easy testing.
3. **Server password:** All servers use `1234`.
4. **Image:** Only `item_burger_1` has an image URL. Other items have empty string.
5. **Offer validity:** All offers valid 2024–2030. No expired offer in mock.
