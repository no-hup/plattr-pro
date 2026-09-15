# Donors

Open-source POS code we read, never run. Ours first, then theirs, and never the same eyes: the
sheet is written without looking here, and a fresh agent (`/moonshot-donor-review`) reads the files
below before it reads the sheet, then reports what we forgot. The builder does not read donors.

## Where the code is

Clones live outside the repo at `~/Desktop/moonshot/donors/`, so greps in this repo never see them.
Disk on this machine is near full: sparse and shallow only, never a full clone.

| Donor | Pinned | Recreate |
|---|---|---|
| Odoo 19 Community | `0055716` (2026-09-13) | `git clone --depth 1 --filter=blob:none --sparse https://github.com/odoo/odoo.git && cd odoo && git sparse-checkout set addons/point_of_sale/models addons/pos_restaurant addons/pos_hr addons/pos_discount` |
| URY (ERPNext restaurant) | `71b59ed` (2026-09-08) | `git clone --depth 1 https://github.com/ury-erp/ury.git` |
| SambaPOS v3 | 5 files, no git | `Samba.Domain/Models/Tickets/{Ticket,Order,OrderMerger,OrderStateValue,TicketEntity}.cs` from `github.com/emreeren/SambaPOS-3` |
| Dolibarr TakePOS | 3 files, no git | `htdocs/takepos/{invoice,floors,split}.php` from `github.com/Dolibarr/dolibarr` |
| ERPNext core | `9be19e6` (2026-09-15) | `git clone --depth 1 --filter=blob:none --sparse https://github.com/frappe/erpnext.git && cd erpnext && git sparse-checkout set erpnext/controllers` for `taxes_and_totals.py` |
| India Compliance | not cloned | `github.com/resilient-tech/india-compliance`, the audit-trail app. Verify the path after cloning |

The folder also holds `_plan-artifact-rev4.html` (research digest, adopt-or-emulate table, lift list),
`_table-edge-cases-artifact.html` and `_edgecases_ordering_tables.md` (45 table scenarios, sourced).

## By concern

Paths are relative to the donor's clone. Line numbers are as of the pinned commits.

**Approvals, PIN, discount limits**
- Odoo `addons/point_of_sale/models/pos_config.py:116` `restrict_price_control`, `:178` `manual_discount`. Gates are config flags on the shop, not code.
- Odoo `addons/point_of_sale/models/res_users.py:20` and `addons/pos_hr/models/hr_employee.py:34-44`. Role is derived, two values: manager or cashier.
- Odoo `addons/pos_hr/models/hr_employee.py:57-66`. Employee PINs go to the browser SHA1-hashed and are checked there. **Do not copy.** A 4-digit space against a captured hash is minutes of work.
- URY `ury/ury/doctype/ury_order/ury_order.py:2016`. Discount gated by POS Profile flags. `:1946` hard-codes `MAX_DISCOUNT_PERCENTAGE = 100`. **Do not copy** the literal.
- Dolibarr `invoice.php:272`. Delete, quantity, price and discount are separate rights.

**Void, cancel, what the kitchen sees**
- SambaPOS `Ticket.cs:76-78` lock and unlock, `:473` `CancelOrders`, `:490` only unlocked orders cancel. Unsent is free, sent needs the void path.
- Odoo `addons/pos_restaurant/models/pos_session.py:19-35` `last_order_preparation_change`. A snapshot of what the kitchen was last told, per line; cancel prints the diff. This is the "kitchen has this" marker.
- URY `ury_order.py:1921-1940` `cancel_reason` is stored, and `ury/ury/report/cancelled_invoices/` is a report of its own.
- Odoo `addons/point_of_sale/models/pos_order.py:1239` cancel, `:1426-1453` refund. A finalised order is never edited; a refund is a new reversing order. Dolibarr does the same with credit notes (`invoice.php:663`).

**Payments, tenders, change, refunds**
- Odoo `addons/point_of_sale/models/pos_payment.py:20-46`. The tender row: method, amount, its own time, session, cashier, the acquirer's card/auth/txn fields, `is_change`, and a unique client uuid. The shape to copy.
- Odoo `addons/point_of_sale/models/pos_payment.py:60-70`. A payment cannot be edited on a posted order; a tender must be one the shop's config allows.
- Odoo `addons/point_of_sale/models/pos_payment.py:74-93`. Change is a cash row of its own, netted against the first cash tender so the drawer shows one movement.
- Odoo `addons/point_of_sale/models/pos_payment_method.py:23-60`, `:115-121`, `:139-153`. Tenders are config; cash/bank/pay-later is derived from the journal; a method cannot be edited while a session using it is open.
- Odoo `addons/point_of_sale/models/pos_payment_method.py:202-212`, `:230-240`. UPI/QR as a method type with a validated account, plus a blank QR precomputed so it works offline.
- Odoo `addons/point_of_sale/models/pos_order.py:194-195`, `:874-898`. Server recomputes paid from the rows; paid is checked at the transition and raises. **`:197-204` reads the change off the client anyway — do not copy.** `:621-622` only warns on overpay.
- Odoo `addons/point_of_sale/models/pos_order.py:626-685`. Every add, change and removal of a tender written to the order's own log with old and new method and amount.
- Odoo `addons/point_of_sale/models/pos_order.py:786-796`, `:889-898`. Round only the cash residual; non-cash pays its exact share; tolerance is half the rounding unit.
- Odoo `addons/point_of_sale/models/pos_order.py:1390-1451`. Refund is a new reversing order in the currently-open session, `amount_paid` 0, its own number; no open session, no refund.
- Odoo `addons/point_of_sale/models/pos_session.py:756-818`. What day close reads: cash in/out with reason and cashier, expected cash, every non-cash method with amount *and count*.
- Odoo `addons/point_of_sale/models/pos_session.py:654-716`, `:1879-1904`. Counted cash stored, difference posted per method; cash-move and cash-move-delete are two separate rights, deletes logged. **`:401-408` forces counted = theoretical in a rescue session — do not copy.**
- Odoo `addons/point_of_sale/models/report_sale_details.py:121-134`, `:376-421`. Day totals come off the payment rows, not the orders; cash moves appear in the same list.
- SambaPOS `Ticket.cs:251-267`, `:280-290`, `:436-441`. Payments and change are two lists; removing a tender removes its ledger transaction with it; money is `decimal`.
- SambaPOS `Ticket.cs:79-86`, `:169-173`, `:811-814`. A ticket will not close with a remainder; `PaidItems` tracks which lines are already settled, so a table pays item by item across tenders.
- URY `ury/ury/doctype/ury_order/ury_order.py:1997-2055`. Split tender as a list of `{mode_of_payment, amount}`, rebuilt server-side; on a merged bill each tender is capped at each invoice's total so nothing double-counts. **`:2067-2070` appends the client's amounts unchecked on the plain path.**
- URY `ury/ury/api/payment_terminal.py:41-89`. The card-terminal contract — start / status / cancel, cancel explicitly advisory — and a default that refuses honestly instead of faking approval.
- URY `ury/ury/doctype/sub_pos_closing_payment/sub_pos_closing_payment.json:12-48`. Per-method close sheet where expected and difference are permission-gated, so the counting cashier counts blind.
- URY `ury/ury/hooks/ury_pos_closing_entry.py:11-70`. The main till cannot close over an open sub-till, and a sub-cashier cannot make the day-close entry.
- Dolibarr `invoice.php:342`, `:415-473`, `:540-546`. The settle is one rolled-back transaction; the amount is clamped to the remainder server-side; the bill flips to paid only at zero. **`:188` takes money as a PHP float off the request, `:193-201` hard-codes the tender codes, `:425` takes change from the browser.**
- Dolibarr `invoice.php:344-367`, `:549-561`. A refund is a credit note that must point at a real validated invoice for that customer.
- Dolibarr `split.php:66-138` and URY `ury/ury/doctype/ury_order/ury_order.py:545-570`. Splitting by moving lines to a second bill, not by amount — the other half of BL-S12.
- Nobody. A tender chosen at the till refused for overshoot while one already in the bank is recorded. `businessDate` frozen on the row. Status that downgrades. A void bounded by day close.

**Day close, shifts, cash count**
- Odoo `addons/point_of_sale/models/pos_session.py`. Open, count, close, difference posted against the cashier.
- Odoo `addons/pos_hr/models/pos_session.py`, `single_employee_sales_report.py`. Per-employee split of one session.

**Order lifecycle, lines, totals**
- Odoo `addons/point_of_sale/models/pos_order.py`. Line snapshot, totals, state machine.
- SambaPOS `Order.cs`, `OrderStateValue.cs`. Per-line state values, the pattern behind item-level status.

**Tax and totals**
- ERPNext `erpnext/controllers/taxes_and_totals.py`. Discount-before-tax `:901-955`, inclusive decomposition `:308-347`, per-item tax split `:677-715`, rounding `:717-732` and `:835-854`, discount on the grand total `:959-1000`, returns `:239-244` and `:868-882`. Reviewed blind for BL 2026-09-15; the merge is in the BL sheet's Decisions.
- Nobody. Liquor VAT and GST on one bill is ours. Unbroken invoice series across offline is ours.

**Offline and sync**
- Odoo `addons/point_of_sale/static/src/app/` dirty-tracking and replay. Copy the pattern, not the limit: their session cannot open offline. Reserved offline numbering exists nowhere.

**Printing**
- Odoo `addons/pos_restaurant` printer routing per category. Odoo `pos_printer` is not in the sparse set; add it when KT is built.

**Audit trail**
- India Compliance audit-trail app (clone first). Tamper-evident records for GST.

## Don'ts we already know
Client-side PIN checks. Hard-coded limits. Percent-only discounts on a line (Odoo; breaks fixed-price
offers). A session that needs the network to open. Editing a finalised document instead of reversing it.
