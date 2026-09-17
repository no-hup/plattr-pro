> **ANSWERED 2026-09-17.** All twenty calls were decided. The decisions, and the cost of the
> three that went against the sheet's recommendation, are in `DECISIONS_2026-09-17.md`.
> This page is kept only as the record of how the questions were put.

# Decisions waiting on Shaurya — print path, till orders, UPI QR

Three sheets written 2026-09-17 by three planning sessions. Nothing is built. Each block below is self-contained: the scene, the options, a recommendation. Answer in one pass; the sheets get updated from your answers.

## Index

**KT · Print path** — `moonshot/SPEC_KT_print_path.md`
- KT-D1 · Bluetooth printers, or LAN printers plus a small bridge? **must decide** — hardware and money
- KT-D2 · Freeze `categoryId` on the placed line **must decide** — schema, rank-1 data
- KT-D3 · Who is responsible for a ticket printing: the till, or the kitchen's own device? **must decide** — architecture
- KT-D4 · A KOT prints twice sometimes. Is that acceptable? **must decide** — operational
- KT-D5 · `Rs.` or a picture of `₹`? **fine to skip** (default: `Rs.`)
- KT-D6 · The offline estimate stops using the browser's print dialog **fine to skip**

**OR · Till order entry** — `moonshot/SPEC_OR_till_order_entry.md`
- 1. A cashier can open a table session with no OTP — **must decide**
- 2. Two new fields on the table session: `openedBy` and `covers` — **must decide**
- 3. Takeaway and phone orders are "tables" — **must decide**
- 4. Moving a table: build it, or don't — **must decide**
- 5. Merging tables, and un-merging — **must decide**
- 6. One party, one session — even at 23:05 — **must decide**
- 7. Order entry is refused offline — **fine to skip**
- 8. Nobody has ever placed an order from a staff device — **fine to skip, but worth knowing**

**UQ · UPI dynamic QR** — `moonshot/SPEC_UQ_upi_dynamic_qr.md`
- 1. UPI stopped being free three days ago. **must decide**
- 2. Which provider, and when you actually have to pick one. **must decide**
- 3. A public HTTP endpoint on the prod project. **must decide**
- 4. Refunding a UPI payment: recorded here, moved by you. **must decide**
- 5. The manual confirm is the theft vector, and it is the one thing I cannot design away. **must decide**
- 6. PY has to change, in two places, and it has already shipped green. **must decide**
- 7. The QR shows on the till screen, not the guest's phone. **fine to skip**
- 8. A QR-drawing library in the till. **fine to skip, but it is a new dependency**
- 9. One webhook secret for the whole project, not one per restaurant. **fine to skip**
- Debt this module will file


---

# KT · Print path

Sheet: `moonshot/SPEC_KT_print_path.md`

## Review before sign-off (Shaurya reads this section only)

Six calls. The first two change what gets bought and what gets written into data, so nothing starts until they are
answered. The rest are cheap to reverse but expensive to argue about later.

---

### KT-D1 · Bluetooth printers, or LAN printers plus a small bridge? **must decide** — hardware and money

**The scene.** It is Friday. The till is an Android tablet at the counter. The kitchen printer is eight metres away
through a wall, the bar printer is at the other end of the room, the bill printer is under the till.

**The problem.** The till is a web page, and a web page cannot open a TCP connection. So the LAN printers that
almost every Indian restaurant already owns — the Epson TM-T82X LAN, the TVS RP 3160, the Rugtek RP-326 — cannot be
reached by our till at all, no matter what we write. That is not a limitation we can code around; the API does not
exist. The build map's note and our own Stack line both assumed otherwise, and both are wrong.

**Option A — buy Bluetooth printers, drive them straight from Chrome.**
Chrome for Android has supported Web Serial over Bluetooth RFCOMM since **Chrome 148** (April 2026), which is
exactly the Bluetooth Classic SPP profile every ESC/POS receipt printer speaks. The printer is paired once in
Android Settings, the cashier grants the page the port once, and we write bytes. No extra hardware, no app to
install, no second thing to support.
*Costs:* three Bluetooth-capable printers, and Bluetooth printers at counter sizes are less common and dearer in
India than the LAN ones — portable BT units (Everycom, Rugtek BP-02) are the common ones and they are 58 mm.
Chrome 148 is recent, so a restaurant on an old tablet with an old Chrome has no printing at all until it updates.
Range through a kitchen wall at 21:00 is a real risk. One tablet holding three pairings is untested by us.

**Option B — keep LAN printers, add a print bridge.**
A ₹4,000 box on the restaurant's LAN (or a tiny Android service) that the till talks to over HTTP/WebSocket and
which opens TCP 9100 to each printer. Everything the restaurant already owns keeps working, range is a non-issue,
any device in the building can print, and the kitchen printer does not care whether the till is awake.
*Costs:* a second piece of software in 50 restaurants, to be installed, updated, monitored and blamed. It is also a
new dependency and a new failure mode, and setting it up is a site visit. And an HTTPS page can only talk to it if
it is on `127.0.0.1` or has a real certificate — meaning the bridge realistically has to run **on the tablet**,
which makes it an app, which is the wrapper the contract says "never unless both fail".

**My recommendation: A, with one condition.** Buy one Bluetooth 80 mm printer this week and prove KT-S1 on the real
tablet before phase 5 is planned. If Chrome on that tablet cannot see the printer, or the link dies every time the
screen sleeps, B becomes the answer and only `link.ts` changes. That is deliberately the only file affected — the
queue, the routing and every ticket layout are identical under both.
**What I need from you:** which printers exist at the first restaurant today, and whether buying three is on the
table at all.

---

### KT-D2 · Freeze `categoryId` on the placed line **must decide** — schema, rank-1 data

**The scene.** 20:52, one Send: a Margherita and two Kingfishers. The pizza must reach the kitchen printer and the
beers the bar printer.

**The problem.** The placed line does not carry anything that says "bar". `domain/line.ts` freezes ids, name,
quantity, components, prices and tax blocks — and drops the category, which *is* present on the cart item
(`addItemToCartBoilerplateHelper.js:547`, put there for offers) and on `order.carts[].items[]`, but not on the
`lines/` document that KT and BL read. The only routing-capable field that survives is `component.taxBlockId`:
`food` or `liquor`.

**Option A — freeze `categoryId` onto the line at placement.** One additive field, filled from a value the cart
already has. Routing is then a config table `categoryId → stationId` read off frozen data, so a reprint at 23:30
routes the way it did at 20:52 even if someone re-categorised the dish at 23:00. Existing line documents simply
have no `categoryId` and route to the default (tested).
*Costs:* a field on the snapshot the critical-pieces doc ranks as the most expensive thing in the system to change.
It is additive and no restaurant has `lines/` data at scale yet, so the real cost is the precedent: the snapshot
grows when a module needs it.

**Option B — route on `taxBlockId` only.** Zero schema change. Liquor goes to the bar, everything else to the
kitchen. For a pub with one kitchen and one bar that is completely correct.
*Costs:* the tandoor cannot get its own printer, ever, without doing A later anyway — and "later" means doing it
after there is data, which is the expensive version.

**Option C — read the live menu at print time.** No schema change, full category.
*Costs:* breaks R9 and the critical-pieces rule that nothing downstream re-reads the menu; a reprint after an Admin
edit routes somewhere new; and a deleted dish routes nowhere.

**My recommendation: A.** It is one field, it is copied not computed, it costs nothing to add now and a migration to
add later, and it is the difference between "we support a tandoor station" and "we do not". C is wrong on
principle. B is genuinely tempting and I would take it if I believed we would never sell to a restaurant with more
than two prep areas — I do not believe that.

---

### KT-D3 · Who is responsible for a ticket printing: the till, or the kitchen's own device? **must decide** — architecture

**The scene.** 20:14 the captain sends a round from his tablet. Paper has to come out in the kitchen. Nobody has
touched the till in ten minutes; its screen is dark.

**The problem.** The round is born on a device that is not the till, but only a device that is physically paired to
a printer can print. Someone has to be awake and holding the link.

**Option A — the till is the print station (this sheet).** The till polls a server-side queue every five seconds,
claims a job, prints, acknowledges. One device pairs with all printers.
*Costs:* if the till tablet sleeps, is carried away, or has a dead battery, no paper comes out anywhere. The kitchen
screen still has everything, so nothing is lost — but the failure is silent unless someone is looking at the till.
Android aggressively backgrounds tabs, so a sleeping tablet is a real and frequent condition, not an edge case.

**Option B — the kitchen tablet prints its own tickets.** Closest to how Petpooja and Odoo do it, and the device is
already in the kitchen next to the printer.
*Costs:* the kitchen app is Flutter, so it needs its own printing implementation, its own pairing UI and its own
queue — a second print path in a second language, and TD-003 says the Flutter apps do not even have a credential
prompt yet. This doubles the module.

**Option C — the till prints, and the queue is loud.** Option A plus: a job queued longer than
`print.claimLeaseSeconds × 3` with nobody claiming it is an alert — on the till when it wakes, and in the log line
MN reads. The restaurant learns "keep the till awake" the way it learns to keep the card machine charged.

**My recommendation: C.** It is A plus a log line, and it converts the one real weakness of A (a sleeping tablet is
silent) into something detectable, which is the "catch it, don't cage it" trade exactly. B is the right long-term
answer and the wrong pre-launch one: it is a second implementation of everything for a benefit the restaurant can
get by leaving a tablet plugged in.
**Also worth knowing:** Chrome may throttle or suspend a background tab. The till should be the foreground app on
that tablet during service, and phase 5 should measure what a backgrounded tab actually does to a five-second poll.

---

### KT-D4 · A KOT prints twice sometimes. Is that acceptable? **must decide** — operational

**The scene.** 20:52 the cashier's tablet claims the bar ticket, writes it, and the battery dies before it tells the
server it printed. Sixty seconds later the second tablet claims the same job.

**The problem.** There is no way to be sure a printer printed. The link says the bytes went out; the blade cutting
the paper is not something a browser can observe. So a system either risks printing twice, or risks printing zero
times.

**Option A — at-least-once (this sheet).** A lease that expires, and a reprint marker on anything that is not the
first attempt. Sometimes two identical tickets come out of the bar, one marked `REPRINT 2`.
*Cost:* a chef could conceivably make two portions. The marker exists to stop that, and a duplicate ticket for the
same `#42-3` is visibly the same round.

**Option B — at-most-once.** Acknowledge before writing. Never a duplicate, and occasionally a round that never
reaches the kitchen at all, with nothing on paper to say so.

**My recommendation: A, strongly.** Food that never gets cooked is a guest waiting forty minutes and a refund. A
duplicate ticket is a chef looking at two identical slips with the same ticket number and the word REPRINT on one.
I want your explicit yes on this because it is the kitchen's experience, not mine, and if your first restaurant's
chefs work off a spike where every slip is a dish, A is worse than I think.

---

### KT-D5 · `Rs.` or a picture of `₹`? **fine to skip** (default: `Rs.`)

Thermal printers print from a code page, and no standard ESC/POS code page contains `₹` (the symbol is from 2010;
these firmwares are older). A bill that asks for `₹` prints `?` or a black box.

**Option A — print `Rs.`** as a config string. Zero work, completely legible, what most Indian POS bills printed
for years.
**Option B — render the total line as a raster image** (`GS v 0`), so `₹` appears exactly as on screen.
*Cost:* a bitmap renderer in the till, slower printing, and a whole new class of alignment bug for one glyph.
**Option C** — check whether the printer we actually buy has a code page with `₹` (some newer Chinese firmwares
have one at page 28 or in a custom slot) and set `print.codePage`. Free if true, and the config key already exists.

**Recommendation: A now, C when the printer is on the table.** Flagged only because the guest sees it on every
single bill and you may care about how it looks more than I do.

---

### KT-D6 · The offline estimate stops using the browser's print dialog **fine to skip**

OF built `EstimateScreen` to show a printable `<div>` and let the browser print it. Once this module exists, that
becomes a ticket through the same encoder to the same counter printer.

**Why it matters enough to be here:** it is a change to something already built and tested (OF-S7, OF-S15), it means
the estimate no longer works if the printer is off — where today the cashier could in principle print to any
Android print service or screenshot it — and it makes KT a hard dependency of OF's emergency path.

**Recommendation: do it, and keep a "show on screen" fallback in the same component.** If both the server and the
printer are down at 20:45, the cashier can still turn the tablet around and let the guest photograph the estimate,
and the estimate is recorded in the till either way. That is three lines of JSX, not a second path.

---

## Files (donors)

`DONORS.md` → Printing currently says only "Odoo `pos_restaurant` printer routing per category. Odoo `pos_printer`
is not in the sparse set; add it when KT is built." Add `addons/point_of_sale/models/pos_printer.py` and
`addons/pos_restaurant/models/restaurant_printer.py` to the sparse checkout before phase 1, and run
`/moonshot-donor-review` against them per the contract — the builder does not read them.

---

# OR · Till order entry

Sheet: `moonshot/SPEC_OR_till_order_entry.md`

## Review — Shaurya's calls

*This is the section to read. Everything below is a real doubt, not a formality.*

---

### 1. A cashier can open a table session with no OTP — **must decide**

**The scene.** Two walk-ins at 21:00. Today the only thing in the codebase that creates a table
session is `validateOTP`, after a guest has typed a phone number and a six-digit code. The walk-ins
have no phone. So the till needs a way to mint a session without one.

**The options.**

- **(a) `table-openTable`, staff-gated, no OTP.** ~40 lines in `table/table.js`'s own style. It calls
  the existing `createOrGetTableSession` with `primaryUserId: 'staff:<serverId>'`. The OTP path is not
  touched; the guest flow is not touched. Cost: a table session can now exist that no guest
  authenticated, so anyone who can read `restaurantId` + `tableId` (both printed on the QR code) could
  write to that table's cart while the till has it open — because the cart endpoints gate on "the table
  has a session", not on who you are. That exposure is **pre-existing** for every OTP'd table; OR makes
  it possible on a table with no guest.
- **(b) Make the cart endpoints accept a staff session instead of a table session.** Correct-feeling,
  and it touches `addItemToCart`, `removeItemFromCart`, `getCart`, `checkoutCart` and every e2e suite
  that seeds a session. Four existing files, each needing a characterization test first.
- **(c) Have the till mint an OTP for itself and immediately consume it.** No new endpoint. Also a lie
  in the audit trail: the session would record a phone number that does not exist.

**My recommendation: (a).** It is one new endpoint, no existing file changes shape, and the exposure it
adds is one the QR product already lives with. Under "catch it, don't cage it" the honest answer is that
`openedBy: 'staff:<serverId>'` on the session is the record, and a drive-by cart write from the car park
is caught the moment it reaches the bill, because nobody ordered it.

**What makes it yours:** it is a change to how sessions are created, which the contract reserves to you.

---

### 2. Two new fields on the table session: `openedBy` and `covers` — **must decide**

**The scene.** Cashier types "4" when she opens table 7. Nothing in the system has anywhere to put it.
There is no covers field on the table, the session or the order.

**The options.**

- **(a) On the session** (`openedBy: string`, `covers: number`). The session already *is* the sitting —
  it is what `draftId` is, what the order groups on, and what dies when the party leaves. Covers is a
  fact about a sitting. Two optional fields; documents without them behave as today.
- **(b) On the table.** Wrong lifetime: the table outlives the party and the field would have to be
  cleared on vacate, which is one more thing to get wrong.
- **(c) On the order.** Nearly right, but the order does not exist until the first round is Sent, and
  the cashier types covers before that.
- **(d) Don't store it. Skip covers in v1.** Per-head average is the number a restaurant owner actually
  watches, and it cannot be backfilled — a night that did not record covers has lost it forever.

**My recommendation: (a), and do not defer it.** It is the cheapest field in the build and the most
expensive one to add late, because it is data, not code (critical pieces' own test).

**What makes it yours:** it is a schema change.

---

### 3. Takeaway and phone orders are "tables" — **must decide**

**The scene.** A regular calls at 20:15 for two dosas. The cart document's id *is* a table id
(`carts/{tableId}`), and checkout demands a session on that table. A phone order has no table.

**The options.**

- **(a) Counter tickets: ordinary table documents, ids listed in `ordering.takeawayTableIds`.** Zero
  schema change, zero branch. `takeaway_1` opens, takes a round, bills, settles and returns to `vacant`
  exactly like table 7, because `vacateTable` does not care what a table is for. The cost is cosmetic:
  a takeaway shows up on the floor plan unless the till filters it out by the same config list, and
  concurrency is bounded by how many counter tickets you seed (seed eight; a busy counter runs two or
  three at once).
- **(b) A real `kind: 'dinein' | 'takeaway'` axis on the order.** Honest modelling, and it branches
  checkout, billing, day close, reports and every read path — plus PO-Q2 (are offers valid on takeaway?)
  becomes answerable, which today it is not.
- **(c) One shared takeaway pseudo-table.** Breaks immediately: two phone orders at once share one cart
  and one bill.

**My recommendation: (a) for v1, and open PO-Q2 as its own question.** The build map asks for takeaway
to *work*, not for takeaway to be *reportable separately*. When you want the split in reports, (b) is
one field added to the order and a report query — and by then there is real data to say whether the
split matters.

**What makes it yours:** it is a module boundary — it decides whether "order kind" ever becomes a
first-class axis.

---

### 4. Moving a table: build it, or don't — **must decide**

**The scene.** 21:10. The party on table 3 has eaten one round and wants the quieter table 9. Today
there is no endpoint at all; the only thing a cashier can do is void the whole table and re-punch it,
at list price, with two P0 audit rows that say "guest left".

**What a move actually touches.** Five documents in one transaction: the session's `tableId`, the live
cart doc (`carts/3` deleted, `carts/9` written — the doc id is the table id, so it cannot be updated in
place), the order's `tableId`, and each unbilled line's `tableId`. `draftId` is the sessionId and does
**not** change, so the bill in progress follows the party and nothing is re-priced. A line with a
`billId` refuses.

**The options.**

- **(a) Build `table-moveTable`.** One endpoint, one transaction, an ST audit row P1. Roughly 80 lines
  in `table/`'s own style. The risk is the cart doc: if a guest's phone writes to `carts/3` in the
  same instant, that write either aborts the move (fine) or lands after it and strands an item
  (not fine). Mitigated by doing the cart read inside the transaction, which is what
  `createOrUpdateOrder` already does.
- **(b) Don't build it. Use merge instead** — merge 9 into 3 so both are the same table, and the guests
  physically move. Wrong on the floor plan: 3 shows occupied all night and 9 shows disabled.
- **(c) Don't build it, and accept void-and-re-punch.** A ₹1,800 table becomes two P0 voids and a fresh
  round. Every discount and offer on it is lost, and the day's void report is polluted with moves.

**My recommendation: (a), but as a phase that can be cut.** Moving tables is ordinary in a dine-in
restaurant on a Friday, and (c) actively corrupts the one report ST exists to produce. If you want the
first cut smaller, cut phase 4 and ship OR without it — the sheet is written so that phase stands alone.

**What makes it yours:** it changes what a table id means on a line that is already placed, which is
schema-adjacent, and it adds a module boundary (who owns "move").

---

### 5. Merging tables, and un-merging — **must decide**

**Your live half-formed idea, and what the code already says.** An earlier agent recommended that the
un-merge be automatic, since a captain can always re-merge. **That is already what the code does** —
`vacateTable` calls `unmergeChildren`, so when the party of eight pays, table 6 releases itself with
nobody confirming. Merge itself is also built: `table-setMerge`, and every guest cart write runs
`resolveTableId`, so a guest scanning table 6's printed QR lands in table 5's cart. So this is not a
build; it is two genuine gaps in what is built.

**Gap A: un-merging mid-meal releases *everything*.** `setMerge {merge: false}` takes `parentTableId`
only and releases every child of it. A party of eight on tables 5+6+7 that shrinks to six at 21:30
cannot hand back table 7 alone.

- **(a) Leave it.** Un-merge all three, re-merge the two you still want. Two taps, no code. The window
  between them is a table that reads vacant and has people sitting at it.
- **(b) Let `setMerge {merge: false}` take `childTableIds` and release only those.** About six lines in
  an existing endpoint, plus a test.

**My recommendation: (b).** It is smaller than this paragraph and removes the only foot-gun in the
feature.

**Gap B: you cannot merge an occupied table.** `setMerge` refuses a child that is not `vacant`, which is
right for the common case (table 6 is empty, push it against 5) and wrong for the other one (two
parties who know each other decide to sit together at 20:30, both already eating). Merging two live
sittings means merging two sessions, two carts and two orders into one bill — which is the *reverse* of
BL-S12's split and is real work.

- **(a) Keep the refusal, say it in words, offer Move.** The cashier moves party B onto table 5 (if
  question 4 says yes), or the two parties get two bills and settle it between themselves, which is
  what happens in most restaurants anyway.
- **(b) Build a session merge.** A new operation, a new audit shape, and a rule about which offers
  survive the merge, since offers are evaluated per order.

**My recommendation: (a).** Two live parties joining is uncommon, the failure mode is "two bills"
rather than "wrong money", and (b) is a module of its own.

**What makes it yours:** Gap A is a change to an existing shipped endpoint; Gap B is a boundary call.

---

### 6. One party, one session — even at 23:05 — **must decide**

**The scene.** Table 7 opened at 19:00. A table session expires after four hours
(`sessionService.js:80`, a literal). At 23:05 the cashier punches a last round of coffee and the session
is dead. If the till simply calls `table-openTable` again, `createOrGetTableSession` finds no *active*
session and mints a new one — a new `sessionId`, therefore a **new `draftId`**, therefore the coffee
lands on a second bill while the dinner sits on the first. Nothing in the system tells the cashier why.

**The options.**

- **(a) Opening an `active` table extends the live session's `expiresAt` and returns its existing id,
  and never mints.** `ordering.sessionHours` becomes the config value behind the literal. A sitting
  keeps one id for as long as the table is occupied.
- **(b) Extend the default to eight hours and move on.** One line. Pushes the same bug to a slower
  night, and a table left occupied overnight never expires at all.
- **(c) Leave it. A four-hour meal is rare.** It is not rare on a Friday with a large party, and the
  symptom — a table that silently pays twice — is exactly the class of bug the bill is supposed to
  make impossible.

**My recommendation: (a).** It is the rule R3 states, and it is what makes `draftId` trustworthy for BL.

**What makes it yours:** it changes session lifetime semantics for the *guest* app too, since both share
`validateTableSession`. Worth a sentence from you about whether a guest's QR session should also be
extended by activity, or only by the till.

---

### 7. Order entry is refused offline — **fine to skip**

**The scene.** 20:44, the till's last call failed. The cashier wants to punch a round.

OF's decision on 2026-09-16 was explicit: no write replay queue, because every staff device has its own
SIM and a full outage is an accepted loss. A cart write is server-priced, so a queued round would be
priced whenever it flushed. So v1 shows the cached menu (read-only, so the cashier can quote a price)
and disables Add and Send with "No connection since 20:42".

The one thing this reverses is OF's line "no menu cache: the till has neither screen today" — OR builds
that screen, so the reason expired. I have written it as a Decision rather than asking, because it is a
read cache and cannot move money.

**Say something only if you want order entry to work offline.** That is a real product position — it is
what Petpooja's local-first design buys — and it is a different module, not a flag.

---

### 8. Nobody has ever placed an order from a staff device — **fine to skip, but worth knowing**

The captain app has no order-entry screen and never had one: eleven endpoints, none of them `cart-*`
except `updateCartStatus` and `removeItemFromCart`. So the till will be the first staff surface that
punches an order, and every "the captain app already does X" assumption in the handoffs is wrong.

Two consequences worth your eye:

- **The e2e suites have only ever exercised guest checkout.** `suites/ordering.js` will be the first
  test that places a round as staff, which is why phase 3 asserts that a till round and a guest round
  land on one order and one draft.
- **Once the till can punch, the captain app is the odd one out.** A waiter at table 12 still walks to
  the counter to add a beer. Whether the captain app ever gets this screen is a product call for after
  go-live, and it is the single largest piece of work OR makes visible without doing.

## Files

Donors for this concern: `DONORS.md` → *Order lifecycle, lines, totals* and → *Void*. Read after
building, per the contract.

```
backend/src-plattr/functions/          # flat dirs, their own style, characterization test first
  table/table.js                       openTable (new onCall), setMerge gains childTableIds on release
  table/moveTable.js                   move a sitting to another table, one transaction (phase 4, optional)
  session/sessionService.js            expiry from ordering.sessionHours; extend, do not mint (R3)
  app/config.ts                        ordering.* onto the existing approvals-config answer
frontend/till/src/
  features/ordering/TableMap.tsx       tables, counter tickets, covers, merge / un-merge, move
  features/ordering/OrderScreen.tsx    menu grid, cart pane, Send, per-line Void and Discount
  features/ordering/useOrder.ts        open, add, remove, send; one requestId per Send tap
  features/ordering/menuCache.ts       the cached menu and its age (OR-S17)
tests: test/unit/table/openTable.test.js · test/unit/table/moveTable.test.js ·
       test/e2e/suites/ordering.js · frontend/till/e2e/ordering.spec.ts
```

**No new dependency.** Nothing here needs one.

---

# UQ · UPI dynamic QR

Sheet: `moonshot/SPEC_UQ_upi_dynamic_qr.md`

## Review before sign-off (Shaurya reads this section only)

Nine calls. The first three are the ones that cost money or cannot be undone; the rest are cheaper but
still yours. Each is self-contained — you should not have to read anything above this line.

---

### 1. UPI stopped being free three days ago. **must decide**

On **15 October 2026**, a UPI payment to a merchant **above ₹2,000** starts costing the merchant **0.4 %,
capped at ₹300**. The law changed in August (s.10A of the Payment and Settlement Systems Act was amended so
the government can choose what stays free), the gazette notification landed 14 September, and NPCI's rules
and FAQs landed 15 September. The restaurant pays it, and **passing it to the guest is not allowed**. Small
merchants taking under ₹1 lakh a month are exempt — a single dine-in outlet in Bangalore will clear that in
a fortnight, so that exemption is worth about three months.

The build-map's own example bill is ₹2,151. That bill now costs the restaurant **₹8.60**. A ₹1,999 bill
costs nothing.

Three things follow, and they are the actual decision:

- **The pitch changes.** "UPI needs no hardware and costs nothing" was true in June 2025 and is not true
  from next month. On a restaurant doing, say, ₹9 lakh a month of UPI with a third of it on tables over
  ₹2,000, that is roughly ₹1,200 a month of new cost — small, but it is the first time the POS is
  associated with one.
- **The software could dodge it, and I have written down that we do not.** Two QRs of ₹1,075.50 each
  instead of one of ₹2,151 pays ₹0. That is a five-line change and it is in *Out of scope* on purpose. Say
  the word if you disagree, but say it in writing, because it is the kind of thing that is very hard to
  take out once a restaurant has got used to it.
- **It may not stick.** A PIL against both the notification and the framework was filed in the Supreme
  Court around 16 September. Nothing in the code encodes 0.4 % or ₹2,000, so if it is struck down we change
  nothing.

**Recommendation:** accept it, build nothing about it, and put one honest line in the sales conversation.
The number is small next to a card terminal's 1.5–2 %.

---

### 2. Which provider, and when you actually have to pick one. **must decide**

The short version: **the QR is easy and the confirmation is the entire product you are buying.** A
`upi://pay` link gives our server nothing — the guest's app talks to NPCI, not to us — so without a
provider there is no automatic "paid".

What each one actually charges for UPI, from their own pricing pages, read on 17 September:

| | UPI rate | Promo for a new merchant | What you get for it |
|---|---|---|---|
| **Paytm** | **0.00 %** | — | Cheapest by a mile. Settlement T+1 with same-day and real-time options. But the webhook contract is **undocumented**: no published retry policy, no dedupe key, no ordering guarantee, and the checksum construction is "use our library" |
| **PhonePe** | 1.99 %, **currently free**, no stated end date | — | Best settlement cycle (T+1). Also publishes almost nothing about webhook reliability, says duplicates are "possible" with no dedupe key, and its purpose-built till API may sit behind a POS agreement |
| **Cashfree** | **1.95 %** | **0 % up to ₹20 lakh of volume, until 31 Mar 2027** | Near-complete webhook contract, ~24-hour activation, instant settlement published at 0.30 %. The QR is a checkout order bent into a QR, not a dedicated per-bill QR API |
| **Razorpay** | **2 % + 18 % GST ≈ 2.36 %** | 0 % for 90 days **or ₹5 lakh**, whichever comes first | The only fully published webhook contract in the market — 24-hour retry window, `x-razorpay-event-id` to dedupe on, an explicit "ordering is not guaranteed", a 5-second ack deadline — and a **dedicated QR API** that is the exact shape of this module: one QR per bill, amount in paise, expiry, and a `qr_code.credited` callback carrying the bank's RRN. QR Codes must be switched on by a request, not a sales call |

Bank-direct (ICICI, HDFC, Axis) is a relationship-manager path in every case and needs a current account
with that bank. Not reachable in this module's timeframe.

The gap that matters: **2.36 % versus 0 % is ₹21,000 a month on ₹9 lakh of UPI.** That is not a rounding
error, it is a line item that could decide whether a restaurant buys the POS. But **Paytm's 0 % comes with
a webhook nobody has documented**, and this is a till where a missed confirmation is an argument at the
counter at 23:40.

**Recommendation, and it is deliberately a two-parter:**

- **Ship `none` mode first and do not pick a provider yet.** In `none` mode the till builds the
  `upi://pay` QR itself from the restaurant's own VPA with the exact amount in it, and the cashier confirms
  by hand. It costs ₹0, needs no KYC, no merchant account and no account with anybody, works on day one,
  and is already better than the printed sticker every restaurant has taped to the counter — because the
  amount is right and nobody types it. What is missing is only the automatic confirm. **Phases 1 to 6 of
  the plan deliver exactly that, and none of them need a provider to exist.**
- **When you do pick, pick Razorpay for the first integration** — not because it is cheapest, it is the
  most expensive, but because its QR API and its webhook contract are the only ones fully written down, so
  the adapter is smallest and least likely to be wrong. Then **move on price once you have real volume**:
  the provider is one file and one config key, which is the whole point of the adapter shape. A rate is
  negotiable; a webhook whose retry behaviour nobody will tell you about is not.

**What I need from you before phase 7 is written:** a UPI rate for this restaurant **in writing**, and a
confirmation that the per-bill QR API is on the tier you are actually on. Four providers have a gap there
that no public page answers.

---

### 3. A public HTTP endpoint on the prod project. **must decide**

The whole feature turns on one thing: the provider POSTs to a URL of ours when the guest pays. That URL is
public and unauthenticated by construction — there is no login on the other end, only a signature.

What that means concretely on `rms-app-dd875`:

- It is a **63rd Cloud Run service**, and it is the first one anybody on the internet can knock on. Every
  other endpoint we have is behind a session.
- The only defence is an **HMAC signature over the raw request body**, checked before we read anything, with
  a constant-time compare. A forged request costs us one hash and no Firestore read. That is deliberate:
  `max-instances: 10` is the real spend ceiling on this project and a flood must stay cheap.
- The secret goes in **Secret Manager**, not the config document. A Firestore document is not a place to
  put a key that can mark bills paid.
- A bare full deploy silently drops the `allUsers` invoker on some services (INFRASTRUCTURE §6). If it
  drops it on this one, the webhook goes dark and payments stop confirming with no error anywhere. One more
  reason never to run one — and a reason the morning "unrecorded" screen exists.

**Recommendation:** accept it. There is no version of this feature without it, and the signature check is
the same control every other business in the country relies on. What I want your explicit yes on is that a
public endpoint on the production project is acceptable at all.

---

### 4. Refunding a UPI payment: recorded here, moved by you. **must decide**

A guest paid ₹2,151 by QR and the pitcher was never poured. BL raises a credit note, the cashier records a
₹499 refund on the UPI tender — and in v1 **no money moves automatically.** The row is written, the
collect's reference is on it, and **you push the refund from the provider's dashboard that night.**

The alternative is that our Cloud Functions hold a credential that can **send money out of the
restaurant's account**. Today the worst a compromised key can do is create QRs and read their status.

The cost of my version: somebody has to remember, every night. If they do not, the ledger says refunded and
the guest was not. There is no test that catches that.

**Recommendation:** record-only in v1. Revisit the moment refunds happen more than once a week, and when
it does change, the provider's refund API goes in the same adapter file and nothing else moves.

---

### 5. The manual confirm is the theft vector, and it is the one thing I cannot design away. **must decide**

When the callback never arrives and the guest is standing there holding a success screen, the cashier taps
"Guest paid — confirm by hand", types the reference off the guest's phone, and enters their PIN. A payment
row is written and the bill closes on a cashier's word.

A dishonest cashier can therefore mark any bill paid without any money arriving. Every control I have is
after the fact: a **P0 audit row with their name on it**, a **required typed reference**, a **PIN**, and
the fact that the provider's report the next morning will not have that payment in it.

I could prevent it — refuse to close a bill without provider confirmation — and then on the night the
provider has an outage the restaurant cannot take UPI at all, which is most of their payments by count.

**Recommendation:** keep the escape hatch. This is "catch it, don't cage it" applied to the single place it
is most tempting to cage. But it is the strongest argument yet for TD-005, the agent that reads audit rows:
three manual confirms a week by one cashier, none of them in the provider's report, is a pattern a human
will not notice and a query will.

---

### 6. PY has to change, in two places, and it has already shipped green. **must decide**

Two real edits to a module that is done, tested and untouched since 15 September:

1. **`canTake` refuses a captured payment on a bill that is already settled.** If a guest pays the QR twice
   — first screen looked stuck, scanned again — the second ₹2,151 reaches the bank and PY refuses to record
   it. That is money in the account with no row anywhere, which is the exact thing PY's own rule R6 exists
   to prevent for the overshoot case. It simply never met this one. The fix is one condition: a payment the
   guest has **already made** may be recorded on a settled bill as a row of amount 0 with the whole sum as
   `overpaid`, and PY-S32 already gives it back.
2. **`take()` needs a staff session, and a webhook has none.** Split into `staffFor()` + `takeAs()`, no
   behaviour change — the same move ST made when PY needed the PIN check.

Both get a characterization test first. Neither is a schema change and neither moves live data.

**Recommendation:** do them, and do them in their own commit **before** any UQ code, so that if they break
something it is obvious what broke it.

---

### 7. The QR shows on the till screen, not the guest's phone. **fine to skip**

The build map says "a QR carrying that exact amount shows on the guest's phone." In v1 it shows on the
**cashier's screen** and the guest points a camera at it — which is what happens in every restaurant in
Bangalore already, and needs nothing from the Flutter consumer app.

Pushing it to the guest's own phone means the consumer app polling a new endpoint, a second surface to get
right, and a guest whose phone has died having no way to pay. It buys one less turn of a screen.

**Recommendation:** till screen. Revisit if a customer actually asks.

---

### 8. A QR-drawing library in the till. **fine to skip, but it is a new dependency**

Drawing a QR in the browser needs an encoder. `qrcode` is the boring choice — MIT, no runtime
dependencies, about 20 kB. The house rule is that no dependency arrives without being asked for, so I am
asking. The alternative is rendering the QR server-side as an SVG, which is the same dependency on the
other side of the wire plus a round trip on every bill.

**Recommendation:** `qrcode` in the till.

---

### 9. One webhook secret for the whole project, not one per restaurant. **fine to skip**

The signing secret lives in Secret Manager as a single value, so every restaurant on this project shares
it. That is fine while there is one outlet with one merchant account — it is the same assumption TD-018
already records for tills and drawers — and it becomes wrong the day there are two restaurants with
different merchant accounts, because either they share a provider account or one of them can forge the
other's callbacks.

**Recommendation:** live with it, with a debt row, and fix it the same week a second restaurant signs.

---

### Debt this module will file

| Proposed | What | Pri |
|---|---|---|
| TD-026 | One global webhook secret, not per restaurant (Review 9) | P2 |
| TD-027 | A UPI refund is recorded but not sent; a human moves the money (Review 4, UQ-S12) | P2 |
| TD-028 | `unrecorded` payments need somebody to look at a screen; there is no alert (UQ-Q3, R8) | P1 |
| TD-029 | The signed-webhook happy path cannot be proven on the emulator if `rawBody` is still missing there | P2 |
| TD-022 (existing) | An in-doubt external tender has no `pending` state. UQ makes this sharper, not different: the manual confirm is exactly the case that row describes | P2 |

## Files

Donors for this concern: `DONORS.md` → Payments (Odoo `pos_payment_method.py:202-212`, `:230-240`; URY
`ury/ury/api/payment_terminal.py:41-89`). Read after building, per the contract.

```
backend/src-plattr/functions/
  domain/upi.ts                 payload(), amountFor(), isLive(), paymentIdFor(), configFrom(). Pure.
  app/upi.ts                    raise(), status(), confirm(), cancel(), onProviderEvent().
                                Calls domain, calls adapters/pay/active, calls app/payments takeAs().
  adapters/pay/active.ts        picks by upi.provider. Same function names, no factory, no registry.
  adapters/pay/none.ts          self-VPA payload only. create() → {payload}, confirms:false, status() → 'unknown'
  adapters/pay/fake.ts          tests only: deterministic ids, a settable next answer
  adapters/pay/<provider>.ts    phase 7. The ONLY file that imports the vendor's SDK or hits its URL
  adapters/firestore/upi.ts     collect reads and writes, inside the caller's transaction
  api/upi.ts                    onCall: upi-raise, upi-status, upi-confirm, upi-cancel (ErrorHandler door)
                                onRequest: upi-webhook — raw-body HMAC, timingSafeEqual, 200/400, no CORS
  index.js                      exports.upi = { raise, status, confirm, cancel, webhook }  (nested, INFRA §6)
  app/payments.ts               CHANGED: take() split into staffFor() + takeAs()
  domain/payments.ts            CHANGED: canTake allows a captured take on a settled bill (overpay row)
frontend/till/src/
  features/upi/useUpi.ts        raise, poll at upi.pollSeconds, confirm, cancel
  features/upi/QrPanel.tsx      inside the existing TenderScreen; draws payload as a QR
tests: domain/upi.test.ts · app/upi.test.ts · test/e2e/suites/upi.js +
       test/e2e/fixtures/upi/*.json · frontend/till/e2e/upi.spec.ts
```

**New dependency, flagged:** drawing a QR in the browser needs an encoder. `qrcode` (MIT, no runtime
dependencies, ~20 kB) is the boring choice and is a Review row, because the house rule is that no
dependency arrives without being asked for. The alternative is a server-rendered SVG, which is the same
dependency on the other side of the wire plus a round trip.
