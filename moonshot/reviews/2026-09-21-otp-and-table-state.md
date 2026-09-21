# Blast radius: always-on OTP, and dropping the `pending` table state

Measured 2026-09-21 by reading every reader and writer in the repo, not from memory.
The proposal: a table always carries an OTP, rotated when the table is marked vacant.
No expiry gate, no cleanup job, and `pending` stops existing.

## What is coupled to the table's status at all

Nothing in the money path. `cart/`, `orders/`, `offers/` and `menu/` never read
`table.status` — the guard that stops a drive-by cart write is
`requireActiveTableSession` (`cart/cartInputValidation.js:95`), which asks the
**sessions** collection. That is the single most important finding here: a guest
cannot order because a session exists, not because a table says `active`.

Everything that is coupled is listed below.

### 1. The one that breaks outright

`domain/floor.ts` `canReceive` refuses a destination that has any OTP on it:

    if (dest.currentOTP) return no(`table ${name(dest)} has a guest signing in`);

`adapters/firestore/floor.ts:44` passes `currentOTP` through raw. So the day every
table always carries a code, **merge and move are refused for every table in every
restaurant**. This check has to become "a code someone is part way through using",
which today is exactly what `pending` means — so removing the state and keeping this
check are the same decision, and it has to be made once, not twice.

### 2. Four places wipe the code when a table is freed

Each would have to mint a fresh code instead of writing null:

- `table/vacateTable.js:19` — the waiter's Vacant, and order COMPLETED before D1
- `table/table.js:662` and `:692` — the cleanup job's two branches
- `app/floor.ts:215` — the source table of a move
- `app/floor.ts:324` — FL's Clear

That is the whole of the rotation work, and it is small. It is also why the
proposal depends on vacate being reliable: these are the only rotation points.

### 3. The scan must stop minting

`table/table.js:157` regenerates whenever the table is vacant, or pending with an
expired code. Under the proposal this branch goes away entirely — and it should,
because it is a live flaw today: **anyone who can scan the QR can rotate the code**,
which silently invalidates the number the waiter is in the middle of reading out.

### 4. Staff OTP generation is already compatible

`server/table_otp.js:62` refuses unless the table is exactly `vacant`, then flips it
to `pending`. Under the proposal the table stays vacant and only the code changes, so
the refusal keeps working and the status write is deleted. This endpoint becomes the
manual rotation lever — useful precisely because it does not depend on vacate firing.

### 5. Readers that simply stop seeing the state

- `table/table.js:644` — the cleanup query is `status in [active, pending]`. The
  pending half goes; the active half still matters and still is not scheduled (TD-044).
- `server/tables_fetch.js:49` — whitelists `pending`, coerces anything unknown to
  `vacant`, and computes `isOccupied = status === 'active'`. Nothing to change.
- `domain/floor.ts` `tileWord` ignores `table.status` altogether, which is TD-042.
  Removing `pending` removes that bug's cause rather than papering over it.

### 6. The four front ends

- **Server app** — `table_detail_dialog.dart:293` offers vacant, active, reserved and
  disabled. It never sets `pending`. Nothing to change.
- **Admin app** — `tables_api_service.dart:164` declares `otpPending = 'pending'` and
  **nothing reads it**. Dead constant, delete it.
- **Consumer app** — has `isTableActive` and `isTableVacant` and no pending branch
  (`models/models.dart:139`). `pending` only ever arrives inside an error payload.
- **Till** — reads tiles, never a raw status. Untouched.

### 7. Seeds and tests

`mock/buildMockData7.js:167` seeds table 2 pending-with-a-valid-code and table 3
pending-with-an-expired-one, in all five restaurants, deliberately. Both scenarios
disappear and the matrix needs two new ones. `app/floor.test.ts`,
`domain/floor.test.ts` and the e2e table suite each carry a pending or "not vacant"
case.

## What the expiry is actually worth today

Close to nothing, in two independent ways.

1. An expired code is replaced by **anyone who scans**, with no authentication. So
   expiring it locks out the slow guest and locks out no attacker.
2. For an `active` table the expiry check is **skipped outright** — the comment at
   `table/table.js:452` says so. A friend joining at 11pm types a code minted at 8pm
   and it works. The code already has unlimited life for the length of a meal.

So the expiry exists only in the window before the first guest signs in, which is the
one window where it causes the dead end and buys nothing.

The real proof of presence is the human handover: the code is never returned to the
guest's phone, only to staff, so the guest has to ask a waiter. That part is sound and
the proposal keeps it.

## Verdict

The proposal is better than what is there, and it removes two filed bugs (TD-042,
most of TD-044) rather than adding a knob. The blast radius is one genuine hazard
(§1) and four small writes (§2).

The dependency is real: rotation happens on vacate, and vacate is the least reliable
thing in the system (TD-013, TD-036, TD-044). Fix vacate first, or the code never
rotates and last night's party can still order to that table.

Recommended order: ten-minute expiry (done, `d6cad38`) → make vacate reliable →
then this.
