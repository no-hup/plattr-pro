# KT · Print path

Status: **v3, 2026-09-18 — KT-D1c revises who the print agent is; see the Decisions table.** Nothing built. Written against BL (built), ST (built), OF (built, uncommitted),
the live order code (`orders/createOrUpdateOrder.js`, `cart/updateCartStatus.js`) and the Flutter kitchen app.
Fan-out and donor review not yet run. **All six Review calls were answered by Shaurya on 2026-09-17**
and are now rows in Decisions; this sheet has been rewritten around them. The one that reshaped it:
**KT-D1 chose LAN printers behind a bridge**, so no browser holds a printer link and the "till is the
print station" design in draft v1 is gone.

**Job.** Put paper in three places: the food ticket in the kitchen, the drink ticket at the bar,
the bill at the counter. Say out loud when the paper did not come out, and never let a printer that is off stop
an order from being taken.

---

## The build map's hypothesis is wrong, and this is the correction

The build map says: import `esc_pos_utils_plus` for the bytes, `flutter_thermal_printer` for the link.
Both are **Dart packages**. The staff till is Vite + React + TypeScript (locked in `moonshot/CLAUDE.md`), so
neither can be used at all. Nothing is salvageable from them but the idea.

The contract also says "Printing: LAN (TCP 9100) first, Web Serial over Bluetooth second". **A browser cannot
open a TCP socket.** There is no API for it and there never has been: a page gets HTTP, WebSocket and
WebTransport, all of which a ₹6,000 thermal printer speaks none of. So "LAN 9100 first" is not a preference we
can act on from a React till — it is only reachable through a piece of software that is not the browser.

What actually works on Chrome for Android, as of today:

| Path | Works? | What it needs |
|---|---|---|
| **Web Serial over Bluetooth RFCOMM** — *works, but **rejected** by KT-D1* | **Yes.** Desktop since Chrome 117; **Android since Chrome 148** (beta 8 Apr 2026, full support M149) | The printer paired once in Android Settings; a user gesture to grant the origin the port; `navigator.serial.requestPort({ allowedBluetoothServiceClassIds: ['00001101-0000-1000-8000-00805f9b34fb'] })` — that UUID is Bluetooth SPP |
| **Web Bluetooth (GATT)** | No, for the printers people buy | Web Bluetooth is BLE-only. Almost every ESC/POS receipt printer is Bluetooth **Classic SPP**, which Web Bluetooth cannot see at all. This is the trap the earlier note walked into |
| **WebUSB over OTG** | Probably, unverified | Chrome Android has WebUSB; a USB printer claimed by no Android driver can be opened. Not tested here, and it occupies the tablet's only port. **UNVERIFIED** |
| **Web Serial over USB on Android** | Not yet dependable | Android's own Serial API arrives "2026Q2 on a limited set of devices" per the Chromium PSA. A Bangalore tablet is not on that list. **UNVERIFIED for our hardware** |
| **`fetch()` to a LAN printer's IP** | No | No TCP; and even for Epson's ePOS-Print HTTP endpoint, an HTTPS page cannot call `http://192.168.x.x` (mixed content), so a hosted PWA is blocked before the printer is reached |
| **A Cloud Function opening 9100** | No | The printer is behind the restaurant's NAT. There is no route from Google's network to it |
| **A local print bridge** — **CHOSEN, KT-D1.** A box on the LAN that **pulls** jobs from our Cloud Functions over HTTPS and speaks TCP 9100 to the printers | Yes | A box per restaurant and a setup visit. Because it pulls, it is never addressed by a browser, so no certificate and no mixed-content problem |

There were exactly two honest v1 shapes: **Bluetooth printers driven straight from the browser**, or **LAN
printers behind a bridge**.

### Decided 2026-09-17 (KT-D1, KT-D1b): LAN printers behind a bridge

**A small box on the restaurant's own network** — Raspberry-Pi class, roughly ₹4,000 — pulls print jobs
from our server, opens TCP 9100 to each printer, and acknowledges. The printers the restaurant already
owns keep working. Bluetooth was rejected: it means replacing every printer, the units common in India
at counter sizes are 58 mm portables, Chrome 148 is recent enough that an old tablet would simply not
print, and range through a kitchen wall at 21:00 was never tested.

**This is not the bridge the draft feared.** The draft's objection was that a bridge on the LAN cannot be
reached from an HTTPS page without a real certificate, which would force it onto the tablet and make it an
app. That objection dies once the bridge **pulls** instead of being called: it talks outbound to our Cloud
Functions exactly as the till does, over HTTPS, and no browser ever addresses it. Nothing on the LAN needs
a certificate because nothing on the LAN is a server to us.

**And it makes KT-D3 free.** The draft made the till the print station, which meant a sleeping tablet
printed nothing. With a bridge, **no device holds a link at all** — the till, the Flutter kitchen app and
the captain app all simply cause jobs to exist, and the bridge prints them. So "both the till and the
kitchen tablet can print" (KT-D3, signed) costs nothing and needs no Flutter printing code, which is what
made it affordable. What the till keeps is the *status line*: it is still where a human sees that the bar
printer is not answering.

**What it costs**, written down rather than discovered later: hardware per restaurant and a setup visit;
its own internet connection to pull jobs; and a second deployable with no update or monitoring story yet
(TD-032). The bridge is the one piece of this system that runs somewhere we cannot see.

The queue below is unchanged by the decision. A job is claimed with a lease and acknowledged, exactly as
drafted — the only difference is **who claims it**. Draft v1 said "the till"; it now says "a print agent",
which is the bridge by default and may be the till.

### Revised 2026-09-18 (KT-D1c): the first agent is the kitchen tablet, not a box. Delegated by Shaurya.

KT-D1's architecture stands. The queue, the lease, the ack, the status line, at-least-once — all
unchanged. What changes is the default answer to "who claims it", and one thing upstream of it.

**The donor review offered a third path and it is rejected.** URY's `websocket_print` is a browser
tab with a hidden iframe calling `window.print()` (`websocket_print.js:41-57`). It addresses the
printer **not at all** — paper comes out of whatever that tab's default printer is. Our job statement
is *three* printers in three places: food to the kitchen, drinks to the bar, the bill to the counter.
One default printer cannot do that. It also marks the invoice printed with no subscriber listening
(`ury_print.py:185-192`). This is the same call the last row of Decisions already makes: a browser
print dialog is not a receipt path.

So the honest choice was the bridge box, or the Flutter kitchen app — which is Dart, so unlike the
React till it *can* open a TCP socket (`dart:io`), and it is already installed on a tablet in the
kitchen and already updated through the Play Store.

**What made that a real choice: move the encoder to the server.** Draft v1 put the ~70 lines of
ESC/POS encoding in the till because the till was the print station. With a queue, that is the wrong
side of the wire. The server already renders the ticket and pads every row to `charsPerLine` (R2, R3)
— it should render the last inch too, and put **bytes** on the job document rather than rows.

The agent then has no ticket logic in it at all: pull a job, open TCP 9100, write the bytes, ack.
That is about thirty lines and no arithmetic, in whatever language the agent happens to be. The
encoder stays exactly where the sheet wanted it — one implementation, in TypeScript, with a jest test
against a hand-written expected byte string — instead of being duplicated per agent.

**So:**

- **Agent #1 is the Flutter kitchen app.** No hardware, no setup visit, nothing new to deploy or
  monitor. It ships in an app we already build and already push updates to.
- **The bridge box is not cancelled, it is demoted to the second implementation.** Same protocol,
  same job document, no rework — the day a restaurant's tablet proves unreliable, or a restaurant has
  no kitchen tablet, the box drops in behind the identical contract.
- **TD-032 is deferred, not solved.** The moment we ship a box, the update-and-monitoring story is
  owed. Today we do not ship one.

**Why this is the practical call for both sides.** The restaurant pays ₹0 instead of ₹4,000 and gets
no setup visit, using the tablet it already owns. We ship no hardware, support no hardware, and keep
the one piece of this system that runs where we cannot see it out of the product until something
forces it. The first live restaurant is reachable without a supply chain.

**What it costs, written down rather than discovered later.**

- A sleeping, unplugged or pocketed tablet prints nothing. This is the bridge's real advantage and we
  are giving it up on purpose.
- The agent needs a foreground service and a wake lock, and on Android 16 the local-network
  permission. None of that is exotic; all of it is unverified on the actual tablet — see the
  hardware-in-the-room list.
- Agent changes ship at Play Store speed, not at our speed.

**What makes it safe is the reconciler, and it is now load-bearing rather than a nicety.** URY runs a
cron every minute that finds orders with no ticket, prints a duplicate, tags it `Duplicate` and logs
it (`ury_kot_validation.py:12-36`, with a one-minute grace window so an order still being typed is
not swept). With a box, that is a good idea. With a tablet as the agent, it is what turns "the tablet
was asleep for four minutes" from lost food into a late ticket that announces itself. Build it in the
same phase as the agent, not after.

---

## Who can do what

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) |
|---|---|---|---|
| A KOT prints because a round was placed | – (nobody: the system does it) | – | – |
| Reprint a KOT | – | ✓ (recorded on the job) | ✓ |
| Print the bill at issue | – | ✓ | ✓ |
| Reprint an issued bill (DUPLICATE) | – | ✓ (ST audit P1) | ✓ (ST audit P1) |
| Print the emergency estimate | – | ✓ (OF rules) | ✓ |
| Kick the cash drawer with no sale | – | PIN (ST, P0) | PIN |
| Pair a printer / set stations | – | – | ✓ (config doc + Android Settings) |

Nothing here is a new permission. Reprint and drawer already exist as ST actions.

---

## Scenarios

Money in rupees for reading; every stored value is minor units. Hours are the restaurant's.
Restaurant is `res_meghana`: food block GST 2.5 + 2.5 exclusive, liquor block no tax part.

| ID | Scene and what happens | Tag |
|---|---|---|
| KT-S1 | **First ticket of a round.** 20:14, table 7, the captain sends one Chicken Biryani ₹450 and one Butter Naan ₹60. The round is placed; two seconds later the kitchen printer produces a ticket: `TABLE 7`, `#42-1`, `20:14`, `1 × Chicken Biryani`, `1 × Butter Naan`, and the captain's name. No prices anywhere on it. **Without this the kitchen reads orders off a screen nobody looks at on a Friday.** | Engine |
| KT-S2 | **Second round, same table.** 20:41 the same table adds two Kingfisher pints. The bar printer produces `#42-2` with only the two pints on it. The biryani is not on this ticket, and nothing reprints. **Without this the kitchen re-cooks the first round every time the table orders again.** | Engine |
| KT-S3 | **One round, two stations.** 20:52 a single Send carries a Margherita ₹500 and two Kingfisher pints ₹260. Two tickets: `#42-3 KITCHEN` with the pizza, `#42-3 BAR` with the pints. Each ticket says `1/2` and `2/2` so the captain can see one is missing. Neither ticket lists the other's items. **Without this the bar never hears about the beer, or the kitchen fires a pizza the bar already has.** | Engine |
| KT-S4 | **Held until the waiter confirms.** The restaurant runs `ordering.requireWaiterConfirmation: true`. A guest's phone places two biryanis at 21:03. No ticket prints. The waiter confirms at 21:05 and both tickets print then, timed 21:05. A rejected round never prints at all. **Without this the kitchen cooks an order the restaurant had not accepted.** | Engine |
| KT-S5 | **The chef lost the ticket.** 21:20 the ticket for `#42-3` is gone under a pan. The cashier taps Reprint on that round. The same ticket comes out with `REPRINT 2` in the header and the time of the reprint beside the original time. The job records who reprinted it and when. **Without this the kitchen phones the counter and reads items off a screen.** | Manual |
| KT-S6 | **The bill at the counter.** 22:10 table 7 asks for the bill. Cashier issues it; the bill is queued for `print.counterStation` and the bridge prints it: 80 mm paper, restaurant name and address, `Tax Invoice`, GSTIN, bill `A/0417`, date and time, table, food block with taxable 1,010.00, CGST 25.25, SGST 25.25, liquor block 520.00 with no tax part, round-off −0.50, `TOTAL Rs. 1,580.00`, place of supply, reverse charge `No`. **Without this the guest gets no paper and nothing filed matches what was taken.** | Engine |
| KT-S7 | **The printer is off.** 20:14 the bar printer is switched off at the wall. The pizza ticket prints; the beer ticket does not. The order is placed all the same. The bridge's TCP connect times out, it does not acknowledge, and the till shows a red line: `BAR printer not answering — 1 ticket waiting`. The job stays in the queue and the bar's own kitchen screen still has the round on it. When the printer comes on the waiting ticket prints by itself. **The same scenario covers the bridge itself being off or offline** — jobs queue, the till goes red, nothing is lost. **Without this an order silently half-exists and nobody knows which half.** | Engine |
| KT-S8 | **Out of paper.** 21:35 the kitchen roll runs out mid-ticket. The link accepts the bytes; the paper sensor answers `paper out`, or does not answer at all. Either way the job is **not** acknowledged and the till says `KITCHEN printer out of paper — 2 tickets waiting`. The chef loads a roll; the bridge's next poll prints both in order, each marked `REPRINT`, and the cashier can force it sooner with Retry on the till. **Without this half a ticket on the floor counts as a printed ticket.** | Engine |
| KT-S9 | **No internet at the till.** 20:45, the till's 4G is gone. Printing is unaffected: the bridge has its own connection and is still pulling and printing rounds placed by the guest app and the captain app. What the till loses is its status line and the ability to issue a bill. Table 12 wants to leave: the emergency estimate (OF-S7) is rendered by the till from its own cache and **queued locally on the till**, so it prints when either the till or the bridge can reach the server; if neither can, the cashier turns the tablet round and the guest photographs it. **Without this an outage takes away the one piece of paper the guest needs.** | Engine |
| KT-S23 | **The bridge is unplugged.** 20:30 the cleaner unplugs the box. Rounds are placed, jobs queue, no paper anywhere and the kitchen screen carries every round as usual. The till's status line reads `No print agent has claimed a job since 20:28 — 6 tickets waiting`, and the same line goes to the log for MN. Plugged back in at 20:41, all six print in order, marked `REPRINT` only if they had been claimed before. **Without this the one component we cannot see fails silently and the first person to notice is a guest.** | Engine |
| KT-S10 | **Two agents, one ticket.** A second bridge is installed at the bar, or a till is added to `print.agents` (KT-D3). Both poll at 20:52. Exactly one prints `#42-3 BAR`: the first to claim it holds a lease of `print.claimLeaseSeconds` (60), the second is told it is taken and prints nothing. If the first loses power before it acknowledges, the lease expires and the second prints it, marked `REPRINT`. **Without this every ticket comes out twice, and two chefs cook it twice.** | Engine |
| KT-S11 | **Cancelled after the ticket printed.** 21:40 the guest walks out. The manager cancels the round; its biryani is already on a spike in the kitchen. A **cancel ticket** prints at the same stations that got the original: `*** CANCELLED ***`, `#42-1`, `TABLE 7`, `1 × Chicken Biryani`, the reason, the name. Paper is never edited; a second ticket is how paper is corrected. **Without this the kitchen serves food for a table that left.** | Engine |
| KT-S12 | **Two became one.** 21:44 a table cuts two biryanis to one on a sent line. ST already treats that as a void of one quantity. A cancel ticket prints for `1 × Chicken Biryani` only, and the remaining one is not reprinted. **Without this the kitchen plates two and the bill charges one.** | Engine |
| KT-S13 | **Variant and add-ons on 80 mm.** `Paneer Tikka (Full) + Extra Cheese, no onion` at 48 characters a line prints as `1 x Paneer Tikka`, then `    (Full)`, then `    + Extra Cheese`, then `    ! no onion` in double height. Names longer than the line wrap with a four-space hang, never truncate. **Without this the chef reads half a dish name and guesses the rest.** | Engine |
| KT-S14 | **Liquor on the guest's paper.** The same bill KT-S6: the liquor block prints its own heading and its own total with no tax lines under it, and the document title is `Invoice-cum-Bill of Supply` because an exempt block is on the page. BL decides that; KT only prints what BL says. **Without this the bill claims GST on alcohol.** | Engine |
| KT-S15 | **Credit note.** 22:40 the coke was never served on the paid bill 0417. BL issues `CN-0007`. The printed note carries `Credit Note`, its own number, the original number and date, the reversed line as a negative, and the negative tax. **Without this the refund has no paper and the return does not tie.** | Engine |
| KT-S16 | **The guest lost the bill.** 22:50 they ask for another copy. It prints with `DUPLICATE` across the header and writes an ST audit row, P1, amount = payable. The bill document is untouched. **Without this a second copy is indistinguishable from the first and the second-copy trick leaves no number.** | Manual |
| KT-S17 | **The drawer.** A cash payment of ₹1,580 is taken: the drawer kicks off the counter printer's RJ11 the moment the payment succeeds. A no-sale open goes through ST first (PIN, P0) and only then kicks. **Without this the cashier props the drawer open all evening.** | Engine |
| KT-S18 | **A 58 mm printer at the bar.** The bar has a cheaper 58 mm unit: 32 characters a line. The same round prints with columns recomputed, nothing overflowing and nothing cut off. One config key, no code. **Without this every ticket at the bar is a ragged mess and the totals do not line up.** | Config |
| KT-S19 | **A dish nobody mapped.** A new "Mocktails" category is added in Admin and never mapped to a station. Its lemonade prints at `print.defaultStation` (kitchen), and the till says once, quietly, `Mocktails has no station`. It is **never** dropped. **Without this a new category silently stops reaching anyone, and the first person to notice is a guest at 22:00.** | Engine |
| KT-S20 | **The agent restarted mid-ticket.** 20:53 the bridge reboots while `#42-3 BAR` is half-written — half a ticket is on the floor. Nothing was acknowledged, so after the lease the job is claimed again and printed in full, marked `REPRINT`. A ticket may print twice; a ticket may never print zero times (KT-D4, signed). **Without this a power blink eats an order.** | Engine |
| KT-S21 | **Rupees on paper.** The bill total ₹1,02,450.00 prints as `TOTAL          Rs. 1,02,450.00`, right-aligned at 48 characters, with `Rs.` and not `₹`, because the printer's code page has no rupee glyph. Indian digit grouping is used. **Without this the total prints as `TOTAL ?1,02,450.00` and the guest queries every bill.** | Config |
| KT-S22 | **Aggregator and label printing.** A Swiggy order needs a ticket, and a parcel needs a label. | No (out of scope, v1) |

**Without this:** the kitchen works off a screen it does not look at, the bar never hears about the beer,
and a guest who wants to pay by cash at 22:10 leaves with nothing in their hand.

---

## Rules

- **R1 Printing never blocks an order.** The round is placed, the line snapshots are written and the kitchen
  screen updates whether or not any printer is on. A print job is created in the same transaction as the round;
  everything after that is outside it. A Cloud Function never waits for paper.
- **R2 A ticket's content is pure, its bytes are not.** `domain/kot.ts` turns line snapshots plus config into a
  **ticket**: an ordered list of already-padded text rows with style flags. It contains no ESC/POS byte, no vendor
  name and no currency symbol (R9 of BL applies here too). The encoder that turns rows into bytes is a vendor
  adapter and lives in the **print agent** — the bridge, not a browser.
- **R3 The server renders, the agent transmits.** The print agent receives tickets, not bills: it never lays out
  a legal document, never formats money, never decides a station. It encodes rows into bytes and writes them. The one thing the till renders by itself is the
  offline estimate, because by definition no server can be reached (OF-S7), and that is six rows of text with no
  tax and no number.
- **R4 A KOT is queued server-side, claimed with a lease, and acknowledged.** One job document per
  (round × station), id `${cartId}_${stationId}`, so a retried write can never make a second job. A job is
  `queued → claimed(by, until) → printed(at, by)`. An expired lease returns it to `queued`. **At least once, never
  zero times**: a ticket printed twice is a chef's shrug, a ticket printed never is food that does not exist.
- **R5 A held round prints nothing.** A job for a cart behind the waiter-confirmation gate is created `held` and
  released by the same write that flips `line.sent` (`lineSnapshots.js markLinesSent`). A rejected round's jobs are
  dropped, never printed, because the kitchen was never told (the same reasoning ST used for a free void).
- **R6 Paper is never edited, only added to.** A cancel, a quantity cut and a reprint are each a **new ticket**.
  Nothing on paper is ever amended, and any ticket that is not the original says so in its header (`REPRINT n`,
  `CANCELLED`, `DUPLICATE`).
- **R7 Unknown is not success.** A job is acknowledged only when the write completed **and** the printer's status
  query answered without an error flag. No answer inside `print.statusTimeoutMs` is `unknown`, and unknown leaves
  the job queued and the till loud. Cheap clones that do not implement `DLE EOT` are the reason this is a config
  key per station (`print.stations.<id>.statusQuery`, default true) rather than an assumption.
- **R8 The screen is the state, the paper is a notification.** The Flutter kitchen screen and the printed KOT are
  two views of one round, and the screen is the one that is true: it carries status, timers and voids live. The
  paper is a fire-and-forget copy of what the round was at the moment it was placed. A restaurant may run with
  either, both, or a screen and no paper (`print.stations.<id>.enabled: false`).
- **R9 The routing key is frozen on the line.** A round placed at 20:14 routes by what the menu said at 20:14,
  not by what it says when the ticket is reprinted at 23:30. Routing therefore reads a field on the line snapshot,
  never the live menu (CRITICAL_EXISTING_PIECES rank 1: nothing downstream re-reads the menu).
- **R10 Every number on paper comes from a snapshot.** KT reads `bill.lines[]`, `bill.blocks[]` and the frozen
  `seller` block, exactly as BL froze them. KT never adds, never rounds, never re-orders. A figure on paper that
  BL did not compute is a bug in KT.
- **R11 A KOT carries no money.** No prices, no offers, no totals. The kitchen does not need them, and a price on a
  kitchen ticket is a second place for the guest's money to be wrong.
- **R12 One door for the printer, and no browser is behind it.** Every byte reaching a printer is written by the
  print agent's `link.ts`. No screen opens a port, no page addresses the bridge, and `window.print()` is not used
  for anything (a browser print dialog on an Android tablet at 22:10 is not a receipt path).
- **R13 The agent pulls; nothing on the restaurant's network is addressable.** The bridge calls `print-pending`,
  `print-claim` and `print-ack` outbound over HTTPS, authenticating as a device of that restaurant. We never open
  a connection into a restaurant, so there is no inbound port, no certificate on the LAN and no mixed content.
  It is also why the bridge needs its own internet: with none, it prints nothing, which is KT-S7's shape exactly.

---

## Objects

**Ticket** (what `domain/kot.ts` and `domain/receipt.ts` produce; never stored, computed on read)

```ts
type Row  = { text: string; align?: 'l' | 'c' | 'r'; bold?: boolean; big?: boolean }
type Ticket = {
  kind: 'kot' | 'cancel' | 'bill' | 'duplicate' | 'creditNote' | 'estimate'
  stationId: string
  charsPerLine: number        // from config; the rows are ALREADY padded to it
  copies: number
  rows: Row[]
  cut: boolean
  drawer: boolean             // kick the drawer after this ticket
}
```

Rows arrive padded, so the encoder does no arithmetic. Two-column rows (`Chicken Biryani` … `450.00`) are built in
the domain, where `charsPerLine` is known and a test can assert the exact string.

**Print job** `restaurants/{id}/printJobs/{cartId}_{stationId}`

| Field | What |
|---|---|
| `jobId, restaurantId, cid, orderId, cartId, stationId` | identity; `cid` is the order's correlation id, so the whole life of a round is one grep |
| `kind` | `kot` or `cancel` |
| `ticketNo` | `${orderNumber}-${cartIndex}`, what a human says out loud |
| `part, parts` | `1 of 2` when one round went to two stations |
| `heldUntilSent` | true behind the waiter gate (R5) |
| `state` | `queued` \| `claimed` \| `printed` \| `dropped` |
| `claimedBy, claimedUntil` | the **print agent's** id (the bridge's `agentId`, or a till's register id) and the lease instant |
| `prints[]` | `{at, by, marker}` — one row per time paper came out; length > 1 is a reprint |
| `createdAt` | epoch ms, server clock |

Nothing else. The ticket's **content** is not stored on the job: it is rendered server-side from the line
snapshots at claim time, so a reprint at 23:30 shows the same round (lines are frozen) with an honest new header.

**A bill has a job too, now.** In draft v1 the till printed the bill itself because it had the bill in its hand.
With no browser on the wire that is no longer possible: the bill is queued for the counter station like any other
ticket, `kind: 'bill'`, and the bridge prints it. The cashier still sees it succeed or fail on the till's status
line, and a dead counter printer is still recovered by a reprint from `billing-get` (KT-S16). This is the one
place the bridge decision **added** work rather than removing it.

---

## Config keys (on `restaurants/{id}/config/settings`, field `print`, with defaults)

Served to the till through the existing `approvals-config` answer — the till's one config read. No new door.

| Key | Default | Used by |
|---|---|---|
| `print.stations` | `{ kitchen: {label:'KITCHEN', charsPerLine:48, enabled:true, copies:1, statusQuery:true}, bar: {label:'BAR', …}, counter: {label:'COUNTER', …} }` | KT-S3, S18 |
| `print.stations.<id>.address` | `''` — the printer's `host:port` on the restaurant LAN, e.g. `192.168.1.51:9100`. Read by the bridge only; never by a browser | KT-S7 |
| `print.stations.<id>.charsPerLine` | 48 (58 mm units set 32) | KT-S13, S18 |
| `print.stations.<id>.copies` | 1 | KT-S1 |
| `print.stations.<id>.enabled` | true (false = screen-only station) | R8 |
| `print.stations.<id>.statusQuery` | true | R7, KT-S8 |
| `print.route` | `{}` — `categoryId → stationId` | KT-S3, S19 |
| `print.routeByTaxBlock` | `{ liquor: 'bar' }` — the fallback when a category is unmapped | KT-S3 |
| `print.defaultStation` | `kitchen` | KT-S19 |
| `print.counterStation` | `counter` — where bills, credit notes and estimates go | KT-S6 |
| `print.retryCount` | 2 | KT-S7 |
| `print.retryDelayMs` | 2000 | KT-S7 |
| `print.statusTimeoutMs` | 3000 | R7 |
| `print.pollSeconds` | 5 | KT-S1 |
| `print.claimLeaseSeconds` | 60 | KT-S10, S20 |
| `print.agents` | `['bridge']` — which agent kinds may claim a job. `['bridge','till']` lets a till claim too (KT-D3) | KT-S10, KT-D3 |
| `print.connectTimeoutMs` | 3000 | KT-S7 — how long the bridge waits on a TCP connect before calling the printer unreachable |
| `print.currencyText` | `Rs.` | KT-S21 |
| `print.codePage` | 0 (PC437) | KT-S21 |
| `print.kotShowsPrices` | false | R11 |
| `print.billCopies` | 1 | KT-S6 |
| `print.reprintMarker` / `print.cancelMarker` / `print.duplicateMarker` | `REPRINT` / `CANCELLED` / `DUPLICATE` | R6 |
| `print.footer` | `''` (e.g. "Thank you · FSSAI 12345678901234") | KT-S6 |
| `print.drawerPulseMs` | 25 | KT-S17 |
| `print.cutAfterTicket` | true | KT-S1 |

Every number above is a key because a 58 mm bar printer, a slow clone and a kitchen that wants two copies are all
one restaurant's settings, not a branch. `restaurantId ===` remains a lint failure.

---

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← OR / checkout | one print job per (round × station), written in the placing transaction | no round, no job; nothing to print |
| ← ST | `line.sent` decides when a held job releases; `reprint` and `openDrawer` are ST actions with audit rows | ST refuses, no paper, no drawer |
| ← BL | `billing-get` / `billing-issue` return the frozen bill; KT renders it | no bill, no bill print; the estimate path is OF's |
| ← OF | the till's cached preview becomes the estimate ticket through the same encoder | the estimate prints from cache; that is the point |
| ← Bridge | the print agent: outbound only, `print-pending` / `print-claim` / `print-ack` over HTTPS (R13) | jobs sit `queued`, the till's status line goes red, the kitchen screen is unaffected |
| ← CF Config | the `print` block, on the same `approvals-config` read | defaults apply and the till warns; printing still works at 48 chars to the default station |
| → PY / DC | the drawer kick after a cash take and after a no-sale open | the drawer stays shut; the payment still recorded |
| → LG Logs | one JSON line per job state change with `cid`, `jobId`, `stationId`, `from`, `to`, and the failure reason | never blocks |
| → MN | a job queued longer than a few minutes is exactly the shape MN should shout about | – |

---

## File layout

```
backend/src-plattr/functions/
  domain/kot.ts          lines + config → Ticket for a round (rows padded, station chosen). Pure.
                         route(line, cfg) → stationId lives here too: a table lookup, no I/O.
  domain/receipt.ts      Bill | CreditNote + config → Ticket. Pure. Sums nothing (R10).
  app/print.ts           pending() / claim() / ack() / fail() / ticket(billId, kind), through Ports.
                         Role check, lease arithmetic on ports.now(), ST's door for the reprint audit row.
  adapters/firestore/print.ts   printJobs read/claim/ack in one transaction; reads lines and bills.
  api/print.ts           onCall wrappers: print-pending, print-claim, print-ack, print-ticket.
  orders/createOrUpdateOrder.js   +1 call beside writeLineSnapshots: create the jobs in the same transaction
  orders/lineSnapshots.js         markLinesSent also releases held jobs; voidCartLines also queues a cancel job
  domain/line.ts         + `categoryId` on the placed line (KT-D2), frozen at placement

bridge/                              NEW, its own deployable. Node + TypeScript, no framework.
  agent.ts      the loop: pending → claim → encode → write → status → ack; retry, backoff, give up
  escpos.ts     Ticket → Uint8Array. ~70 lines, no dependency. The vendor adapter.
  link.ts       THE ONE DOOR to the wire (R12): a TCP socket to `host:port`, write, DLE EOT, close
  config.ts     restaurantId, agentId, credentials. Nothing business-shaped: the stations come from
                the server's config answer, so a printer moves without touching the box.

frontend/till/src/features/print/
  PrintStatus.tsx   the red line: which station, how many tickets waiting, a Retry button
  estimate.ts       the six rows of the offline slip (R3), rendered and queued locally

backend/src-plattr/functions/adapters/printers/   NOT CREATED — see Decisions. The bridge transmits;
                                                  the backend only ever hands out a ticket.
```

**Where the line falls, said plainly.** The bytes are a vendor concern and belong in an adapter; the adapter has to
run on the machine that can reach the printer, and after KT-D1 that machine is the **bridge**, not a browser and
not a Cloud Function. So `escpos.ts` and `link.ts` live in `bridge/`. `adapters/printers/` on the backend stays
empty: the backend's whole job is to hand out a rendered ticket, and creating a folder to satisfy a diagram is
exactly the "interface with one implementation" the contract bans.

**Who renders, queues and retries.** Renders: the server (`domain/kot.ts`, `domain/receipt.ts`), so layout and
legal fields are jest-testable with no browser and no box. Queues: the server, always — a job exists because a
round was placed or a bill was issued, and it does not matter which device caused it. Retries: the bridge, because
only the bridge can see that the paper did not come out; the server-side lease is what makes it safe for the
bridge to die mid-job.

**The till is no longer on the print path at all.** It shows status and it queues the offline estimate. That is the
whole of its involvement, and it is why KT-D3 (both the till and the kitchen tablet can print) needed no code:
neither of them prints. The bridge does.

---

## Out of scope (written down, per the contract)

Bluetooth printing of any kind (rejected by KT-D1; the capability table above keeps the facts) ·
Aggregator tickets (Swiggy/Zomato KOTs) · label and sticker printers · replacing the kitchen screen with paper ·
a KDS bump bar · logo bitmaps or a QR code on the bill · printing in Kannada, Hindi or any non-Latin script (the
seed's names are Latin; a Devanagari dish name prints as `?` and that is accepted in v1) · USB-OTG and WebUSB ·
Epson ePOS-Print XML · printing from the Flutter kitchen or captain apps (TD-003's cousin: those apps get no print
path in v1) · a second till as a second print station beyond the lease that already makes it safe (TD-018) ·
duplicate-detection across restarts finer than the lease · printing a bill before it is issued (there is no draft
document to print; a draft on paper is the estimate, and that is OF's, gated on a failed call).

---

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-17 | The build map's Flutter libraries are dropped entirely | They are Dart; the till is React. Nothing to port, only the idea |
| 2026-09-17 | The contract's "LAN 9100 first" is **not achievable from the till** and is corrected here | Browsers have no TCP sockets. This is not a preference, it is an absence. `moonshot/CLAUDE.md`'s Stack line needs the one-line edit; proposed, not applied |
| 2026-09-17 | No npm ESC/POS package. ~70 lines of TypeScript | `esc-pos-encoder` exists; the bytes we need are `ESC @`, `ESC a n`, `ESC E n`, `GS ! n`, `ESC t n`, `LF`, `GS V B 0` and `ESC p 0 t1 t2`. A dependency for eight constants fails "20 over 100" and the no-new-dependency ban |
| 2026-09-17 | Server renders the ticket, the till encodes it (R2, R3) | Layout, money formatting and the Rule 46 fields get a jest test with a hand-written expected string. Putting them in the browser makes the legal part of the bill the least-tested code we own |
| 2026-09-17 | Rows arrive from the domain already padded to `charsPerLine` | The encoder then has no arithmetic in it, so it cannot get a total's alignment wrong; and a column test is a string comparison, not a byte comparison |
| 2026-09-17 | KOTs are queued server-side; bills are not | A KOT is born on a device that is not the till, so the till must be told. A bill is in the issuing till's hand already, and a failed bill print is recoverable by reprint |
| 2026-09-17 | Job id is `${cartId}_${stationId}`, deterministic | Same trick OF's `requestId` and PY's `paymentId` use: a retried write lands on the same document instead of making a second ticket |
| 2026-09-17 | At-least-once, never zero. A lease, not an exactly-once protocol | Exactly-once over a socket to a printer that may not answer does not exist. A duplicate KOT is annoying; a missing KOT is food that never gets cooked |
| 2026-09-17 | The decorative `kitchens` subcollection in the seed is **not** revived | Nothing links a menu item to it (`mock/MockData7ProductionMenus.json`; only `kitchen/chef.js:17` reads it, hardcoded to `rest001`). Stations are config keys like every other module's settings |
| 2026-09-17 | Routing is `categoryId → stationId`, with `taxBlockId` as the fallback, both read off the frozen line | `component.taxBlockId` already survives onto the line and separates food from liquor, which is 80 % of the routing a Bangalore pub needs. Category is what gets the tandoor its own printer. Adding a `station` field to the menu schema means 400 dishes get re-typed and half stay blank |
| 2026-09-17 | A KOT carries no prices (R11), by default | Every Indian KOT I have seen does the same. It is also one fewer place for money to disagree with the bill |
| 2026-09-17 | `Rs.` not `₹` on paper, as a config string | The standard ESC/POS code pages have no rupee glyph; a printer prints `?` or a box. Rendering ₹ as a raster image is a real option and is KT-D5 |
| 2026-09-17 | The estimate slip is rendered in the till, not the server (the one exception to R3) | There is no server to ask; that is the definition of the scenario. Six rows, no money maths beyond the cached total |
| 2026-09-18 | **The first print agent is the Flutter kitchen app, not a bridge box** (KT-D1c, delegated) | The restaurant pays ₹0 and gets no setup visit; we ship and support no hardware. The bridge is demoted to the second implementation behind the identical protocol, so it drops in later with no rework |
| 2026-09-18 | **The server encodes to bytes; the job document carries bytes, not rows** | This is what makes the agent thirty lines in any language, so the encoder stays one TypeScript implementation with one jest test instead of being rewritten per agent. Draft v1 put it in the till only because the till was the print station |
| 2026-09-18 | URY's `websocket_print` browser-tab spooler is rejected | It addresses no printer — paper comes out of that tab's default. The job is three printers in three places, and it marks the invoice printed with no subscriber listening |
| 2026-09-18 | The every-minute reconciler is built in the same phase as the agent, not after | With a box it is a nicety. With a tablet as the agent it is what turns "asleep for four minutes" into a late, labelled ticket instead of food nobody cooks |
| 2026-09-17 | `window.print()` is not used anywhere, including for the estimate | OF's current `EstimateScreen` shows a printable `<div>`. It becomes a ticket through the same encoder, so there is one path to paper and one thing to test. A browser print dialog is not a receipt path |
| 2026-09-17 | Reprinting a KOT is recorded on the job, not in ST's audit trail; reprinting a **bill** stays an ST audit row | A kitchen ticket is not money. A second bill copy is, and ST already has the `reprint` action with `amount = payable` |
| 2026-09-17 | A cancel is a new ticket at the stations the original went to, not at every station | Odoo prints the diff of what the kitchen was last told (`pos_restaurant/models/pos_session.py:19-35`). The job rows are our record of what was told, so the diff is free |
| 2026-09-17 | Donor review not yet run. `DONORS.md` → Printing says Odoo `pos_printer` is not in the sparse set; it must be added before implementation starts | Contract step 4. The routing-by-category design above is ours first, on purpose |
| 2026-09-17 | Fan-out not yet run on this draft | Contract's sheet-writing process; do it before phase 1 |

---
| 2026-09-17 | **Signed (KT-D1): LAN printers behind a bridge, not Bluetooth printers from the browser** | Chosen against this sheet's recommendation. Bluetooth means replacing every printer the restaurant owns, the Indian counter-size units are mostly 58 mm portables, Chrome 148 is recent enough that an old tablet prints nothing at all, and range through a kitchen wall was never tested. The bridge keeps the existing hardware working |
| 2026-09-17 | **Signed (KT-D1b): the bridge is a box on the restaurant LAN that *pulls* jobs** | Pulling is what kills the draft's objection to a bridge. It talks outbound over HTTPS like any client, so no browser addresses it, no certificate is needed on the LAN, and it does not have to live on the tablet as an app (R13) |
| 2026-09-17 | **Signed (KT-D2): `categoryId` is frozen on the placed line** | One additive field copied from a value the cart already has. Routing then reads frozen data, so a reprint at 23:30 routes as it did at 20:52 even if the dish was re-categorised at 23:00. Without it a tandoor can never have its own printer without doing this migration later, after there is data — the expensive version |
| 2026-09-17 | **Signed (KT-D3): both the till and the kitchen tablet can print, configured per restaurant** (`print.agents`) | It cost nothing once KT-D1b landed, because **neither of them prints**: they cause jobs, the bridge prints. The Flutter printing implementation the draft feared is not needed |
| 2026-09-17 | **Signed (KT-D4): at-least-once, marked `REPRINT`** | Explicitly confirmed, because it is the kitchen's experience and not ours. Food that never gets cooked is a guest waiting forty minutes and a refund; a duplicate is a chef holding two identical slips with the same ticket number, one of them stamped |
| 2026-09-17 | **Signed (KT-D5): `Rs.` as a config string** | No standard ESC/POS code page has a rupee glyph. Revisit `print.codePage` when the actual printer is on the table — some newer firmwares carry one and the key already exists |
| 2026-09-17 | **Signed (KT-D6): the offline estimate goes through this path**, keeping a "show on screen" fallback in the same component | One path to paper, one thing to test. The fallback is three lines of JSX and it is what saves the cashier when the server and the bridge are both unreachable |
| 2026-09-17 | **The bill is queued like every other ticket** | Consequence of KT-D1, not a separate call. Draft v1 had the till print the bill directly because it held the link; no browser holds a link now. It is the one place the bridge decision added work |
| 2026-09-17 | **The till is not on the print path.** It shows the status line and queues the offline estimate | Follows from KT-D1b. Worth stating because draft v1 built a whole claim/lease/retry loop in the till, and a later reader will otherwise wonder where it went |

## Known collisions with open debt

- **TD-018 (one till, one drawer).** The print queue needs an identity to hold a lease. The bridge has its own
  `agentId` from its config file, so the till no longer needs to mint a `registerId` for printing at all — TD-018
  is left exactly where it was rather than being deepened by this module.
- **TD-032 (new, this sheet).** The bridge is a second deployable with no update, monitoring or provisioning
  story. It runs on hardware we do not own, in a room we cannot see, and today the only thing that would notice it
  had died is KT-S23's status line. Filed P2 against KT-D1b.
- **TD-003 (no PIN prompt in Flutter).** Untouched: nothing in KT asks a Flutter app for anything.
- **TD-023 (cart cancel is not PIN-gated).** KT rides on `voidCartLines`, so a cancel ticket prints for a cancel
  that was not PIN-gated. That is TD-023's problem, not a new one, and the ticket is if anything the detection.
- **TD-024 (three unowned e2e failures).** The KT suite must not add a fourth; a flaky printer test is banned by
  the contract and there is no real printer in CI, so every automated assertion is against a fake port.

---

## Phase plan (each phase is one commit)

Definition of done applies to every phase: the failing test written **first** and proven red against the old code,
`make check` green with the output pasted, e2e green where the path touches the emulator, `DEBT(TD-nnn)` rows filed,
and the scenario ID in the commit message.

**0. This sheet, plus Shaurya's answers.** **Answers done 2026-09-17; the sheet is rewritten around them.**
Still owed before phase 1: fan-out (`/custom-fanout-consult`) and a donor review targeted at "how do they route a
ticket, how do they know it printed, what do they do when the printer is off" — Odoo `pos_printer.py` and
`pos_restaurant` need adding to the sparse clone first.

**1. Routing key frozen on the line.** `categoryId` onto `CartItem` → `placeLine` → the line document, and
`domain/kot.ts route()`. Characterization test on `createOrUpdateOrder` pinned **before** the change (the same way
BL phase 4 did it), then `domain/line.test.ts` and `domain/kot.test.ts`. Tests: KT-S3, KT-S19, plus "a line placed
before this change has no `categoryId` and routes to the default, never nowhere".

**2. The ticket, pure.** `domain/kot.ts` and `domain/receipt.ts`: rows, padding, wrapping, markers, the cancel
ticket, the two-column money rows. Every expected value is a hand-written string in the test, 48 and 32 characters
both. Tests: KT-S1, S2, S5, S6, S11, S13, S14, S15, S16, S18, S21. No I/O, no emulator, milliseconds.

**3. The queue.** `adapters/firestore/print.ts`, `app/print.ts`, `api/print.ts` → `print-pending`, `print-claim`,
`print-ack`, `print-ticket`; job creation inside the placing transaction; release on `markLinesSent`; a cancel job
on `voidCartLines`. App tests with fake ports and a fake clock (leases are arithmetic on `ports.now()`, never a
sleep). e2e `test/e2e/suites/print.js` on its own emulator slot with its own table. Tests: KT-S4, S7, S10, S20,
plus "a second `print-claim` inside the lease is refused" and "an expired lease re-queues exactly once".

**4. The encoder.** `bridge/escpos.ts`: Ticket → `Uint8Array`. Byte-level assertions against hand-written arrays —
`1B 40` at the head, `1D 56 42 00` at the tail, `1B 61 01` for a centred row, `1D 21 11` for a double-size row,
`1B 70 00 19 FA` for the drawer. Tests: KT-S13, S17, S21. Plain jest against a fake socket that records what was
written; no hardware, no browser, no box.

**5. The bridge.** `bridge/agent.ts`, `link.ts`, `config.ts`: the pull loop (pending → claim → encode → write →
`DLE EOT` → ack), retry with backoff, give up and leave the job queued. Tested against a **fake TCP server in the
test process** that can accept and echo, refuse the connection (printer off), answer a paper-out flag, or accept
and never answer. Plus the till's `PrintStatus.tsx` and a Playwright spec for the status line and Retry, with the
server's answers stubbed — no `navigator.serial` anywhere, because the browser is no longer on the path.
Tests: KT-S7, S8, S10, S20, S23.

**6. The bill, the estimate and the drawer at the counter.** Issue → queue a `bill` job for the counter station,
reprint → `DUPLICATE` + ST audit row, credit note, OF's estimate rendered in the till and queued locally
(deleting the `window.print()` div but **keeping a show-on-screen fallback**, KT-D6), the drawer kick after a cash
take and after ST's no-sale. Tests: KT-S6, S9, S15, S16, S17, and OF-S7 re-run so it stays green.

**7. The room.** Not a commit — a morning in a restaurant with two printers, the bridge box, a real tablet and a real roll. What
only hardware can tell us is listed below.

### How a printer is tested without a printer

Everything up to the wire is tested with a **fake port**: an object with a `writable` whose sink records every
`Uint8Array`, and a `readable` a test can feed a status byte into. The assertions are exact byte arrays, so a
regression in the cut command or the alignment escape fails in milliseconds. The four states that matter are all
reachable without hardware: writes fine, throws on open, answers an error flag, never answers. The domain tests
never see a byte at all — they compare strings.

### What genuinely needs the real hardware in the room

1. **Does the bridge reach each printer on TCP 9100**, at the address the restaurant's router gives it — including
   what happens when DHCP hands a printer a new IP overnight. This is the bridge's equivalent of the pairing
   question and nothing else substitutes for it. (A static lease per printer is the likely answer, and it is a
   setup-visit step, not code.)
2. **Does the printer answer `DLE EOT`** and does its paper-out flag mean what the manual says. Cheap clones vary,
   and R7's config key exists because of it.
3. **The code page and the rupee.** Print `Rs. 1,02,450.00`, a long dish name, and an accented character, and look.
4. **The cut.** Partial vs full cut, and whether the last two lines get eaten before the blade.
5. **The drawer.** Whether this drawer's solenoid fires on a 25 ms pulse through this printer's RJ11.
6. **Recovery after a power cut.** The box loses power at 21:00 with the restaurant full. Does it come back by
   itself, reconnect and drain the queue with no one touching it? This is the failure most likely to be reported
   as "printing stopped".
7. **The restaurant's own network.** A guest wifi VLAN that cannot see the printers, a router that reboots
   nightly, a printer on a different subnet. This is the class of problem the Bluetooth option did not have, and
   it is the price of KT-D1.

---

## Open questions (owner: Shaurya)

- KT-Q1 Does the first restaurant want paper in the kitchen **at all**, or is the kitchen screen enough and only the
  bar and counter print? The answer halves the hardware bill and decides whether KT-S7 is a Friday-night emergency
  or a shrug.
- KT-Q2 ~~One tablet or several?~~ **Closed by KT-D1b:** one bridge drives all three printers over the LAN, and
  range is no longer a constraint. What replaces it: does the restaurant have a network the box can sit on, with
  the printers reachable from it, or is that part of the install?
- KT-Q3 Does the tandoor need its own ticket separate from the main kitchen at Meghana-sized volume, or is
  kitchen/bar/counter the whole truth for v1? `print.route` supports either; the question is whether to buy a
  fourth printer.

---

## Review — answered 2026-09-17

All six calls were put to Shaurya and decided in one sitting. They are rows in **Decisions** above; the
questions as asked are in `DECISIONS_WAITING_2026-09-17.md` and the full record with costs is
`DECISIONS_2026-09-17.md`.

**KT-D1 went against this sheet's recommendation** and is not to be re-opened on the grounds that the sheet
advised Bluetooth. The sheet's own objection to a bridge — that it would have to live on the tablet and
therefore be an app — turned out to be wrong once the bridge **pulls** instead of being called, and the
pulling design removed more work than the bridge added. What it costs is hardware, a setup visit, the
restaurant's own network as a new failure surface, and TD-032.

**KT-D3 was answered with a request rather than one of the options** — "support both, configurable at
onboarding" — and it became free rather than expensive for the same reason: with a bridge, neither the
till nor the kitchen tablet prints. `print.agents` is the key.

Two defaults were taken rather than asked, and stand: `Rs.` on paper with `print.codePage` revisited when
a real printer is here (KT-D5), and the offline estimate moving onto this path with a show-on-screen
fallback kept in the same component (KT-D6).

**Still owed before phase 1:** the fan-out, and the donor review — Odoo `pos_printer.py` and
`pos_restaurant/models/restaurant_printer.py` are not in the local sparse clone and must be added first.
The routing-by-category design in this sheet is deliberately ours before theirs is read.

## Files (donors)

`DONORS.md` → Printing currently says only "Odoo `pos_restaurant` printer routing per category. Odoo `pos_printer`
is not in the sparse set; add it when KT is built." Add `addons/point_of_sale/models/pos_printer.py` and
`addons/pos_restaurant/models/restaurant_printer.py` to the sparse checkout before phase 1, and run
`/moonshot-donor-review` against them per the contract — the builder does not read them.
