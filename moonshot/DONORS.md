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
| ERPNext core | not cloned | `git clone --depth 1 --filter=blob:none --sparse https://github.com/frappe/erpnext.git && git sparse-checkout set erpnext/controllers` for `taxes_and_totals.py` |
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

**Day close, shifts, cash count**
- Odoo `addons/point_of_sale/models/pos_session.py`. Open, count, close, difference posted against the cashier.
- Odoo `addons/pos_hr/models/pos_session.py`, `single_employee_sales_report.py`. Per-employee split of one session.

**Order lifecycle, lines, totals**
- Odoo `addons/point_of_sale/models/pos_order.py`. Line snapshot, totals, state machine.
- SambaPOS `Order.cs`, `OrderStateValue.cs`. Per-line state values, the pattern behind item-level status.

**Tax and totals**
- ERPNext `erpnext/controllers/taxes_and_totals.py` (clone first). Discount-before-tax, inclusive decomposition, per-line tax split.
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
