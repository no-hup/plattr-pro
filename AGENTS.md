# Plattr Pro — Agent Instructions

> **New POS work (till, billing, day close, offline, reports, config) is governed by
> [`moonshot/CLAUDE.md`](moonshot/CLAUDE.md). Read it first. This file still governs the existing apps.**

## Project Overview
Restaurant management platform with 4 apps: Consumer (QR scan → menu → order), Kitchen (order management), Server (table/order management), Admin (restaurant settings). Backend is Firebase Cloud Functions + Firestore.

## Critical: Change Impact Checklist

**Before changing any backend API or Cloud Function:**
1. Grep for `featureFlags.isEnabled` in the code path — read `backend/src-plattr/functions/singleton/FeatureFlags.js` for the full flag list and flow-impact map. Verify your change works for **both `true` and `false`** values of every flag in that path.
2. Identify **all frontend apps** that consume the API you're changing. Grep the endpoint name across Consumer, Kitchen, Server, and Admin apps. Verify behavior change is handled in every consuming app.
3. If your change alters the Firestore document schema (adding/removing/renaming fields), check all code that reads those documents — backend functions AND frontend apps. Existing documents in production won't have new fields; code must handle missing fields gracefully.

**Feature flags are per-restaurant overridable** via Firestore doc `_system/featureFlagOverrides` (emulator) or restaurant-level config. Never assume a flag has a single value across all restaurants.

## Architecture Notes

- **Monorepo structure:**
  - `backend/src-plattr/functions/` — Firebase Cloud Functions (Node.js)
  - `frontend/flutter_boilerplate/` — Consumer app (Flutter web)
  - `frontend/src-platter-apps/apps/platter_kitchen/` — Kitchen app
  - `frontend/src-platter-apps/apps/platter_server/` — Server app
  - `frontend/src-platter-apps/apps/platter_admin/` — Admin app
- **Shared core:** `frontend/src-platter-apps/modules/platter_core/` — models shared across kitchen/server/admin apps
- **Emulator-first development:** All local dev uses Firebase emulators. Mock data lives in `backend/src-plattr/functions/mock/`
- **Prod infra, hosting & billing:** `INFRASTRUCTURE.md` — project/billing identity, the two hosting sites, what costs money, and why `max-instances: 10` must not be raised casually.

## Backend Conventions

- Error handling uses `backend/src-plattr/functions/singleton/ErrorHandler.js` — never throw raw errors from cloud functions
- Array operations use `backend/src-plattr/functions/utils/arrayOperations.js` (`safeArrayUnion`, `applyArrayOperation`) — never use raw `FieldValue.arrayUnion` directly
- Session management through `backend/src-plattr/functions/session/sessionService.js`
- OTP generation/validation through `backend/src-plattr/functions/session/otpService.js`

## Writing PRDs & Feature Specs

Every capability is written as: **short name → concrete scene → what the system does → what breaks without it.**

Good:
> **Stock toggle.** Prawns run out at 8pm. Staff marks prawns unavailable once. It goes off Swiggy and Zomato instantly. Without this, orders keep coming for a dish they cannot make, they cancel, and their Swiggy rating drops.

Bad:
> The system shall support real-time inventory availability synchronisation across integrated third-party channels.

Rules:
- One capability per bullet. Name it in one or two words, bolded, then a full stop.
- The scene uses real specifics: a real dish, a real price, a real time of day. "Paneer tikka ₹320 → ₹340", never "an item's price".
- Name the human who acts (manager, cashier, kitchen staff), never "the user".
- Always end with the "Without this…" line. If you cannot write one, the feature probably should not exist.
- Banned: "shall", "seamless", "robust", "leverage", "streamline", "solution".
- Bare paths are never used — every file/folder is a clickable markdown link (see `../CLAUDE.md`).

## Data Defensiveness Rules

- Always null-guard array fields from Firestore before calling `.includes()`, `.length`, `.map()`, etc. Use `(field || [])` pattern
- Session documents may have been created by older code versions — never assume all fields exist
- Table documents may be in unexpected states (e.g., `OTP_PENDING` with expired OTP) — handle gracefully

## Testing

### Browser / front-end testing

Driving the Flutter apps in a browser: **gstack `/browse`, headless, via `scripts/ab.sh`** —
never `--headed`, never a second browser tool. Seed is **MockData7**.
Full recipe, identifiers and gotchas: `FRONTEND_TESTING.md`.

### Testing Strategy (Two Homes)

All backend tests live under **one folder**: `backend/src-plattr/functions/test/` (see `TEST_STRATEGY.md`). Two modes:

1. **Unit Tests (Jest):** `backend/src-plattr/functions/test/unit/` — pure function tests, no emulator needed, runs in milliseconds. Covers `calculateItemPrice`, `BasicPriceInfo`, input validation, response builder.
   - Run: `cd backend/src-plattr/functions && npx jest --verbose`

2. **E2E API Tests (Agent-friendly):** `backend/src-plattr/functions/test/e2e/` — 12 suites hitting real Cloud Functions against Firebase emulator. Covers pricing, cart, checkout, order lifecycle, customer journey, server operations, feature flags, offers, error cases.
   - Run: `cd backend/src-plattr/functions/test/e2e && bash run-tests.sh`
   - Run single suite: `bash run-tests.sh --suite pricing`
   - Agent instructions: `backend/src-plattr/functions/test/e2e/README_AGENT.md`

**Do NOT scatter test files elsewhere in the codebase.** Frontend Dart tests live in their respective app `test/` directories (including `test/contract/` contract tests) — that is the only exception.

### Test Data & Credentials

- E2E test data: `backend/src-plattr/functions/mock/MockData5EndToEndTesting.json`
- Test startup guide: `AGENT_TESTING_STARTUP_GUIDELINE.md`
- Consumer OTP for testing: `123456` (6 digits, matches `OTP_CONFIG.LENGTH`)
- Test customers: phone `9876543210` (Customer One), `9876543211` (Customer Two)
- Import mock data: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node functions/mock/importMockData5.js --clean --refresh-timestamps`

### Price Calculation Reference

The `calculateItemPrice` function in `cart/calculateCartValue.js` applies discounts **per-component**, not to the total sum:
- Base item: uses item's own `finalPrice` (pre-calculated with discount)
- Variants: if `respectParentDiscount: true`, applies parent item's discount %; otherwise uses variant's own `finalPrice`
- Addons: same logic as variants via `respectParentDiscount` flag
- Example: Burger(₹200, 10% off=₹180) + Large(₹50, inherits=₹45) + Cheese(₹20, no inherit=₹20) = **₹245**

### Cross-App Consistency Layer (goalline.mjs)

The goal-line suite (`test/e2e/goalline.mjs`) verifies that every app's read path
reports the **same golden offer-adjusted order total**, not just the consumer path.
After each golden checkout it re-reads the order via `order-getActiveCartsForKitchen`
(kitchen), `order-getActiveOrdersForRestaurant` (server list), and
`server-getOrderDetails` (server detail). A mismatch localizes the bug to that app's
read/sanitize path. Full run is **79 assertions**. Always `--clean` re-import
MockData7 before a fresh run (repeated checkouts on one session group into a single
multi-cart order and inflate totals). Staff auth: `kitchen@<slug>.test` /
`server@<slug>.test`, password `1234`.

### coverage Suite (orphaned endpoints)

`test/e2e/suites/coverage.js` covers endpoints no other suite hits: customer
profile/visit (auth-gated), `menu-fetchMenu-fetchMenu` (the doubled name is
load-bearing — the live consumer app calls it), `table-updateTableStatus`,
`server-getOrderDetails`, `server-markItemServed`. Uses dedicated `table_clean_8`.
Auth-gated customer endpoints need the emulator started via `npm run emulators`
(now sets `FIREBASE_DEBUG_FEATURES='{"skipTokenVerification":true}'` so an unsigned
bearer token authenticates); otherwise the suite falls back to asserting the auth gate.

### Known Test Gaps

- `offers` and `offer-pricing` suites are SKIPped — `applyOffer` endpoint was removed in Offers V2 (auto-apply at checkout). These suites need rewriting to verify offers via checkout flow.
- `admin` suite runs again since `index.js` exports admin endpoints as the nested `exports.admin = {…}` group (the prod requirement from 2026-09-08, see `INFRASTRUCTURE.md`; committed 2026-09-15 inside the ST commits). It fails 9/16 on "Insufficient permissions": the seeded session is not ADMIN/MANAGER. TD-007.
- ~~`checkTableStatus` endpoint returns INTERNAL error~~ — FIXED 2026-09-08: the handler
  destructured the callable request wrapper instead of reading `request.data`, so
  `restaurantId`/`tableId` were always undefined. Covered by table suite tests 16 and 17.
- `cart-updateCartStatus` cascades the cart status to its non-terminal items (`carts[].items` only; the flat `order.items` copy is not cascaded — no read path returns its status and it carries no cart reference). The coverage suite still asserts the `PENDING→SERVED` rejection on a fresh checkout (that cart is never moved to READY), then seeds `READY` via a Firestore test seam.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

This project has a Tree-sitter knowledge graph (`.code-review-graph/graph.db`).
It is **not** a blanket replacement for Grep — measured on this repo (2026-09-13),
a source-scoped `rg` and a graph search cost the same tokens for symbol lookup.
Use each where it actually wins:

### Use the graph for

- **Backend JS structure**: `query_graph` with callers_of/callees_of/imports_of/tests_for
  on `backend/src-plattr/functions/**` — this is where it beats a grep loop, because
  the answer needs several rounds of grep otherwise.
- **Impact radius** of a JS function change: `get_impact_radius`.
- **Test coverage** of a JS function: `query_graph` pattern="tests_for".

### Use Grep for (the graph is blind here)

- **Anything crossing the JS ↔ Dart seam.** The Flutter apps call the backend by
  **string literal** (`'order-cancel'`, `'login-restaurant'`), not by symbol, so no
  structural edge exists for the graph to follow. The rule in *Change Impact Checklist*
  — grep the endpoint name across Consumer, Kitchen, Server, Admin — stays a grep.
- **Feature-flag keys** (`featureFlags.isEnabled('...')`) — also string-keyed.
- **Any string-identity coupling**: route paths, Firestore field names, status enums.

Scope greps to source (`-g '*.js' -g '*.dart'`) — unscoped rg drags in
`deploy-logs/` and `docs/` and costs ~40x more for the same answer.

### Freshness — read this before trusting a query

The auto-update hooks in `.claude/settings.json` are **deliberately inert**: they
invoke a bare `code-review-graph`, which is not on PATH (only `uvx code-review-graph`
resolves). This is intentional — a `PostToolUse` update on every Edit/Write/Bash with
a 5s timeout, against a ~90s full build, risks a partially-written graph that returns
confidently wrong structure. **A stale graph is worse than no graph.**

So the graph is only as fresh as the last manual build. Refresh it yourself before
relying on it:

```bash
uvx code-review-graph build     # full rebuild, ~90s
uvx code-review-graph status    # check "Last updated" and "Built at commit"
```

If `status` shows a commit older than the code you are reasoning about, rebuild or
use Grep instead.
