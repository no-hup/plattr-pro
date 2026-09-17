# Handoff · plan and build OF · Offline & sync

Register first: `/moonshot-session start OF offline and sync`.

Read, in order: `moonshot/CLAUDE.md`, `moonshot/STATE.md`, then the three sheets that have already
parked work on you and named it: `moonshot/SPEC_BL_billing_and_tax.md` (BL-S20, the **Counter**
object, and R3 — a number is handed out only at issue, inside the transaction),
`moonshot/SPEC_PY_payments.md` (Out of scope: offline tenders; and the Review row "Offline is OF's:
no internet, no payment"), `moonshot/SPEC_DC_day_close.md` (Decisions 2026-09-16, money arriving
after a close). Read `moonshot/CRITICAL_EXISTING_PIECES.md` whole — offline touches every path in
it. From `moonshot/DONORS.md` read "Offline and sync" and "Don'ts we already know". For existing
code shapes, start from "Read these to copy the shape" in CLAUDE.md. Follow "Writing a sheet" and
"Building a module" in CLAUDE.md exactly. Your plan page is step 0 and it is yours to write — do
not lift one from a reviewer.

Task: **OF · Offline & sync** on branch `moonshot`. The line goes down at 20:40 on a Saturday with
30 tables seated. The till has to keep taking orders, keep printing bills whose GST numbers have no
holes in them, and keep taking money — and when the connection comes back, nothing is lost, nothing
is charged twice, and no number is reused. Reports are RP. Printing is KT.

## This module is different: the architecture is a decision, not an implementation detail

The four modules before you (ST, PY, BL, DC) fitted the shape that was already there. This one may
not, and Shaurya expects that.

- Phase 0 is **two** things, not one: the 5–10 line phase plan in `STATE.md` In flight, **and** a
  written architecture proposal for Shaurya on its own page.
- The contract is explicit that the stack, a schema change, and a module boundary are Shaurya's
  calls and not yours. Offline plausibly wants all three. Get a written yes before phase 1.
- Do not open with code that quietly assumes one of the answers. A queue written before the
  decision is a vote cast before the meeting.
- The proposal names, at minimum: where offline state lives, what the till is allowed to do with no
  server, how a replayed action is recognised as the same action, and what changes on the documents
  that four modules already write.

## What already exists — inherit, do not re-invent

- **The till has exactly one door out.** `frontend/till/src/api/client.ts` is the only `fetch` in
  the app; the credential challenge (`requires: 'pin'|'otp'|'password'`) is handled there once, not
  per screen. Whatever you queue, queue at that door. A second HTTP path is a banned dependency in
  disguise.
- **The till never touches Firestore.** The layering rule says it talks to Cloud Functions only, so
  the Firestore SDK's own offline persistence is not available to it as the app is built today.
  That is a real tension. Name it in the sheet and let Shaurya decide it; do not quietly cross the
  line, and do not pretend it is not there.
- **Invoice numbers are handed out at issue, inside the transaction.** `domain/invoice.ts` has
  `counterKey()` and `nextNumber()`; the counter is `restaurants/{id}/counters/{series}_{fiscalYear}`
  = `{next}`. **There is no reserved range in the code.** BL-S20 promises one and nobody has built
  it, and `DONORS.md` says plainly that reserved offline numbering exists in none of the donors.
  This is the hard part of the module and it has no reference implementation to copy.
- **Three money paths already refuse rather than guess when they cannot read.** `billing-issue`,
  `payments-take` and `dayClose-close` each do their work inside a Firestore transaction, and PY's
  R15 refuses the write when the day-close state is *unknown*. Offline changes the meaning of
  "cannot read". Every one of those refusals has to be revisited on purpose, with a scenario ID
  against it — not softened in passing.
- **Nothing anywhere takes a client-supplied request id.** Grep `domain/`, `app/`, `adapters/` for
  idempotency and you find none. A queue replayed without one takes the same ₹1,840 twice.
- **Every act already writes an audit row and carries a `cid`.** A replay must not write the row
  twice, and a night that ran offline must still be able to say it was *observed*, not merely
  quiet (TD-005, and MN reads these).
- **One till and one cash drawer per restaurant** is Shaurya's standing call (TD-018). Two tills
  offline at the same time is a different and much harder problem. If you need it out of scope,
  that goes in the sheet's Out-of-scope block with its reason, before the code that depends on it.

## Shape

Module shape as in CLAUDE.md: `domain/offline.ts`, `app/offline.ts`,
`adapters/firestore/offline.ts`, `api/offline.ts`, `frontend/till/src/features/offline/` — unless
your approved architecture says otherwise, in which case the sheet says why in one line. Domain
holds the rules — what may be done with no server, what a replay may and may not do twice, how a
reserved range is spent and how the unused tail is returned — and knows nothing about Firestore or
about the browser.

Donor reading is the reviewer's, not yours: `/moonshot-donor-review` the moment implementation
starts. `DONORS.md` points at Odoo `addons/point_of_sale/static/src/app/` for dirty-tracking and
replay, with the warning attached: copy the pattern, not the limit — their session cannot open
offline. Merge the report before Definition of done.

## Constraints

- Test skeleton first with hand-computed expected values, then the blind second opinion, then red
  before green. "Building a module" in CLAUDE.md, in that order. Every `OF-Sn` ends up as a test name.
- Never weaken, skip or delete a test to get green. Never ship a check without proving it can fail:
  green on a clean tree and red on a planted failure, both pasted.
- **No new dependency without asking.** An offline queue is exactly where a library gets smuggled
  in. If you want one, name it and ask.
- Money is integer minor units. Any window, retry count, queue depth or threshold is a config key
  on the restaurant doc with a default, never a literal.
- Existing dirs untouched except the `index.js` export. Characterization test first if you must
  touch one.
- Any shortcut: `// DEBT(TD-nnn)` + a row in `TECH_DEBT.md`. **Next free id is TD-022** — check the
  table first, it has had two ID collisions already.
- Reply style: summary line first, short bullets. Long output on a page.

## Verify it against a network that actually fails

A module about the network breaking cannot be proved by unit tests alone.

- `test/e2e/journey.mjs` walks a real menu item through cart, checkout, kitchen, bill and payment on
  any seeded restaurant (`node test/e2e/journey.mjs res_meghana --as-seeded`), and
  `test/e2e/pricing-matrix.mjs` covers the arithmetic cases. Both are other sessions' uncommitted
  work — read them before writing a third harness, and extend one rather than starting over.
- At least one check must **cut the connection in the middle of a live bill and bring it back**, and
  prove the number series and the payment ledger both survived it. An offline module that has never
  run with the emulator genuinely unreachable is not done.
- Emulator slots: `EMU_SLOT=N ./emu.sh` from `backend/src-plattr/`, ports = base + slot × 100.
  Slots 0 and 1 are usually taken by other sessions. Take your own, and write which one in
  `STATE.md` In flight so nobody wipes your data underneath you.

## Stop and ask Shaurya only for

The architecture proposal above — always, before phase 1. Then: whether the guest QR app has to work
offline too or only the staff till; whether a bill may be **issued** offline at all or only parked;
and what a day close does when a till still has unsynced rows. Everything else: pick the lazy
default, write it in Decisions, continue.

Reviewers (`/moonshot-review`, `/moonshot-drift`) only look at registered sessions. Check your inbox
(`moonshot/reviews/inbox/<id>.md`) before saying done; answer what is there.

Usage: `Read moonshot/HANDOFF_OF_offline_and_sync.md and do it.`
