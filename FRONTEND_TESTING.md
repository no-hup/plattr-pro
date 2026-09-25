# Front-end testing with a browser agent — the standard for this repo

Companion to `CLAUDE.md`/`AGENTS.md`. Backend API testing lives in
`AGENT_TESTING_STARTUP_GUIDELINE.md` and `backend/src-plattr/functions/test/`. This file is
for the moment you must drive one of the four Flutter web apps like a user would.

Short on rules, long on judgement. Read §1–§2 before touching a browser; the rest is
reference. Add hard-won gotchas here, not in chat.

---

## 1. The three ideas that make this fast

**Test through the UI only what the UI owns.** The backend has 12 e2e suites, a golden
oracle and a 660-case matrix. If a bug is in pricing, offers, order state or auth, the API
shows it in seconds and the browser takes minutes. Use the browser for what only the browser
can show: does the screen render the right number, does the tap reach the right endpoint,
does the page survive a reload, does polling update, does the error toast appear. For
everything else call the endpoint (`backend/src-plattr/functions/test/e2e/lib/api.js` shows
the shape: POST `{"data":{...}}` to `http://127.0.0.1:5002/rms-app-dd875/us-central1/<fn>`).

**Set up state through the API, exercise it through the UI, prove it through the API.**
Seed a session instead of typing an OTP. Create the order by checkout call if the thing
under test is the kitchen screen. After a UI action, read the truth back from
`order-getOrder` / `server-getOrderDetails` / `server-getTables` rather than squinting at a
screenshot. A screen can lie (stale poll, wrong tab); the document cannot.

**Selectors, not screenshots.** Flutter on the web draws into one `<canvas>`. The only
addressable surface is Flutter's accessibility tree, which becomes real DOM once semantics
are on. Hot controls carry `Semantics(identifier:)`, rendered as the DOM attribute
`flt-semantics-identifier`, so a click is `[flt-semantics-identifier="cart-checkout"]`:
stable across re-renders, no ref renumbering, no vision model. Screenshots are for the
human, not for the agent's decisions.

## 2. Memory is the constraint, not the browser

This Mac has 16 GB. Every freeze in the week of 2026-09-02 was macOS running out of
compressed memory (`vm-compressor-space-shortage`), not the agent's browser misbehaving. The
tipping load is a Chromium sitting on a WebGL/WASM Flutter page, which does not compress.
Each rule below is a specific incident:

- **One browser, headless.** gstack `/browse` is the tool for this repo. Never `--headed`
  (it disables the 30-minute idle exit; the daemon then lives until its parent dies). Never
  the CDP Chrome on `:9222` (`custom-browser-agent`): a second real Chrome with no idle exit,
  no stop command, no Flutter affordances.
- **`ab preflight` before `ab open`.** It refuses if the emulator or the app port is down, or a
  headed daemon exists. It prints free memory and personal Chrome's size but never refuses on them:
  **memory is never a reason to stop a run** (Shaurya, 2026-09-25, after two runs sat blocked on it).
  Keep the other rules in this section; they are what keeps the machine up.
- **`ab stop` when the task ends.** A parked daemon on a Flutter page is what froze the
  machine. The 5-minute idle timeout is a backstop, not the plan.
- **`-d web-server`, never `-d chrome`.** `flutter run -d chrome` spawns a whole second
  Chrome per app just to host the page. `backend/flutter-app-logs/run_app.sh <app>` does it
  right; nothing appears on screen and that is correct.
- **`$B status` is not read-only**: it starts a daemon if none exists. Check with
  `pgrep -f ms-playwright` instead.
- **Keep transcripts light.** A long browser session inflates the VS Code extension host to
  ~3 GB. Prefer `ab snap` (`snapshot -i -d 6`) over full trees, save screenshots to a path
  rather than `--base64`, and start a fresh session for a new testing task.

## 3. Start the stack

```bash
# 1. emulator  (npm run emulators is the documented way; this is the working command)
cd backend/src-plattr
GOOGLE_APPLICATION_CREDENTIALS=$PWD/functions/secure_stuff/service-account.json \
FIREBASE_DEBUG_MODE=true FIREBASE_DEBUG_FEATURES='{"skipTokenVerification":true}' \
firebase emulators:start --config firebase.json --project rms-app-dd875 --only firestore,functions

# 2. seed MockData7  (rebuild first: offer validity dates are baked as ISO strings and rot)
cd functions
node mock/buildMockData7.js
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node mock/importMockData5.js \
  --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps

# 3. apps — one terminal each, no browser is spawned
backend/flutter-app-logs/run_app.sh consumer   # :5051
backend/flutter-app-logs/run_app.sh server     # :5050
backend/flutter-app-logs/run_app.sh kitchen    # :5052
backend/flutter-app-logs/run_app.sh admin      # :5053
```

Consumer prerequisite, once: `cd frontend/flutter_boilerplate && cp .env.example .env && dart run build_runner build`.
`run_consumer.sh` / `run_server.sh` still work; they delegate to `run_app.sh`.
Functions `:5002`, Firestore `:8080`, emulator UI `:4001`.

**Your own slot, with the till** (what a QA run uses; slot 1 shown, ports are `base + slot*100`):

```bash
cd backend/src-plattr && EMU_SLOT=1 ./emu.sh          # background; firestore :8180, functions :5102
cd functions && node mock/buildMockData7.js && FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 \
  node mock/importMockData5.js --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps
cd ../../../frontend/till && VITE_FUNCTIONS_URL=http://127.0.0.1:5102/rms-app-dd875/us-central1 \
  npx vite --port 5174 --strictPort --host 127.0.0.1
```

Without `VITE_FUNCTIONS_URL` the till talks to `:5002`, which is slot 0 — somebody else's data.

**The till's Playwright suite** runs on your slot in one command: `cd frontend/till && EMU_SLOT=1 npm run e2e:ui`.
It seeds MockData5 and MockData7 on top of the slot, starts its own Vite on `5173 + slot×100`, and refuses to run
without `EMU_SLOT`. Walks on real writers are in `e2e/walks.spec.ts` (states from `floorstate.mjs`); open findings
are `[known bug]` tests (TESTING.md).

## 4. The vocabulary: `scripts/ab.sh`

```bash
ab=scripts/ab.sh
$ab preflight consumer          # refuses, with the numbers, if the Mac can't afford it
$ab seed-consumer meg 1         # skip the OTP: land on Meghana table 1's menu, semantics on
$ab open server                 # or kitchen / admin / consumer [hash-route]; prints snapshot
$ab login server meg            # server@meg.test / 1234, waits for the first screen
$ab click cart-checkout         # stable selector — no snapshot, no refs
$ab fill  login-username server@meg.test   # clicks first (unfocused fill silently no-ops)
$ab snap 8                      # snapshot -i, depth 8
$ab ids                         # every identifier currently in the DOM — learn a screen in one call
$ab stop                        # ALWAYS
```

Anything `ab` doesn't cover is raw gstack: `B=~/.claude/skills/gstack/browse/dist/browse`
→ `$B url`, `$B console --errors`, `$B network`, `$B screenshot <path>`, `$B js '…'`,
`$B snapshot -D` (diff against the previous snapshot). Full reference:
`~/.claude/skills/gstack/browse/SKILL.md`.

### How the two hooks work

1. **`?agent=1`**: an inline script in each app's `web/index.html` clicks Flutter's
   `flt-semantics-placeholder`, the only switch that turns the accessibility tree on (the
   engine sets its flag in the placeholder handler and drops framework updates while it is
   off; there is no Dart API). Inert without the param. `ab open` adds it; if you `goto` by
   hand, add it yourself or click the placeholder via `$B js`.
2. **`Semantics(identifier:)`** on the hot controls → DOM attribute
   `flt-semantics-identifier` → `ab click <id>`. Changes nothing about layout, labels, or
   what a screen reader announces.

## 5. Test data: MockData7, and what is pre-made for you

Front-end testing standardises on **MockData7**. Backend e2e suites use MockData5; the ids
differ, do not mix them.

| slug | restaurantId | name | pre-made active session |
|---|---|---|---|
| meg | `res_meghana` | Meghana Foods | `ses_meg_active` on `tbl_meg_1` |
| pb | `res_pizzabakery` | The Pizza Bakery | `ses_pb_active` on `tbl_pb_1` |
| tr | `res_truffles` | Truffles | `ses_tr_active` on `tbl_tr_1` |
| salt | `res_salt` | SALT | `ses_salt_active` on `tbl_salt_1` |
| cw | `res_chowman` | Chowman | `ses_cw_active` on `tbl_cw_1` |

Tables `tbl_<slug>_<n>`: **1 active** (holds the live session), 2–3 pending, **4 reserved**
(scan and OTP return 403 "ask the staff", by design), **5 disabled**, 6+ vacant. Meghana has
12, the rest 10. Staff `server@<slug>.test`, `kitchen@<slug>.test`, `admin@<slug>.test`, `till@<slug>.test`, `manager@<slug>.test`,
password `1234`. Customers `9876543210` (Customer One), `9876543211`, `9876543212`.
Emulator OTP is always `123456`. `--refresh-timestamps` on import is what keeps
`ses_*_active` unexpired (+1 h).

`ab seed-consumer` writes that session into `sessionStorage['restaurant_session_state']`
and hash-navigates. It omits `sessionExpiresAt` (the loader skips the expiry check when the
field is absent) and sets `phoneNumber` to the session's `primaryUserId`, which is what
makes the backend resume it. Staff sessions are AES-encrypted in localStorage and
re-validated server-side on boot, so there is no equivalent shortcut: `ab login` types the
form.

Consumer routes (hash-routed): `#/r/<rid>/t/<tid>` scan → `/verify` → `/menu` → `/cart`
→ `/orders` → `/orders/<orderId>` (`frontend/flutter_boilerplate/lib/pages/app_routes.dart`).

## 6. Identifiers, and how to add one

Naming `<screen>-<action>[-<id>]`. `ab ids` shows what is live on the current page.

| App | Identifiers |
|---|---|
| consumer — verify | `verify-name`, `verify-phone`, `verify-otp`, `verify-submit` (same names on the verification page and the OTP dialog; never mounted together) |
| consumer — menu | `menu-add-<itemId>`, `menu-<itemId>-inc`, `menu-<itemId>-dec`, `menu-open-cart` |
| consumer — customize sheet | `sheet-add`, `sheet-inc`, `sheet-dec` |
| consumer — cart | `cart-checkout`, `cart-<cartItemId>-inc`, `cart-<cartItemId>-dec` |
| consumer — app bar (every page) | `nav-menu`, `nav-cart`, `nav-orders`, `nav-search`, `nav-offers` |
| staff login (all 4 apps) | `login-restaurant`, `login-username`, `login-password`, `login-submit` |
| server — tabs | `tab-orders`, `tab-tables`, `tab-menu` |
| server — tables | `table-<tableId>`, `table-status-{vacant,active,reserved,disabled}`, `table-refresh-otp`, `table-view-order`, `tables-refresh`\* |
| server — orders | `order-cart-<cartId>`, `order-mark-served`, `order-cancel`, `order-mark-paid`, `order-mark-paid-confirm`, `orders-refresh`\* |
| server — menu stock (D6) | `stock-addon-<addonId>` (the Add-ons section at the top of the Menu tab; tap it open first), `stock-addon-confirm` |
| kitchen | `kitchen-cart-<cartId>`, `kitchen-mark-ready`, `kitchen-refresh` (error-state retry only) |
| admin — menu (D6) | `menu-edit-<itemId>`; dish editor `dish-edit-addons`, `dish-edit-variants`, `dish-save`; add-ons `addon-price-<addonId>`, `addon-stock-<addonId>`, `addon-save-<addonId>`, `addons-done`; portions `variant-edit-<variantId>`, `variant-option-price-<optionId>`, `variant-save`, `variants-done`; the "on N dishes" question `shared-scope-all`, `shared-scope-only` |

Two conditional absences are load-bearing, not bugs in the table: **the selected
server tab has no identifier** (it renders `activeIcon`, which carries none), so
`ab ids` showing only `tab-tables`+`tab-menu` means you are on Orders; and
`table-status-active` is hidden when the table is already active.

\* `tables-refresh` / `orders-refresh` are wired but **unreachable today**: the
server app bar shows "Refresh Menu" on every tab — the Menu screen's app-bar
config wins regardless of which tab is selected. Real app bug, filed here, not
fixed (out of scope). Use `tab-tables` → re-read via the API instead.

Admin has the login identifiers only (not in the hot loop). When a flow has no identifier,
add one rather than text-matching: wrap the control in `Semantics(identifier: 'screen-action',
child: …)` or add `identifier:` to an existing `Semantics`, then add it to this table.
`frontend/flutter_boilerplate/test/pages/menuListing/add_button_semantics_test.dart` guards
the convention with `find.bySemanticsIdentifier`.

Fallback when there is none yet: `ab snap` lists interactive nodes as `@eN` with role and
name, `$B click @e5`. Names often sit on the enclosing group (`$B snapshot -s flt-semantics-host`
shows them); `snapshot -i -C` adds non-ARIA clickables. Refs renumber after any state change,
so re-snapshot before each click.

## 7. What counts as proof

A claim in a report rests on one of these, in order of preference:
1. **Backend read-back** after the UI action (the order document says `SERVED`).
2. **`$B snapshot -D`**: the diff between before and after the click. When the UI is one
   canvas this is the cleanest evidence a tap did something.
3. **`$B url`** confirming the tab and route. Tab targeting drifts and `console`/`network`
   are global across tabs; a click on the wrong tab looks exactly like a broken button and
   once nearly produced a false "Kitchen Mark Ready is broken" report.
4. A screenshot saved to a path, for the human.

Never report from memory of an earlier snapshot; never report a failure without
`$B console --errors` and the app log in `backend/flutter-app-logs/<app>.log`.

## 8. Gotchas

- **`$B wait '<flt-…>'` always times out.** Flutter's semantics elements are zero-opacity,
  so Playwright never calls them visible. Poll with `$B js` (what `ab` does internally).
- **`fill` on an unfocused Flutter textbox silently no-ops.** Click first (`ab fill` does).
- Some dialog buttons ignore `.click()`: dispatch `pointerdown`→`mousedown`→`pointerup`→`mouseup`→`click` at the element centre via `$B js`.
- `$B eval <file>` is unreliable about which page it targets; prefer `$B js`.
- **A Flutter text field's DOM `input.value` reads empty until the field is focused**, even when the app prefilled it (debug consumer OTP). Don't report "not prefilled" from `input.value`.
- **Under `-d web-server` the app log (`flutter-app-logs/<app>.log`) holds build output only**; runtime errors and assertions appear only in `$B console --errors`.
- A `web/index.html` edit needs no rebuild; **any Dart edit needs the app restarted**, a
  running `flutter run` serves the old bundle (`ab ids` empty on a rendered page is this).
- **`ab open consumer '#/r/…'` can drop the hash on a cold first load** and land on the dev home page ("QR: 10 …"). Set it with `$B js "location.hash='#/r/res_meghana/t/tbl_meg_7'"`, as `ab seed-consumer` does.
- **`ab stop` can print "Server crashed twice in a row — aborting" and leave a new daemon behind on `about:blank`.** After it, run `pgrep -fl 'ms-playwright|browse/src/server.ts'` and kill the `server.ts` pid that is yours.
- **A Flutter list's `flt-semantics-identifier` can go stale** when a poll or a tab switch reorders the cards: `order-cart-<id>` then sits on another table's card, or on two cards. Reload the page before clicking by a card id, and confirm which card was hit from the emulator log (waiter run, 2026-09-25).
- **A Flutter snackbar is gone in about 4 s.** Screenshot within a second of the tap before calling a refusal "silent"; a 5 s screenshot missed "No active session for this table" once (guest run, 2026-09-25).
- **`$B goto` or `location.hash` to another table does not reload the app, and an open OTP dialog survives it** (then submits against the new table). To switch tables: `sessionStorage.clear()`, set the hash, `$B reload`, then click the semantics placeholder again.
- **Two agents, one emulator:** whoever runs `--clean` wipes the other's sessions, and it
  looks like a session bug. One live runner at a time.

## 9. When it breaks

| Symptom | Cause → fix |
|---|---|
| "app never booted (no semantics placeholder)" | `?agent=1` missing, or the app is still compiling |
| `ab ids` empty but the page renders | app running pre-edit Dart → restart `run_app.sh` |
| 403 on table scan | table is `reserved` (`_4`) or `disabled` (`_5`) → use `_1.._3` |
| session expired / bounced to verify | re-import with `--refresh-timestamps` |
| staff login loops back to login | stored session re-validated on boot; emulator restarted → log in again |
| totals inflated on a repeat run | re-import `--clean`; repeat checkouts on one session group into one multi-cart order |
| offers pick the wrong discount | `node mock/buildMockData7.js` first; baked validity dates rot |
| everything slow, fans on | close Chrome and idle VS Code windows, `ab stop`, then `ab preflight` for the numbers (there is no `$B memory` subcommand — use `ps -o rss= -p $(pgrep -f ms-playwright \| tr '\\n' ,)`) |

## 10. Measured (2026-09-08, 16 GB M-series, emulator + 3 apps up, headless)

| step | |
|---|---|
| `ab seed-consumer meg 1` (incl. cold daemon start) | 4.7 s |
| `ab click menu-add-mi_veg_bir` | 369 ms |
| `ab click sheet-add` | 223 ms |
| `ab click menu-open-cart` | 87 ms |
| `ab click cart-checkout` | 66 ms |

Before the hooks the same flow needed a placeholder click, a fresh `snapshot -i` before
every click, and text-matching to recover the ref each time: roughly four times the tool
calls, every one a flake surface. The headless Chromium tree cost 0.58 GB while running.

## 11. The full order lifecycle (run this, not just the happy click)

The realistic dine-in flow, all through `ab` against MockData7 `tbl_meg_1`. It is
the only test that catches the wiring gaps in §12 — a single-cart checkout passes
while the real thing is broken.

```
guests scan  →  round 1 (starters)  →  checkout        cart 0 PENDING, order IN_PROGRESS
kitchen                              →  Mark Ready     cart 0 READY
server        long-press the card    →  Mark Served    cart 0 SERVED
guests        round 2 (mains) same session → checkout  cart 1 PENDING, SAME order, 2 carts
kitchen                              →  Mark Ready     cart 1 READY
server        long-press             →  Mark Served    cart 1 SERVED
server        table → View → Mark Paid → confirm       order COMPLETED, table → vacant
```

Read back from Firestore after every step; the screen can lie, the document
cannot. `Authorization: Bearer owner` against
`http://127.0.0.1:8080/v1/projects/rms-app-dd875/databases/(default)/documents/restaurants/<rid>/orders`.

Two mechanics the identifiers do not give you:

- **Mark Served is a long-press**, not a click. `ab` has no verb for it; dispatch
  `pointerdown`+`mousedown` at the card centre, wait ~600 ms, then
  `pointerup`+`mouseup`. It works headlessly — verified twice.
- **Customizable items open a sheet.** `ab click menu-add-<itemId>` on e.g.
  `mi_gongura_mutton` opens the customization sheet instead of adding; follow it
  with `ab click sheet-add`. Check `ab ids` for `sheet-add` before assuming the
  item went in. Non-customizable items (`mi_veg_bir`, `mi_gulab`) add directly.

Measured 2026-09-08: whole lifecycle, seven UI actions across three apps,
~90 s wall clock including three app logins.

## 12. Found by the lifecycle run — not fixed here

Both are **production blockers** and neither shows up in a single-cart test.

1. **A fully-served, unpaid order disappears from the server app.**
   `backend/src-plattr/functions/orders/getActiveOrdersForRestaurant.js:153`
   filters `SERVED`/`CANCELLED`/`RETURNED` carts out of every order it returns.
   Once the last cart is served the order comes back with `carts: []`, so
   `allCartCards` is empty and *every* Orders sub-tab (My Orders, Ready, Pending,
   All Orders) renders nothing. The Served tab uses a different endpoint and did
   not show it either. There is then no route to the order detail, so **Mark Paid
   is unreachable and the table can never be closed**.

2. **Nothing writes `table.activeOrderId` at checkout**, which kills the fallback
   route. `activeOrderId` is only *read* (`table/table.js:904,1079`) and only
   *written* by the mock builders (`mock/lib/seedKit.js:143`). Without it the
   table dialog never renders its "View" button, so the server cannot reach the
   bill from the Tables tab either. Seeding the field by hand makes `table-view-order`
   appear and the rest of the chain — order detail → `order-mark-paid` →
   `order-mark-paid-confirm` → `order-updateOrderStatus` 200 → order `COMPLETED`,
   table `active`→`vacant` — works correctly. So the closure logic is sound; only
   the reachability is broken.

Smaller, same run:

- Server app bar shows **"Refresh Menu" on every tab** (the Menu screen's app-bar
  config wins regardless of selection), so `tables-refresh` / `orders-refresh` are
  unreachable.
- Order detail renders **`Created: 1970-01-01T05:30:00.000`** — the Firestore
  timestamp is not parsed on the way into the detail model.
- Consumer throws **`setState() called during build` for `MenuState`** on a cold
  load (debug assertion; the app still renders, but it delays first paint enough
  that a fixed-iteration wait gives up — this is why `ab`'s poll is time-budgeted).
