# Plattr Pro — Test Strategy (APIs & Contracts)

**Date:** 2026-06-16
**Scope owner decision:** test ONLY these 3 pillars. Nothing else.

---

## 0. Scope — deliberately narrow

| Pillar | Question it answers |
|---|---|
| **1. API correctness** | Does every backend endpoint return the *desired* response across edge cases & all 4 feature-flag states? |
| **2. Pricing** | Are per-component discounts, cart/order totals, offers, and charges *exactly* right? |
| **3. Contracts** | Does every response's *structure* match what the frontend Flutter models require to parse? |

**Explicitly OUT of scope** (do not build, do not block on): widget/UI tests, golden-image tests, frontend business-logic unit tests, performance/load, security scanning. Order flow (cart→order→cancel) is covered under Pillars 1+2 (it's API correctness + pricing recompute), not a separate pillar.

---

## 1. Decisions (locked)

1. **Contract source of truth = JSON Schema + golden fixtures.** One schema per response type. Backend validates live responses against it; the run emits captured "golden" responses; frontend parses those through the real Dart models.
2. **Single backend test home** — migrate `claude-api-testing-workflow/` into `backend/src-plattr/functions/test/e2e/`.
3. **Frontend** — Flutter forces tests into each package's `test/` dir, so a literal single folder is impossible. Closest achievable: a **shared contract convention** (golden fixtures + the existing `test/contract/` pattern) reused per models-owning package.

---

## 2. Target structure

### Backend — ONE folder: `backend/src-plattr/functions/test/`
```
test/
  unit/                      # Jest — pure functions, ms-fast, NO emulator
    cart/                    #   calculateCartValue, addItemToCart helper, input validation
    models/                  #   priceinfo (BasicPriceInfo/CartItem/CartTotal/Order)
    responseBuilder.test.js  #   (moved from test/ root)
  e2e/                       # plain-Node API suite (migrated from claude-api-testing-workflow)
    run.js                   #   discover → reset → run → summary.json + emit fixtures
    lib/
      config.js              #   golden IDs + EXPECTED_PRICES (single pricing oracle)
      api.js  assert.js      #   + NEW assertContract(resp, schemaName)
      auth.js  data.js  narrator.js
      schema.js              #   NEW — loads contracts/, validates (ajv or hand-rolled)
    contracts/               #   NEW — JSON Schema per response (the contract)
      menu.schema.json  cart.schema.json  order.schema.json
      session.schema.json  offers.schema.json  table.schema.json  serverLogin.schema.json
    fixtures/golden/         #   NEW — real responses emitted each run → consumed by frontend
    suites/                  #   menu, table, cart, pricing, order-lifecycle, offers,
                             #   feature-flags, error-cases, customer-journey, server-journey, admin
  README.md                  #   how to run unit + e2e
```
`unit` stays Jest (right tool for pure fns). `e2e` stays plain-Node (right tool for emulator API tests). Both under one `test/` tree = "one backend folder."

### Frontend — shared contract convention (per models-owning package)
Reuse the **existing** `platter_server/test/contract/` pattern (it already calls live endpoints through real Dart models — this is the gold standard). Extend the same `contract_test_utils.dart` + `CONTRACT_TESTS_AGENT.md` convention to:
- `flutter_boilerplate/test/contract/` — consumer models (menu, cart, order, session) ← **highest priority** (core QR→order flow)
- `platter_core/test/contract/` — staff-shared models (kitchen/server/admin)

Each contract test does ONE of:
- **Live mode** (preferred): call endpoint via the real Dart API service, assert `Model.fromJson` succeeds + required fields present.
- **Fixture mode** (CI / no emulator): load `backend/.../fixtures/golden/<endpoint>.json`, run it through `Model.fromJson`, assert no parse failure.

Both modes assert against the **same** contract the backend validates → one source of truth, two enforcers.

---

## 3. Contract flow (one source of truth, enforced on both sides)

```
                 contracts/<type>.schema.json   ◄── single source of truth
                      ▲                    │
   backend e2e ───────┘                    └──────► frontend contract test
   assertContract(resp, 'order')                    Order.fromJson(goldenFixture)
   (live response must validate)                    (real model must accept it)
                      │
                      └─► emits fixtures/golden/order.json  ──► feeds frontend fixture mode
```
- A schema is derived from the Flutter model's **required / non-nullable** fields (e.g. menu item MUST have `nutritionalInfo`, `meta.name`, `priceInfo.{basePrice,discount,finalPrice}`; variant MUST have top-level `name`).
- Backend drift (missing/renamed field) → e2e `assertContract` fails.
- Frontend drift (model adds a new required field) → fixture parse fails until backend + schema catch up.

---

## 4. Coverage matrix

Endpoints × dimensions. ✅ = existing suite covers; ➕ = add; 🔧 = fix/rewrite.

| Endpoint | Happy | Edge cases | Feature flags | Errors | Contract | Pricing |
|---|:--:|---|---|:--:|:--:|:--:|
| `table-verifyQR` / `verifyStatus` | ✅ | disabled/reserved/expired-OTP | otpMandatoryAtScan | ✅ | ➕ | — |
| `table-validateOTP` | ✅ | wrong/expired OTP, 2nd user | username, multiUser | ✅ | ➕ | — |
| `menu-fetchMenu` | ✅ | empty menu, all-OOS, carousel | — | ✅ | ➕ | — |
| `cart-addItemToCart` | ✅ | mandatory variant missing, OOS item, OOS addon | — | ✅ | ➕ | ✅ per-component |
| `cart-removeItem`/`clearCart`/`fetchCart` | ✅ | empty cart | — | ✅ | ➕ | ✅ recompute |
| `cart-checkoutCart` | 🔧 | empty cart, stock recheck | otp-at-checkout, multiUser | ✅ | ➕ | ✅ + offers + charges |
| `order-getOrder`/`fetchOrder` | ✅ | multi-cart | — | ✅ | ➕ | ✅ totals |
| `order-updateOrderStatus` | ✅ | invalid transition (guard), →COMPLETED recompute | — | ✅ | ➕ | ✅ |
| `order-cancelOrder` / `cancelOrderItem` | ✅ | last item, recompute totals | — | ✅ | ➕ | ✅ |
| `updateCartStatus` / `markItemServed` / `markCartAsServed` | ✅ | invalid transition | serverNotifications | ✅ | ➕ | — |
| `getActiveCartsForKitchen` | ✅ | filters SERVED/CANCELLED | role gate | ✅ | ➕ | — |
| `getApplicableOffers` + auto-apply | 🔧 | all 4 types × scopes, maxDiscount cap, requiredItems, userHistory, expired/future/inactive/CART-scope | — | ✅ | ➕ | 🔧 V2 rewrite |
| `serverLogin` | ✅ | inactive server, wrong pwd, role gate | — | ✅ | ✅ | — |
| `customer profile` | ✅ | first-time vs returning | username | ✅ | ➕ | — |

**Pricing oracle:** all expected numbers live in `e2e/lib/config.js` `EXPECTED_PRICES` (one place). Mirror the per-component cases the `MockData6` seed already encodes (respectParentDiscount true/false, negative charge, offer caps).

**Order-lifecycle pillar specifics** (your "cart→order→cancel" worry):
- cart→checkout creates a NEW order vs **appends** to an existing IN_PROGRESS order for the table.
- ORDER_STATUS transition guard: PENDING→IN_PROGRESS→{COMPLETED,CANCELLED}; terminal states reject (test the rejection).
- →COMPLETED recomputes priceInfo + re-evaluates offer + sets paymentStatus=paid.
- FULFILLMENT transitions (cart & item): PENDING→PREPARING→READY→SERVED→RETURNED; CANCELLED terminal.
- cancelOrderItem drops the item from `order.items[]` and **recomputes totals** (verify the new total).

---

## 5. Reuse / Fix / Delete

**Reuse as-is** (proven): `run.js` runner model, `lib/` (config/api/assert/auth/data/narrator), suite-isolation via `table_clean_*`, structured `summary.json`, `BUGS.md`, narrator log, the `platter_server/test/contract/` pattern + `contract_test_utils.dart`.

**Fix / build (real work):**
- ➕ `contracts/*.schema.json` + `schema.js` + `assertContract` + fixture emit.
- 🔧 Rewrite `offers.js` + `offer-pricing.js` for Offers V2 (auto-apply at checkout; no `applyOffer` endpoint).
- 🔧 Decide on the 3 known bugs (see §7).
- ➕ Consumer-app `test/contract/` (extend the server pattern).

**Deleted (verified unreferenced):** `utils/testFetchMenu.js`, `src-plattr/testFirestore.js`, `flutter_boilerplate/test/debug_api_responses.dart`, dead `consumer/` orphan dir, 5× `test_output*.txt` + empty logs (+ `.gitignore`). Moved `test/ResponseBuilder.test.js` → `test/unit/`.

**Do NOT delete (audit misclassified as orphaned — both are wired in):**
- `backend/src-plattr/functions/tests/` — `preflight_ports.sh` (generates `firebase.temp.json` for the `emulators` npm script) + `api_workflow_test.sh` are referenced by `backend/src-plattr/package.json` scripts. NOTE: those npm scripts have a stale relative path (`tests/` resolves to `src-plattr/tests/`, which doesn't exist — the files are in `functions/tests/`); fix the path before relying on them, but keep the files.
- `backend/src-plattr/contract-tests/` — `contract_test_config.sh` + `run_customer_server_order_flow.sh` are sourced by the `.agent/skills/comprehensive-unit-test` tooling. Supersede only after that skill is updated.

---

## 6. Phased plan (each phase independently shippable)

**Phase 0 — Cleanup (mechanical, low-risk).** Delete strays, move ResponseBuilder test into `unit/`, add `.gitignore` entries. No behavior change.

**Phase 1 — Migrate E2E into `test/e2e/`.** Move `claude-api-testing-workflow/` → `test/e2e/`, fix relative paths in `run.js`/`run-tests.sh`/imports, update `AGENTS.md` testing section + the npm script. Verify the existing 167 pass post-move. *No new coverage yet — pure relocation.*

**Phase 2 — Contracts layer.** Write `contracts/*.schema.json` from the Flutter model required-fields; add `schema.js` + `assertContract`; wire it into every `assertSuccess` site; emit `fixtures/golden/`. Now every API test also asserts structure.

**Phase 3 — Frontend contract tests.** Extend `platter_server` pattern to `flutter_boilerplate/test/contract/` (consumer first) + `platter_core/test/contract/`, both consuming the golden fixtures / live endpoints against the same schemas.

**Phase 4 — Close coverage gaps.** Rewrite Offers V2 suites; add the edge/flag cells marked ➕ in §4; decide known bugs (§7).

**Phase 5 — One command.** `npm test` (backend) runs unit + e2e + emits fixtures; document the single frontend `flutter test` invocation per package. Update `AGENTS.md` so the two homes are the *only* documented homes.

---

## 7. Known-bug decisions to make (Phase 4 gate)

| Bug | Options |
|---|---|
| `admin-*` emulator namespace bug | (a) rename exports to avoid dash, (b) keep `adminCall()` SKIP shim + track in BUGS.md |
| `checkTableStatus` → INTERNAL | (a) debug & fix, (b) mark known-bug, exclude from green bar |
| Offers V2 SKIPs | rewrite against checkout (Phase 4) — no longer optional, it's core Pillar 2 |

---

## 8. Test data

- **e2e**: keep a pinned, deterministic seed so `EXPECTED_PRICES` stay stable (current clean-table approach, or a trimmed `MockData6` profile). Reset before each run.
- **`MockData6BigRestaurants.json`**: the rich exploratory / frontend-dev / manual-QA seed (all edge states). Complementary — not the e2e oracle (too large to pin exact prices against).
- One pricing oracle (`EXPECTED_PRICES`), one OTP (`123456`), one server pwd (`1234`), fixed customer phones.
