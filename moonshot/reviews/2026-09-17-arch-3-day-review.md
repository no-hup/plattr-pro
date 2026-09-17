# Architecture review · the last three days (2026-09-15 → 2026-09-17)

Requested by Shaurya, not the `/moonshot-review` loop. Reviewed against `moonshot/CLAUDE.md`
(boundaries, money paths, written scoping) plus the things a contract cannot check: what this
shape costs in a year.

**Scope.** `ccd7052^..HEAD` — 39 commits, 150 files, ~17.4k added — plus the uncommitted working
tree (96 files; OF and FL are in flight). Read in full: `domain/*.ts`, `app/*.ts`,
`adapters/firestore/*.ts`, `api/*.ts`, the JS seam (`orders/lineSnapshots.js`,
`orders/createOrUpdateOrder.js`, `cart/checkoutCart.js`, `orders/updateOrderStatus.js`,
`adminApp/auth.js`), `firestore.rules`, `firebase.json`, `index.js`, `scripts/moonshot-check.sh`,
and the till's one door (`frontend/till/src/api/client.ts`).

**State of the tree at review time.** `npx tsc --noEmit` clean. `npx jest` → 824 pass, 0 fail.
`scripts/moonshot-check.sh` → exit 0 clean; exit 1 with `BOUNDARY: domain imports outside domain`
when I planted `domain/__probe.ts` importing `admin/admin` (probe deleted). The gate can fail.
`.review-head` deliberately untouched, so the automated reviewer still sees these commits.

Nothing in this review was fixed. Every item below is either unlogged, or logged for a different
reason than the one that will bite.

---

## 1 · The auth door fails open on an expiry it cannot parse — P0 to decide, latent to exploit

`adminApp/auth.js:116` (staff) and `:49` (admin):

```js
const staffExpiry = timestamp.safeToDate(sessionData.expiresAt);
if (sessionData.expiresAt && staffExpiry && staffExpiry < new Date()) { unauthorized(...) }
```

`safeToDate` returns `null` for any shape it does not recognise, and `null` makes the whole
condition false — **the session is accepted and its expiry is never checked**. Verified by running
it: `{seconds: 1, nanoseconds: 0}` → `null`. That is exactly what a Firestore `Timestamp` becomes
after a JSON round-trip, which is what a console edit, a migration script or a client-SDK
read-then-write produces. `{}`, `true` and a garbage string do the same. A missing `expiresAt`
skips the check too.

Nothing in the repo writes that shape today — `timestamp.fromDate` produces a real `Timestamp` or
`{_seconds}`, both handled — so this is **latent, not exploitable from the network right now**. Two
things make it worth a row anyway:

- Three days ago this door guarded the kitchen and server apps. Today it is the *only* gate in
  front of `billing-issue`, `payments-take`, `payments-refund`, `payments-void`, `dayClose-close`
  and `approvals-apply`. Every module's `staff.bySession` is this function.
- The TD-006 fix (`a00e6af`) changed the admin side from **crash-closed** (`expiresAt.toDate()`
  threw → 500 → denied) to **fail-open**. That is the wrong direction for an auth check, and the
  new test (`test/unit/adminApp/validateAdminSession.test.js`) covers Timestamp and ISO, past and
  future — not the unparseable case that the change created.

It does log `Unrecognized timestamp format` on the way through, so it is detectable. It is one
line to make it deny instead: treat "present but unparseable" as expired.

## 2 · Day close scans two whole collections, one of them inside a transaction — P1

`adapters/firestore/dayClose.ts:36-37`:

```ts
const issuedQuery  = (rid) => bills(rid).where('status', '==', 'issued');
const unbilledQuery = (rid) => lines(rid).where('billId', '==', null);
```

No date bound, no limit. Both are read on every `dayClose-get` (`:91-94`) and again inside the
close transaction (`:69`), then filtered by business date **in memory**. And nothing ever deletes a
line: `orders/lineSnapshots.js` is the only writer, there is no sweep, no archive, no TTL.

Every abandoned table, every aborted checkout, every line a bug leaves without a bill stays in that
result set forever. Tonight it is fifty documents. One restaurant, one year, five lines a table:
tens of thousands, pulled into a Firestore transaction at 23:40 while the cashier holds the drawer
open. Firestore transactions have a hard read budget; day close is the one operation that cannot be
told to come back later. The failure will read as "the till hangs at close" and will arrive
suddenly, at the busiest restaurant first.

Cheapest shape: put `businessDate` on the line and bill documents at write time (both already know
it — `businessDateFor(placedAt)` is computed on every read instead) and make these range queries.

## 3 · Two systems compute the bill and neither owns it — P1, and it is already costing

The legacy path (`order.priceInfo`, float rupees, rebuilt by `calculateCartValue` and recomputed in
`orders/updateOrderStatus.js` on COMPLETED) and the new path (`lines/` snapshots in minor units,
summed by `domain/billing.preview`) both answer "what does this table owe". In three days that
split produced three bugs:

- **TD-014** — a variant inheriting a discount was billed above the quoted price (₹736 quoted,
  ₹768 billed).
- **TD-016** — a scoped offer spread across lines it never targeted.
- **`052626b`** — completing an order put a cancelled round back on the bill, ~₹450, because the
  totals loop did not filter cancelled carts.

That last commit's own message says it "makes the fourth site agree". Four implementations of one
predicate: `isBillableItem` (order totals), `isLiveCart` (checkout), the UNBILLED rule in
`cart/updateCartStatus.js`, and `countsTowardTotal` on the line snapshot. TD-010 logs the
duplication of `paymentStatus` — it does not log the duplication of *the total*, which is the
bigger one.

Until `order.priceInfo` is derived from lines (or frozen at issue and never recomputed), every new
status transition is a fresh chance for the two numbers to disagree, and the guest sees whichever
one the app they are looking at happens to read.

## 4 · PY hardened its request body; BL, ST and DC did not — P1

`api/payments.ts` has a genuinely good pattern: `KEEP` allowlists per operation, `SERVER_OWNED`
drops, integer checks, a document-id check, and a self-consistency check on
`tendered − change = amount`. It is the only one. `api/billing.ts`, `api/approvals.ts` and
`api/dayClose.ts` each pass `request.data as never` straight into the app layer, and
`ApplyRequest` even declares `[extra: string]: unknown`.

What that costs today:

- **The optimistic lock is optional and the client chooses.** `app/billing.ts:111` —
  `if (req.expectedV[l.lineId] !== undefined && req.expectedV[l.lineId] !== l.v)`. A till that
  sends `expectedV: {}` disables "line changed, preview again" entirely; one that omits the field
  reads a property off `undefined` and the failure surfaces as `internal`. The guard against
  billing a line that moved under you is honour-system.
- **The bill records attribution the client chose.** `req.discount` is stored as sent, including
  `source.reason` and `source.approverId`. ST writes the true `staffId` on its own audit row, so
  detection survives — but the bill document, which is what a report or an accountant reads, can
  name anyone.
- **The audit trail is client-writable at one endpoint.** `approvals-apply` accepts
  `action: 'billDiscount'` with `amountMinor`/`baseMinor` from the body (`app/approvals.ts:112`)
  and `action: 'estimate'` with `amountMinor` (`:119`), and writes an audit row from those numbers.
  `billing-issue` recomputes the base itself before calling ST (`app/billing.ts:97`), so **no money
  moves** — but `e45ecfa` just made the contract "detection over prevention, the audit trail as the
  agent's input", and that input currently has a door onto it.

Lifting PY's `shape()` into one shared wrapper is a small diff and closes all three.

## 5 · The approval PIN is the login password — P1 for design, not for code

`adapters/firestore/approvals.ts:29,35`: `bySession` returns `password: serverData.password`, and
`pin.verify` compares the typed PIN against it — bcrypt if the stored value looks like a hash,
otherwise `stored === pin` in the clear, for legacy documents.

These are two secrets with two threat models. A login password is typed once a shift, in the back,
by one person. An approval PIN is typed thirty times a night, at the till, at arm's length from the
guest whose discount is being approved. Shoulder-surfing the PIN now hands over the whole account —
and, through `approvals-apply`, every P0 action. The plaintext branch additionally means the
approval secret sits readable in Firestore for any function with admin credentials.

The seeded staff password in this repo is `1234`. Whatever the production values are, `pinHash`
wants to be its own field.

---

## Smaller, but they will not fix themselves

**6 · A charge escapes tax when no line uses its block.** `domain/billing.ts:117` —
`const def = live.map(l => blockOf(l, ch.taxBlockId)).find(Boolean)`. The tax block *definition* for
a service charge is scavenged from whatever line happens to carry that block. A bar-only bill at
19:00, service charge configured against the `food` block, no food on it: `def` is `undefined`,
line 120 falls back to `{ taxable: amount, parts: [] }`, and the charge is billed untaxed with
nothing logged. Block definitions belong to config, not to a line that may or may not be there.

**7 · Two calendars in one system.** `domain/invoice.ts:3` uses IANA `Asia/Kolkata` through `Intl`
for the fiscal year; `domain/payments.ts:44` uses a fixed `timezoneOffsetMinutes: 330` for the
business date. Both are per-restaurant config, in the same settings document, under different keys.
They agree in India today. They disagree the first time one is set and the other is not — and the
two numbers they produce are the invoice number series and the day a payment belongs to.

**8 · The settings document is read three to five times per call.** `dayClose.close` reads it in
`configs()`, again in `approvalsCfgFor()`, again inside `transact()` via `payConfig()`; PY does the
same; `bySession` adds two more reads. Each module added its own "read once per request" loader and
none of them share. Worth one per-request config object before the next module copies the pattern.

**9 · A targeted offer plus a manual comp can make a bill unissuable.** `domain/billing.ts:82-83`
(uncommitted TD-016 work): `reach` is what the offer-targeted lines can still absorb; if a manager
comps a line the offer also targets, `want > reach` and the whole bill is refused —
`discount exceeds bill`, at the till, guest waiting, no route out but undoing the comp. The sheet
should decide what happens instead (clamp to `reach` and record the shortfall is the likely answer).

**10 · A settled bill can be ₹0.99 short, and nobody is told.** `settleWithin: 99` with
`isSettled(payable − paid <= within)` applies to every bill, not only to a round-off remainder. The
call is deliberate and documented (`domain/payments.ts:38-41`) — but the shortfall lands nowhere: it
is absorbed by the drawer count and shows up as the cashier's difference at close. If it stays, the
close document should carry the sum of tolerated shortfalls so the number has a name.

---

## What I checked and found genuinely good

Worth naming so it survives the next module.

- **The boundary is real and mechanical.** `domain/` imports nothing, `app/` imports no firebase,
  the till imports no adapters — and `scripts/moonshot-check.sh` proves it on every run. I planted
  a violation and it went red.
- **The write shape is the same in all four modules**: decide on a read → PIN → decide *again*
  inside the transaction on the fresh document (`app/approvals.ts:157`, `app/payments.ts:205`,
  `app/dayClose.ts:161`, `app/billing.ts:111`). That is the correct pattern and it was not
  re-invented per module.
- **Idempotency is client-supplied and checked everywhere it matters**: `paymentId`, `movementId`,
  `requestId`, and the close document keyed by date. A retry is a success, a different payload
  under the same id is a refusal. That is the right answer for a tablet on restaurant wifi.
- **Money is integer minor units throughout the new code**, with the float seam confined to two
  `minor()` helpers at the JS boundary.
- **`firestore.rules` is total lockdown.** No client touches Firestore directly; every path goes
  through a function. That is what makes the body-allowlist gap in item 4 a P1 rather than a P0.
- **Derived numbers are derived**: `paidTotalOf` recomputes from rows every time rather than
  trusting a stored total, and voiding a row restores what it took.

## Process, not code

- **Scoping is written down, consistently.** 34 TECH_DEBT rows, Decisions tables on every sheet,
  and the debt rows name blast radius rather than just the symptom. Most of what I found in the
  money paths was already there with a better explanation than I would have written.
- **One thing drifts: the working tree holds three modules at once.** 96 modified files, plus new
  `domain/offline.ts` and `domain/floor.ts` and a `floor.test.ts` with no implementation yet. Riding
  along uncommitted are unrelated legacy cleanups (a comment typo in `utils/timestamp.js`, edits in
  `customer.js`, `menu.js`, `sessionService.js`). Phases are supposed to be the commit boundaries;
  when these land they will land inside somebody's module commit, and the blame trail for the money
  code gets muddier for no gain.

## If I could only pick three

1. Make the expiry check deny on unparseable (item 1). One line, one test, in front of all the money.
2. Put a `businessDate` on lines and bills before the `lines` collection gets big (item 2). It is
   cheap now and a migration later.
3. Lift PY's `shape()` into a shared wrapper for the other three APIs (item 4). Closes the
   optimistic-lock hole, the client-chosen attribution and the audit-trail door together.

---

# Follow-up · 2026-09-18 · two retractions and what I changed

## Item 6 was wrong. There is no untaxed charge.

I wrote that a charge whose tax block no line carries "is billed untaxed and nothing complains".
It is not. `base` is summed **only** over components whose block is the charge's own, and the R10
check above it refuses any line whose component block is missing from its snapshot. So no line in
the block ⟹ `base` 0 ⟹ `amount` 0. The `{ taxable: amount, parts: [] }` arm is only ever reached
with amount 0.

Reproduced: bar-only bill, 10% service charge configured on `food` →
`{base: 0, amount: 0, tax: {taxable: 0, parts: []}}`, payable unchanged at 49900.

Test `C6` already documented exactly this ("row with base 0, amount 0, no tax, payable
unchanged"). I read past it and reasoned from the shape of the code instead. The session that
pushed back priced the fix correctly and did not catch that there was nothing to fix either.

What is left is a smell, not a bug: the definition is taken off a line rather than read from
config, which is what made it readable as a money leak. Rather than refactor around a non-bug,
the coupling that makes it safe is now pinned:

- `domain/billing.ts` — a comment stating the implication chain and naming the test that guards it.
- `domain/billing.test.ts` `C6b` — asserts `amount ≠ 0 ⟹ the charge's block is on the bill`,
  across three shapes (bar-only, kitchen-only, unknown block id). Proven red by widening `base`
  past the charge's own block (5 failures, C6b among them), green on restore. Widening `base` is
  the one edit that would turn this into the bug I claimed, and it can no longer be made quietly.

**The real question underneath is unchanged and still worth a decision:** a charge's *rate* is
read from live config at preview and again at issue, so it can move between the bill a guest was
shown and the bill they are handed. Charges are the only part of a bill that is a reference rather
than a snapshot. That is worth deciding on purpose.

## Item 5: the plaintext branch is not dead code

I said the plaintext PIN fallback at `adapters/firestore/approvals.ts:36` serves legacy documents,
that the not-live rule means there are none, and that it could be deleted today in one line.

MockData7 seeds `password: "1234"`, in the clear, on every server document. The fallback is not
legacy tolerance — it is the live comparison path for every test, every emulator run and the
Playwright specs. Deleting it breaks every PIN in the repo.

That makes item 5 worse than I described, not smaller. The approval PIN is not merely the login
password: in the only data that exists it is **stored and compared as clear text**. And the
deletion I called free is not separable from the `pinHash` schema change — they are one change.
Still the biggest item left, still in the free-exactly-once window, and now entirely Shaurya's
call, because it is a schema change plus a re-seed.

## Changed today

Both gates proven red before green. `make check`: boundary clean, typecheck clean across the whole
tree including FL's in-flight files, 1008 unit tests pass.

- `domain/billing.ts`, `domain/billing.test.ts` — the charge invariant above (`C6b`).
- `app/billing.ts`, `app/billing.test.ts` — `billing-issue` now refuses a missing or non-object
  `expectedV` with `invalid-argument` instead of throwing a TypeError inside the transaction and
  surfacing as a bare `internal`. No behaviour change for any existing caller: all three send `{}`.

Nothing else. Items 3, 5 and 10 are schema changes and are Shaurya's; item 4 is parked behind FL by
agreement; item 2, item 7 and the two fail-open config reads were fixed by the module sessions in
`0c6c824`, `ed909c9`, `44b3d0b` and `3d72e03`. The composite-index checklist line is already in the
go-live plan.

## Two rows I am proposing, not writing

`TECH_DEBT.md` is open in FL's working tree; these want the next free ids.

**· P1 · The stale-line guard on `billing-issue` has never fired.** `expectedV` only checks the
lines it names, and all three real callers send `{}` — `useBill.ts` twice, `ReconcileScreen.tsx`
once. The money is not at risk: `issue` recomputes from the fresh line documents inside the
transaction. The cashier is. They press Issue on a preview reading ₹1,240 and the printed bill
comes out at ₹1,190 because a line was voided in between, with no "preview again" in the way.
Fixing it means the till sending the `v` it previewed at — and the offline replay has no preview to
take one from, so OF has to decide what it sends. A decision, not a patch.

**· P1 · Approval PINs are seeded and compared in clear text.**
`adapters/firestore/approvals.ts:36` compares `stored === pin` whenever the stored value is not a
bcrypt hash, and MockData7 seeds `1234` unhashed on every server. Same secret as the login
password, so shoulder-surfing a PIN at the till hands over the account. Removing the comparison
requires the seed to store hashes, which is the same change as splitting `pinHash` off `password` —
one change, cheap exactly once, before any real staff account exists.
