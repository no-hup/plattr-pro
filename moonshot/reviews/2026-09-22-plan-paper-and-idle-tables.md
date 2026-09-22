# Plan — paper, staff orders, and the table nobody frees

2026-09-22. One task, four items from the pickup list, planned together because they share one order of
work. Read against `moonshot/CLAUDE.md`, `STATE.md`, `TECH_DEBT.md`, `SPEC_KT_print_path.md` v3,
`SPEC_OR_till_order_entry.md`, `SPEC_FL_floor_and_moves.md`, the 2026-09-17 donor and Gemini reviews of KT,
and the code each item touches. Every claim below that names a file was traced, not remembered. One blind
Grok round is folded in (last section says what was taken and what was refused).

**Bottom line.** Three of the four are real work; the fourth is already done. The order is
**Add-dishes → TD-044 on its own scheduled function → KT sheet v4 (with the hardware spike in parallel) →
KT code → the room.** KT is the only one that needs the full moonshot treatment (sheet, skeleton, donor
merge, phases). TD-044 needs one scenario, one rule and one config key added to FL's sheet, not a sheet of
its own. Add-dishes needs no sheet: its scenarios are OR's and already have IDs. **Two small scheduled
functions, not one shared "housekeeping" door**: idle tables every 5 minutes under FL, stale print jobs every
minute under KT. Different cadence, separate failure domain, and the contract says one caller means inline it.

---

## What changed since the pickup list was written (read before anything)

- **TD-042 is closed** (2026-09-21). `tileWord` gained `holding`; the refusal and the tile read one
  input. Five tests in `domain/floor.test.ts`, one in `app/floor.test.ts`. **Nothing to do.** The
  till's `floor.spec.ts` has no `holding` case — one line to add while walking Add-dishes, not a task.
- **KT phase 1 is mostly done already.** `categoryId` and `taxSource` freeze onto the placed line
  (`domain/line.ts:23,35`, `orders/lineSnapshots.js:41,67`) since TD-038 on 2026-09-20. What is left of
  KT phase 1 is `route()` and one test, so it folds into phase KT-1 below.
- **The KT donor review and the Gemini fan-out have run** (`reviews/2026-09-17-donor-KT.md`, 41 KB;
  `reviews/2026-09-17-fanout-KT-gemini.md`). The sheet's status line "not yet run" is stale. What is
  owed is the **merge** — one Decisions line per item — not a re-run. The manager pass on the 18th
  already took two of them (drop the live status query; put a TTL on jobs) and they are not yet in the
  sheet.
- **D3 (2026-09-20)** says: keep the sheet plus one donor review; drop fan-out and blind Opus for
  modules smaller than BL. KT is BL-sized (22 scenarios, ~13 rules, ~25 config keys), so it gets one
  blind pass — this Grok consult on the plan, and a second on the test skeleton — and no more.
- **The idle clock is wrong at the source.** `cleanupInactiveSessions` (`table/table.js:630-723`)
  judges idleness by `table.lastActivity`, and that field is written by scan (`table.js:413,474`),
  staff OTP (`server/table_otp.js:82`) and `openTable` (`openTable.js:49`) — **never by a cart write,
  a checkout, or a re-open** (`openTable.js:40` moves `expiresAt` only). A table that ordered three
  rounds over two hours reads "idle since the scan". It also ends the session with no money check, which
  is the exact thing FL's R14 forbids. So TD-044 is not "schedule the existing function"; it is "write the
  rule correctly in `app/floor.ts`, then schedule it".

---

## Item A — finish the Add-dishes screen (OR-S1 · S19 · S22)

**Moonshot docs needed: no sheet.** The scenarios are OR's and already have IDs; the decision to ship
this screen instead of OR is in `STATE.md` (2026-09-20). One `STATE.md` line at the end.

What exists: `table/openTable.js` (6 unit tests, mocked Firestore), the Flutter screen
`platter_server/lib/pages/tables_home/add_dishes_screen.dart` (318 lines), `dish_search.dart` (5 Dart
tests). What is missing: any test that hits the emulator, and any proof the screen reaches the endpoints.

**A1 — e2e `test/e2e/suites/order-entry.js`** on its own slot with its own fixtures (`table_or_*`,
`manager@or.test`, `server@or.test`, seeded over Firestore REST the way `suites/floor.js` does it).
One assertion block per scenario, hand-computed:
- OR-S1: a SERVER opens a vacant table → `created: true`, `addedBy: 'staff:<id>'`, table `active`,
  session `openedBy` stamped; then `cart-addItemToCart` ×2 and `cart-checkoutCart` on the **table**
  session → one order, `orderNumber` present, both line snapshots carry `placedBy` = the staff tag,
  `sent: true`.
- OR-S22: open the same table again → `created: false`, same `sessionId`, `expiresAt` moved forward,
  nothing minted (session count unchanged).
- OR-S19: a second round on the same sitting → the **same** order gains a second cart, not a second
  order (`order-getActiveCartsForKitchen` shows both rounds under one `orderNumber`).
- Refusals: disabled table → `failed-precondition`; a merged child → opens the parent's sitting;
  `covers: 0` and `covers: 100` → `invalid-argument`; a CUSTOMER session as `sessionId` → refused.
- The kitchen read sees the round; the floor read (`floor-get`) shows the table's `onTable` equal
  to the hand-computed net of the two lines.
This is a **characterization suite** for an endpoint that already works — there is no honest red for it,
and pointing it at a wrong `addedBy` would only prove the assertion string can fail. The proof Add-dishes
has never had is the screen, and that is A2.

**A2 — the browser walk.** The screen has **zero** `Semantics(identifier:)` (the server app has 17
elsewhere), so an agent cannot drive it today. Add six: `add-dishes-covers`, `add-dishes-search`,
`add-dishes-dish-<id>`, `add-dishes-variant-<id>`, `add-dishes-send`, `add-dishes-round-count`.
Then, per `FRONTEND_TESTING.md`: `ab preflight` → `scripts/dev-up.sh` (already brings up the emulator,
MockData7 and the server app on :5050) → log in as `server@meg.test` → open table → Add dishes → type
`biry` → tap → Send → **prove it through the API**, not the screenshot: `order-getActiveCartsForKitchen`
lists the round, `restaurants/res_meghana/lines/*` carry `placedBy: 'staff:…'`. Result pasted.
Browser rules stand: one headless daemon, `ab stop` after, never `:9222`, ask before starting it.

**Out of scope, written here so it is not spoken:** `SESSION_MS` in `openTable.js:14` is the same
four-hour literal as `sessionService.js:81`; OR-6 signed it as `ordering.sessionHours` and it is not
built. It touches `validateTableSession`, which the guest app shares, so it is a TD row
(`DEBT(TD-045)` at both sites), not a rider on this item. Sales ranking and typo tolerance stay skipped.

**Done when:** suite green on a slot, walk pasted, `make check` green, one STATE line. Half a session.

---

## Item C — TD-044, the table nobody frees

**Moonshot docs needed: an addendum to `SPEC_FL_floor_and_moves.md`**, because "when a table frees"
belongs to FL (D1, 2026-09-20: the floor module is the one owner). One scenario, one rule, one config
key, Decisions lines. No new sheet.

- **FL-S36 — the party that walked out.** 21:10 a couple scans table 4, signs in, orders nothing, and
  leaves. 22:10 nobody has touched table 4 for an hour and it owes nothing. The system ends the sitting,
  writes one audit row (`autoVacate`, who: `system`, why: `idle 60m, no open money`) and the tile reads
  free. The phone still open on that session gets "session ended" on its next call, not a crash. A table
  that owes ₹1,840 and has been idle two hours is **not** freed: one log line per sweep, the tile keeps its
  money, and day close is where a person meets it (it already refuses on an unpaid bill and on unbilled
  lines, `domain/dayClose.ts:175,180`). **Without this the table refuses every merge and move until a
  human notices, and there is nothing on the tile to say why.**

  What the rule does, sitting by sitting:

  | Sitting, idle past the threshold | Outcome |
  |---|---|
  | Scanned or opened, no order, no cart | freed |
  | Cart has items, nothing sent | not idle — the cart write is on the clock |
  | Food sent, no bill | not freed (unbilled money) |
  | Bill issued, unpaid | not freed |
  | Paid in full, nobody tapped clear | **must decide** — freeing is the P1 fix; the risk is seating the next party on lingering guests. Lazy default: freed |
  | A read fails or a timestamp is missing | skipped, logged, never freed |

- **R21 — idle is measured off everything the sitting did.** The clock is the newest of: session
  `createdAt` and `updatedAt` (a re-open moves it, `openTable.js:40`), the newest cart `lastUpdated`
  (`cart/addItemToCart.js:219`), the newest line's `placedAt`, the newest bill's `issuedAt`, the newest
  payment (read via the bill's `sessionId`, payments carry none), and `table.lastActivity` as one more
  input — never the only one. Derived, not a rollup: a field written by every event is the bug we have
  now with more writers. Candidates first: only sessions `active` with `createdAt` older than the
  threshold are read further, so a busy floor costs a handful of reads per sweep.
- **Config:** `floor.idleFreeAfterMinutes`, default 60 (the literal in `table.js:642` today).
- **Decisions:** (1) the release goes through `isReleasable` — open money outranks idleness, same as
  it outranks a captain's COMPLETED; (2) the old `cleanupInactiveSessions` body is deleted, the
  emulator-only `onCall` stays as the manual trigger for e2e **with its guard, and a unit test that the
  guard throws outside the emulator**; (3) the `pending` branch of its query is deleted outright —
  nothing writes `pending` since the 21st and the seed is re-run.

**C1 — the schedule.** `api/floor.ts` exports `releaseIdleTables = onSchedule({ schedule: 'every 5
minutes', maxInstances: 1, retryCount: 0 }, …)` from `firebase-functions/v2/scheduler` (package 6.6.0;
`index.js` already uses v2's `setGlobalOptions`). Five minutes, not one: the threshold is an hour and the
reads are the bill. Per restaurant in its own `try`, so one bad restaurant never aborts the others (the one
line of the old loop worth keeping). One log line per restaurant per sweep with counts, so a quiet sweep is
distinguishable from one that did not run. The emulator registers the schedule as a pubsub topic and
never fires it (firebase-tools `functionsEmulator.js:715-724`), so the same use-case sits behind
`table-cleanupInactiveSessions` for tests. Composite index `(status, createdAt)` on `sessions` in
`firestore.indexes.json`, same commit. Unit: `app/floor.test.ts` on fake ports and a fake clock. e2e:
`suites/housekeeping.js` seeds every row of the table above, calls the trigger, asserts each outcome.

**C2 — `app/floor.ts releaseIdle(ports, now, cfg)`** using `isReleasable`, `linesOfSessions`,
`billsOfSessions` the adapter already has, plus two new port reads (carts by session; payments via bill).
Release is conditional on the session still being `active` inside the transaction, so an overlapping run
or a retry is a no-op. It writes the audit row and calls `table/vacateTable.js` — which already ends the
sessions, unmerges children and clears the table document; the old cleanup's extra `sessionToken: null`
has no reader anywhere, so nothing is lost by not writing it. Rotates nothing (the OTP rules of the 21st).

**Cost:** Cloud Scheduler bills per job, three free per billing account, then $0.10 per job-month — two
jobs (this and KT-4) are free. The real bill is Firestore reads, hence candidates-first and 5 minutes.

**Done when:** FL-S36 named in `domain`/`app` tests, red first, e2e green, the old body gone,
`STATE.md` and `TECH_DEBT.md` (TD-044 closed) updated. One session.

---

## Item B — KT · print path

**Moonshot docs needed: yes, the full treatment.** The sheet exists at v3 and is the best-written
document in the folder, but it was rewritten around KT-D1 (a bridge box) and then patched for KT-D1c (the
kitchen tablet) without the patch reaching the file layout, the config defaults, the rules or the phase
plan. **Building against v3 as it stands would build a `bridge/` folder for a box we decided not to
ship.** So phase 0 is sheet v4, and it is the first KT commit.

### KT-0 — sheet v4 (one commit, no code) — and the spike, same week

What moves, each a line in Decisions with the date:

1. **File layout.** `bridge/` leaves the layout (kept as an appendix: "implementation #2, same
   protocol"). The agent is `platter_kitchen/lib/print/print_agent.dart` (the loop) and
   `printer_link.dart` (the one socket door, R12). The encoder moves server-side as KT-D1c already
   says — `adapters/printers/escpos.ts`, the vendor boundary the sheet's own diagram wanted.
2. **`print.agents` is a list of kinds** (`kitchen`, `bridge`, `till`), default `['kitchen']`. The
   install id is a different field: the agent sends `{ kind, agentId }`, kind is the allow-list, `agentId`
   becomes `claimedBy`. The id is generated once and excluded from Android auto-backup, so a restored
   tablet is a new agent and two tablets never share a lease.
3. **Claim returns bytes; the job stores none.** `print-claim` renders the ticket from the frozen lines
   *at that moment* and returns `{ jobId, ticketNo, bytes }` (base64, repeated `copies` times server-side).
   A reprint is a fresh claim with a fresh header rendered from the lines **as they are now** — after a
   quantity cut the kitchen sees the current quantity (KT-S5's "the same ticket" becomes "the same round").
   Nothing rendered is persisted.
4. **Job ids carry their kind.** `kot:${cartId}:${stationId}`, `cancel:${cartId}:${stationId}:${v}`,
   `reprint:${cartId}:${stationId}:${n}`, `bill:${billId}`, `credit:${creditNoteId}`,
   `duplicate:${billId}:${n}`, `drawer:${paymentId}`. One id space for every kind made a cancel overwrite
   the printed KOT.
5. **Claim, ack and fail are idempotent and holder-checked.** The same `claimedBy` re-claiming inside its
   lease gets the bytes again (the response was lost; renders are deterministic). A different agent is
   refused. Ack of an already-printed job by its holder is a no-op success. `print-fail` from a non-holder
   is refused. A `claimed` job whose `claimedUntil` has passed counts as waiting in `print-pending`,
   `print-status` and the sweep — the asleep tablet is the failure being detected, so the tablet cannot be
   the detector.
6. **Status query off by default and not built in v1.** `print.stations.<id>.statusQuery` stays as a key,
   default **false**; the `DLE EOT` read is not written until KT-7 puts a printer that answers on the
   bench. "No answer" is never an automatic reprint. R7: a job is acknowledged when the socket accepted
   every byte and closed cleanly inside `print.writeTimeoutMs`. KT-S8 (paper out) splits: query off → the
   chef sees half a ticket, the cashier taps Reprint (v1); query on → the red line is true (deferred).
   **Must decide.**
7. **Stale tickets are skipped, never expired.** No `expired` state: `queued → claimed → printed |
   dropped`. The agent does not auto-claim a `kot` or `cancel` whose `queuedAt` (the moment it became
   claimable — a held round's clock starts at the waiter's confirm) is older than `print.staleAfterMinutes`
   (30). The status line says `3 not auto-printed`; Reprint sets a one-shot `force` so the next claim skips
   the age check once. Bills ignore the age (a guest is waiting). KT-D4 becomes "never *silently* zero".
   **Must decide.**
8. **Drawer is immediate or dropped.** A `drawer` job older than `print.drawerStaleSeconds` (60) is
   dropped by the pending read, never kicked late onto an empty counter. `print.drawerPulseMs` default
   becomes **50** so `t1 = 25 = 0x19`, the pulse the old magic number gave (25 ms made it weaker).
9. **The stale-queue sweep is KT's own `every 1 minutes` schedule** in `api/print.ts` (KT-4), not a
   shared door: any waiting job older than `print.unclaimedAfterSeconds` (90) → one log line with `cid`,
   `jobId`, `stationId`, age — the same fact `print-status` returns to the till's red line.
10. **KT-D6 under D1c: the offline estimate is screen-only, never queued.** When the till is back the
    cashier issues the real bill (KT-S6). KOTs from the guest and captain apps keep printing during a
    till-only outage, because the kitchen tablet has its own uplink — that is KT-S9's real split (till on
    4G, printer side on shop internet). What D1c removed is till-originated paper while the till cannot
    reach the server, which was already true of bills. **Must decide.**
11. **Every print callable is a staff call.** `validateStaffSession` on `print-pending/-claim/-ack/-fail/
    -reprint/-status`; the kitchen app is already logged in. An install id is not a credential. Authz row:
    Reprint of a KOT needs no PIN and writes S16's audit row with who.
12. **Merge the donor review and Gemini's pass**, one line each. Accepted: encoder maps every code point
    above 0x7F to `?`, tested with `क` (U+0915) asserting the emitted byte is `0x3F` and not the low byte
    `0x15` (NAK); `1B 40` before `1B 74 n`, asserted in order (init resets the code page); the cancel ticket
    back-links the original number (donor #2); "a line the kitchen has seen is voided, never deleted"
    (donor #3, how `voidCartLines` works — `applyToLine` replaces the doc, never deletes); per-shift ticket
    number is `${orderNumber}-${cartIndex}` already (donor #6). Pushed back: Z-report is DC's; course firing
    out of scope; a LAN fallback from till to tablet is the addressable-LAN design R13 rejects.
13. **A `print` config block on the config doc** with the defaults above, served to the till on
    `approvals-config` and to the kitchen app on a filtered **`print-config`** — not `approvals-config`,
    which would hand the tablet the PIN policy. Two callers justify the door.
14. **Scenario rewrites in the same commit**: KT-S7, S8, S9, S20, S23, so the skeleton does not freeze v3's
    promises. S20 says a Dart fake socket cannot prove a real printer's buffered prefix; the room does.
15. **The hardware spike runs now, in parallel, on the real tablet**: one throwaway Dart script. Foreground
    service type that survives a six-hour dinner (`specialUse`, not `dataSync` — Kotlin, so it is an
    "ask before adding" item); screen-off Doze for 30 minutes with the poll still landing; a write larger
    than the printer's buffer (>4 KB) arriving whole; AP client isolation and VLAN both checked with
    `nc -vz <printer> 9100`; `targetSdkVersion` recorded. Android 16's local-network rule is opt-in and
    enforcement is Android 17 / target SDK 37; a denial looks like a connect timeout. A "do not bump
    targetSdk without `ACCESS_LOCAL_NETWORK`" note, not a go-live blocker. Lease length and the ack rule
    are not frozen until the spike is back; KT-1 and KT-2 do not wait for it.
16. **Review before sign-off**: rows 6, 7, 10 must decide; 3, 4, 5 must decide as a set (the job model);
    9 fine to skip.

### KT-1 — the ticket, pure (`domain/kot.ts`, `domain/receipt.ts`)

Skeleton first: one `it()` per scenario with the **expected string** written by hand at 48 and at 32
characters, body `todo`. Then one blind pass on the skeleton (Grok, per D3), merge, then implement one
at a time. `route(line, cfg)`: category → `print.route`, else `taxBlockId` → `print.routeByTaxBlock`,
else `print.defaultStation`, never nowhere (KT-S19); a line with **no `categoryId` at all throws** — the
field is frozen on every placed line, so a missing one is a writer bug, not a case (fail closed). Tickets:
KT-S1, S2, S3 (parts `1/2`), S5 (`REPRINT 2` header), S11 (cancel with back-link), S12 (quantity cut), S13
(variant/add-on/note rows, four-space hang, no truncation), S14 (liquor block, `Invoice-cum-Bill of Supply`
because BL said so), S15 (credit note), S16 (`DUPLICATE`), S18 (32 chars), S21 (`Rs. 1,02,450.00`
right-aligned, Indian grouping). No I/O. R10 enforced structurally: `receipt.ts` takes `bill.lines[]`,
`bill.blocks[]`, `seller` and sums nothing — a test plants a wrong `payable` on the bill and asserts the
paper prints the wrong number, because the paper must not correct BL.

### KT-2 — the encoder (`adapters/printers/escpos.ts`)

`Ticket → Uint8Array`. Hand-written byte arrays: `1B 40` head, `1D 56 42 00` tail, `1B 61 01` centred,
`1D 21 11` double, `1B 70 00 t1 t2` drawer with `t1` from config, `1B 74 n` code page **after** init.
Every char > 0x7F → `?`, asserted at the byte. No dependency, ~70 lines. Tests: KT-S13, S17, S21.

### KT-3 — the queue (`adapters/firestore/print.ts`, `app/print.ts`, `api/print.ts`)

Endpoints `print-pending`, `print-claim`, `print-ack`, `print-fail`, `print-status`, `print-reprint`, all
staff-session calls. Ids and states as KT-0 rows 4–7, lease arithmetic on `ports.now()`. Hooks into
flat-dir code, each with a **characterization test pinned first** (BL phase 4's method): one call beside
`writeLineSnapshots` in `createOrUpdateOrder.js:232` — `adapters/firestore/print.ts enqueue(transaction,
jobs)` **inside the caller's transaction**, same shape as `writeLineSnapshots`; a failed job write fails
the round, because R1 means "never waits on a socket", not "best-effort write". `held` behind the waiter
gate; `markLinesSent` releases held jobs and stamps `queuedAt` (R5); `voidCartLines` queues a cancel job at
the stations the original went to (KT-S11, S12); `billing-issue` queues a `bill` job for
`print.counterStation` (KT-S6); credit note (KT-S15); ST's `reprint` action → a `duplicate` job + the P1
audit row it already writes (KT-S16). App tests with fake ports and a fake clock: KT-S4, S7, S10, S20, "a
second claim inside the lease **by a different agent** is refused", "the holder re-claiming gets the bytes
again", "ack twice is one success", "fail from a non-holder is refused", "an expired lease is claimable
again exactly once", "a job past `staleAfterMinutes` is skipped by pending and claimable with `force`". e2e
`suites/print.js` on its own slot with its own table: place a two-station round, read pending, claim as
`kitchen`, **two overlapping claims** (parallel calls, exactly one wins), ack, cancel → cancel job at the
same station only. Proven red by planting a wrong job id.

### KT-4 — the stale-queue sweep

`api/print.ts` exports `sweepPrintJobs = onSchedule({ schedule: 'every 1 minutes', maxInstances: 1 }, …)`
calling `app/print.ts sweep(ports, now, cfg)` (row 9). One unit test on the fake clock, one e2e assertion
in `suites/print.js` via an emulator-guarded manual trigger, same pattern as C1.

### KT-5 — the agent (Flutter kitchen app) and the till's status line

`lib/print/print_agent.dart`: every `print.pollSeconds`, `print-pending` → `print-claim` → decode
base64 → `printer_link.write(host, port, bytes)` → `print-ack`, else `print-fail(reason)` and back off
`print.retryDelayMs` × `print.retryCount`, then leave it queued. **One job in flight per station**; a
station that wedges does not stop the other. `printer_link.dart` is the one file with `dart:io Socket` in
it: `Socket.connect(host, port, timeout: connectTimeoutMs)`, `add(bytes)`, `await flush()`, `await
close()`, the whole thing under `print.writeTimeoutMs` (10 000) — `flush` completes when Dart has handed
the bytes off, not when the head has printed, so a printer that accepts and never reads must `print-fail`,
not hang the isolate. Well under `claimLeaseSeconds` (60). Agent identity per KT-0 row 2. A settings toggle
"This tablet prints" (off by default; the room turns it on; the status line says "no print agent", not
"printer not answering", while it is off). Foreground service per the spike. Dart tests with a fake socket
factory: connect refused → `fail` with reason and the job stays queued; write throws mid-ticket → no ack
(KT-S20's half); happy path → ack with the byte count.

Till: `features/print/PrintStatus.tsx` reading `print-status` on the existing poll: `BAR printer not
answering — 1 ticket waiting`, `No print agent has claimed a job since 20:28 — 6 waiting`, `3 not
auto-printed`, with Retry (`force`) and Reprint. Playwright spec with the server's answers seeded: KT-S7,
S23, plus the stale case.

### KT-6 — the counter

Drawer kick: a `drawer` job after a cash `payments-take` and after ST's no-sale open (KT-S17), immediate or
dropped (row 8). The offline estimate stays on screen (row 10), `window.print()` deleted; OF-S7 re-run
green. (The till's offline sync replays estimate audit rows only, never `payments-take`, so a sync can
never mint a stale drawer job — `frontend/till/src/features/offline/sync.ts`.)

### KT-7 — the room

Not a commit. The tablet, two printers, a roll. The sheet's seven hardware questions, minus `DLE EOT`
(deferred, row 6), minus what the spike already answered. The one thing only the room proves: KT-S20's
buffered prefix on a real printer.

**Done when:** every KT-S id is a test name, `make check` green, e2e `print` green on a slot, Playwright
`print.spec.ts` green, the Dart tests green, donor merge in Decisions, TD rows filed (TD-032 stays
deferred; a new row for "tablet asleep = no paper" if the room says so), `STATE.md` updated. **Four to
five sessions**, KT-0 through KT-3 being the bulk.

---

## Order, and why

1. **A** — half a session, unblocks nothing, but it is the only way staff punch an order and it has
   never been proven end to end. Cheap certainty first.
2. **C** — one session. Deletes a wrong job. Closes a P1.
3. **KT-0 + the spike** — sheet v4 is half a session of writing and three must-decide rows plus the job
   model for Shaurya. The domain (KT-1) does not wait on them, so its skeleton can start the same day.
4. **KT-1 → KT-2 → KT-3 → KT-4 → KT-5 → KT-6**, one commit each, domain to screens.
5. **KT-7** when there is a tablet and a printer on a table.

Not in this plan, on purpose: OR (deferred 2026-09-20), `order.priceInfo` (D2 revised: waits for OR),
RP, CF, UQ, `ordering.sessionHours` (TD row, above).

---

## Review before sign-off (Shaurya reads this section only)

| Row | Call | Must decide / fine to skip |
|---|---|---|
| C | A table idle for `floor.idleFreeAfterMinutes` with **no open money** is freed by the system with an audit row; one with money is left, and day close is where a person meets it | **must decide** — new product behaviour, not only R14 |
| C | A **paid** table nobody cleared is freed by the clock too | **must decide** — lazy default: yes |
| KT-0 · 6 | Status query kept as a key, default off, not built in v1; paper-out is a manual Reprint until a printer that answers is on the bench | **must decide** |
| KT-0 · 7 | Stale tickets are skipped, not expired: no auto-print past 30 minutes, one tap with `force` prints it | **must decide** — amends KT-D4 |
| KT-0 · 10 | The offline estimate is screen-only; the real bill prints when the till is back; KOTs keep printing | **must decide** — amends KT-D6 |
| KT-0 · 3–5 | Job ids per kind, claim returns bytes, holder re-claim allowed, ack/fail idempotent | **must decide as a set** — the job model |
| C / KT-4 | Two scheduled functions (tables every 5 min, print every 1 min), not one shared door | fine to skip |
| A | `ordering.sessionHours` is a TD row, not done here | fine to skip |

---

## Open items to verify (not decide)

- `platter_kitchen`'s `targetSdkVersion` (Flutter 3.47.2 default) — record at the spike.
- Whether Android auto-backup would restore the agent id from shared prefs — exclude it either way.
- Whether the till's floor screen vacates a paid table today — decides the wording of the paid-idle row.
- Where cart documents live, for the `cartsOfSessions` port (`addItemToCart.js:219` writes `lastUpdated`).

Closed while planning: the emulator never fires schedules (manual trigger is the seam); payments carry no
`sessionId`, bills do (`domain/billing.ts:145`), so R21 reads payments through the bill; `make check`
exists (`Makefile:6`); nothing reads `table.sessionToken`.

---

## Grok round 1 (2026-09-22) — taken and refused

Taken, each verified against the code first: the idle clock missed re-opens and cart writes; the vacate
write set had to be listed (answer: reuse `vacateTable`); fail closed on a read error; the sitting-by-sitting
policy table and the paid-idle row; one job id space collided across kinds; holder re-claim, idempotent
ack/fail, stuck `claimed` counts as waiting; no `expired` state; drawer immediate or dropped; `print.agents`
is kinds not ids; staff session on print calls; missing `categoryId` throws; hook joins the caller's
transaction and a failed job write fails the round; encoder byte and order assertions; `drawerPulseMs` 50;
row 10 as screen-only; row 6 as key-kept-default-off; scenario rewrites in v4; write deadline, one job in
flight, copies server-side; `print-config` for the tablet; the spike moved forward; two schedules instead of
one door; Scheduler cost corrected; A's fake red dropped.

Refused: a `session.lastActivityAt` rollup written by every event (the failure we have, with more writers);
"`make check` may not exist" (it does); "offline sync replays cash" (it replays estimate audit rows only);
reprint as a facsimile (a reprint shows the current lines); log only on transition (day close is the human
surface, the sweep log is agent-read).

---

## Proposed `STATE.md` In-flight entry (paste when work starts, not before)

```
- PT · Paper, staff orders and idle tables, session <id>, 2026-09-22. Plan: reviews/2026-09-22-plan-paper-and-idle-tables.md
  (Grok round folded). One task: finish Add-dishes (OR-S1/S19/S22 e2e + browser walk), TD-044 as FL-S36
  on a 5-minute schedule under FL, then KT on sheet v4. Phases, each a commit:
  A. e2e suites/order-entry.js + six Semantics ids + the walk.
  C. app/floor.releaseIdle + api/floor onSchedule + firestore index; old cleanup body deleted, guard kept and tested.
  KT-0 sheet v4 (must-decide rows) + hardware spike. KT-1 domain/kot + receipt. KT-2 adapters/printers/escpos.
  KT-3 queue + hooks (characterization first). KT-4 1-minute sweep. KT-5 kitchen agent + till status.
  KT-6 drawer + estimate. KT-7 the room.
```
