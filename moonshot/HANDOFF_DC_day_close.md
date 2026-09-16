# Handoff · plan and build DC · Day close & cash count

Register first: `/moonshot-session start DC day close`.

Read, in order: `moonshot/CLAUDE.md`, `moonshot/STATE.md`, then `moonshot/SPEC_PY_payments.md` —
its Objects block, R14/R15, PY-S18, and every row that names DC. PY was built against a DC contract
it could not call yet; that contract is the spine of this module and you inherit it rather than
redesign it. From `moonshot/SPEC_BL_billing_and_tax.md` read the bill object and its `status` values
only. From `moonshot/CRITICAL_EXISTING_PIECES.md` read section 3. For existing code shapes, start
from "Read these to copy the shape" in CLAUDE.md. Follow "Writing a sheet" and "Building a module"
in CLAUDE.md exactly. Your plan page is step 0 and it is yours to write — do not lift one from a
reviewer.

Task: DC · Day close & cash count on branch `moonshot`. End a trading day so the money in the
drawer can be compared with the money the system says should be there, and so a closed day can
never be written to again. Reports are RP, not you. Printing is KT.

## What already exists — inherit, do not re-invent

- **The business date is already decided.** `domain/payments.ts` exports `businessDateFor(at, cfg)`
  and `payments.dayCloseHour` (default 5) already rolls a 01:30 payment into the previous day.
  Every payment row is stamped with its `businessDate` server-side. You do not get to redefine it.
- **PY already asks you whether a day is closed.** `app/payments.ts` has a `dayClosed(businessDate)`
  port returning `boolean | null`, and R15 says PY refuses the write when the answer is `null`
  (unknown). So the document you write is a hard gate on live money: `restaurants/{id}/dayClose/{businessDate}`
  with `{closed: true}`. Absent means open. Unreadable must stay unreadable, not default to open.
- **PY already reports the day.** `payments-list` with a `businessDate` returns that day's non-void
  rows. Group by `tenderId` from those rows; do not build a second ledger.
- **BL owns bill status.** Refuse to close while any bill for that day is still `issued`. Read
  `bills/`; do not infer settlement from payment rows.
- **Non-sale drawer movements are yours.** PY's sheet parks them here by name: the ₹1,200 handed to
  the vegetable vendor at 18:40 leaves the drawer and belongs to no bill. Cash counted at 23:00 will
  not reconcile without them.

## Shape

Module shape as in CLAUDE.md: `domain/dayClose.ts`, `app/dayClose.ts`,
`adapters/firestore/dayClose.ts`, `api/dayClose.ts`, `frontend/till/src/features/dayclose/`.
Domain holds the arithmetic — expected cash, counted cash, the difference, and who it is posted
against — and knows nothing about Firestore.

Donor reading is the reviewer's, not yours: `/moonshot-donor-review` the moment implementation
starts. `DONORS.md` already points at Odoo `pos_session.py` (open, count, close, difference posted
against the cashier) and `pos_hr` for the per-employee split. Merge before Definition of done.

## Constraints

- Money is integer minor units. Thresholds, the close hour, and whether a blind count is required
  are config keys on the restaurant, never literals, never a country switch.
- **A closed day is closed.** No reopen in v1 unless you can show why the alternative is worse; if
  you add one it is a P0 approval through ST's existing PIN door with an audit row, never a flag.
- A count that does not match is **recorded, not blocked**. Refusing to close on a mismatch means a
  cashier who is ₹50 short simply never closes, and you lose the signal you built the module for.
- Existing dirs untouched except the `index.js` export. Characterization test first if you must
  touch one.
- Any shortcut: `// DEBT(TD-nnn)` + a row in `TECH_DEBT.md`. **Next free id is TD-017** — check the
  table first, it has had two ID collisions already.
- Reply style: summary line first, short bullets. Long output on a page.

## Verify it against real data, not only fixtures

`test/e2e/journey.mjs` takes a real menu item through cart, checkout, kitchen, bill and payment on
any seeded restaurant, and `test/e2e/pricing-matrix.mjs` covers the arithmetic cases. Both are
uncommitted work by other sessions — read them before writing a third harness, and extend one
rather than starting over. The seed now carries tax blocks and tenders, so
`node test/e2e/journey.mjs res_meghana --as-seeded` reaches a paid bill with no stamping. A day
close that has never been run against a day built by that script is not done.

## Stop and ask Shaurya only for

A schema change; whether a short drawer blocks the close (recommend no, record it); who may close a
day (recommend MANAGER and ADMIN, reusing ST's roles); and whether a closed day can ever be reopened.
Everything else: pick the lazy default, write it in Decisions, continue.

Reviewers (`/moonshot-review`, `/moonshot-drift`) only look at registered sessions. Check your inbox
(`moonshot/reviews/inbox/<id>.md`) before saying done; answer what is there.

Usage: `Read moonshot/HANDOFF_DC_day_close.md and do it.`
