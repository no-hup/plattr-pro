# Manual QA findings — agent-driven (2026-09-07)

Setup: emulator + MockData7 (`--clean`), Consumer :5051, Kitchen :5052, Server :5050.
Driven through Flutter's semantics tree (see "How control works" at the bottom).

## End-to-end result: the full loop WORKS

Consumer QR → OTP → menu → customize (Family +₹260, Extra Raita +₹40) → cart ₹620 →
checkout → **ORD-00001** (offer auto-applied, "saved ₹100 with ₹100 Off") →
**Kitchen** shows `tbl_meg_9 / 1x Chicken Dum Biryani / Family (serves 3), + Extra Raita` →
Kitchen **Mark Ready** → cart `PENDING → READY`, item cascaded →
**Server app** shows `Table tbl_meg_9 — READY — 1× Chicken Dum Biryani`.
Pricing and offer maths agreed across all three apps.

---

## FIXED — Checkout latched a dead error screen after a page reload

**Repro:** build a cart, reload the page (or reopen in a new browser), tap PROCEED TO CHECKOUT.

**Was:** the cart screen showed *"Oops! Something went wrong — No active session found.
Please scan the QR code again."* and stayed there **even after the OTP re-auth succeeded**.
Backend was healthy throughout (active, unexpired session for the table, correct user) —
purely client state.

**Root cause:** the consumer session lives in memory only, so a reload loses `sessionId`.
`checkoutCart` set `_error`, fired `AuthPrompt.showIfNeeded(...)` **without awaiting it**, and
returned false. The prompt then succeeded and populated the session — but nothing cleared
`_error` or re-read the session, so the error screen latched forever.

**Fix** — [cart_listing_state.dart:537](frontend/flutter_boilerplate/lib/pages/cart_listing/cart_listing_state.dart#L537):
await the existing `AuthPrompt`, re-read `sessionId`, and only error if it's *still* absent.
Reuses what was already there; no new state, no new abstraction.

**Verified live:** reload → checkout → OTP → checkout completes → ORD-00001 → kitchen sees it.

**Deliberately NOT done:** auto-retrying checkout after re-auth. Checkout is the money path;
a silent auto-submit risks duplicate orders. The user taps PROCEED once more, which is safe
and obvious. Say the word if you'd rather have the retry.

## WITHDRAWN — two findings from my first pass were wrong

- **"OTP dialog has no phone field"** — false. The dialog is adaptive: a *vacant* table asks
  Name + Phone + OTP (primary customer); an *active* table asks Name + OTP (joiner). Correct.
- **"MockData7 marks tables active with no session"** — false. A clean import is consistent:
  `tbl_meg_1` active *with* `ses_meg_active`; `tbl_meg_6..12` vacant with no session. The bad
  state I saw was runtime contamination from earlier test runs on a shared emulator.

Both were artifacts of **mutated emulator state**, not defects. Worth remembering: this
emulator is shared, and stale state impersonates application bugs convincingly.

---

## Open findings

### STAFF-1 — Kitchen and Server apps show raw document IDs to staff
Kitchen card header and detail dialog read `tbl_meg_9` / `Table tbl_meg_9`; the Server app
shows `Table tbl_meg_9`. Waiters and cooks should see **Table 9**. The `number` field ("9")
is already on the table doc and already used elsewhere.

### STAFF-2 — Order number renders as `#0` in Kitchen
Kitchen shows `#0` on the card and `Order #0` in the dialog for the order the consumer app
calls **ORD-00001**. Kitchen is reading a different (or unset) field.

### LOG-1 — `poopoo` debug logging ships in backend *and* frontend
Backend: `session/sessionService.js`, `table/table.js`, `singleton/ErrorHandler.js` log on
every session validation, OTP validation and error path. Frontend: the consumer's `AppLogger`
emits `🐛 poopoo 📦 ORDER REPO: …` etc. to the browser console on every order parse.

### A11Y-1 — FIXED (agent) — ADD buttons had no accessible name
`semanticsLabel: 'Add <name>, ₹<price>'` on the existing Text — one parameter, plus a widget
test. Note my original claim was overstated: item names/prices *were* exposed on the enclosing
row group; only the button itself was anonymous.

### A11Y-2 — NOT FIXED, upstream Flutter SDK
The route-label console warning comes from Flutter's own `_ModalBottomSheet`, which sets
`namesRoute: true` with an empty label on macOS/iOS — and Chrome-on-Mac reports `macOS`. Fires
for **every** `showModalBottomSheet` in the app. The only workarounds are a debug-only global
platform override (changes scroll physics and transitions app-wide) or forking
`ModalBottomSheetRoute` — both far bigger than the symptom. Console noise only; a screen
reader still announces the sheet's contents. Recommend ignoring or tracking upstream.

### UI-1 — FIXED (agent) — and the real-user half was worse than I thought
Not just the debug page. There is **no comparator anywhere**: every table list renders raw
Firestore document-id order (1, 10, 11, 12, 2 …). That includes the **Server app's waiter
table grid** and the **Admin app's operations screen** — both user-facing. A backend `orderBy`
wouldn't help since `number` is a string field. Fixed locally in each of the three apps
(they share no common package).

### BUILD-1 — FIXED — consumer app couldn't be built from a fresh clone
Three separate blockers:
- `DioExceptionType.transformTimeout` unhandled in two switches after a dio bump —
  `error_interceptor.dart`, `offers_repository.dart`. **Committed code, not local setup.**
- `lib/firebase_options.dart` was gitignored (inherited from the upstream boilerplate) while
  all three sibling apps commit theirs. Now un-ignored; the file is byte-identical to the
  kitchen app's already-committed copy, so nothing new is exposed.
- No `.env` and no `.env.example` — and the root `.gitignore`'s `.env*` made a template
  impossible to commit. Added `!.env.example`, the template, and a README "first run" section.

---

## Architectural inconsistencies — reported, deliberately NOT patched

1. **`reserved` is not a real table status.** `tableInputValidation.js:119` accepts
   `'reserved'`, but `TABLE_STATUS` in `table/table.js:20-25` has no such member — so
   `validateOTP` on a reserved table falls through to the final `else` and returns a **500
   "Unexpected table status"**. Separately, `server/tables_fetch.js:47` coerces it to
   `'vacant'` for the server app. `tbl_*_4` is seeded `reserved` with a live OTP in all five
   restaurants: genuinely "looks joinable, isn't". Fixing it means deciding what `reserved`
   *means* — an enum/product decision, not a patch.

2. **Vacant tables carry a live OTP in the seed.** The backend invariant is
   vacant ⟹ `currentOTP: null`. The seed breaks it deliberately so `goalline.mjs` and
   `matrix/run-matrix.mjs` can join tables without a waiter step. It means the test seed
   exercises a state production cannot produce.

3. **`importMockData5.js` uses `set(…, {merge: true})`.** A re-import *without* `--clean`
   cannot clear omitted fields (`occupiedBy`, `primaryCustomer`, `activeOrderId`) or delete
   runtime session docs — so a "reseed" can leave exactly the contaminated shape that sent my
   first pass chasing two phantom bugs. Every documented workflow uses `--clean`, so it's a
   footgun rather than a live defect.

4. **Admin app does not build.** `flutter pub get` fails on `firebase_crashlytics ^3.5.7` vs
   `cloud_firestore ^6.1.2` (via `platter_core`). Almost certainly the real reason behind the
   "admin suite SKIPped" note in CLAUDE.md. Its UI-1 fix is unverified as a result.

---

## How agent control works (reusable)

Flutter 3.47 is CanvasKit-only — the DOM is a single `<canvas>`, so ordinary selectors fail.
Enable Flutter's accessibility tree once per page and the UI becomes queryable:

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B goto 'http://127.0.0.1:5051/#/r/res_meghana/t/tbl_meg_9'
$B js 'document.querySelector("flt-semantics-placeholder").click()'   # semantics DOM on
$B snapshot -i          # → @e1 [textbox] "Name", @e5 [button] "Submit", ...
$B click @e1 && $B fill @e1 "QA Tester"     # ALWAYS click (focus) before fill
```

Gotchas learned the hard way:
- `fill` on an unfocused Flutter textbox **silently no-ops**. Click first, always.
- `snapshot -i` lists only *interactive* nodes; labels can live on the enclosing group.
- Refs renumber after any state change — re-snapshot before each click.
- **Verify the active tab (`$B url`) before trusting a result.** Tab targeting drifts, and
  `console`/`network` are global across tabs. I nearly filed "Kitchen Mark Ready is broken"
  purely from clicks landing on the wrong tab; it works fine.
- Some dialog buttons need real pointer events rather than `.click()` — dispatch
  `pointerdown`/`mousedown`/`pointerup`/`mouseup`/`click` at the element's centre.

---

# Addendum — PRD cross-check + audit of commits a91653d..8fdd3f5

## The PRD settles two of the open findings

**`reserved` is an unresolved product decision, not a bug.**
- `PLATTR_PRO_PRD.md` §10.1: table lifecycle is `Vacant → OTP Pending → Active → Vacant`;
  "Disabled is an admin override state"; **"Reserved is supported in UI; operational policy
  must be finalized."** Reserved is deliberately outside the lifecycle.
- §16 Open Decisions: *"Final policy for reserved tables and how it interacts with OTP."*
- §15 Risks and Gaps: *"Final naming alignment of statuses must be confirmed."*

So the 500 on a reserved table is the **absence of a decision**, not a defect to patch.
Correct call not to fix it. It needs a product answer first.

**Consumer session persistence is a stated requirement that was never built.**
`frontend/flutter_boilerplate/lib/docs_important/customer-website-requirements.md`:
- line 147 — **"Session persistence"** (under Offline Handling)
- lines 245-246 — **`checkSession(tableId)`**, **`refreshSession(tableId)` → "Extends session
  if valid"**

Against the code:
- Neither `checkSession` nor `refreshSession` exists in the backend — zero occurrences.
- The consumer app has **no persistence mechanism at all** — no `shared_preferences`, no
  `localStorage`, no secure storage anywhere under `lib/`.
- [router.dart:184](frontend/flutter_boilerplate/lib/router.dart#L184) `_checkSession()` is
  `return true;` with `// TODO: Implement actual session check` and a comment saying it
  should read local storage.

That chain is *why* the checkout bug existed: the router asserts a session is valid, and the
checkout path is the first code that discovers it isn't. My fix makes the recovery correct;
**the requirement itself is unimplemented and needs a product decision** (persist the
sessionId, build `refreshSession`, or accept re-auth on refresh as intended behaviour).

Note §5 line 91 *"Maintain cart state across page refreshes"* currently passes only
**incidentally** — the cart survives because it lives server-side, not because the client
persists anything.

**STAFF-1 is softer than I filed it.** `server_app_prd.md:23` specifies "show orderId,
**tableId**, and item status pills". Displaying the tableId is spec'd. Showing the raw slug
`tbl_meg_9` when the table doc carries `number: "9"` is still poor for staff, but that is a
product question, not a bug.

## Audit of the six commits — verdict: sound

Small and contained: **34 insertions / 13 deletions** across 9 production files.
`npx jest` **104/104 pass**; `verifyGolden` **157/157**. No secrets committed
(no `.env`, `firebase_options.dart`, service-account or key files in the range).

**The 9 "already-fixed" markings are honest.** I verified each claim against the code rather
than trusting the annotation — `markCartAsServed.js:101` (isValidCartTransition),
`serverMarkItemServed.js:75` (idempotent short-circuit), `updateOrderStatus.js:125`
(calculateCharges on the post-offer total), `createOrUpdateOrder.js:63/:159` (transactional
cart read + delete), `calculateCartValue.js:152` (mapCartStatus), `updateCartStatus.js`
(cascadedItems). All present as described. No rubber-stamping.

**The MockData7 diff is 100% timestamp regeneration** — every one of the 183 changed lines is
`_seconds` / `_nanoseconds` / `generatedAtUnix` / offer `startDate`-`endDate`. Zero semantic
change.

### Issues worth acting on

1. **`load_kitchen.json` is a non-deterministic golden, now empty.** It has flip-flopped
   `0 → 2 → 0` orders across a91653d / 7d382ee / 8fdd3f5, and the contract test was relaxed to
   let `load_*` fixtures be empty. It is the **only empty capture of 36 golden fixtures**.
   While empty it asserts nothing — it would pass if `order-getActiveCartsForKitchen`
   returned nothing at all. The race explanation is plausible, but the fix treats the
   symptom: the capture should be taken after the checkouts settle rather than accepted empty.
   It will also keep churning in every diff.

2. **Five findings are misattributed to the wrong commit.** They read "FIXED at 6b31eda", but
   `git log -S` puts the code at **4acb6db** (which predates this session) — 6b31eda is where
   they were *verified*, not fixed. In an audit trail whose whole point is traceability that
   matters: anyone reverting 6b31eda expecting to undo the atomic-checkout or charges fixes
   would be wrong.

3. **Two counting conventions in one config object.** `userHistory.minOrderCount: N` now means
   "N prior orders"; `userHistory.activeSessionOrderCount: N` means "the Nth order of the
   sitting" (N-1 prior). Both read the same session-scoped `priorCount`, but only the second
   carries the `-1` and a pinning test. Not a regression — checkout behaviour is unchanged and
   the fix correctly made COMPLETED agree with checkout — but it is a live footgun for whoever
   configures offers.

4. **Two of my working-tree edits were committed by another session** (`aab22eb` transformTimeout,
   `a787cf5` the dev script). I diffed both: byte-for-byte my intended change, nothing
   half-finished swept along. No harm done, but worth knowing the authorship isn't mine.

---

# Addendum 2 — fixes applied from the audit (2026-09-08)

- **Flaky `load_kitchen` golden — fixed at the cause.** `staffLoad` still fires its four staff
  polls concurrently with the checkouts (that race is the point of the scenario and is still
  asserted on), but those polls are now labelled `_load_race` and `capture()` in
  `test/e2e/matrix/actors.mjs` skips any `_`-prefixed label — a transient probe is never
  written as a golden. The golden `load_kitchen` is now captured **after** the checkouts
  settle, next to the existing `load_final`. Regenerated via
  `node run-matrix.mjs --scenario staff-load` → 75/75; `load_kitchen.json` now holds all 4
  orders. Removed the three fixtures the race used to produce (`load_kitchen2`,
  `load_server`, `load_server2`). The kitchen contract test's "empty is fine for `load_*`"
  exception is gone — every fixture is back under the strict non-empty guard (3/3 pass).
  Harness nit noticed on the way: `cart-addItemToCart/load.json` flips `tbl_meg_10 ↔
  tbl_meg_6` between a full and a `--scenario` run because table allocation depends on run
  scope — the "byte-identical fixtures" comment in `writeFixtures` doesn't hold for tableIds.
  Reverted that file to HEAD rather than commit a scope-dependent diff.
- **Misattribution fixed.** All nine `FIXED at 6b31eda` annotations in `static-findings.cjs`
  now name the commit that carries the code — seven at `4acb6db`, the charges fix at
  `3ad0107`, the kitchen `json_serializable` fix at `5d6e258` — each marked "(verified by
  the 6b31eda matrix run)". Verified with `git log -S` per claim.
- **Offer counting conventions documented** in `auxilary/docs/OFFERS_SYSTEM.md` next to the
  schema: `minOrderCount: N` = N prior orders (unlocks on N+1), `activeSessionOrderCount: N`
  = the Nth order (unlocks on N), both session-scoped. Behaviour unchanged — it's a
  money path and both semantics are internally consistent; the trap was that nothing said so.
- **Seed churn**: every matrix run rebuilds `MockData7ProductionMenus.json` /
  `goldenExpectedValues.json` with fresh timestamps (183-line diff, zero semantic change).
  Reverted to HEAD; `verifyGolden` 157/157 against HEAD's seed.

## Proven, not fixed — cart writes are gated by the table, not the caller

`cart-addItemToCart`, `cart-removeItemFromCart`, `cart-clearCart`, `cart-getCart` only
require that the **table** has an active session. They accept and validate a `sessionId`
if one is sent, but the consumer never sends one. Reproduced on the live emulator: with
tbl_meg_9 occupied, a bare `curl` with just `restaurantId` + `tableId` (both printed on the
QR) added **3× Butter Naan (₹180)** to the customer's cart, read it back, and removed it —
no OTP, no session, no token. Checkout *is* protected (`validateCheckoutSession` requires
the caller's sessionId to equal the table's), so a stranger can't place the order — but
they can pad a cart the real customer then checks out without re-reading it.
Blast radius to close it: 6 consumer call sites + a freezed field regen; 6 matrix-actor
and 29 e2e-suite cart calls, 4 of which pass a sessionId today. Recommendation below.

---

# Addendum 3 — corrections and the fixes applied after them (2026-09-08)

## CORRECTION: consumer session persistence exists and works

The Addendum-2 claim "no persistence mechanism at all" was **wrong**, and so was the
grep behind it — it searched `lib/` for `shared_preferences` and `localStorage` and
missed the mechanism actually in use.

- [session_storage_service.dart](frontend/flutter_boilerplate/lib/session/services/session_storage_service.dart)
  writes the session state to **`window.sessionStorage`** (`dart:html`, with a
  non-web stub), with an expiry check on load and a `clearSession` on logout.
- [session_provider.dart](frontend/flutter_boilerplate/lib/session/session_provider.dart)
  loads it in its constructor and saves on every mutation
  (`updateFromTableValidation`, `authenticate`, `setSessionFromOtp`).

Verified live, not by reading: logged in on `tbl_meg_9` via OTP, hard-reloaded the
page, landed straight on the menu with no OTP prompt, added an item, reloaded again on
the cart page, and checked out — **ORD-00001, ₹204 after a ₹204 BOGO offer, order page
rendered**. The stored blob was `{"sessionId":"ulQ...","isAuthenticated":true,...}`.

What is actually true, and much smaller than the claim it replaces:
- `sessionStorage` is **tab-scoped**: it survives reload and in-tab navigation, and is
  dropped when the tab is closed. For a QR-scan web app that is arguably the right
  choice — the next diner on that table starts clean.
- The OTP path stores `restaurantId`, `tableId` and `sessionExpiresAt` as **null**,
  because `AuthPrompt`/`table_verification` synthesise a `TableValidationResponse` that
  carries only the sessionId. Consequences: the client-side expiry check can never fire
  (harmless — the backend enforces expiry), and the stored session is **not scoped to a
  table**, so the same tab scanning a different table's QR sent that sessionId to the
  new table. See the `validateTableAndLocation` fix below, which closes that.

`_checkSession()` was real but **dead**: `redirect` called it, it returned a hardcoded
`true`, so the redirect never fired and the `/login` route it pointed at does not exist
in the route table. Deleted the stub and the redirect block — 27 lines, no behaviour
change (verified: consumer test suite 139 pass / 39 fail identically before and after;
those 39 are pre-existing).

## Fixes applied

1. **`reserved` is now a real table status.** Product call, taken deliberately: a
   reserved table is *staff-held*. A physical reserved card sits on it, and if a walk-in
   scans the QR the waiter re-seats them — so the app should say exactly that rather
   than 500. Added `RESERVED: 'reserved'` to `TABLE_STATUS`
   ([table.js:20](backend/src-plattr/functions/table/table.js#L20)) and a guard in both
   `validateTableAndLocation` and `validateOTP`: **403 "This table is reserved. Please
   ask the staff to seat you."** The guard sits *after* the valid-session early return,
   so a party already seated keeps access if staff flip the table to reserved mid-meal.
   `server/tables_fetch.js` no longer coerces `reserved` → `vacant`, so the waiter app
   shows the true status (its `TableModel.status` is a plain String and `table_card.dart`
   already had an orange `reserved` case — no frontend change needed). Nothing changes
   for the waiter's Reserved / Vacant buttons: reserved → vacant is how a party gets
   seated, and that already worked.

2. **Session resume is caller-scoped.** `validateTableAndLocation` called
   `validateTableSession(restaurantId, tableId)`, which is *table*-scoped — it returned
   whatever session the table held, no matter what `sessionId` the caller sent. So any
   value (`"totally-bogus"`) handed back the live session id, which is the checkout
   credential. Now the resumed session must match the id the caller sent. Two new
   coverage-suite assertions pin both directions. This also fixes the stale-tab case
   above.

3. **`poopoo` log prefix removed** — 233 occurrences across 14 backend files plus the
   consumer `AppLogger`. Prefix only; every log line, level and message is unchanged.

4. **Table suite test 15 was asserting the bug.** It resumed a `table_clean_2` session
   against `table_clean_1` and called success. Pointed it at its own table; it now
   passes and is a real regression test for resume.

## Verification (all after the changes)

| Check | Result |
|---|---|
| jest unit | 104 / 104 |
| goal-line e2e | 79 / 79 |
| verifyGolden | 157 / 157 |
| matrix (full) | 655 / 660 — the 5 fails are the known "cart items carry no attribution" finding × 5 restaurants, unchanged |
| e2e coverage suite | 16 / 16 (includes the 4 new reserved + resume assertions) |
| e2e table suite | 18 pass, 2 fail — both the documented `checkTableStatus` INTERNAL gap; was 17/3 before |
| customer-journey / order-lifecycle / error-cases / feature-flags / server-journey | 21, 23, 26, 4, 8 — all pass |
| cross-app contracts | 43 models, 55 nodes, 0 violations |
| kitchen contract test | 3 / 3 |
| consumer flutter test | 139 / 39 — identical before and after |

## Left alone, on purpose

- **`customToken`** in the `validateOTP` response is dead weight (the consumer never
  calls `signInWithCustomToken`), but it is nullable in the Dart models and three
  consumer tests assert on it. Removing it is churn on an auth path for no user-visible
  gain. Its error message still contradicts its own condition; left as-is.
- **Table doc vs session doc** as two records of who is at a table, written in separate
  steps rather than one transaction. Real smell, not a launch blocker; if it bites, the
  fix is making the session doc the single source of occupancy.
- **Cart writes gated by the table, not the caller** (Addendum 2) — still open, still
  the one thing I'd close before go-live.

## Docs updated for the reserved decision (and the persistence correction)

| Doc | What changed |
|---|---|
| [PLATTR_PRO_PRD.md](PLATTR_PRO_PRD.md) | §10.1 reserved is now a defined staff-held state; §16 open decision moved to a new **16.1 Decided** with the rationale; §15 records the open cart-write gap |
| [table_session_customer_detailed_spec.md](backend/src-plattr/functions/table/table_session_customer_detailed_spec.md) | RESERVED added to the state diagram, the `TABLE_STATUS` block and the table schema line; scan-flow guard clauses now state the caller-scoped session match and the reserved 403 |
| [tableScanAndOtpValidation.md](backend/src-plattr/functions/table/tableScanAndOtpValidation.md) | New "Error Response - Table Reserved (403)" contract section next to the disabled one |
| [tables_home/README.md](frontend/src-platter-apps/apps/platter_server/lib/pages/tables_home/README.md) | What `reserved` means for the waiter: customer sees 403, set Vacant to seat, seated parties not evicted, not auto-vacated |
| [server_app_prd.md](frontend/src-platter-apps/apps/platter_server/lib/docs/server_app_prd.md) | One-line reserved definition pointing at PRD 16.1 |
| [customer-website-requirements.md](frontend/flutter_boilerplate/lib/docs_important/customer-website-requirements.md) | "Session persistence" marked BUILT with the sessionStorage mechanism and its tab-scoped rationale; `checkSession`/`refreshSession` struck through as never built, with what covers them instead |

Code comments at the decision points: `TABLE_STATUS.RESERVED` and both 403 guards in
`table/table.js` (including why the guard sits after the session check), the caller-scoped
resume line, the `VALID_STATUSES` pass-through in `server/tables_fetch.js`, and the
waiter's Reserved button in `table_detail_dialog.dart`.
