# Decisions · 2026-09-17 · print path, till orders, UPI QR

Twenty calls, answered by Shaurya in one sitting on 2026-09-17, against the Review sections of
`SPEC_KT_print_path.md`, `SPEC_OR_till_order_entry.md` and `SPEC_UQ_upi_dynamic_qr.md`.
The questions as they were put to him are preserved in `DECISIONS_WAITING_2026-09-17.md`.

Nothing was built. No donor review and no fan-out has run on any of the three sheets; both are
contract steps and both are still owed before implementation.

Three answers went **against** the sheet's own recommendation. Those carry a cost, the cost is
written next to them, and they are not to be re-opened by a later session on the grounds that
the sheet recommended otherwise. The sheet was advice. This page is the decision.

---

## KT · Print path

| # | Decision | |
|---|---|---|
| KT-D1 | **LAN printers plus a bridge, not Bluetooth.** A web page cannot open a TCP socket, so the till cannot reach a LAN printer directly. Rather than replace every printer with Bluetooth, a bridge does the talking | **against the sheet** |
| KT-D1b | **The bridge is a small box on the restaurant's own network** that pulls print jobs from our server and prints to the existing LAN printers | |
| KT-D2 | **Freeze `categoryId` on the placed line.** One additive field, copied from data the cart already holds, so routing reads frozen data and a reprint at 23:30 goes where it went at 20:52 | as recommended |
| KT-D3 | **Both the till and the kitchen tablet can print.** Which one, or both, is configured per restaurant at onboarding | |
| KT-D4 | **At-least-once.** A ticket may print twice, the second marked `REPRINT`; it must never print zero times | as recommended |
| KT-D5 | Print `Rs.` as a config string. Revisit `print.codePage` when the real printer is in the room | default taken |
| KT-D6 | The offline estimate prints through this same path, keeping a "show on screen" fallback in the same component | default taken |

### What KT-D1b and KT-D3 do to the sheet

The sheet's architecture assumed **the till holds the printer links** and polls a queue: claim a
job, print it, acknowledge it, with a lease that expires if the tablet sleeps. A bridge that
pulls jobs itself removes that whole design. No device holds a link. The till, the kitchen
tablet and the captain app all simply create jobs, so "both, configurable" costs nothing and
needs no Flutter printing code at all — which is what made KT-D3 affordable.

What survives: ticket content, routing by category, the `REPRINT` marker, at-least-once.
What is rewritten: the file layout, the phase plan, and every scenario whose failure mode was
"the till tablet is asleep" — that becomes "the bridge is offline".

### What the bridge costs, written down so it is not a surprise

- Hardware per restaurant and a setup visit. It is not a download.
- It needs its own internet connection to pull jobs.
- It is a second deployable: something to install, update, monitor and be blamed for. Filed as
  TD-032, because today it has no update or monitoring story at all.
- Bluetooth is not the fallback it looked like. The rejected option is recorded here so nobody
  re-discovers it: Web Serial over Bluetooth RFCOMM works on Chrome for Android from **Chrome
  148** (April 2026), not Chrome 138 as `STATE.md` recorded. Web Bluetooth is a dead end for
  receipt printers — it is BLE-only and they speak Bluetooth Classic SPP.

---

## OR · Till order entry

| # | Decision | |
|---|---|---|
| OR-1 | **A staff-only `table-openTable` endpoint.** No OTP. The session records who opened it instead of a guest's phone. The guest OTP path is untouched | as recommended |
| OR-2 | **No covers count in v1.** `openedBy` is still written — it is the audit record OR-1 depends on | **against the sheet** |
| OR-3 | **Counter tickets.** Takeaway and phone orders are ordinary table records listed in config; they open, bill, settle and vacate exactly like table 7 | as recommended |
| OR-4 | **Build `table-moveTable`**, as a phase that can be cut if the first release needs to be smaller | as recommended |
| OR-5a | **Un-merge stays as it is.** Releasing one child releases every child; the cashier re-merges the ones still wanted | **against the sheet** |
| OR-5b | **Merging two occupied tables is refused**, said plainly on screen, with Move offered instead | as recommended |
| OR-6 | **Opening an occupied table extends the live sitting and never mints a new one.** The four-hour expiry becomes a config key | as recommended |
| OR-7 | Order entry is refused with no connection; the cached menu is read-only, so a price can still be quoted | already in the sheet |

### The cost of OR-2

A night that runs without a covers count has lost its per-head average permanently. It cannot be
backfilled — there is no record anywhere of how many people sat at table 7. Per-head average is
a number restaurant owners watch.

This is an **accepted loss**, not an oversight. A later session must not add the field on the
grounds that it is cheap; it is cheap, and it was declined anyway. Filed as TD-031.

### The cost of OR-5a

Between "un-merge all three" and "re-merge the two I still want", tables 5, 6 and 7 all read
`vacant` while people are sitting at them. A walk-in can be seated on top of a live party, and
a guest scanning a QR at that moment lands in a cart that is about to be merged away.

The window is a few seconds of cashier taps. The alternative was roughly six lines in an
endpoint that already exists. **Accepted as a known foot-gun.** Filed as TD-030.

### The cost of OR-6, which reaches further than the till

`validateTableSession` is shared with the guest app, so extending a sitting on activity changes
session lifetime semantics for a guest's QR session too, not only the till's. That is the right
answer — a guest at a four-hour dinner should not be logged out mid-meal — but it is a change to
live guest behaviour and belongs in `STATE.md`, not only here.

---

## UQ · UPI dynamic QR

| # | Decision | |
|---|---|---|
| UQ-1 | **Accept the MDR. Build nothing about it. Never split a bill to dodge it** | as recommended |
| UQ-2 | **Paytm**, for 0 % on UPI | **against the sheet** |
| UQ-2b | **Ship phases 1–6 with no provider at all.** The Paytm adapter is phase 7, once a merchant account exists | as recommended |
| UQ-3 | **A public webhook endpoint on the production project is accepted**, with raw-body HMAC checked before anything is read, a constant-time compare, and the secret in Secret Manager | as recommended |
| UQ-4 | **A refund is recorded here and moved by a human** from the provider's dashboard. Our backend never holds a credential that can send money out | as recommended |
| UQ-5 | **The manual confirm escape hatch stays.** P0 audit row, a typed reference, a PIN | as recommended |
| UQ-6 | **Both payments holes are fixed in their own commit, before any UQ code** | as recommended |
| UQ-7 | The QR shows on the till screen; the guest points a camera at it | default taken |
| UQ-8 | **`qrcode` is approved** as a new dependency in the till | new dependency |
| UQ-9 | One webhook secret for the whole project, with a debt row | default taken |

### UQ-1, in full, because it is a product position and not a code decision

From **15 October 2026**, a UPI payment to a merchant above ₹2,000 costs the merchant 0.4 %,
capped at ₹300. The restaurant pays it and is not allowed to pass it to the guest. Merchants
under ₹1 lakh a month are exempt, which a single Bangalore outlet clears in about a fortnight.

Two consequences were decided, not just noted:

- **The pitch changes.** "UPI needs no hardware and costs nothing" stops being true. Roughly
  ₹1,200 a month on a ₹9 lakh UPI month. A card terminal is 1.5–2 %, so it is still the cheapest
  tender in the building, and that is the honest line to use.
- **We do not dodge it.** Two QRs of ₹1,075.50 instead of one of ₹2,151 pays nothing, and it is
  about five lines of code. It is in Out-of-scope on purpose. Fee avoidance designed into a
  product is very hard to remove once a restaurant depends on it.

Nothing in the code encodes 0.4 % or ₹2,000, so if the Supreme Court PIL filed around
16 September succeeds, we change nothing.

### The cost of UQ-2

Paytm charges 0 % on UPI where Razorpay charges about 2.36 % — on ₹9 lakh of UPI a month that is
roughly ₹21,000, which is a line item that can decide whether a restaurant buys the POS at all.
That is why it was chosen and the reason is sound.

What we give up is **documentation**. Paytm publishes no webhook retry policy, no dedupe key and
no ordering guarantee, and its checksum is "use our library". Razorpay publishes all four,
including an event id to dedupe on and an explicit "ordering is not guaranteed".

So phase 7 is written to **expect surprises and measure them**, not to trust a contract that was
never published. Before Paytm's confirmations are trusted to close a bill, the sandbox must
answer: does it retry, how often and for how long; is there any id stable across retries that we
can dedupe on; can two callbacks arrive out of order; what is the ack deadline. If the answers
are bad, the adapter is one file and one config key — that is the entire point of the shape.

### Why the payments module is being touched at all (UQ-6)

PY shipped green on 15 September and has not been touched since. Two real holes:

1. **A guest who scans twice.** The first screen looked stuck, so they paid again. The second
   ₹2,151 reaches the bank and PY **refuses to record it**, because the bill is already settled.
   That is money in the account with no row anywhere — the exact thing PY's own rule R6 exists
   to prevent for the overshoot case. It simply never met this one. This is a live bug today,
   with or without UPI.
2. **A webhook has no staff session**, and `take()` requires one.

Both get a characterization test first, in their own commit before any UQ code, so that if
something breaks it is obvious what broke it. Neither is a schema change and neither moves live
data.

---

## Debt created by these decisions

| Row | What | From |
|---|---|---|
| TD-026 | One global webhook secret, not one per restaurant | UQ-9 |
| TD-027 | A UPI refund is recorded but not sent; a human moves the money | UQ-4 |
| TD-028 | Nobody is alerted about unrecorded money; it needs someone to open a screen | UQ-3 |
| TD-029 | The signed-webhook happy path may be unprovable on the emulator (`rawBody`) | UQ-3 |
| TD-030 | Un-merge releases every child; a table reads vacant with people at it | OR-5a |
| TD-031 | Covers are not recorded; per-head average is unrecoverable for those nights | OR-2 |
| TD-032 | The print bridge is a second deployable with no update or monitoring story | KT-D1b |

## Still owed before any of this is built

- **Donor review** on all three sheets. Odoo's `pos_printer.py` and `restaurant_printer.py` are
  not in the local sparse clone yet and must be added first.
- **Fan-out second opinion** on all three sheets.
