# Handoff · plan and build PY · Payments

Register first: `/moonshot-session start PY payments`.
Read, in order: `moonshot/CLAUDE.md`, `moonshot/STATE.md`, `moonshot/SPEC_ST_staff_pin_and_approvals.md`
(the template and the module you reuse for PIN), then `moonshot/SPEC_BL_billing_and_tax.md` for the
bill object only (its Objects block and finalise/cancel/credit-note scenarios; skip its Decisions).
From `moonshot/CRITICAL_EXISTING_PIECES.md` read section 3, Order lifecycle. For existing code,
start from "Read these to copy the shape" in CLAUDE.md. Follow "Writing a sheet" and "Building a
module" in CLAUDE.md exactly.

Task: PY · Payments on branch `moonshot`. Take a finalised bill to paid. Tenders, split by amount,
change, refund against a credit note, and a paid mark nothing else can set. Gateways (UPI QR, card
terminal) are later modules that will call PY; PY is the ledger, not the pipe. There is no sheet yet;
you write it.

BL is being built in parallel by another session (`plattr-pro-9a`, see the session registry). Its
bill object is your input. Read its sheet, do not redesign it. If PY needs a field BL does not have,
write the ask in one line to `moonshot/reviews/inbox/<their id>.md` and carry on with a fake adapter.

Steps
1. Plan page `moonshot/reviews/<date>-PY-plan.md` in the shape of `reviews/2026-09-15-BL-plan.md`:
   what exists today and what is wrong with it (start at `orders/orderConstants.js` PAYMENT_STATUS
   and every writer of `paymentStatus`), phases, calls you will make, open questions for Shaurya
   with a default on each. Then STATE.md In flight. Show Shaurya. Wait for a yes.
2. Sheet `moonshot/SPEC_PY_payments.md`. Real rupees in every scenario. Draft → fan-out → decide.
   Shaurya reads Review before sign-off only.
3. Test skeleton, then blind Opus + fan-out. Merge. Show the final skeleton. Wait for a yes.
4. Implement in Files order: `domain/payments.ts` → `adapters/firestore/payments.ts` →
   `app/payments.ts` → `api/payments.ts` → till `features/payments/`. Domain and app run against a
   fake bill so nothing waits on BL. E2E and Playwright run once BL's finalise endpoint exists;
   until then they are `todo` with the reason on the line.
5. `/moonshot-donor-review` the moment implementation starts. Odoo's payment models are not in
   the sparse set; the reviewer adds `addons/point_of_sale/models/pos_payment.py` and
   `pos_payment_method.py` (disk is near full, sparse only) and updates `DONORS.md`.
6. Definition of done in CLAUDE.md. Commit per scenario ID. Do not push.

Constraints
- Money is integer minor units, tenders and thresholds are config, no country switch. The BL plan
  page's portability knobs apply here unchanged.
- `order.paymentStatus` keeps working for the Flutter apps: mirror it from PY's own state in one
  line, log the debt, do not extend it.
- Existing dirs untouched except `index.js` export and the mirror above. Characterization test first
  if you must touch one.
- Any shortcut: `// DEBT(TD-nnn)` + row in `TECH_DEBT.md`. Any "for now / later" → Decisions table.
- Reply style: summary line first, short bullets. Long output on a page.

Stop and ask only for: a schema change, a change to BL's bill object, who may refund, or a money
rule the accountant must answer (rounding per tender, refund tender). Everything else: pick the
lazy default, write it down, continue.
Reviewers (`/moonshot-review`, `/moonshot-drift`) only look at registered sessions. Check your inbox
(`moonshot/reviews/inbox/<id>.md`) before saying done; answer what is there.
