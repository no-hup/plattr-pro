# Critical Existing Pieces

The parts of Plattr Pro that are expensive to get wrong, ranked by cost of changing them
once restaurants are live. Everything else in the POS build reads from these.

**The test applied throughout:** how expensive is this to change after 50 restaurants have
real data in it? Code is cheap. Written data is not.

| Rank | Piece | Cost to change later | Why |
|---|---|---|---|
| 1 | Line snapshot | Very high | Data already written. You cannot go back and ask what the price was. |
| 2 | Menu structure + tax label | High | Restaurants have typed 400 dishes into it. |
| 3 | Order lifecycle | Medium | Everything reads it, but it is code, not data. |
| 4 | Pricing logic | Low | A pure function. Change it, rerun the fixture. |
| 5 | Offer application | Low | Same, provided its output lands in the snapshot. |

---

## 1. Line snapshot — the joint

**What it is.** What a line remembers forever once its round is placed, versus what stays a
live reference to the menu.

**Why it is first.** Menu, pricing, order lifecycle and tax all meet here. It is the only one
of the five that is *data* rather than code.

**Cautionary example.** Odoo stores a line's discount as a percentage — a bare number like
`20`. So Odoo cannot express "₹699, less ₹200". The happy-hour placard scenario does not fit
their line. Fifteen years and thousands of restaurants later, they are still stuck with it.
That was not a bug. It was a snapshot shape chosen once and frozen.

**What must be true.**
- Every line carries its own: list price, discount amount, discount source, taxable value,
  tax block, rate, and computed tax components.
- Discount is stored as an **amount**, never only a percentage. A fixed-price offer must be
  expressible.
- The discount source is either an offer ID, or a reason plus an approver. Never blank.
- Variants and add-ons each carry their own price, discount and tax label. Not inherited at
  read time.
- Nothing downstream recomputes a price. Billing sums snapshots; it does not re-price.
- A line's snapshot is frozen when its round is placed, not when the bill prints.
- Reading a line must never require the menu item to still exist.

**Deliverable before any POS code is written.** One page listing every field, marked frozen
or live, plus a golden fixture covering: happy-hour fixed price, two-for-one, bill-level
discount apportioned across lines, split bill, credit note.

---

## 2. Menu structure and the tax label

**What exists.** Categories, items, variants, add-on groups with min/max, availability.
Nesting is item → variant → add-on.

**Why it is critical.** Every other system reads it: pricing, ordering, kitchen routing, tax,
reports, aggregator sync. And it is the one place real data gets entered by hand.

**The tax label is the part that cannot be retrofitted.** Each item must declare which tax
block it belongs to — GST food, or Karnataka VAT liquor. Nothing downstream can fix a missing
or wrong label, because the bill's whole structure follows from it.

**What must be true.**
- Every item declares a tax block. No default, no null.
- Tax block carries mode (inclusive or exclusive) and its components (e.g. CGST 2.5 + SGST 2.5),
  not a single flat rate.
- Variants and add-ons can carry their own tax label, and inherit the parent's only when unset.
- Items declare a kitchen routing category, used to pick kitchen vs bar vs counter printer.
- An item removed from the menu must not break orders that already reference it.
- HSN/SAC code per item, required for the GST bill.

**Nesting note.** The nesting depth decides what the snapshot must hold. Three levels (item,
variant, add-on) is what we have and what we keep. Combos are deliberately modelled as their
own menu item, not as a fourth level or as an offer — that decision is what keeps a single
tax label per line valid.

---

## 3. Order lifecycle

**What exists.** Order state machine, multi-round carts grouped per table session, table
sessions locked by OTP, cart status cascading to items.

**Why it is critical.** Everything reads it, and two known bugs already live here: orders that
are served but unpaid disappear from the server app, and the table can be released while other
rounds are still open.

**What must be true.**
- **States are separate axes, not one enum.** Kitchen progress, service, and payment are three
  independent things. Kitchen progress must never ride on the payment field, and void is its
  own axis, not a payment status.
- A line marked sent to the kitchen is locked. Quantity cannot be reduced without an approval.
- A table is released only when no open bill remains anywhere in its group, including merged
  tables and split bills.
- A paid or printed bill cannot move backwards. Changes become a cancel or a credit note.
- Ordering stops once the bill is requested.
- Void and comp keep the line, flip a counts-toward-total flag, and record reason and approver.
  Nothing is ever deleted.
- Concurrent writes carry a version. Last-write-wins is the bug, not the fix. (The PRD's old
  "resolve using most recent update" line is superseded.)

---

## 4. Pricing logic

**What exists.** `calculateItemPrice` in `cart/calculateCartValue.js`, applying discounts
per-component rather than to the summed total. Charges in `orders/calculateCharges.js`.

**Why it ranks low despite handling money.** It is a pure function. Its cost of change is one
test run — provided its output lands correctly in the line snapshot.

**What must be true.**
- Discount is taken before tax. Always.
- Bill-level discounts are apportioned onto lines in proportion to net price (list − offer −
  line discount), *before* tax is computed, leftover minor unit on the last line, and the
  apportioned share is stored on the line.
- Inclusive prices decompose with one helper: `price × rate ÷ (100 + total rate)`, per
  component, with an explicit decimal count.
- Tax parts are computed per component. Default `tax.partRounding: independent`: each part is
  rounded half-up on its own, so CGST and SGST print equal (8.33 + 8.33 on ₹333) and may
  exceed the single-rate figure by one minor unit. `residualLast` gives the single-rate figure
  with the residual on the last part (8.32 + 8.33). A block is the sum of its lines, never a
  second calculation.
- Rounding happens once, on the payable total. Tax lines stay exact.
- No figure is ever accepted from the client. Everything recomputes server-side.

---

## 5. Offer application

**What exists.** Offers V2, auto-applied at checkout. Types: percentage, flat, buy-one-get-one.
Scopes: order, category, item. Conditions: minimum bill, required items, order history.
Validity: start and end dates.

**What is missing, in priority order.**
1. **Fixed price** — "this item at ₹499". The happy-hour placard case. Cannot be expressed today.
2. **Day and time window** — Mon–Thu, 15:00–17:00, in the restaurant's timezone. Start inclusive,
   end exclusive.
3. **Order type condition** — dine-in, takeaway, delivery.
4. **Best-one-wins** — when several offers match a line, the one saving the guest most applies,
   and the bill names which. No stacking unless the offer explicitly allows it.
5. **Manual override at the till** — remove an auto-applied offer, or apply a discount by amount
   or percent, with a reason and a manager PIN. This is the escape hatch that caps how
   configurable the engine needs to be.

**What must be true.**
- An item has one list price. Offers produce discounts, never a second price.
- An offer price is in the same mode (inclusive or exclusive) as the menu it belongs to.
- Price locks at round placement. Editing a live offer does not touch rounds already placed.
- Every discount lands in the line snapshot with its source.
- A free item stays on the bill as a quantity with a 100% discount. Stock falls by two, tax on
  one. This is an excise requirement, not a cosmetic choice.

**Deliberately not supported.** Combos as offers, coupon codes, customer-segment offers,
stacked offers, bank-card offers, loyalty points. All fall back to the manual override.

---

## What to do first

1. Write the line snapshot field list. One page.
2. Write the golden fixture against it, before any POS code.
3. Get the first customer's accountant to sign the fixture once.

No scenario is closed until a test fails without the fix.
