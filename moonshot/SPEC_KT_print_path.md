# KT · Print path

Status: **v4, 2026-09-22 — the sheet now says what KT-D1c decided: the kitchen tablet is the print agent, the
server encodes, `bridge/` is an appendix.** Phase 1 (routing key on the line) is done since TD-038; nothing else
built. Written against BL, ST, OF, FL (all built), the live order code and the Flutter kitchen app. The donor review
(`reviews/2026-09-17-donor-KT.md`) and the Gemini fan-out (`reviews/2026-09-17-fanout-KT-gemini.md`) have run and
are merged below; one blind Grok pass on the plan (`reviews/2026-09-22-plan-paper-and-idle-tables.md`) is merged
too. **All six 2026-09-17 Review calls and the five 2026-09-22 calls are rows in Decisions.** v3's text was
rewritten around a bridge box and then patched for the tablet without the patch reaching the layout, the config
defaults, the rules or the phases; v4 is that patch applied everywhere. The one that reshaped it:
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
- **A restaurant with no kitchen tablet has no printing at all.** Raised by the parity review on the
  18th and it is the sharpest objection to this decision. It is fine for customer one, who has one;
  it is not a thing to discover at customer five. It is also the strongest argument for keeping the
  bridge as implementation #2 rather than quietly dropping it — the protocol is what makes that
  cheap, so the protocol must not grow a dependency on Flutter.

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
| KT-S5 | **The chef lost the ticket.** 21:20 the ticket for `#42-3` is gone under a pan. The cashier taps Reprint on that round. The same round comes out with `REPRINT 2` in the header and the time of the reprint beside the original time, rendered from the lines **as they are now** — a quantity cut since the original shows the cut quantity, because that is what the kitchen should cook and the cancel ticket already said so. The reprint is its own job (`reprint:…:2`) and records who asked and when. **Without this the kitchen phones the counter and reads items off a screen.** | Manual |
| KT-S6 | **The bill at the counter.** 22:10 table 7 asks for the bill. Cashier issues it; the bill is queued for `print.counterStation` and the counter's agent prints it: 80 mm paper, restaurant name and address, `Tax Invoice`, GSTIN, bill `A/0417`, date and time, table, food block with taxable 1,010.00, CGST 25.25, SGST 25.25, liquor block 520.00 with no tax part, round-off −0.50, `TOTAL Rs. 1,580.00`, place of supply, reverse charge `No`. **Without this the guest gets no paper and nothing filed matches what was taken.** | Engine |
| KT-S7 | **The printer is off.** 20:14 the bar printer is switched off at the wall. The pizza ticket prints; the beer ticket does not. The order is placed all the same. The agent's TCP connect times out inside `print.connectTimeoutMs`, it reports `fail`, and the till shows a red line: `BAR printer not answering — 1 ticket waiting`. The job stays queued and the bar's own kitchen screen still has the round on it. The printer comes on at 20:31: the waiting ticket prints by itself, because it is younger than `print.staleAfterMinutes` (30). Had the printer stayed off until 21:00 the ticket would **not** print by itself: the till counts it (`1 ticket not auto-printed`) and one tap on Reprint prints it, so a printer that comes back after the rush never dumps the rush onto the pass. **The same scenario covers the tablet itself being asleep** — jobs queue, the till goes red, nothing is lost. **Without this an order silently half-exists and nobody knows which half.** | Engine |
| KT-S8 | **Out of paper.** 21:35 the kitchen roll runs out mid-ticket. The printer accepts every byte and closes cleanly, so the system sees a printed ticket: **the system cannot see paper in v1.** The chef sees half a ticket on the floor, loads a roll, and the cashier taps Reprint on that round: the same round prints with `REPRINT 2`. A printer whose `print.stations.<id>.statusQuery` is switched on (default off, not built in v1) answers `DLE EOT` after the write and a positive paper-out bit blocks the ack — then the till says `KITCHEN printer out of paper — 2 tickets waiting` and the reload prints both. No answer is never a reprint. **Without this a half ticket is silently a printed ticket and nobody is told which half.** Signed 2026-09-22, with the doubt written down in Decisions. | Manual (v1) |
| KT-S9 | **No internet at the till.** 20:45, the till's 4G is gone. Kitchen and bar printing are unaffected: the kitchen tablet is on the shop's own internet and is still pulling and printing rounds placed by the guest app and the captain app. What the till loses is its status line and the ability to issue a bill — which was already true of bills, since the server issues them. Table 12 wants to leave: the emergency estimate (OF-S7) is rendered by the till from its own cache and **shown on screen**; the cashier turns the tablet round and the guest photographs it. It is never queued to print later: a slip with no bill number arriving twenty minutes after the guest left is not a bill. When the till is back the cashier issues the real bill and it prints (KT-S6). **Without this an outage takes away the one piece of paper the guest needs, or hands them a fake one later.** Signed 2026-09-22 (amends KT-D6). | Engine |
| KT-S23 | **The tablet is asleep.** 20:30 the kitchen tablet goes into a drawer with the screen off and the "This tablet prints" toggle on. Rounds are placed, jobs queue, no paper anywhere and the kitchen screen carries every round as usual. Ninety seconds later the sweep logs it and the till's status line reads `No print agent has claimed a job since 20:28 — 6 tickets waiting`. Woken at 20:41, all six print in order (each younger than 30 minutes), marked `REPRINT` only if they had been claimed before. Woken at 21:15 instead, the six are counted as `not auto-printed` and print one tap each — the chef decides which are still wanted. A job stuck in `claimed` past its lease counts as waiting too: the sleeping tablet cannot be the thing that notices itself. **Without this the one component we cannot see fails silently and the first person to notice is a guest.** | Engine |
| KT-S10 | **Two agents, one ticket.** A second tablet at the bar has the toggle on too. Both poll at 20:52. Exactly one prints `#42-3 BAR`: the first to claim it holds a lease of `print.claimLeaseSeconds` (60), the second is told it is taken and prints nothing. The **same** tablet asking again inside its lease — its claim landed but the answer was lost — is handed the bytes again, not refused. If the first loses power before it acknowledges, the lease expires and the second prints it, marked `REPRINT`. Two overlapping claims are decided in one transaction, never read-then-write. **Without this every ticket comes out twice, and two chefs cook it twice.** | Engine |
| KT-S11 | **Cancelled after the ticket printed.** 21:40 the guest walks out. The manager cancels the round; its biryani is already on a spike in the kitchen. A **cancel ticket** prints at the same stations that got the original: `*** CANCELLED ***`, `#42-1`, `TABLE 7`, `1 × Chicken Biryani`, the reason, the name. Paper is never edited; a second ticket is how paper is corrected. **Without this the kitchen serves food for a table that left.** | Engine |
| KT-S12 | **Two became one.** 21:44 a table cuts two biryanis to one on a sent line. ST already treats that as a void of one quantity. A cancel ticket prints for `1 × Chicken Biryani` only, and the remaining one is not reprinted. **Without this the kitchen plates two and the bill charges one.** | Engine |
| KT-S13 | **Variant and add-ons on 80 mm.** `Paneer Tikka (Full) + Extra Cheese, no onion` at 48 characters a line prints as `1 x Paneer Tikka`, then `    (Full)`, then `    + Extra Cheese`, then `    ! no onion` in double height. Names longer than the line wrap with a four-space hang, never truncate. **Without this the chef reads half a dish name and guesses the rest.** | Engine |
| KT-S14 | **Liquor on the guest's paper.** The same bill KT-S6: the liquor block prints its own heading and its own total with no tax lines under it, and the document title is `Invoice-cum-Bill of Supply` because an exempt block is on the page. BL decides that; KT only prints what BL says. **Without this the bill claims GST on alcohol.** | Engine |
| KT-S15 | **Credit note.** 22:40 the coke was never served on the paid bill 0417. BL issues `CN-0007`. The printed note carries `Credit Note`, its own number, the original number and date, the reversed line as a negative, and the negative tax. **Without this the refund has no paper and the return does not tie.** | Engine |
| KT-S16 | **The guest lost the bill.** 22:50 they ask for another copy. It prints with `DUPLICATE` across the header and writes an ST audit row, P1, amount = payable. The bill document is untouched. **Without this a second copy is indistinguishable from the first and the second-copy trick leaves no number.** | Manual |
| KT-S17 | **The drawer.** A cash payment of ₹1,580 is taken: a `drawer` job is queued and the counter tablet's next poll kicks the drawer off the printer's RJ11 — within `print.pollSeconds`. A no-sale open goes through ST first (PIN, P0) and only then queues the kick. A drawer job older than `print.drawerStaleSeconds` (60) is dropped, never kicked late onto an empty counter when a tablet wakes. **Without this the cashier props the drawer open all evening.** | Engine |
| KT-S18 | **A 58 mm printer at the bar.** The bar has a cheaper 58 mm unit: 32 characters a line. The same round prints with columns recomputed, nothing overflowing and nothing cut off. One config key, no code. **Without this every ticket at the bar is a ragged mess and the totals do not line up.** | Config |
| KT-S19 | **A dish nobody mapped.** A new "Mocktails" category is added in Admin and never mapped to a station. Its lemonade prints at `print.defaultStation` (kitchen), and the placing hook logs `line.unrouted` naming the category, read the next morning; the on-screen warning is CF's config screen, not the till (Decisions 2026-09-23). It is **never** dropped. **Without this a new category silently stops reaching anyone, and the first person to notice is a guest at 22:00.** | Engine |
| KT-S20 | **The agent died mid-ticket.** 20:53 Android kills the kitchen app while `#42-3 BAR` is half-written — half a ticket is on the floor, because the printer prints whatever prefix it was handed. Nothing was acknowledged, so after the lease the job is claimed again and printed in full, marked `REPRINT`. A ticket may print twice; a ticket may never print *silently* zero times (KT-D4 as amended 2026-09-22). A fake socket in a Dart test proves the "write threw → no ack" half; only the room proves the printed prefix. **Without this a power blink eats an order.** | Engine |
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
  adapter and lives **server-side** in `adapters/printers/escpos.ts` (KT-D1c): one implementation, one jest test,
  and the agent carries no ticket logic at all.
- **R3 The server renders and encodes, the agent transmits.** The print agent receives **bytes**, not tickets and
  not bills: it never lays out a legal document, never formats money, never decides a station, never encodes. It
  opens a socket, writes, closes, acknowledges. The one thing the till renders by itself is the offline estimate,
  because by definition no server can be reached (OF-S7), and it is shown on screen, never printed (KT-S9).
- **R4 Every ticket is a job: queued server-side, claimed with a lease, acknowledged.** One job document per
  (thing × station), with a deterministic id that **carries its kind**: `kot:${cartId}:${stationId}`,
  `cancel:${cartId}:${stationId}:${v}`, `reprint:${cartId}:${stationId}:${n}`, `bill:${billId}`,
  `credit:${creditNoteId}`, `duplicate:${billId}:${n}`, `drawer:${paymentId}`. A retried write lands on the same
  document; a cancel can never overwrite the printed KOT it follows. States: `held → queued → claimed(by, until) →
  printed | dropped`. Claim, ack and fail are **idempotent and holder-checked**: the holder re-claiming inside its
  lease gets the bytes again; a different agent is refused; the holder acking a printed job is a no-op success;
  `fail` from a non-holder is refused. A `claimed` job whose lease has passed is waiting again, for the pending
  read, the status line and the sweep alike. **At least once, never *silently* zero**: a ticket printed twice is a
  chef's shrug, a ticket printed never is food that does not exist — but a ticket older than
  `print.staleAfterMinutes` is not printed by itself; it is counted on the till and printed by one tap (KT-S7).
- **R5 A held round prints nothing.** A job for a cart behind the waiter-confirmation gate is created `held` and
  released by the same write that flips `line.sent` (`lineSnapshots.js markLinesSent`). A rejected round's jobs are
  dropped, never printed, because the kitchen was never told (the same reasoning ST used for a free void).
- **R6 Paper is never edited, only added to.** A cancel, a quantity cut and a reprint are each a **new ticket**.
  Nothing on paper is ever amended, and any ticket that is not the original says so in its header (`REPRINT n`,
  `CANCELLED`, `DUPLICATE`).
- **R7 Accepted is the best the wire can say; unknown is never a reprint.** A job is acknowledged when the socket
  accepted every byte and closed cleanly inside `print.writeTimeoutMs`. `flush` completing means Dart handed the
  bytes off, not that the head printed them, so a printer that accepts and never reads must time out to `fail`
  rather than hang the loop. The paper sensor (`DLE EOT`) stays a per-station key, `print.stations.<id>.statusQuery`,
  **default false and not built in v1**: when on, it is asked after the write and only a *positive* paper-out bit
  blocks the ack. No answer, or a clone that ignores the question, never starts another physical print — v3's
  3-second timeout around the whole ticket was an infinite reprint loop on cheap printers.
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
  kitchen app's `printer_link.dart`, the one file with `dart:io Socket` in it: connect within `connectTimeoutMs`,
  write, flush, close, all under `writeTimeoutMs`; one job in flight per station; a station that wedges never
  stops the other. No screen opens a port, no page addresses the tablet, and `window.print()` is not used for
  anything (a browser print dialog on an Android tablet at 22:10 is not a receipt path).
- **R13 The agent pulls, as a logged-in member of staff; nothing on the restaurant's network is addressable.** The
  kitchen app calls `print-pending`, `print-claim`, `print-ack`, `print-fail` outbound over HTTPS with its **staff
  session** — an install id is not a credential, and an unauthenticated ack would be a silent drop of food tickets.
  It also sends `{ kind: 'kitchen', agentId }`: `print.agents` is a list of **kinds** allowed to claim; the install
  id, minted once and excluded from Android auto-backup, becomes `claimedBy`. We never open a connection into a
  restaurant, so there is no inbound port, no certificate on the LAN and no mixed content. With no internet on the
  tablet it prints nothing, which is KT-S7's shape exactly.

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

**Print job** `restaurants/{id}/printJobs/{kind}:{…}` (ids per R4)

| Field | What |
|---|---|
| `jobId, restaurantId, cid, stationId` | identity; `cid` is the order's or bill's correlation id, so the whole life of a round is one grep |
| `kind` | `kot` \| `cancel` \| `reprint` \| `bill` \| `credit` \| `duplicate` \| `drawer` |
| `orderId, cartId` / `billId` / `paymentId` | whichever the kind is about |
| `ticketNo` | `${orderNumber}-${cartIndex}` for a round, the bill number for paper with money, what a human says out loud |
| `part, parts` | `1 of 2` when one round went to two stations |
| `state` | `held` \| `queued` \| `claimed` \| `printed` \| `dropped` |
| `queuedAt` | epoch ms when it became claimable — set at placement, or at the waiter's confirm for a held round (R5). **The stale clock starts here**, not at `createdAt` |
| `claimedBy, claimedUntil` | the agent's install id and the lease instant. Past `claimedUntil` the job is waiting again |
| `force` | true once, set by Reprint/Retry, so the next claim skips the `staleAfterMinutes` check and clears it |
| `prints[]` | `{at, by, marker}` — one row per time paper came out; length > 1 is a reprint |
| `createdAt` | epoch ms, server clock |

Nothing else. **The bytes are not stored.** `print-claim` renders the ticket from the frozen lines or the frozen
bill *at that moment*, encodes it, and answers `{ jobId, ticketNo, bytes }` (base64, already repeated
`copies` times). Rendering is deterministic, which is what lets the holder be handed the same bytes again after a
lost answer. A document can therefore never carry a stale ticket, and the job stays under a kilobyte.

**A bill has a job too.** The bill is queued for the counter station like any other ticket, `kind: 'bill'`, and the
counter's agent prints it. Bills **ignore** `staleAfterMinutes` — a guest is waiting for it — so a counter printer
that comes back prints the bill by itself. The cashier sees it succeed or fail on the till's status line, and a
dead counter printer is recovered by a `duplicate` from `billing-get` (KT-S16). **A drawer kick is a job with no
paper** (`kind: 'drawer'`, bytes = the pulse from `print.drawerPulseMs`), immediate or dropped (KT-S17).

---

## Config keys (on `restaurants/{id}/config/settings`, field `print`, with defaults)

Served to the till through the existing `approvals-config` answer — the till's one config read. The kitchen app
gets a **filtered** `print-config` (stations, poll and retry numbers, the agent kinds): `approvals-config` would
hand the tablet the PIN and approval policy, and two callers justify the door.

| Key | Default | Used by |
|---|---|---|
| `print.stations` | `{ kitchen: {label:'KITCHEN', charsPerLine:48, enabled:true, copies:1, statusQuery:false}, bar: {label:'BAR', …}, counter: {label:'COUNTER', …} }` | KT-S3, S18 |
| `print.stations.<id>.address` | `''` — the printer's `host:port` on the restaurant LAN, e.g. `192.168.1.51:9100`. Read by the kitchen app's agent only; never by a browser | KT-S7 |
| `print.stations.<id>.charsPerLine` | 48 (58 mm units set 32) | KT-S13, S18 |
| `print.stations.<id>.copies` | 1 — applied server-side: the claim answer repeats the bytes | KT-S1 |
| `print.stations.<id>.enabled` | true (false = screen-only station) | R8 |
| `print.stations.<id>.statusQuery` | **false** — the `DLE EOT` paper query; not built in v1, the key is the hook | R7, KT-S8 |
| `print.route` | `{}` — `categoryId → stationId` | KT-S3, S19 |
| `print.routeByTaxBlock` | `{ liquor: 'bar' }` — the fallback when a category is unmapped | KT-S3 |
| `print.defaultStation` | `kitchen` | KT-S19 |
| `print.counterStation` | `counter` — where bills, credit notes and estimates go | KT-S6 |
| `print.retryCount` | 2 | KT-S7 |
| `print.retryDelayMs` | 2000 | KT-S7 |
| `print.writeTimeoutMs` | 10000 — connect + write + flush + close, all of it; well under the lease | R7, R12 |
| `print.staleAfterMinutes` | 30 — a `kot` or `cancel` older than this (from `queuedAt`) is not auto-printed; counted on the till, printed by one tap. Bills ignore it | KT-S7, S23 |
| `print.unclaimedAfterSeconds` | 90 — a waiting job older than this is logged by the every-minute sweep and named on the till's red line | KT-S23 |
| `print.drawerStaleSeconds` | 60 — a `drawer` job older than this is dropped, never kicked late | KT-S17 |
| `print.pollSeconds` | 5 | KT-S1 |
| `print.claimLeaseSeconds` | 60 | KT-S10, S20 |
| `print.agents` | `['kitchen']` — which agent **kinds** may claim a job (`kitchen`, `bridge`, `till`). The install id is `claimedBy`, a different field | KT-S10, KT-D3, R13 |
| `print.connectTimeoutMs` | 3000 | KT-S7 — how long the agent waits on a TCP connect before calling the printer unreachable |
| `print.currencyText` | `Rs.` | KT-S21 |
| `print.codePage` | 0 (PC437) | KT-S21 |
| `print.kotShowsPrices` | false | R11 |
| `print.billCopies` | 1 | KT-S6 |
| `print.reprintMarker` / `print.cancelMarker` / `print.duplicateMarker` | `REPRINT` / `CANCELLED` / `DUPLICATE` | R6 |
| `print.footer` | `''` (e.g. "Thank you · FSSAI 12345678901234") | KT-S6 |
| `print.drawerPulseMs` | 50 — `t1 = round(ms/2) = 25 = 0x19`, the pulse the old magic number gave; 25 ms made it weaker | KT-S17 |
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
| ← OF | the till's cached preview is the estimate, on screen only (KT-S9) | the estimate is shown from cache; the real bill prints when the till is back |
| ← Kitchen app (agent) | outbound only, as a staff session: `print-pending` / `print-claim` / `print-ack` / `print-fail` over HTTPS (R13) | jobs sit `queued`, the till's status line goes red, the kitchen screen is unaffected |
| ← CF Config | the `print` block, on `approvals-config` for the till and the filtered `print-config` for the kitchen app | defaults apply and the till warns; printing still works at 48 chars to the default station |
| → its own sweep | `print-sweepJobs`, `onSchedule('every 1 minutes')`: waiting jobs older than `unclaimedAfterSeconds` → one log line each with `cid`, `jobId`, `stationId`, age. Prints nothing itself | the till's `print-status` still computes the same fact on demand |
| → PY / DC | the drawer kick after a cash take and after a no-sale open | the drawer stays shut; the payment still recorded |
| → LG Logs | one JSON line per job state change with `cid`, `jobId`, `stationId`, `from`, `to`, and the failure reason | never blocks |
| → MN | a job queued longer than a few minutes is exactly the shape MN should shout about | – |

---

## File layout

```
backend/src-plattr/functions/
  domain/kot.ts          lines + config → Ticket for a round (rows padded, station chosen). Pure.
                         route(line, cfg) → stationId lives here too: a table lookup, no I/O. A line with no
                         categoryId THROWS (the field is frozen on every placed line; a missing one is a writer bug).
  domain/receipt.ts      Bill | CreditNote + config → Ticket. Pure. Sums nothing (R10).
  adapters/printers/escpos.ts   Ticket → Uint8Array. ~70 lines, no dependency. THE vendor adapter (R2), server-side.
  app/print.ts           pending() / claim() / ack() / fail() / reprint() / status() / sweep(), through Ports.
                         Staff check, lease arithmetic on ports.now(), stale and force rules, ST's door for the audit row.
  adapters/firestore/print.ts   printJobs read/claim/ack in one transaction; enqueue(transaction, jobs) for the hooks.
  api/print.ts           onCall wrappers print-pending/-claim/-ack/-fail/-reprint/-status/-config,
                         and print-sweepJobs = onSchedule('every 1 minutes') (+ an emulator-only manual trigger).
  orders/createOrUpdateOrder.js   +1 call beside writeLineSnapshots: enqueue the jobs in the SAME transaction (R1).
                                  If the job write throws, the round fails — R1 means "never waits on a socket",
                                  not "best-effort write".
  orders/lineSnapshots.js         markLinesSent also releases held jobs and stamps queuedAt; voidCartLines queues a cancel job
  domain/line.ts         `categoryId` on the placed line (KT-D2) — DONE, TD-038

frontend/src-platter-apps/apps/platter_kitchen/lib/print/
  print_agent.dart     the loop: pending → claim → decode → write → ack, else fail + backoff; one job in flight per
                       station; the "This tablet prints" toggle (off by default); a stable install id, not backed up
  printer_link.dart    THE ONE DOOR to the wire (R12): dart:io Socket, connect/write/flush/close under writeTimeoutMs
  android/.../PrintService.kt   KT-5b: a `connectedDevice` foreground service + CPU wake lock while the toggle is on;
                       started and stopped by the toggle over the `plattr/print_service` channel in MainActivity.kt

frontend/till/src/features/print/
  PrintStatus.tsx      the red line: which station, how many waiting, how many not auto-printed; Retry (force) and Reprint

Appendix — bridge/ (implementation #2, NOT built): a Node box that speaks the identical protocol for a restaurant
with no kitchen tablet. Same job document, same four calls, its own agentId of kind `bridge`. TD-032 is owed the day
one ships.
```

**Where the line falls, said plainly.** The bytes are a vendor concern and belong in an adapter; with a queue
between the server and the printer, the adapter can live server-side, where it is one implementation with one
jest test. The agent then has no ticket logic in it: pull, write, ack. That is what makes a second agent (the box)
thirty lines in another language rather than a port of the encoder.

**Who renders, queues and retries.** Renders and encodes: the server. Queues: the server, always — a job exists
because a round was placed or a bill was issued, and it does not matter which device caused it. Retries: the
agent, because only the agent can see that the socket failed; the server-side lease is what makes it safe for the
agent to die mid-job. Notices silence: the every-minute sweep, because a sleeping tablet cannot notice itself.

**The till is not on the print path.** It shows the status line, offers Retry and Reprint, and shows the offline
estimate on screen. That is the whole of its involvement.

---

## Out of scope (written down, per the contract)

Bluetooth printing of any kind (rejected by KT-D1; the capability table above keeps the facts) ·
Aggregator tickets (Swiggy/Zomato KOTs) · label and sticker printers · replacing the kitchen screen with paper ·
a KDS bump bar · logo bitmaps or a QR code on the bill · printing in Kannada, Hindi or any non-Latin script (the
seed's names are Latin; a Devanagari dish name prints as `?` and that is accepted in v1) · USB-OTG and WebUSB ·
Epson ePOS-Print XML · printing from the captain app (the kitchen app IS the print agent since KT-D1c; the captain
app causes jobs and prints nothing) · the `DLE EOT` paper query (key kept, default off, built when a printer that
answers it is on the bench) · printing the offline estimate (screen only, KT-S9) · a second till as a second print station beyond the lease that already makes it safe (TD-018) ·
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
| 2026-09-18 | **The bar ticket is a go-live item; the kitchen ticket is not** | There is no bar surface in the product at all — `live_orders_screen.dart:36` is a client-side category dropdown and no device can be bound to a station. Screen-only means a bartender watching the whole kitchen behind a filter someone must remember to keep set. Drinks are the margin. A kitchen, unlike a bar, genuinely runs on a screen — KDS is a real product |
| 2026-09-18 | KT-a's scope is a routing table, not a phase boundary | `counter` and `bar` at go-live, `kitchen` a config line the chef switches on the same afternoon. Once the agent holds a socket and a job loop for the bill, another station is a routing rule and one ticket layout — it stopped being a second implementation in a second language |
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
| 2026-09-22 | **Signed (KT-D7): the status query is a key, default off, not built in v1; paper-out is a manual Reprint until a printer that answers is on the bench** | v3's default-on query with a 3 s timeout treated "no answer" as failure and failure as reprint — an infinite loop on the clones people buy. Deleting `DLE EOT` outright (the 09-18 manager pass) would have left no way back without a schema revival. **Doubt, written down:** a half ticket is caught by the chef's eyes, not the system, until the key is on for a printer that implements it. Reverse: build the read in `printer_link.dart` and flip the default |
| 2026-09-22 | **Signed (KT-D4 amended): never *silently* zero. A `kot` or `cancel` older than `print.staleAfterMinutes` (30, from `queuedAt`) is not auto-printed; it is counted on the till and printed by one tap with `force`. Bills ignore it. No `expired` state** | A tablet back from a two-hour sleep must not print fifty tickets for food already served; but a terminal `expired` state would have silenced the 90-second alarm at the moment the ticket was oldest and fought the Retry button (pending expires it again before a socket opens). Staying `queued` and skipping keeps the alarm and makes Retry one flag. **Doubt:** the chef has to tap; a busy pass may not. Reverse: `staleAfterMinutes: 0` prints everything, always |
| 2026-09-22 | **Signed (KT-D6 amended): the offline estimate is screen-only; it is never queued to print later; the real bill prints when the till is back (KT-S9)** | Under KT-D1c an offline till can reach neither the encoder nor the agent. Queueing the estimate would print a slip with no bill number twenty minutes after the guest left. KOTs from the guest and captain apps keep printing through the tablet's own uplink, so the outage costs till-originated paper only — which was already true of bills. **Doubt:** no paper at all during a till-only outage; the expensive way back is a box on the LAN, not worth it for the estimate |
| 2026-09-22 | **Job ids carry their kind; claim/ack/fail are idempotent and holder-checked; a stuck `claimed` is waiting again; the stale clock starts at `queuedAt`; drawer is immediate or dropped** (R4) | From the Grok plan review, each verified against the sheet: `${cartId}_${stationId}` made a cancel overwrite the printed KOT and a reprint collide with it; "second claim inside the lease is refused" forbade the same tablet recovering a lost answer; a job in `claimed` past its lease was neither queued nor expired and invisible to the alarm; a held round confirmed at minute 40 would have been born stale; a drawer kick replayed an hour late opens the drawer onto an empty counter |
| 2026-09-22 | **`print.agents` is a list of kinds; the install id is `claimedBy`; every print call is a staff-session call; the kitchen app reads a filtered `print-config`** (R13) | The plan had conflated kind and id, which would have failed every real tablet closed. An install id is not a credential. `approvals-config` on a kitchen tablet would leak the PIN policy |
| 2026-09-22 | **A reprint renders the lines as they are now, with `REPRINT n`; KT-S5's "the same ticket" is "the same round"** | Grok asked for a facsimile of the original. After a quantity cut the kitchen should see the current quantity, and the cancel ticket already told them. Rendering from live frozen lines keeps "store nothing" true |
| 2026-09-22 | ~~**`route()` throws on a line with no `categoryId`**~~ **Reverted the same day: a line with no `categoryId` routes by tax block, then the default station, and the hook logs `line.noCategory`.** | R1 outranks fail-closed here: printing never blocks an order, and a throw inside the placing transaction refused the whole checkout (the characterization fixtures proved it in minutes). A station `print.stations` does not know still throws — that is config, not data |
| 2026-09-22 | **Encoder: `1B 40` before `1B 74 n`, asserted in order; `क` (U+0915) must emit `0x3F`, never the low byte `0x15` (NAK); `drawerPulseMs` default 50** | Gemini's fan-out found the multi-byte hazard; the actual bug is `& 0xFF` on a BMP code point, not surrogates. Init resets the code page, so the code page after init is the only order that works. The sheet's 25 ms pulse gave `t1 = 13`, weaker than the `0x19` literal it replaced |
| 2026-09-22 | **The stale-queue sweep is KT's own `every 1 minutes` schedule in `api/print.ts`, not a shared door with FL's idle sweep** | Different cadence (the idle threshold is an hour), separate failure domain (a bad KT deploy must not take TD-044's fix down with it), and the contract says one caller means inline it. Cloud Scheduler bills per job, three free; the second job is free |
| 2026-09-22 | **Merged from the donor review and the Gemini pass**: cancel ticket back-links the original number (donor #2); a line the kitchen has seen is voided never deleted (donor #3 — `applyToLine` replaces the doc); ticket number is `${orderNumber}-${cartIndex}` already (donor #6). **Pushed back**: the Z-report (DC's), course firing (out of scope), a LAN fallback from till to tablet (the addressable-LAN design R13 rejects) | One line each, per the contract; neither review is re-run |
| 2026-09-22 | **KT-3 built as one commit with KT-4**: `domain/print.ts` (ids, lease, stale, status, sweep rules), `app/print.ts`, `adapters/firestore/print.ts`, `api/print.ts` (seven callables + `print-sweepJobs` every minute + the emulator-only `print-sweepNow`); hooks in `createOrUpdateOrder` (enqueue), `markLinesSent` (release), `voidCartLines` (drop or cancel), ST's void (cancel at the line's station), BL's issue and credit note. `suites/print.js` (31) bills a **seeded taxable line** because the e2e seed's tiramisu has no tax block (BL-S14 refuses it) | Every KT-S id from the queue half is a test name; the guest's note is TD-048 |
| 2026-09-22 | **KT-6 built**: a tender with `opensDrawer` queues `drawer:<paymentId>` in the take's transaction (a retry never kicks twice); ST's no-sale open queues `drawer:<auditId>` beside its P0 row. The till's `EstimateScreen` never had a `window.print()` to delete — its buttons now say "Show estimate" / "Show estimate again" and its header says why (KT-D6 amended) | KT-S17 in `app/payments.test.ts` and `app/approvals.test.ts`; OF-S13/S15 Playwright assertions reworded |
| 2026-09-22 | **KT-5 built**: `platter_kitchen/lib/print/printer_link.dart` (the one `dart:io Socket`, connect/write/flush/close under `writeTimeoutMs`), `print_agent.dart` (pending → claim → write → ack, else fail with the reason; one job in flight per station; a wedged station never stops the other), `print_toggle.dart` ("This tablet prints", off by default, in the app bar on every tab, Semantics `kitchen-print-toggle`), `network/print_api_service.dart`; the install id is minted once and excluded from Android backup and device transfer (`res/xml/backup_rules.xml`, `data_extraction_rules.xml`). Till: `features/print/PrintStatus.tsx` + `usePrintStatus.ts` on the floor, `e2e/print.spec.ts`. 13 Dart tests on a fake socket and a fake API | **Not built, on purpose:** the foreground service that keeps the tablet polling with the screen off. It is Kotlin plus a declared service type (`specialUse`), which is a new dependency in a new language — the spike decides it, and it is an "ask before adding" item. Until then the agent runs while the kitchen app is in the foreground, which is how the kitchen screen is used anyway |
| 2026-09-22 | **Grok's blind pass on the KT-1 skeleton, merged.** Taken: paise are never rounded (1 → 0.01, −0 is not a minus, minus with lakh grouping); midnight, month and year ends on the fixed +330 offset; an emoji is two code units and the hard cut never splits it; a bidi override in a guest note is dropped, a tab is a space; qty 10 and 100 rows; every station disabled → no ticket; **the block heading is the label BL froze** (`GST`, `Liquor`), never the config key shouted; **the title is derived from the frozen blocks** — food + liquor is an Invoice-cum-Bill of Supply, liquor only a Bill of Supply; **the HSN/SAC frozen on the line prints beside it** (Rule 46); a credit note shows the qty as a count, the money negative — no double minus; a two-line note; a block with lines and zero taxable prints 0.00 as frozen; 125 bps → `1.25%`, 200 bps → `2%` | Refused: a fixed quantity column (the hang is four spaces whatever the qty; a 100-qty KOT is a rounding error of a scene); veg/non-veg marks on the KOT (not on the line; if wanted, freeze it at placement first); a 16-column station (32 is the narrowest paper we ship for); dropping the golden row indexes (the golden rows are the point); a plus on a positive round-off is kept; a control byte becomes a space, not nothing, so words stay apart |
| 2026-09-23 | **KT-5b built: the foreground service is `connectedDevice` (Shaurya), plain Kotlin, no package.** `PrintService.kt` holds a partial wake lock; the toggle starts it and stops it on off, logout and dispose; `MainActivity.onDestroy` and `stopWithTask` stop it; `START_NOT_STICKY`. An explicit INTERNET permission joined the main manifest (only debug/profile declared it) | `connectedDevice` is Android's type for an external device over a network connection and needs only `CHANGE_NETWORK_STATE`, a normal permission; `specialUse` wants a free-text Play review and `dataSync` is capped at six hours a day. The service lives only while the Dart engine does, so the notification never claims printing that is not happening. **Not done, on purpose:** no start after a reboot (Android forbids starting the activity from boot, and a service without the engine would lie) — someone opens the app, and the till's KT-S23 line says so until they do; battery "Unrestricted" is a setup step, not a runtime prompt (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is Play-restricted). No `POST_NOTIFICATIONS` request: on Android 13+ the "Printing tickets" notification is hidden until granted, and the service runs regardless; the toggle icon is the visible sign. **Owed at release:** the Play Console foreground-service declaration for `connectedDevice` |
| 2026-09-23 | **KT-S19's till line is not built; the placing hook logs `line.unrouted` (`domain/kot.ts unroutedCategories`) instead** | `print-status` reads open jobs only, so a printed lemonade's category is invisible to it; showing it would mean a day's jobs read on every till poll, or a menu read that flags a beer category whose dishes route by their own liquor block. The ticket already prints at the default station, which is the half that matters. Empty when `print.route` is empty, because then the default station is the design. The warning belongs on CF's config screen, where categories and stations are edited |
| 2026-09-23 | **The 12-hour staff session stops the agent mid-dinner: TD-051, not fixed in KT** | An auth change shared by every staff app and the till. Not silent: the till's KT-S23 line goes red within 90 s |
| 2026-09-22 | **The hardware spike runs in parallel with this sheet, before KT-3 freezes the lease and the ack rule** | The lease length, the write deadline and whether a tablet can stay awake six hours are facts the room decides; freezing states in a sheet they then unwind is the expensive order. KT-1 and KT-2 do not wait for it |

## Known collisions with open debt

- **TD-018 (one till, one drawer).** The print queue needs an identity to hold a lease. The kitchen app mints its
  own install id (R13), so the till never needs a `registerId` for printing — TD-018 is left exactly where it was
  rather than being deepened by this module.
- **TD-032.** Deferred, not solved: the bridge box is implementation #2 and is not shipped. The day one is, the
  update, monitoring and provisioning story is owed.
- **TD-003 (no PIN prompt in Flutter).** Untouched: nothing in KT asks a Flutter app for anything.
- **TD-023 (cart cancel is not PIN-gated).** KT rides on `voidCartLines`, so a cancel ticket prints for a cancel
  that was not PIN-gated. That is TD-023's problem, not a new one, and the ticket is if anything the detection.
- **TD-024 (three unowned e2e failures).** The KT suite must not add a fourth; a flaky printer test is banned by
  the contract and there is no real printer in CI, so every automated assertion is against a fake port.

---

## Phase plan (each phase is one commit) — v4

Definition of done applies to every phase: the failing test written **first** and proven red against the old code,
`make check` green with the output pasted, e2e green where the path touches the emulator, `DEBT(TD-nnn)` rows filed,
and the scenario ID in the commit message. The plan with the reasoning is `reviews/2026-09-22-plan-paper-and-idle-tables.md`.

**KT-0. This sheet (v4) — DONE 2026-09-22 — and the spike, same week.** On the real tablet, one throwaway Dart
script, before any queue code: a foreground service of a type that survives a six-hour dinner (`specialUse`, not
`dataSync`, which Android 15 caps at six hours a day — this is Kotlin, so it is an "ask before adding" item);
screen-off Doze for 30 minutes with the poll still landing (`adb shell dumpsys deviceidle force-idle`); a write
larger than the printer's buffer (> 4 KB) arriving whole with the cut; `nc -vz <printer> 9100` from the staff SSID
(AP client isolation and the guest VLAN are two different walls); `targetSdkVersion` recorded. Android 16's
local-network restriction is opt-in and enforcement is Android 17 / target SDK 37 with `ACCESS_LOCAL_NETWORK`; a
denial looks like a connect timeout. Lease length and the ack rule are not frozen until the spike is back.

**KT-1. The ticket, pure** (`domain/kot.ts`, `domain/receipt.ts`). Skeleton first: one `it()` per scenario with the
expected string written by hand at 48 and 32 characters, body `todo`; one blind pass on the skeleton (Grok, per D3);
merge; implement one at a time. `route(line, cfg)`: category → `print.route`, else `taxBlockId` →
`print.routeByTaxBlock`, else `print.defaultStation`, never nowhere (KT-S19); no `categoryId` → throw. Tests:
KT-S1, S2, S3, S5, S11, S12, S13, S14, S15, S16, S18, S19, S21. R10 enforced structurally: a test plants a wrong
`payable` on the bill and asserts the paper prints the wrong number.

**KT-2. The encoder** (`adapters/printers/escpos.ts`). Ticket → `Uint8Array`, hand-written byte arrays: `1B 40` head,
`1B 74 n` after it, `1D 56 42 00` tail, `1B 61 01` centred, `1D 21 11` double, `1B 70 00 t1 t2` drawer with `t1`
from config. Every char > 0x7F → `0x3F`, asserted at the byte with a Devanagari name. Tests: KT-S13, S17, S21.

**KT-3. The queue** (`adapters/firestore/print.ts`, `app/print.ts`, `api/print.ts`). Endpoints per the layout,
all staff-session calls. Hooks into flat-dir code, each with a characterization test pinned first: enqueue in the
placing transaction (a failed job write fails the round); `held` behind the waiter gate; `markLinesSent` releases
and stamps `queuedAt`; `voidCartLines` queues a cancel at the stations the original went to; `billing-issue`
queues a `bill`; credit note; ST's `reprint` → `duplicate` + its P1 audit row. App tests on fake ports and a fake
clock: KT-S4, S7, S10, S20; "a second claim inside the lease **by a different agent** is refused"; "the holder
re-claiming gets the bytes again"; "ack twice is one success"; "fail from a non-holder is refused"; "an expired
lease is claimable again exactly once"; "a job past `staleAfterMinutes` is skipped by pending and claimable with
`force`"; "a held round confirmed at minute 40 is not stale". e2e `suites/print.js` on its own slot: place a
two-station round, pending, claim as `kitchen`, **two overlapping claims** (parallel calls, exactly one wins), ack,
cancel → cancel job at the same station only. Red first by planting a wrong job id.

**KT-4. The sweep.** `api/print.ts print-sweepJobs = onSchedule('every 1 minutes', maxInstances 1)` calling
`app/print.ts sweep(ports, now, cfg)`; an emulator-only manual trigger for the e2e, same pattern as FL's
`table-cleanupInactiveSessions`. One unit test on the fake clock; one e2e assertion in `suites/print.js`.

**KT-5. The agent and the status line.** `print_agent.dart` / `printer_link.dart` per the layout, the toggle, the
install id, the foreground service the spike chose. Dart tests with a fake socket factory: connect refused →
`fail` with reason and the job stays queued; write throws mid-ticket → no ack (KT-S20's provable half); happy path →
ack with the byte count; a socket that accepts and never reads → `fail` at `writeTimeoutMs`, and the other station's
loop kept running. Till: `PrintStatus.tsx` on the existing poll — `BAR printer not answering — 1 ticket waiting`,
`No print agent has claimed a job since 20:28 — 6 waiting`, `3 not auto-printed`, `no print agent` while every
toggle is off — with Retry (`force`) and Reprint; Playwright spec with the server's answers seeded: KT-S7, S23, the
stale case.

**KT-6. The counter.** `drawer` job after a cash `payments-take` and after ST's no-sale (KT-S17); OF's
`EstimateScreen` stays a screen and loses its `window.print()` div (KT-S9); OF-S7 re-run green. (The till's offline
sync replays estimate audit rows only, never `payments-take`, so a sync can never mint a stale drawer job.)

**KT-7. The room.** Not a commit: the tablet, two printers, a roll. What only hardware can tell us is listed below,
minus what the spike already answered. The one thing only the room proves is KT-S20's printed prefix.

### How a printer is tested without a printer

Everything up to the wire is tested with a **fake port**: an object with a `writable` whose sink records every
`Uint8Array`, and a `readable` a test can feed a status byte into. The assertions are exact byte arrays, so a
regression in the cut command or the alignment escape fails in milliseconds. The four states that matter are all
reachable without hardware: writes fine, throws on open, answers an error flag, never answers. The domain tests
never see a byte at all — they compare strings.

### What genuinely needs the real hardware in the room

1. **Does the tablet reach each printer on TCP 9100**, at the address the restaurant's router gives it — including
   what happens when DHCP hands a printer a new IP overnight (a static lease per printer is the likely answer, and it
   is a setup step, not code), and whether the staff SSID has client isolation on (`nc -vz`).
2. **The tablet stays awake and polling for a whole service** with the screen off and battery set to unrestricted —
   the spike's answer, re-checked on the shipped device and its OEM skin.
3. **The code page and the rupee.** Print `Rs. 1,02,450.00`, a long dish name, and an accented character, and look.
4. **The cut, and the buffered tail.** Partial vs full cut; whether a > 4 KB bill arrives whole; whether `close`
   straight after `flush` eats the last two lines on this printer (KT-S20's prefix, R7's doubt).
5. **The drawer.** Whether this drawer's solenoid fires on a 50 ms pulse (`t1 = 0x19`) through this printer's RJ11.
6. **Paper-out.** Whether this printer answers `DLE EOT` at all and what its bit 5 means — the day the answer is yes,
   `statusQuery` goes on for that station (KT-D7).
7. **Recovery after a power cut.** The tablet reboots at 21:00 with the restaurant full. Does the agent come back by
   itself, or does someone have to open the app?

---

## Open questions (owner: Shaurya)

- KT-Q1 Does the first restaurant want paper in the kitchen **at all**, or is the kitchen screen enough and only the
  bar and counter print? The answer halves the hardware bill and decides whether KT-S7 is a Friday-night emergency
  or a shrug.
- KT-Q2 One tablet or several? Under KT-D1c one kitchen tablet can drive all three printers over the LAN, or the bar
  and counter can run their own with the toggle on (KT-S10 makes that safe). Does the restaurant have a network the
  tablet and the printers share, or is that part of the install?
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

## Review — answered 2026-09-22

Five calls put to Shaurya with the options and their costs, all signed on the recommended option, each with its
doubt written into Decisions and mirrored in the PRD §17.2: **KT-D7** (paper-out: key kept, default off, manual
Reprint in v1), **KT-D4 amended** (stale tickets skipped, counted, one tap), **KT-D6 amended** (offline estimate
screen-only), and FL-S36's two (a silent table freed after 60 minutes; a paid uncleared table freed by the same
clock). The job model (ids per kind, holder re-claim, idempotent ack/fail) was signed with them as one set.

**Owed before KT-3 freezes the lease:** the hardware spike (KT-0). **Owed before KT-1's expected strings are
written:** nothing — the skeleton starts now.

## Files (donors)

`DONORS.md` → Printing currently says only "Odoo `pos_restaurant` printer routing per category. Odoo `pos_printer`
is not in the sparse set; add it when KT is built." Add `addons/point_of_sale/models/pos_printer.py` and
`addons/pos_restaurant/models/restaurant_printer.py` to the sparse checkout before phase 1, and run
`/moonshot-donor-review` against them per the contract — the builder does not read them.
