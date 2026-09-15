# ST · Staff PIN & approvals

Status: **final v1** (2026-09-15). Golden module: its shape is the template for every other module.

**Job.** Decide who may do a risky thing at the till, ask for a PIN when the server says so, and leave one audit row with a name on it.

## Who can do what

Roles are the existing ones in `adminApp/auth.js`: ADMIN, MANAGER, SERVER, KITCHEN. "Cashier" is a seat: the till is logged in as a MANAGER or ADMIN account. "Owner" is ADMIN.

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) |
|---|---|---|---|
| Manual discount under the limit | – | ✓ | ✓ |
| Manual discount over the limit | – | PIN | PIN |
| Remove an auto offer from a line | – | PIN | PIN |
| Void a line already sent to kitchen | – | PIN | PIN |
| Void a line not yet sent | ✓ | ✓ | ✓ |
| Reprint a bill | – | ✓ (audit P1) | ✓ (audit P1) |
| Open drawer with no sale | – | PIN | PIN |
| Change the limits | – | – | ✓ (config doc) |

## Scenarios

| ID | Scene and what happens | Tag |
|---|---|---|
| ST-S1 | **Under the limit.** Pitcher ₹1,250, cashier gives ₹100 off, reason "regular". Limit is 10%. Applied at once. Audit row severity P1. | Engine |
| ST-S2 | **Over the limit.** Same pitcher, ₹251 off to match a ₹999 placard. Server answers "PIN needed". Till shows the PIN box. Cashier enters their own PIN. Server checks it, applies, writes audit row P0 with reason "placard". | Engine |
| ST-S3 | **Wrong PIN.** Cashier mistypes at 21:40. Server says wrong, till asks again. From the fifth wrong inside ten minutes the next attempt is refused until a cooling-off that doubles each time, capped at two minutes. Owner gets a P0 audit row. The account is never locked: the same manager can still void the next table's ₹450 biryani. | Engine |
| ST-S4 | **Captain tries.** Waiter's app sends a discount. Server refuses with 403. Waiter walks to the till. | Engine |
| ST-S5 | **Void after kitchen.** Cashier voids a ₹450 biryani already cooking. PIN, reason "guest left". Audit P0. Kitchen screen shows the line struck out. Stock is not returned. | Engine |
| ST-S6 | **No reason.** Cashier leaves reason blank. Server refuses. Reason is picked from a list, with an optional note. | Engine |
| ST-S7 | **Audit write fails.** Firestore write of the audit row errors. The discount is not applied. The cashier sees "try again". | Engine |
| ST-S8 | **Monday report.** Owner opens Discounts. Sees per cashier: count of P1, count of P0, rupees, top reasons. Three "placard" P0s by one cashier every Friday stands out. | Report |
| ST-S9 | **PIN never leaves the request.** PIN travels once in the request body, is compared against the stored hash, and appears in no log, no audit row, no client storage. | Engine |
| ST-S10 | **Limit change.** Owner sets the limit to 5%. Next request uses 5%. No deploy, no restart. | Config |
| ST-S11 | **Happy hour and a favour.** Paneer tikka ₹320 with a 20% happy-hour offer already on the line (₹64 off). At 19:30 the cashier adds ₹40 off, reason "regular". Both cuts come off the ₹320 menu price: the guest pays ₹216. The PIN gate reads 40/320 = 12.5%, over the 10% limit, so a PIN is asked. | Engine |
| ST-S12 | **Second thoughts.** Cashier gives ₹100 off a ₹1,250 pitcher, then changes it to ₹251. The line ends up ₹251 off, not ₹351. Two audit rows name both acts. Monday's rupee column reads ₹251. | Engine |
| ST-S13 | **Too generous.** Cashier tries ₹400 off a ₹320 paneer tikka that already has ₹64 of offer on it. Server refuses: a line can never go below zero. | Engine |

**Without this:** anyone can give anything away, and there is no name on it.

## Rules

- R1 The server decides whether a PIN is needed. The client only shows the box.
- R2 Under the limit: applied at once, audit P1. Over the limit, void after kitchen, no-sale drawer: PIN, audit P0.
- R3 The PIN checked is the acting account's own PIN, the same hash used at login (`servers/{id}.password`).
- R4 No audit row, no action. The audit write and the change are one transaction.
- R5 Every audit row: `ts, cid, action, staffId, sev, amount, pct, reason, note, lineId, before, after`. Never the PIN.
- R6 Reasons come from a list on the config doc; a free note may be added.
- R7 A wrong-PIN streak slows the next attempt; it never locks the account. The staff doc carries `pinRetryAfter`; a PIN arriving before that instant is refused without being checked. Counter and instant live server-side. A closed till on a Friday costs more than a guessed PIN.
- R8 A SERVER role account cannot discount, void a sent line, reprint, or open the drawer. 403, not a PIN box.
- R9 Money on a line is `listPrice − offer − discount`, all three rupee amounts in paise, all cuts of the GST-inclusive menu price. A line holds at most one manual discount: a new one replaces the old value, it never adds to it. The percent the PIN gate compares is `discount / listPrice`. The result may not fall below zero.
- R10 The audit answers who and why; the line answers how much. Any rupee total in a report sums `discount` on the line docs, never `amount` across audit rows — replacement rows would count the same giveaway twice.

## Config keys (on `restaurants/{id}/config/settings`, field `approvals`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `approvals.discountPinAbovePercent` | 10 | ST-S1, S2 |
| `approvals.voidAfterKitchenNeedsPin` | true | ST-S5 |
| `approvals.pinSlowAfterWrong` | 5 | ST-S3 |
| `approvals.pinSlowWindowMinutes` | 10 | ST-S3 |
| `approvals.pinSlowMaxSeconds` | 120 | ST-S3 |
| `approvals.reasons` | placard, regular, complaint, birthday, guest left, staff meal, other | ST-S6 |

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← PO Pricing | discount amount and percent for the line | no amount, no decision; refuse |
| ← CF Config | the keys above, read once per request | defaults apply; log a warning |
| → BL Billing | the approved discount as a line snapshot with `source: {reason, approverId}` | approval fails, nothing reaches billing |
| → RP Reports | audit rows, grouped by staff and severity | report shows "audit unavailable", never zeros |
| → LG Logs | one JSON line per decision with `cid`, `action`, `sev`, `needsPin`, `outcome` | never blocks the action |

## The challenge, end to end

1. Till calls `approvals-apply` with `{action, cid, lineId, amount, reason, note}`.
2. Server: role check → config → `needsPin()` → if needed and no `pin` in body, throw `permission-denied` with `{requires: 'pin', action, sev}`.
3. Till's one interceptor sees `requires`, shows the PIN box, resends the same body plus `pin`.
4. Server verifies, applies change + audit row in one transaction, returns the new line.
Same shape for `requires: 'otp'` or `'password'` later. Nothing per screen.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-15 | No cashier role. Till logs in as MANAGER or ADMIN | Reuse existing roles; a seat is not a role |
| 2026-09-15 | Over-limit PIN is the acting account's own PIN, not a second person's | Shaurya's call; one till, one person. Upgrade path: `approvals.requireDifferentApprover` key, no schema change |
| 2026-09-15 | All approvals happen at the till. Captain devices cannot request remote approval | One audit path, one screen to get right. Revisit after go-live |
| 2026-09-15 | Severity is two-valued: P1 under limit, P0 over / void / drawer | Enough for the weekly report; more levels add nothing |
| 2026-09-15 | Flutter apps do not get the challenge interceptor now (TD-003) | No Flutter screen needs a PIN before the till ships |
| 2026-09-15 | PIN is checked on the server, never in the browser | Donor pass. Odoo `pos_hr/models/hr_employee.py:57-66` ships SHA1-hashed PINs to the client and compares there; a 4-digit space against a captured hash is minutes. We send once, compare server-side, lock out |
| 2026-09-15 | Two-tier void stands: unsent line is free, sent line is PIN + reason | Donor pass. SambaPOS `Ticket.cs:490` cancels only unlocked orders; locked ones take the void path |
| 2026-09-15 | Kitchen shows a struck line by diffing against what it was last told | Donor pass. Odoo `pos_restaurant/models/pos_session.py:19-35`. ST-S5 needs that marker; OR owns it |
| 2026-09-15 | A void after the invoice is printed is a credit note, owned by BL, not a void | Donor pass. Odoo `pos_order.py:1453` and Dolibarr credit notes never edit a finalised document |
| 2026-09-15 | Cancelled and discounted bills get their own report, not a filter on sales | Donor pass. URY ships `report/cancelled_invoices/`; ST-S8 already says so |
| 2026-09-15 | Skeleton merge (Opus, blind). Accepted: ₹125.01 boundary, NaN/negative amounts, whitespace reason, empty reasons list fails closed, 10-minute window boundary at exactly 10:00, per-staff lock, staff doc missing, role from staff doc never body, non-string PIN, hash-string-as-PIN, line-write failure rolls back audit, partial and malformed config, void of voided line, till cancel and two-call cases | Each is a real production input with a hand-computable value |
| 2026-09-15 | Rejected: backwards-clock lock test | Fake clock in tests; no fallback for a state the platform clock should make impossible |
| 2026-09-15 | Rejected: idempotency key on the request | Discount, void and removeOffer set state, they do not add, so a replay lands the same line. Drawer and reprint replays make a second P1/P0 row, which is the honest record |
| 2026-09-15 | Rejected: "discount on a settled bill" | No bill exists until BL ships; BL adds that precondition in its own sheet |
| 2026-09-15 | Rejected: "logger throws, action still applies" | Console logging does not throw; nothing to test |
| 2026-09-15 | ~~Locked account rows~~ superseded by R7 the same evening: no lock at all, a slowdown. Code follows R7 | The sheet is authoritative; the lock rows above are history |
| 2026-09-15 | Concurrent discounts on one line both apply, serially, two audit rows | Firestore transaction serialises them; "second one fails" would need a client version and adds nothing the audit trail lacks |
| 2026-09-15 | Assumption: one till per outlet. That is why serial apply with no client version is fine | Whoever adds a second till re-reads the row above first |
| 2026-09-15 | Adapter is one file, `adapters/firestore/approvals.ts`, not `staff.ts` + `audit.ts` as the Files block said | Module-shape rule: one name in every layer. Staff lookup reuses `adminApp/auth.js validateStaffSession`, the existing auth door |
| 2026-09-15 | Staging line doc is TD-008 | Peer review: a staging structure without a debt row becomes permanent by accident |
| 2026-09-15 | R7 implementation: staff doc fields `pinWrongAt: number[]`, `pinRetryAfter: number|null`; the P0 row for the owner is `action: 'pinStreak'`, written once per streak on the 5th wrong, in the same transaction as the counter | Additive fields on `servers/{id}` as the sheet says; one row per streak keeps ST-S8 honest |
| 2026-09-15 | R9 implementation: the till sends `amount` in rupees as typed (₹251, ₹0.30); the server rounds to paise once; line and audit `amount` are paise | Cashiers type rupees; money is stored as integers |
| 2026-09-15 | Amount larger than the list price is `failed-precondition` (line below zero), not `invalid-argument` | ST-S13 says the line rule refuses it; one rule, one place (`applyToLine`) |
| 2026-09-15 | The e2e suite deletes its own lines, audit rows and staff before seeding | It must rerun without a data reset; leftover audit ids would trip ST-S7's real path |
| 2026-09-15 | ~~`approvals.pinLockWindowMinutes`~~ became `approvals.pinSlowWindowMinutes` with R7 | Same number, new name |
| 2026-09-15 | v1 line target is `restaurants/{id}/lines/{lineId}` (`listPrice, sent, v, discount?, void?, offer?, countsTowardTotal`), seeded by tests until BL/PO write real lines. Wiring into the existing `orders[].carts[].items` is a schema change and waits for Shaurya (ST-Q2) | PO and BL do not exist yet; the module needs a line with a list price to decide, and a place to put the snapshot |
| 2026-09-15 | ST-S5 "kitchen screen shows the line struck out" is deferred with ST-Q2 | The kitchen app reads the old order schema |
| 2026-09-15 | Fan-out merge (Grok, Gemini; Codex out of quota). Accepted: integer-paise gate instead of float percent compare, limit 0 means always PIN, empty pin = missing not wrong, lock not extended by wrongs while locked, wrong-PIN counter persisted outside the business transaction, pin on an under-limit action ignored and never counted, `api` strips `pin` before any log, log outcome enum, till closes the box on `locked` (no loop) | Money, auth and concurrency inputs with hand-computable values |
| 2026-09-15 | Rejected (Grok): audit row on an ADMIN config-limit change | Editing the config doc from a screen is out of scope; the audit of config writes belongs to the CF Config sheet, noted there as a must-have |
| 2026-09-15 | Rejected (Gemini): cache the config in memory with a TTL | ST-S10 says the next request uses the new limit; one Firestore read per risky action is the cost of that, not per till tap |
| 2026-09-15 | Rejected (Gemini): consecutive-gap counter instead of a 10-minute window | The sheet says five wrong in ten minutes; a pruned timestamp array is three lines and matches it literally |
| 2026-09-15 | Rejected (Gemini): void of a voided line returns 200 | Two of three reviewers and the sheet's "nothing is deleted" rule favour failed-precondition; a silent 200 hides a double tap |
| 2026-09-15 | Noted (Gemini): rupee cap alongside percent is a money risk on large tables | PO-Q1 is Shaurya's; percent ships in v1 as written. Offline lockout of PIN actions belongs to OF |
| 2026-09-15 | Donor review, 2026-09-15: `moonshot/reviews/2026-09-15-donor-ST.md` | Blind pass over Odoo, URY, Dolibarr, SambaPOS |
| 2026-09-15 | Accept (donor MISSING 1): reprint writes an audit row, sev P1, `lineId` null, `amount` = bill total when known | Odoo counts prints on the order; without a row the second-copy trick leaves no number in ST-S8. Test: app "reprint → audit P1" |
| 2026-09-15 | Accept (donor MISSING 2): staff is resolved from `restaurants/{restaurantId}/sessions/{sessionId}` → `servers/{id}` of the same restaurant; a session from another outlet is `unauthenticated`, never a PIN box | URY refuses cross-outlet cancels before mutating. Test: app "session from another restaurant → unauthenticated" |
| 2026-09-15 | Push back (donor MISSING 3): reversing kitchen docket on void | Kitchen marker is OR's (row above); printing a `CNCL-` KOT is the printing sheet's. ST writes `void` on the line; those modules read it |
| 2026-09-15 | Accept as scope (donor MISSING 4): reducing the quantity of a sent line is a void of that quantity and must go through `approvals-apply`; the till has no line editing yet, so no test until OR ships it | Dolibarr and Odoo make qty and price separate rights; a 2 → 1 on a sent biryani is a ₹450 void wearing another name |
| 2026-09-15 | Donor DIFFERENT "approver is never the cashier": unchanged, already Shaurya's must-decide in Review before sign-off | Odoo makes over-limit a thing a cashier account cannot do |
| 2026-09-15 | ST-Q1 closed: ADMIN is asked for a PIN over the limit, as the v1 default said | One tap, and the owner's own giveaways are the ones nobody else reviews |
| 2026-09-15 | PO-Q1 closed: percent only. A rupee cap is a later config key | Shaurya's call. Two limits to reason about before a single bill exists buys nothing |
| 2026-09-15 | ST-Q2 closed: `restaurants/{id}/lines/{lineId}`, a document per line. Not `orders[].carts[].items` | No longer a backward-compatibility call — no Flutter app is live. It is a concurrency call. A nested array element cannot be written without rewriting the whole order doc, so R4's one transaction would serialise two cashiers discounting two *different* lines of the same table. Per-line docs also give ST-S8 a query. Migrating the existing order schema to lines is OR/BL's job, not smuggled in here |
| 2026-09-15 | R9 added: one discount slot per line, replace not add, every cut an amount in paise off the GST-inclusive `listPrice`, result never below zero | Grok donor pass: Odoo stores a percent on `pos_order_line.discount` and a second tap overwrites it (`pos_order_line.js:218-226`); Dolibarr the same on `remise_percent` (`invoice.php:1276-1307`). We store the amount instead because CLAUDE.md's snapshot rule already says a line carries its own money, and amounts make the offer-plus-discount case one subtraction rather than Odoo's two-object multiply. ST-S11 and ST-S13 are the tests |
| 2026-09-15 | Deliberate divergence from donors: offer and manual discount are both cuts of `listPrice` (additive), not manual-on-top-of-offer (multiplicative) | Odoo's global discount is a separate negative line computed on an already-discounted base, so 10% + 10% is 19% off (`pos_store.js:86-108`). Ours is 20% off. Additive is the one a cashier can check against the menu, and with amounts there is nothing to compound. Named here so nobody "fixes" it later |
| 2026-09-15 | R10 added: report rupees come from the line docs, never `SUM(amount)` over audit rows | Grok found the bug: ST-S12's ₹100-then-₹251 writes two rows; summing them reports ₹351 of giveaway against a line that gave away ₹251. Counts stay honest, rupees do not |
| 2026-09-15 | Clarifies the earlier concurrency row: "both apply, serially, two audit rows" is about the race, R9's replace is about the field. One surviving `discount`, two rows | The two read as contradictory; they are not. Stated so the next reader does not re-litigate it |
| 2026-09-15 | Wrong-PIN streak slows the next attempt instead of locking the account for fifteen minutes (R7, ST-S3, config keys renamed) | The lock killed exactly the actions a manager is needed for, at the hottest hour, with no way back in — and no donor throttles at all, so there was no precedent either way. A growing refusal window stops a guesser grinding 10,000 combinations and expires on its own, so no unlock endpoint. Stored as `pinRetryAfter` and compared, never slept on: a Cloud Function sleeping is billed wall-clock |
| 2026-09-15 | Rejected: an ADMIN endpoint to clear a PIN lock | Nothing to clear once the backoff expires by itself. One fewer endpoint, one fewer permission |
| 2026-09-15 | Rejected: PCI-DSS as a reason for any of this | PCI-DSS v4.0.1 8.3.4 carves out "user accounts on point-of-sale terminals that have access to only one card number at a time … such as IDs used by cashiers". Our operator PIN is further out still. Whatever we do here is an operational choice, not a compliance one |
| 2026-09-15 | No hard ceiling on a PIN-approved discount in v1 (TD-004) | Shaurya's call, delegated and taken: a PIN holder can still zero a bill. Rare, and the trail names them. One config key when the log-auditing agent lands |
| 2026-09-15 | Future scope, documented not built: an agent reads the audit rows and flags patterns (one cashier's "placard" P0s every Friday, discounts clustering just under the limit) | Shaurya's. ST-S8 gives a human the same numbers today; the agent is what makes own-PIN approval safe enough to keep |
| 2026-09-15 | Arch review 1, item 2 (ST-S5 race): the write transaction re-reads the line and decides again on the fresh `sent`; a line that went to the kitchen between the two reads now answers `requires: pin` instead of voiding for free. Test: app "arch-2" with a fake adapter that flips `sent` between reads | `reviews/2026-09-15-arch.md`. The first read was outside the transaction, so the decision could be stale |
| 2026-09-15 | Arch review 1, item 4: non-line audit ids carry a random suffix, `${cid}_${action}_${ts}_${rand}` | Two drawer opens in one millisecond collided on `createAudit`. Test: app "arch-4", two rows |
| 2026-09-15 | Arch review 1, item 5: the till answers at most 10 challenges per call, then "Too many PIN attempts, start again". R7 never locks, so nothing server-side ended the loop | Playwright "arch-5" with a routed server that always asks |
| 2026-09-15 | Arch review 1, item 3: the staging line doc is TD-008; TD-004 stays the no-ceiling row | Two rows shared one id |
| 2026-09-15 | Arch review 1, item 1 (gate on `net` instead of `listPrice`) **not taken, waiting on Shaurya**: R9 and ST-S11 say `discount / listPrice` in so many words, and a domain test asserts it. Gating on `listPrice − offer` keeps every scenario's outcome (S11: 40/256 = 15.6 %, still a PIN) and closes the ₹1,000-with-₹900-offer hole the reviewer found. Recommendation: take it | A sheet rule is Shaurya's to change, not a reviewer's or mine |

## Out of scope

Remote approval from a captain's phone · biometric · shift-level discount budgets · editing the reasons list from a screen (owner edits the config doc) · approvals for menu edits (already ADMIN-only) · voids after the invoice is printed (credit note, BL).

## Open questions (owner: Shaurya)

All three closed on 2026-09-15; see Decisions. ST-Q1 asked, PO-Q1 percent, ST-Q2 `lines/{lineId}`.

- ST-Q3 Is a friends-and-family comp a fireable offence here? The answer sets how hard ST-S8 has to be read on a Monday, and whether the no-ceiling call (TD-004) stays comfortable.

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| Offer and manual discount are both cuts of the menu price, so 20% + 10% is 30% off, not 28% | **must decide** | Real money on every happy-hour ticket, and it is where we knowingly differ from Odoo. ST-S11 is the test; changing it later changes bills |
| No ceiling on a PIN-approved discount: a manager can take a bill to zero (TD-004) | **must decide** | You delegated this and I took the simple road. The trail names them, nothing stops them |
| Over-limit PIN is the cashier's own, not a second person's | settled 2026-09-15 | Your call: caught in the trail, and a log-auditing agent is future scope |
| Captain devices cannot request approval remotely | **must decide** | Changes how the floor works on a busy night |
| Wrong PINs slow the next attempt instead of locking the account | fine to skip | Cheaper on a Friday, same defence against guessing |

## Files
Donors for this concern: `DONORS.md` → Approvals, and → Void. Read after building, per the contract.


```
backend/src-plattr/functions/
  domain/approvals.ts            needsPin(action, pct, config) → {needsPin, sev}. Pure. Table-driven test.
  app/approvals.ts               apply(): role → config → needsPin → verifyPin → transaction(change + audit)
  adapters/firestore/staff.ts    getStaff, verifyPin (hash compare), wrong-PIN counter
  adapters/firestore/audit.ts    appendAudit (inside the caller's transaction)
  api/approvals.ts               onCall wrapper: parse body, call app, map errors. Exported as approvals-apply
frontend/till/src/
  api/client.ts                  one fetch wrapper; the `requires` interceptor lives here
  features/approvals/PinPrompt.tsx
  features/approvals/useApproval.ts
tests: domain/approvals.test.ts · test/e2e/suites/approvals.js · frontend/till/e2e/approvals.spec.ts
```
