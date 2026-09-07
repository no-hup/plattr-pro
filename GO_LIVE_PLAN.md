# Go-Live Plan — Single-Restaurant Soft Launch

## Execution status (updated 2026-09-07, evening)

DONE (committed): Day 1 config (Node 22, locked rules, hosting block, build script,
.gitignore, in-flight changeset committed) · Day 2 five field bugs + full
session-validator audit **and** the resulting security fixes (staff gating on OTP
minting/table mutations/menu mutations, entity checks on 5 staff order endpoints,
active-table-session requirement on cart mutations, checkout session-id match,
emulator-only cleanupInactiveSessions) · Day 3 backend (bounded polled queries, dead
getOrder query deleted, maxInstances 10) and frontend polling (consumer 15s, waiter
20s, kitchen 30s, all with in-flight guards + keep-last-good + lifecycle pause).
NO key rotation (user decision). E2E: 178 pass / 5 pre-existing fails (see below).

**Blocked on the user (this machine):**
1. `firebase login` — then: deploy functions, rules, create hosting site, deploy hosting.
2. Flutter SDK not on PATH — `flutter analyze` + web/apk builds must run wherever
   Flutter lives. All Dart edits are unverified-by-compiler until then.

**State on 2026-09-08:** jest 104/104 · verifyGolden 157/157 · goalline 79/79 ·
matrix 807/9 (all 9 = multi-user cart attribution, v2) · e2e 178/5.
- e2e pre-existing failures: `table` 15 (suite bug: resumes table 1 with table 2's
  session), 16/17 (`checkTableStatus` INTERNAL — long-known), `menu` 3 (shape
  assertion), `server-journey` 5 (cross-suite state: table left OTP_PENDING).
- The earlier goalline 67/79 and the 2 jest cancelled-item failures are fixed.
- Races #8 (order counter) and #9 (removeItemFromCart) are fixed; #10 is closed by
  the atomic checkout. COMPLETED now vacates the table and ends the session.

Remaining: Day 4-5 service-day.mjs + real-phone rehearsals; deploy steps (Blaze,
`firebase login`, functions/indexes/hosting deploys).

---

Status: Verified against code 2026-09-07. Every blocker below was confirmed by direct
inspection (file:line cited). Sequence: 5 working days + rehearsal, then soft launch.

## Verified blockers (evidence)

| # | Claim | Evidence | Status |
|---|---|---|---|
| 1 | Node 18 runtime — deploys rejected | `functions/package.json` `"engines": {"node": "18"}`; GCF Node 18 decommissioned | CONFIRMED |
| 2 | No hosting for consumer web app — no QR URL | no `hosting` key in `backend/src-plattr/firebase.json` | CONFIRMED |
| 3 | Firestore rules wide open | `firestore.rules`: `allow read, write: if true` | CONFIRMED |
| 4 | Service-account key committed | `git ls-files` → `secure_stuff/service-account.json`, `keys.rtf`, `stuff.*` | CONFIRMED |
| 5 | No Flutter app reads Firestore directly | zero `FirebaseFirestore`/`.snapshots()` in any `.dart`; `cloud_firestore` declared but unused in server+core | CONFIRMED → rules can be `if false` |
| 6 | Dead debug query on consumer hot path | `orders/getOrder.js:91-96` reads table's full order history, result unused | CONFIRMED |
| 7 | Unbounded orders reads on polled endpoints | `getActiveOrdersForRestaurant.js:64`, `getActiveCartsForKitchen.js:53` — `ordersRef.get()` | CONFIRMED |
| 8 | Order-counter race | `createOrUpdateOrder.js:434` — read-modify-write, not `FieldValue.increment` | CONFIRMED |
| 9 | Lost-cart-item race | `removeItemFromCart.js:94` bare `cartRef.update`, zero transactions; `addItemToCart` IS transactional | CONFIRMED |
| 10 | Checkout→clear window | `checkoutCart.js:99+` — `createOrUpdateOrder` then `clearCartInternal`, sequential awaits | CONFIRMED |
| 11 | Admin history returns zero orders | `adminApp/orders_admin.js:62` — `forEach((doc, index))`, index is always undefined | CONFIRMED |
| 12 | Free lost-update detector exists | `updateOrderStatus.js:106` — bill-recompute `preconditionFailed` guard | CONFIRMED |
| 13 | Waiter menu hardcoded rest001/session001 | `menu_api_service.dart:23` uses `AppState.instance`; `app_state.dart:7` defaults | CONFIRMED |
| 14 | Kitchen+Admin release builds → localhost | both `main.dart` hardcode `Environment.dev`; server branches correctly on `kReleaseMode` | CONFIRMED |
| 15 | Consumer auth stub fakes success | `session_provider.dart:102` `// TODO: Add API call here` | CONFIRMED |
| 16 | No polling in consumer or waiter apps | zero `Timer.periodic` in either | CONFIRMED |
| 17 | Kitchen polling pattern ready to copy | `kitchen_live_provider.dart:63-67` `startPolling`/`Timer.periodic` | CONFIRMED |

---

## Day 1 — Unblock deploys + security (must precede everything)

- [ ] **Rotate the service-account key** in GCP IAM (assume compromised). Then
      `git rm --cached backend/src-plattr/functions/secure_stuff/` (all 4 files),
      add `secure_stuff/` to `.gitignore`, delete `utils/generateToken.js` (its only consumer).
      Skip history rewrite — revocation is what matters.
- [x] **Node 18 → 22** in `functions/package.json` engines. Drop unused `firebase`
      client dep if grep confirms zero requires. Deploy once to prove it.
- [x] **Firestore rules → total lockdown**: `allow read, write: if false;` (safe: blocker #5;
      Admin SDK bypasses rules). Deploy: `firebase deploy --only firestore:rules`.
- [x] **Add hosting** block to `backend/src-plattr/firebase.json` →
      `frontend/flutter_boilerplate/build/web` + SPA rewrite to `/index.html`.
      Build script (never from memory):
      `flutter build web --dart-define=API_BASE_URL=https://us-central1-rms-app-dd875.cloudfunctions.net`
- [x] **Commit the in-flight changeset** (currently unstaged+untracked) in 4 pieces:
      deletions / E2E move to `test/e2e/` / MockData6+7 + golden tooling / BUG-9 fix.
- Exit criteria: `firebase deploy` succeeds; consumer app loads from a real URL on a phone.

## Day 2 — The five field bugs + auth audit

- [x] `menu_api_service.dart:23-24` — use its own params, not `AppState.instance`;
      make `app_state.dart` defaults null/late so a missed assignment fails loudly (bug #13).
- [x] `orders_admin.js:62` — `ordersSnapshot.docs.forEach(...)` + fix wrong field reads
      (`status`→`orderStatus`, `totalAmount`→`priceInfo.finalPrice`); Jest test on a
      pageSize+1 fixture (bug #11).
- [x] Kitchen + Admin `main.dart` — `AppConfig.initialize(kReleaseMode ? Environment.prod : Environment.dev)`
      (bug #14). AppConfig dedupe dropped (architectural).
- [x] Consumer auth stub (bug #15): `authenticate()` no longer fakes success — it
      surfaces the OTP dialog. Form-path deletion dropped (minimal fix instead).
- [x] **Session-validator audit** (1h): list every export in `functions/index.js`, confirm
      each handler validates a session. With rules locked, this IS the security boundary.
- Exit criteria: admin history shows orders; waiter menu loads a real restaurant; audit gaps fixed or listed.

## Day 3 — Make the loop live (poll everywhere, no listeners)

Backend first:
- [x] Bound both hot queries: `.where('orderStatus','!=',ORDER_STATUS.COMPLETED).limit(300)`
      — same semantics as the existing in-Node filter, auto-indexed, zero behavior delta (bug #7).
      Check live docs for missing `orderStatus` before deploying (`!=` excludes them).
- [x] Delete `getOrder.js:91-96` dead query + the `poopoo` full-order JSON log on the poll path (bug #6).
- [x] Set `maxInstances` on functions (runaway-client bill guard).

Frontend (copy `kitchen_live_provider.dart`, don't abstract):
- [x] Consumer `order_listing_state.dart`: 15s poll + `_inFlight` guard + keep-last-good on
      failure + auto-stop on COMPLETED/all-SERVED + `WidgetsBindingObserver` pause when
      backgrounded + `RefreshIndicator` + "last updated" line. Page-scoped start/stop (provider is app-scoped).
- [x] Waiter `orders_provider.dart`: 20s poll, same guards; poll `fetchActiveOrders` only
      (served carts on tab-select); wire existing `no_internet_banner_widget.dart`.
- [x] Kitchen: 60s → 30s, add `_inFlight` guard.
- Acceptance = the four invariants: never blank on failed poll; never stack requests;
  session-expiry terminal vs network transient; always show last-updated.

## Days 4–5 — service-day.mjs + rehearsal

- [ ] Build `test/e2e/service-day.mjs` (standalone, like goalline): 12 seeded-PRNG table
      actors (2 rounds each, golden items), 2 competing kitchen actors, 2 waiters,
      1 chaos guest (2 phones + double-tap checkout on table 12). Benign-loss vs
      hard-failure split; 11 end-of-run invariants incl. distinct order numbers,
      counter delta == 12, empty carts, golden totals, zero hard failures, p95 latency.
      Always `--clean --refresh-timestamps` MockData7 reimport per run.
- [x] Races #8/#9/#10 fixed ahead of the suite: counter read+written inside the
      checkout transaction; `removeItemFromCart` wrapped in `runTransaction`;
      checkout reads and deletes the cart inside its transaction.
- [ ] **Go-live bar: 3 consecutive clean runs (different seeds) + 1 stress run (jitter halved,
      +2 kitchen actors) with zero hard failures.** benignLosses must be > 0 (proves overlap happened).
- [ ] Rehearse twice on real phones on cellular against the deployed prod build:
      QR → OTP → order → kitchen READY → waiter sees it unprompted → served →
      consumer updates unprompted → admin history correct. Practice rollback once (redeploy prior tag).

## Deploy checklist (every deploy)

1. `npx jest` green; `node mock/verifyGolden.js` green; `flutter analyze` clean
2. `firebase use` shows expected project
3. rules → functions → curl healthcheck → `flutter build web --dart-define=API_BASE_URL=…` → hosting
4. Staff apps: `flutter build apk --release` ONLY (release selects prod env)
5. 5-min smoke: real QR, ₹1 order end-to-end, functions log clean

## Deferred (explicitly)

Week 2: staging project (`.firebaserc` multi-project + `Environment.js` → `process.env.GCLOUD_PROJECT`),
CI (`jest` + `verifyGolden` need no emulator — cheapest first workflow), CORS whitelist, OTP rate limiting.
Later: item-level READY, Firebase Auth, offers-suite rewrite, `poopoo` log purge (except hot-path ones removed Day 3).
