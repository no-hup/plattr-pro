# QA grid: kitchen app, 2026-09-25

Prep for a driver exploring the kitchen app screen by screen ([AGENT_QA.md](../../AGENT_QA.md) §5–§7). Written
read-only, before the run. Every "expected" cites a spec row, a decision, or the code that decides it. The kitchen
spec is [SPEC_KT](../SPEC_KT_print_path.md) (paper and screen: R8 "the screen is the state … it carries status,
timers and voids live"). Also [CLAUDE.md](../../CLAUDE.md) (waiter-confirmation gate), backend transitions in
[cart/updateCartStatus.js](../../backend/src-plattr/functions/cart/updateCartStatus.js) and
[utils/statusUtils.js](../../backend/src-plattr/functions/utils/statusUtils.js), and [TESTING.md](../../TESTING.md).
Format follows the [waiter grid](2026-09-25-grid-waiter-app.md). The run's verdicts are in the
[report](2026-09-25-qa-kitchen-app.md#coverage-grid).

**File keys** (app = [platter_kitchen/lib/](../../frontend/src-platter-apps/apps/platter_kitchen/lib/), backend = [functions/](../../backend/src-plattr/functions/)):

| key | file | key | file |
|---|---|---|---|
| NAV | [main_navigation.dart](../../frontend/src-platter-apps/apps/platter_kitchen/lib/main_navigation.dart) | GAK | [orders/getActiveCartsForKitchen.js](../../backend/src-plattr/functions/orders/getActiveCartsForKitchen.js) |
| LP | [state/kitchen_live_provider.dart](../../frontend/src-platter-apps/apps/platter_kitchen/lib/state/kitchen_live_provider.dart) | UCS | [cart/updateCartStatus.js](../../backend/src-plattr/functions/cart/updateCartStatus.js) |
| KR | [core/kitchen_repository.dart](../../frontend/src-platter-apps/apps/platter_kitchen/lib/core/kitchen_repository.dart) | SMI | [orders/serverMarkItemServed.js](../../backend/src-plattr/functions/orders/serverMarkItemServed.js) |
| LO | [pages/live/live_orders_screen.dart](../../frontend/src-platter-apps/apps/platter_kitchen/lib/pages/live/live_orders_screen.dart) | APV | [app/approvals.ts](../../backend/src-plattr/functions/app/approvals.ts) |
| AC | [widgets/active_cart_card.dart](../../frontend/src-platter-apps/apps/platter_kitchen/lib/widgets/active_cart_card.dart) | ATC | [cart/addItemToCart.js](../../backend/src-plattr/functions/cart/addItemToCart.js) |
| CD | [widgets/cart_detail_dialog.dart](../../frontend/src-platter-apps/apps/platter_kitchen/lib/widgets/cart_detail_dialog.dart) | FS | [qa/floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs) |
| AB | [widgets/kitchen_app_bar_widget.dart](../../frontend/src-platter-apps/apps/platter_kitchen/lib/widgets/kitchen_app_bar_widget.dart) | PT | [print/print_toggle.dart](../../frontend/src-platter-apps/apps/platter_kitchen/lib/print/print_toggle.dart) |

**Run 2026-09-25:** 42 cells (+1 added, K24b): 8 FAIL, 5 NOTE, 25 PASS, 1 NOTBUILT, 3 not run. Every state marked
**new** in §2 now exists in `floorstate.mjs`.

## 0. Read this before starting

- **Slot 0 only.** The kitchen app calls `http://localhost:5002` (the shared `AppConfig`, like the waiter app). Seed
  with `FS` against Firestore `:8080` / functions `:5002`. App: `run_app.sh kitchen` → `:5052`.
- **How the screen refreshes.** One read, `order-getActiveCartsForKitchen`, every **30 s** (KR api_constants:18,
  LP:64). Pull-to-refresh exists (LO:113); there is no refresh button except `kitchen-refresh` on the error state.
  After Mark Ready the app re-reads at once (LO:53). A card up to 30 s old is the normal stale screen.
- **One card per live round.** The backend drops AWAITING_CONFIRMATION, SERVED, CANCELLED and RETURNED carts, and
  CANCELLED/RETURNED/SERVED items inside a cart (GAK:211-230). READY rounds stay until a captain serves them.
- **What the card shows** (AC): the table label (`order.tableId`, raw: TD-046), the age badge (red after 20 min), up to
  4 items as `n x name` + one line of variants/add-ons, "+ n more items", `#<orderNumber>` (always #0: TD-086), a status
  chip PENDING / COOKING / READY. **Item notes are never read**: KR:269 sets `itemNote: null` although the read carries
  `item.note` (TD-048's closure froze the note on the line for paper; the screen was left out).
- **One mutation**: Mark Ready, whole round (CD). No "start cooking" (PREPARING), no per-dish ready, no reject, no void.
- **Controls without ids**: logout icon, category dropdown, bottom tabs Live/History, the dialog's close X. Use `ab snap`.

## 1. Controls

| id | what | file:line |
|---|---|---|
| `login-restaurant`, `login-username`, `login-password`, `login-submit` | staff login (platter_core form) | [platter_login_form.dart](../../frontend/src-platter-apps/modules/platter_core/lib/src/ui/auth/platter_login_form.dart) |
| `kitchen-cart-<orderId>_<cartIndex>` | one card per live round; tap opens the detail | LO:133-143 |
| `kitchen-mark-ready` | detail dialog: Mark Ready (PENDING/COOKING only), else disabled "Already Ready" | CD:178-190 |
| (no id) close X | closes the dialog (disabled while submitting) | CD:107 |
| `kitchen-refresh` | Retry, only on the error state with no cards | LO:91 |
| `kitchen-print-toggle` | "This tablet prints"; starts the print agent (the service part is Android only, PT:55) | PT:103 |
| (no id) category dropdown All / kitchen / bar | sets `selectedCategory`; **nothing reads it** (LO:33-37) | AB:102, NAV:134 |
| (no id) logout icon → No / Yes | `SessionManager.logout` | AB:93, NAV:101 |
| (no id) bottom tabs Live / History | History is a "coming soon" placeholder | NAV:195 |
| (no id) Reconnect | session-expired view → logout | LO:199 |

## 2. States, in product words

| # | state | seed (`node floorstate.mjs <n> <state>`) |
|---|---|---|
| S1 | round PENDING, guest's QR | `ordered` |
| S2 | round sent by the captain, with a note "no onion" | **new** `note` |
| S3 | round AWAITING_CONFIRMATION (gate on) | `awaiting` (then `gate off`) |
| S4 | the same round after a waiter confirmed it | **new** `confirmed` |
| S5 | PREPARING | `preparing` |
| S6 | READY | `ready` |
| S7 | SERVED | `served` |
| S8 | round CANCELLED (manager) | `cartcancelled` |
| S9 | order CANCELLED | `ordercancelled` |
| S10 | order COMPLETED (Mark Paid) with the round unserved | `completed` |
| S11 | paid and cleared at the till with the round still PENDING | `clearedlive` |
| S12 | two rounds, different dishes | **new** `tworounds` |
| S13 | same dish in two rounds (PENDING + READY) | `samedish` |
| S14 | quantity 3 | **new** `qty3` |
| S15 | variant + add-on + note (Chicken Biryani Family + Extra Raita, "less spicy") | **new** `variant` |
| S16 | six dishes in one round | **new** `biground` |
| S17 | one dish voided by the manager with a PIN (the ST door) | **new** `linevoid` |
| S18 | merged 7+8, a guest on 8's QR orders | **new** `mergedchild` |
| S19 | parcel ticket P1 / P2 | `ordered` on `P1` |
| S20 | guest session expired, round still live | `expired` |
| S21 | kitchen staff session expired | `staffexpired`-style patch of the kitchen@ session |
| S22 | every dish of a READY round ticked served one by one by the captain | inline: `ready` + `server-markItemServed` per dish |

## 3. The grid

"Refused" means refused with a reason that names the round or table, and nothing changed. **Bold** = expected to fail.

### A. A ticket the kitchen never sees

| # | control | state | expected | source |
|---|---|---|---|---|
| K01 | Live list | S1 | a card for the table: 1 x Butter Naan, PENDING, within one poll | KT-S1 (screen half), R8; spine R3/R4 |
| K02 | Live list | S2 | a card, the captain's dish | KT-S1 |
| K03 | Live list | S3 | **no card** | KT-S4, R5; CLAUDE.md gate |
| K04 | Live list | S4 | card appears on the next poll | KT-S4 |
| K05 | Live list | S19 P1 | a card, and the cook can tell it's a parcel | KT-S1 (`TABLE 7` → the ticket label); OR parcels | 
| K06 | Live list | S18 | a card for the group | TD-080 (known: "7" only) |
| K07 | Live list | S12 | two cards, round 2 lists only the Gulab Jamun | KT-S2 |
| K08 | Live list | S13 | two cards: one PENDING, one READY | KT-S2 |
| K09 | Live list | S20 | the card stays | R8 |
| K10 | `kitchen-print-toggle` on the web | S1 | nothing is claimed: a browser never prints (R12). If the web agent claims, the job must not be lost | R4, R12, R13 |
| K11 | time from checkout to card | S1 | ≤ 30 s (the poll). Record | LP:64 |

### B. A ticket that never goes away (or goes too early)

| # | control | state | expected | source |
|---|---|---|---|---|
| K12 | card → `kitchen-mark-ready` | S1 | cart READY (+ items), one `statusHistory` entry; card turns READY at once | UCS; spine step 2 |
| K13 | Live list | S7 | card gone | GAK:211 |
| K14 | Live list | S8 | card gone on the next poll | GAK:211 |
| K15 | Live list | S22 | **card gone** once every dish is served | SMI never moves the cart; GAK keeps a READY cart with 0 items |
| K16 | Live list | S11 | known QW-7 / TD-082: check only whether it's worse | TD-082 |
| K17 | Live list | S9, S10 | known QW-1 / QW-4 (card vanishes): check only whether worse | TD-089, TD-092 |
| K18 | card | S5 | chip COOKING, Mark Ready enabled | CD:42 |

### C. Wrong table or label

| # | control | state | expected | source |
|---|---|---|---|---|
| K19 | card label at 430 px | S19 P1 next to table 1/12 | the cook can tell P1 from table 1 | TD-046/088 known; parcel is the new part |
| K20 | detail header | S1 | "Table 6" | TD-046 known ("Table tbl_meg_6") |

### D. Wrong quantity or wrong dish

| # | control | state | expected | source |
|---|---|---|---|---|
| K21 | card + dialog | S14 | "3x Chicken 65" / "x3" | KT-S1 |
| K22 | card + dialog | same dish added twice in one round | one line "2x" | ATC identical-item merge |
| K23 | card + dialog | S15 | "Family (serves 3), + Extra Raita" readable, **and "less spicy"** | KT-S13 (screen half), R8 |
| K24 | card + dialog | S2 | **"no onion" shown** | TD-048 closure; KT-S13; R8 |
| K25 | card + dialog | S16 | card "+ 2 more items", dialog lists all 6 | AC:159 |
| K26 | card | S17 | **the voided naan struck through or gone** | KT-S11/S12 "Without this the kitchen serves food for a table that left"; R8 "voids live" |

### E. Mark Ready: repeat, stale, two people

| # | control | state | expected | source |
|---|---|---|---|---|
| K27 | `kitchen-mark-ready` | S6 | disabled "Already Ready" | CD:42 |
| K28 | double-tap Mark Ready | S1 | one history entry | AGENT_QA §5 repeat; CD:47 |
| K29 | Mark Ready, stale | card PENDING, manager cancelled the round | refused, and the screen says it was **cancelled** | UCS:131 (CANCELLED has no way out) |
| K30 | Mark Ready, stale | another kitchen login marked it READY | harmless or "already ready" | UCS |
| K31 | Mark Ready, stale | order cancelled by a captain | record (QW-1 domain) | — |
| K32 | Mark Ready | S11 | record (QW-7 domain) | — |

### F. Session, login, shell

| # | control | state | expected | source |
|---|---|---|---|---|
| K33 | login wrong password | — | refused in red | LF |
| K34 | login as `server@meg.test` | — | refused at login, or a clear "not a kitchen account" | GAK:182 forbids SERVER |
| K35 | any poll | S21 | "Session expired. Reconnect", polling stops, Reconnect → login | LP:113, TD-051 |
| K36 | reload | logged in | still logged in, same cards | main.dart tryRestoreSession |
| K37 | logout → Yes | — | login screen, polling stops | NAV:101 |
| K38 | category "bar" | S1 + S14 | only bar dishes, or the control is absent. **It filters nothing** | LO:33-37 |
| K39 | History tab | — | NOT BUILT ("coming soon") | history_screen |
| K40 | Live list | nothing live | "No Active Tickets" | LO:106 |
| K41 | 430 × 900 | S15, S16 | nothing clipped | AC column in a fixed 0.8 aspect cell |
| K42 | order of cards | several | oldest first (FIFO) | LP:156 |

## 4. Misuses, for a cook

| misuse | cells |
|---|---|
| repeat | K28 |
| stale screen (≤30 s) | K29–K31 |
| two people at once | K30 (two kitchen tablets) |
| after the till / captain acted | K13, K14, K16, K17, K32 |
| session expired | K35 |
| wrong app | K34 |

## 5. Do not report

TD-046 (raw table id), TD-086 (#0), TD-088 (header overflow), TD-082/QW-7, TD-089 (QW-1), TD-092 (QW-4),
TD-094 (QW-6), TD-052, TD-080 (group says "7"), TD-051 (12 h session), TD-003 (no PIN in Flutter). No PREPARING
control and kitchen acts recorded as `userId: system` (run 3). Debug-build seeded-login cards. Report a known one
only if it's worse than its row.
