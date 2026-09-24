# Plattr Pro RMS – Product Requirements Document (PRD)

Status: Living Document
Audience: Product, Ops, Engineering

> **Direction change, Sep 2026.** Plattr Pro is now being built to *replace* the restaurant's
> POS (Petpooja-class), not sit beside it. Two statements below are superseded:
> - §3 "Out of scope: Payments and invoicing" — **now in scope** (cashier till, GST bill, liquor
>   VAT block, UPI, card terminal, day close).
> - §12.4 "Table status conflicts: resolve using most recent update" — **superseded.** Last write
>   wins is the bug, not the fix; writes carry a version and conflicts are rejected.
>
> Source of truth for the new scope lives in three living artifacts (comment there, not here):
> Build Map · Spec Sheets · Table Edge Cases. Links in `~/.claude` memory
> `petpooja-replacement-strategy`. The rest of this PRD still describes what exists and remains valid.
>
> **Where that build has reached is §17**, added 2026-09-17: the eight go-live blocks with six built,
> and three product positions that changed — UPI's new fee, printing needing hardware on site, and
> takeaway not being separately reportable in v1.

## 1. Vision
Plattr Pro digitizes in-restaurant dining by connecting customers, servers, kitchen staff, and managers in a single real-time workflow. The system reduces table wait time, prevents order mistakes, and keeps staff aligned on the true state of each table and order.

## 2. Objectives
- Fast customer onboarding through QR and OTP.
- Accurate, low-friction ordering and customization.
- Real-time visibility for kitchen and servers.
- Simple restaurant configuration for admins.
- Multi-tenant scalability with data isolation per restaurant.

## 3. Scope
**In scope**
- Table onboarding and session control
- Menu browsing and item customization
- Cart and checkout workflows
- Kitchen fulfillment and server delivery
- Staff table and order management
- Admin configuration of menu, tables, and staff

**Out of scope**
- Payments and invoicing
- Loyalty and CRM
- Payroll and scheduling
- Advanced analytics beyond operational reporting

## 4. Personas
- **Customer**: wants fast access, clear menu, and reliable order tracking.
- **Server/Waiter**: needs quick table and order control with minimal taps.
- **Kitchen Staff**: needs a focused queue and easy status updates.
- **Admin/Manager**: needs configuration controls and operational oversight.

## 5. Product Principles
- Speed over complexity for staff workflows.
- Consistency of order status across all apps.
- Minimal friction at table onboarding.
- Safe defaults with confirmations for destructive actions.
- Clear recovery paths for errors and edge cases.

## 6. System Overview
Plattr Pro consists of four apps working against a shared backend:
- **Consumer App**: customer QR access, menu, cart, checkout, and tracking.
- **Server App**: waiter operations for tables and orders.
- **Kitchen App**: order preparation and readiness updates.
- **Admin App**: restaurant configuration and oversight.

The backend maintains shared data objects (restaurants, tables, sessions, menus, carts, orders, and staff) and broadcasts real-time state changes to each app.

## 7. High-Level Data Flow

### 7.1 Table Access and Session
1. Customer scans a table QR.
2. System validates table availability and location (if enabled).
3. If required, OTP is requested and validated.
4. A session is created or joined; table becomes active.
5. Session ends when the order is closed or after inactivity.

### 7.2 Menu to Cart
1. Customer opens the menu for the restaurant.
2. Customer selects items with variants and addons.
3. System validates selection and stock, updates totals.

### 7.3 Checkout to Order
1. Customer confirms cart and checks out.
2. A cart snapshot is attached to an active order.
3. Order becomes visible to the server app, and to the kitchen app unless the restaurant
   requires waiter confirmation first (see 9.4).
4. Cart is cleared for future rounds at the same table.

### 7.4 Fulfillment to Completion
1. Kitchen updates preparation status.
2. READY items notify servers.
3. Servers mark items served.
4. Order closes when all items are resolved.

## 8. Functional Requirements

### 8.1 Consumer App (Guest)
**Must have**
- QR entry with table verification.
- OTP flow with configurable requirements.
- Session restore while valid.
- Category-based menu browsing.
- Customization (variants, addons).
- Cart management and checkout.
- Live order tracking with clear status labels.

**Should have**
- Search and filter within menu.
- Lightweight offline handling and retry UX.
- Clear error recovery for invalid OTP or session expiry.

### 8.2 Server App (Staff)
**Must have**
- Orders list with status indicators and sorting by urgency.
- Tables list with capacity and status.
- Table detail view with status controls and OTP refresh.
- Order detail view with multi-cart history and item delivery checks.
- Menu availability toggles.
- Session-based staff login with expiry handling.
- Notifications for READY items and new orders.
- Confirm or reject a guest-placed order, where the restaurant requires it (see 9.4).

**Should have**
- Assignment filtering (“my tables”).
- Historical order view per table.
- Clear offline or stale data indicators.

### 8.3 Kitchen App
**Must have**
- Active orders queue sorted by recency and priority. Where waiter confirmation is
  required, unconfirmed rounds are absent from this queue entirely — they are not shown
  as pending work (see 9.4).
- Status updates across the preparation pipeline.
- Clear visibility into item-level notes and modifications.

**Should have**
- Filters by table or server.
- Large format display for shared kitchen screens.

### 8.4 Admin App
**Must have**
- Menu management: categories, items, variants, addons, pricing, stock.
- Table management: add/edit tables, capacity, status.
- Staff management: create/update servers and assignments.
- View active orders and operational status.

**Should have**
- Historical orders with filtering and export.
- Role-based permissions for managers vs staff.

## 9. Shared Platform Concepts

### 9.1 Multi-Cart Order Model
Orders behave like a shared table tab. Each checkout creates a cart snapshot that rolls up into a single order total. This supports multi-round ordering without starting a new bill.

### 9.2 Menu and Inventory
- Items can be in or out of stock.
- Variants and addons affect price and customization rules.
- Availability changes should propagate quickly to customers.

### 9.3 Sessions
- Sessions link customers to a table and enable shared ordering.
- Multi-user sessions may be enabled or disabled.
- Session validity is time-bound and ends on inactivity or order closeout.

### 9.4 Waiter-Confirmed Ordering (optional, per restaurant)

**Confirm before kitchen.** A table of four at a busy Friday dinner adds a Mutton Biryani
₹380, two Butter Naan and a Coke, then argues for five minutes and drops the biryani. With
open QR ordering the kitchen has already started it. With this on, the order sits at the
table's card on the waiter's phone instead; the waiter walks over, reads it back, and taps
**Send to kitchen** — that tap is the first time the kitchen sees it. If the table has
changed its mind, the waiter rejects it and nothing was ever cooked. Without this, a
restaurant that has been burned by cancelled QR orders turns QR ordering off completely
and goes back to a waiter with a paper pad — which is exactly what the restaurant that
asked for this had already done.

**Off by default.** A restaurant that is happy with unattended QR ordering sets nothing and
nothing changes for them.

**The order is still the guest's.** The bill, the totals and the offers are the same
whether the gate is on or off; confirmation controls only when the kitchen is told.

## 10. State Models

### 10.1 Table State
- Vacant → OTP Pending → Active → Vacant
- Active → Vacant also happens by the clock: a sitting untouched for `floor.idleFreeAfterMinutes`
  (60) that owes nothing is ended by a five-minute sweep with an audit row; a fully paid table nobody
  cleared goes the same way. Open money is never freed by the clock (decided 2026-09-22, FL-S36). The
  paid-table half is the less certain call and is one line to reverse.
- Active → Vacant by hand: a table that owes nothing can be freed by anyone, the captain's Vacant or
  the cashier's Clear. A table that still owes (unbilled food or an unpaid bill, the group's for a
  merged child) can only be freed by the cashier, with a PIN and a reason, and the audit row names
  the amount walked away from. A captain is refused outright (decided 2026-09-24, Shaurya).
- Disabled is an admin override state
- Reserved is a staff-held state, set and cleared by the waiter (decided 2026-09-08,
  see 16.1). It is outside the self-service lifecycle: a customer scanning a reserved
  table gets 403 "This table is reserved. Please ask the staff to seat you." The waiter
  seats the party by setting the table to Vacant, after which the normal
  Vacant → OTP Pending → Active flow applies.

### 10.2 Session State
- Active
- Expired
- Ended

### 10.3 Order State
- In Progress
- Completed
- Cancelled

### 10.4 Fulfillment State (Cart/Item)
- Awaiting Confirmation → Pending → Preparing → Ready → Served
- Awaiting Confirmation only exists where the restaurant requires waiter confirmation
  (see 9.4); everywhere else a checkout begins at Pending
- An unconfirmed cart has exactly two moves: the waiter confirms it, or it is cancelled
- Cancelled and Returned are terminal outcomes

## 11. Notifications and Real-Time Updates
- READY items notify servers.
- New order assignment should notify the responsible server.
- **Gap:** where waiter confirmation is required, nothing yet pushes "a table is waiting to
  be confirmed" to the waiter — they have to be looking at the Pending tab. Server push
  exists but sits behind `sendServerNotifications` (default off) and has no wording for
  this event. Food does not start cooking until someone taps, so this is the failure mode
  to watch in the first restaurant that runs it.
- Optional future alerts: table assistance, low stock, or out-of-stock events.

## 12. Edge Cases and Scenarios

### 12.1 Customer Onboarding
- Table disabled: user is blocked with clear guidance.
- Location mismatch: user prompted to retry with location enabled.
- OTP expired: user retries with a regenerated OTP.
- Secondary user joins: behavior follows multi-user rules.

### 12.2 Ordering
- Item goes out of stock mid-session: block add-to-cart and refresh menu state.
- The same for an add-on: one switched off, not listed on the dish, or unknown is refused at add and
  re-checked at checkout — never dropped silently, never billed at ₹0 (2026-09-23, TD-015).
- A table's cart belongs to the sitting that filled it: the next party never sees, sends or pays for
  the last party's unsent items, and only the table's own live session may write it (2026-09-23, TD-033).
- Empty cart on checkout: block and prompt to add items.
- Invalid customization: show error and reset to valid choices.

### 12.3 Fulfillment
- READY marked while server offline: notification queued or visible in orders list.
- Partial serving: order remains open until all items resolved.
- Returned items: tracked in order history and totals.

### 12.4 Staff Ops
- Session expired mid-shift: re-auth flow with minimal disruption.
- Table status conflicts: resolve using most recent update and audit trail.
- Menu availability toggled during active orders: does not alter existing carts.

## 13. Operational Requirements
- Mobile-first performance for customer app.
- Clear offline and retry behavior for staff apps.
- Data isolation per restaurant.
- Auditability of staff actions (status changes, menu changes).

## 14. Success Metrics
- Time from QR scan to first order.
- Time from checkout to READY.
- Percentage of READY items served within SLA.
- Reduction in table turn time.
- OTP error rate and recovery rate.

## 15. Risks and Gaps
- Location validation may be simplified or disabled in some deployments.
- Cart writes (add/remove/clear/get) authorize on the table having an active session,
  not on the caller holding it, so anyone with the QR values can edit an occupied
  table's cart. Checkout is caller-scoped and unaffected. Open as of 2026-09-08.
- Historical order reporting may be limited in early releases.
- Notification reliability depends on device token integrity.
- Final naming alignment of statuses must be confirmed.

## 16. Open Decisions
- Exact session timeout and inactivity thresholds.

### 16.1 Decided
- **Reserved tables and OTP (decided 2026-09-08).** Reserved means the table is held by
  staff — a physical reserved card sits on it. A customer who scans it anyway is told to
  ask staff, and the waiter either re-seats them or sets the table to Vacant to seat them
  there. Rationale: it matches what already happens on the floor, needs no new UI, and
  keeps the OTP lifecycle untouched. Reserved is deliberately NOT auto-vacated by the
  inactivity cleanup, because a held table has no activity to measure.
  Implementation: `TABLE_STATUS.RESERVED` guards in `validateTableAndLocation` and
  `validateOTP` (403); the guard sits after the valid-session check, so a party already
  seated keeps access if staff flip the table to reserved mid-meal.
- SLA targets for kitchen and server performance.


---

## 17. POS replacement — where the build stands (2026-09-17)

The direction note at the top of this document says Plattr Pro now replaces the restaurant's POS
rather than sitting beside it. This section says how far that is, so a reader does not have to open
three spec sheets to find out. Engineering detail lives in `moonshot/`; this is the product view.

### 17.1 Go-live blocks

Eight capabilities stand between the current apps and a restaurant that can open its doors on
Plattr Pro alone. Six are built and tested; two are specified and not yet started.

**Built**

- **Staff PIN & approvals.** A captain tries to void a ₹1,250 pitcher; the screen asks for the
  manager's PIN and records who approved it. *Without this, anyone can void anything and there is no
  name on it.*
- **GST bill & numbering.** Pizza ₹500 at 20% off prints as ₹400 taxable, ₹10 CGST, ₹10 SGST, on
  invoice 0417 in an unbroken run. *Without this the accountant rebuilds the month by hand, and then
  vetoes us.*
- **Liquor block.** A Kingfisher at ₹499 sits in its own block on the same bill, outside GST, never
  mixed with the food lines. *Without this every pub and brewery in Bangalore is off the table.*
- **Payments & tender capture.** Cash, card and UPI recorded against the bill, with refunds, voids
  and round-off. *Without this the money that came in is a guess.*
- **Day close & cash count.** 23:30, the cashier counts ₹42,100 against an expected ₹42,300; the
  ₹200 gap is logged against her shift and the day still closes. *Without this there is no handover
  and no daily number the owner trusts.*
- **Offline mode.** The internet drops at 20:40; the till still shows the bill, takes the tender and
  shows an estimate from cache on screen, and reconciles when it returns. The estimate is not printed:
  the printer is driven through the server, so paper waits for the connection and the real bill
  prints then (decided 2026-09-22, KT sheet Decisions). *Without this the first outage on a
  busy night is the last night they use us.*

**Specified, not built**

- **Print path.** Table 7's pizza ticket prints in the kitchen, the beer ticket at the bar, the bill
  at the counter. *Without this the kitchen works off a screen nobody looks at and the guest gets no
  paper.* See §17.2 — it needs hardware.
- **Till order entry.** Two walk-ins at 21:00 with no phone; the cashier punches their order, and it
  lands on the same bill as anything the table ordered by QR. *Without this every walk-in and phone
  order happens on paper and Plattr never sees that money.*
- **Aggregator orders.** 20:14, a Swiggy order for two biryanis at ₹450 lands; the kitchen ticket
  prints within seconds, the order is accepted before Swiggy gives up, and the ₹900 shows in the
  night's sales under "Swiggy" with the payout owed, never on a GST bill and never in the cash
  drawer. *Without this the restaurant keeps the Petpooja tablet next to us and we have replaced
  nothing.* Added 2026-09-22; goes through UrbanPiper, see §17.2.

### 17.2 Three positions a reader of this PRD needs

**UPI is no longer free to accept.** From 15 October 2026 a UPI payment above ₹2,000 costs the
restaurant 0.4%, capped at ₹300, and the fee cannot be passed to the guest. A ₹2,151 bill costs
₹8.60; a ₹1,999 bill costs nothing. Roughly ₹1,200 a month for a restaurant taking ₹9 lakh on UPI.
Two consequences are decided and not negotiable inside the product:

- The pitch changes from "UPI costs nothing" to "UPI is still the cheapest tender you have" — a card
  terminal is 1.5–2%.
- **We do not split a bill into sub-₹2,000 QRs to avoid the fee**, although it is about five lines of
  code. Fee avoidance designed into the product is very hard to remove once a restaurant depends on
  it. Recorded in `moonshot/SPEC_UQ_upi_dynamic_qr.md` Out of scope.

**Printing goes through the kitchen tablet.** A browser cannot open a TCP socket, so the staff till
cannot talk to a network printer directly. The first print agent is the Flutter kitchen app already
on a tablet in the kitchen: it pulls print jobs from us and drives the restaurant's existing LAN
printers (decided 2026-09-18, KT-D1c). No hardware to ship, no install visit; the cost is that a
tablet asleep or unplugged prints nothing until it wakes, and the till says so. A small box on the
LAN remains the second implementation behind the same protocol for a restaurant with no kitchen
tablet. Three product calls signed 2026-09-22 and not certain, so written down: paper-out is caught
by a person and fixed with a Reprint until a printer that reports it is on the bench; a ticket older
than 30 minutes when the tablet wakes is not printed by itself, it is counted on the till and printed
by one tap; the offline estimate stays on screen. Each is one config key or one line to reverse. Two limits
added 2026-09-23 with the screen-off service: after a tablet reboots, printing resumes only when
someone opens the kitchen app (Android does not let an app open itself at boot); and a staff login
lasts 12 hours, so a tablet logged in at 10:30 stops printing at 22:30 until someone logs in again
(TD-051). The till's red line catches both within 90 seconds.

**Swiggy and Zomato orders are a receivable, not a sale we invoice.** Since January 2022 the platform,
not the restaurant, pays the GST on food ordered through it (section 9(5)). So a Swiggy order gets a
kitchen ticket and a line in the channel report, but it cannot take an invoice number, cannot be
settled to cash or card, and its money arrives days later as a net payout after commission. The
restaurant still reports the figure in its return; we store what the platform sent so the accountant
never types it from the partner panel. We reach both platforms through UrbanPiper, because neither
opens its API to a POS this size; that is a flat fee per outlet the restaurant pays, and the menu
is pushed from us, which is why a dish gets an aggregator price.

**Takeaway works but is not separately reportable.** Phone and counter orders run as ordinary tables
named as counter tickets, so they bill, settle and close exactly like table 7 with no special cases.
Since 2026-09-23 a counter ticket carries the flat packing charge (₹20.00, taxed like a service charge)
and not the service charge, because the ticket's own document names the charge rows it takes; the till
draws the tickets in a Parcels strip under the floor. What the owner cannot yet ask is "how much of
last month was takeaway". That becomes one field and a report query when the split is worth having.

**The everyday bills that are not a plain table (built 2026-09-23).** A staff meal or a complimentary
dish is a discount with a reason on a numbered bill — the whole table through the till's Comp (PIN
every time), one dish through the line discount — and the day close lists what was given away by
reason, so "staff meal ₹4,200 across 6 bills" is a line the owner reads every morning. "Put it on my
account" is a tender of its own kind: the bill closes as money **owed**, never as cash, a receivable
names who owes it, and the cashier collects it days later on cash or card from the till's account
page; the day close shows the owed line apart from the drawer. A tip is typed by the cashier on the
payment, never guessed from the change, never on the bill and never taxed; cash tips sit in the drawer
until a `tip payout` movement takes them out, card tips are reported per staff. The guest's note
("no onion") is frozen on the placed line so the kitchen ticket prints it.

### 17.3 After go-live

The order the first month is expected to need: owner report pack, a readable audit trail, and two
imports. A card terminal, basic inventory and a Tally export are priced separately and are not
go-live blockers. Swiggy and Zomato moved into the go-live blocks on 2026-09-22.

- **Menu import.** The owner hands over the Petpooja menu export; 400 dishes, prices, categories and
  tax buckets land in Plattr without retyping. *Without this the switch costs a weekend of data
  entry and most owners will not start.*
- **Sales-history import (parked, important).** The owner wants last Diwali's numbers next to this
  one's. No vendor in this market has a standard export, so whatever spreadsheet arrives is
  normalised by a cheap LLM call into one fixed shape, a human confirms the mapping, and we import
  day totals and the 90-day item mix. Old bills are never imported as bills and the invoice series
  is never touched. *Without this the owner loses year-on-year comparison, which is a reason to
  delay switching, not a reason to refuse.*
