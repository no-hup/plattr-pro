# Agent Testing Startup Guideline

This file is designed for a low-reasoning coding agent (e.g. Haiku) to execute all startup commands and guide manual testing across two restaurants.

---

## OPTION A: One-Command Launch (Recommended)

Run the god-level script to start everything at once in iTerm2 tabs:

```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro
zsh backend/flutter-app-logs/god-level-script-to-run-everything.sh
```

When prompted for mock data, select option **5** (`mockData5EndToEndTesting`).

The script will:
1. Kill any existing Flutter/Firebase/Dart processes
2. Start Firebase emulators in a new iTerm tab
3. Wait for emulators to be ready (30s timeout with health check)
4. Import the selected mock data
5. Launch all 4 Flutter apps (Server, Consumer, Kitchen, Admin) in separate iTerm tabs
6. Print a summary with all URLs

**Logs are saved to:**
- Emulator: `backend/firebase-debug-logs/emulator.log`
- Server: `backend/flutter-app-logs/server.log`
- Consumer: `backend/flutter-app-logs/consumer.log`
- Kitchen: `backend/flutter-app-logs/kitchen.log`
- Admin: `backend/flutter-app-logs/admin.log`

---

## OPTION B: Manual Step-by-Step Launch

Use this if you don't have iTerm2 or want to launch apps selectively.

### STEP 1: Start Firebase Emulators

Run this in a terminal. Wait until you see "All emulators ready" before proceeding.

```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
npm run emulators
```

**Expected ports:**
- Functions: `127.0.0.1:5002`
- Firestore: `127.0.0.1:8080`
- Emulator UI: `http://127.0.0.1:4001`

### STEP 2: Import Mock Data (separate terminal)

```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node functions/mock/importMockData5.js --clean --refresh-timestamps
```

**Verify success:** Script should print "Mock data (v5) loaded successfully" and import 7 restaurants + 2 customers.

### STEP 3: Start Consumer App (separate terminal)

```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/flutter_boilerplate
flutter run -d chrome --web-hostname 127.0.0.1 --web-port 5051
```

The app will open at `http://127.0.0.1:5051`. It connects to the emulator at `http://localhost:5002/rms-app-dd875/us-central1` automatically in debug mode.

### STEP 4: Start Kitchen App (separate terminal)

```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/src-platter-apps/apps/platter_kitchen
flutter run -d chrome --web-hostname 127.0.0.1 --web-port 5052
```

The app will open at `http://127.0.0.1:5052`. It connects to the same emulator backend automatically in debug mode (via `AppConfig` initialized to `Environment.dev`).

### STEP 5: Start Server App (separate terminal, optional)

```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/src-platter-apps/apps/platter_server
flutter run -d chrome --web-hostname 127.0.0.1 --web-port 5050
```

---

## TEST RESTAURANTS

We test with exactly 2 restaurants to cover ~80% of scenarios:

| Label | Restaurant ID | Key Feature |
|-------|--------------|-------------|
| **R1** (Complex) | `res_e2e_all_on` | All features ON — multi-variant items, fallback config, variants, addons, discounts |
| **R2** (Simple) | `res_e2e_simple_menu` | Simple menu — basic items, no variant complexity |

---

## PORT SUMMARY

| Component | Port | URL |
|---|---|---|
| Firebase Functions | 5002 | `http://127.0.0.1:5002` |
| Firestore | 8080 | `http://127.0.0.1:8080` |
| Emulator UI | 4001 | `http://127.0.0.1:4001` |
| Server App | 5050 | `http://127.0.0.1:5050` |
| Consumer App | 5051 | `http://127.0.0.1:5051` |
| Kitchen App | 5052 | `http://127.0.0.1:5052` |
| Admin App | 5053 | `http://127.0.0.1:5053` |

---

## LOGIN CREDENTIALS

### Kitchen/Server App

| Restaurant | Email | Password |
|---|---|---|
| R1 (`res_e2e_all_on`) | `server1@e2e.com` | `1234` |
| R2 (`res_e2e_simple_menu`) | `server1@e2e-simple.com` | `1234` |

Second server accounts (if needed for multi-server testing):
- R1: `server2@e2e.com` / `1234`
- R2: `server2@e2e-simple.com` / `1234`

### Consumer App

Entry is via URL (simulating QR scan). Navigate your browser to:

| Restaurant | URL |
|---|---|
| R1 | `http://127.0.0.1:5051/#/r/res_e2e_all_on/t/table_1` |
| R2 | `http://127.0.0.1:5051/#/r/res_e2e_simple_menu/t/table_1` |

Alternative table: replace `table_1` with `table_2` (capacity 2 instead of 4).

**OTP & Customer Details (same for both restaurants):**

| Field | Value |
|---|---|
| OTP | Dynamically generated on first scan. Look up in **Server App** (shows OTP per table) or **Emulator UI** at `http://127.0.0.1:4001` → Firestore → restaurants → {restaurantId} → tables → {tableId} → `currentOTP.code` |
| Phone number | `9876543210` |
| Customer name | `Customer One` |

Second customer (for multi-user testing): phone `9876543211`, name `Customer Two`.

**Note:** In emulator, OTP is valid for 1 hour (vs 5 min in production).

---

## TEST SCENARIOS (ordered checklist)

Execute these in order. Each scenario builds on prior state.

### Phase A: Consumer App on R1 (complex menu)

- [ ] **A1 — Table Entry:** Open `http://127.0.0.1:5051/#/r/res_e2e_all_on/t/table_1`. Look up the OTP from the Server App or Emulator UI (`127.0.0.1:4001`), enter it along with phone `9876543210`, name `Customer One`. Verify you land on the menu page.
- [ ] **A2 — Menu Browse:** Verify 2 categories appear: Food and Bar. Under Food, verify subcategories: Burger, Pizza, Dessert. Under Bar: Whiskey, Beer.
- [ ] **A3 — Add Complex Item:** Add "Classic Burger" (`item_burger_1`, base price 200). Verify the variant selector appears (Size is mandatory). Pick a size, optionally add addons (Cheese, Olives, Jalapenos). Confirm item lands in cart with correct computed price (base + variant + addons, minus any discounts).
- [ ] **A4 — Add Simple Item:** Add "Tiramisu" (`item_tiramisu`, price 200). Verify NO variant/addon prompt. Confirm it appears in cart.
- [ ] **A5 — Out-of-Stock:** Attempt to add "Craft Beer" (`item_beer_1`). Verify it is shown as out-of-stock and cannot be added.
- [ ] **A6 — Cart Review:** Open cart. Verify all added items are listed with correct prices and quantities. Verify total calculation.
- [ ] **A7 — Checkout:** Checkout the cart. Verify an order is created and you can see order status/history.

### Phase B: Kitchen App on R1

- [ ] **B1 — Server Login:** Open kitchen app at `http://127.0.0.1:5052`. Login with `server1@e2e.com` / `1234` for restaurant `res_e2e_all_on`. Verify you see the dashboard.
- [ ] **B2 — View Orders:** Verify the order from A7 appears in active orders with correct items.
- [ ] **B3 — Mark Served:** Mark individual items as served. Then mark the entire cart as served. Verify status updates reflect in the UI.
- [ ] **B4 — Table Management:** Navigate to tables view. Verify table_1 shows as active (occupied by the consumer session). Verify table_2 shows as vacant.

### Phase C: Consumer App on R2 (simple menu)

- [ ] **C1 — Table Entry:** Open `http://127.0.0.1:5051/#/r/res_e2e_simple_menu/t/table_1`. Same OTP flow — look up OTP from Server App or Emulator UI (`127.0.0.1:4001`), phone `9876543210`, name `Customer One`. Verify menu loads.
- [ ] **C2 — Simple Items:** Browse menu. Add items. Verify no variant/addon prompts appear for simple items.
- [ ] **C3 — Checkout:** Add items to cart, checkout. Verify order creation.

### Phase D: Kitchen App on R2

- [ ] **D1 — Server Login:** Login to kitchen app with `server1@e2e-simple.com` / `1234`. Verify dashboard loads.
- [ ] **D2 — View & Serve:** Verify order from C3 appears. Mark items as served.

### Phase E: Cross-cutting checks

- [ ] **E1 — Emulator UI:** Open `http://127.0.0.1:4001`. Browse Firestore data. Verify restaurants, orders, carts, and sessions are all present and correctly structured.
- [ ] **E2 — Session Persistence:** Refresh the consumer app browser tab. Verify the session persists (you are NOT kicked back to OTP entry).
- [ ] **E3 — Second Table:** Open a new incognito tab. Navigate to `http://127.0.0.1:5051/#/r/res_e2e_all_on/t/table_2`. Login as Customer Two (phone `9876543211`). Verify independent session on a different table.

---

## R1 MENU REFERENCE (res_e2e_all_on)

| Item ID | Name | Base Price | Category | Stock | Variants | Addons |
|---|---|---|---|---|---|---|
| `item_burger_1` | Classic Burger | 200 | Food > Burger | In stock | Size (mandatory) | Cheese, Olives, Jalapenos |
| `item_pizza_1` | Margherita Pizza | 500 | Food > Pizza | In stock | Size, Crust | Cheese, Olives, Jalapenos |
| `item_tiramisu` | Tiramisu | 200 | Food > Dessert | In stock | None | None |
| `item_whiskey_1` | Scotch Whiskey | 500 | Bar > Whiskey | In stock | None | None |
| `item_beer_1` | Craft Beer | 100 | Bar > Beer | **OUT OF STOCK** | None | None |

**Feature flags for R1:** `isMultipleVariantOrAddonForMenuItemsSupported: true`, `fallbackToSameCustomConfigurationForAddItem: true`

---

## TROUBLESHOOTING

| Problem | Fix |
|---|---|
| "Connection refused" on consumer/kitchen app | Emulators not running. Go back to Step 1. |
| No restaurants in Firestore | Mock data not imported. Re-run Step 2. |
| OTP rejected | Ensure you used `--clean` flag in Step 2 to reset state. |
| Timestamps show "3 years ago" | Re-run Step 2 with `--refresh-timestamps` flag. |
| Consumer app shows blank page | Check browser console. Ensure URL has correct `/#/r/...` hash format. |
| Kitchen app login fails | Verify restaurantId matches the email domain (e.g. `server1@e2e.com` goes with `res_e2e_all_on`). |
| Port already in use | Kill existing process: `lsof -ti:5002 | xargs kill` (replace 5002 with the conflicting port). |

---

## API ENDPOINTS REFERENCE (for debugging)

Base URL: `http://127.0.0.1:5002/rms-app-dd875/us-central1`

| Endpoint | Purpose |
|---|---|
| `/table-validateTableAndLocation` | Consumer: validate table + location |
| `/table-validateOTP` | Consumer: OTP verification |
| `/menu-fetchMenu-fetchMenu` | Consumer: fetch restaurant menu |
| `/cart-addItemToCart` | Consumer: add item to cart |
| `/cart-getCart` | Consumer: get current cart |
| `/cart-checkoutCart` | Consumer: checkout |
| `/order-getOrder` | Both: get order details |
| `/server-serverLogin` | Kitchen: server login |
| `/order-getActiveOrdersForRestaurant` | Kitchen: list active orders |
| `/order-markCartAsServed` | Kitchen: mark cart served |
| `/table-getTablesForRestaurant` | Kitchen: list tables |
| `/dev-listRestaurants` | Debug: list all restaurants in emulator |
