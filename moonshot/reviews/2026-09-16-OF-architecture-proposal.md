# OF · Offline & sync — architecture proposal

> **Superseded 2026-09-16, same day.** Shaurya rescoped OF to four items (request id, indicator, read cache, emergency bill); see `SPEC_OF_offline_and_sync.md`. Kept as the record of the write-replay design and why a reserved range was not needed under one till.

For Shaurya. Phase 0 of `HANDOFF_OF_offline_and_sync.md`. Nothing below is built; no code exists that
assumes an answer. Session `plattr-pro-11`, emulator slot 2.

## The scene, and what the till can actually do about it

Saturday 20:40, the line drops, 30 tables seated. Today's till does four things: a line discount (ST),
a bill (BL), a tender (PY), a day close (DC). It takes no orders (OR is not built) and prints nothing
(KT is not built). Guests order on their own phones over mobile data, straight to the cloud, so their
orders keep landing in Firestore while the restaurant's Wi-Fi is dead. The kitchen and captain apps
are Flutter on that Wi-Fi: they go blind.

So for the till, "offline" means one thing: **bill and take money for tables whose lines the till has
already seen**, and hand out numbers with no holes. "Keep taking orders" offline is OR plus the
Flutter apps, a different module, and I want it out of scope with that reason (question 2 below).

## The one decision: the till is a queue of intents, not a second database

**Proposed.** The till keeps what it last read through its one door (`api/client.ts`): the config it
bills with, the tenders it may offer, the counter's `next`, and every draft's lines it has previewed,
each stamped with when. While the server is unreachable it runs the **same pure domain code** the
server runs (`domain/billing.ts`, `domain/invoice.ts`, imported into the browser, nothing copied) to
compute the bill it prints, mints its own ids, and queues the exact request body it would have sent.
When the line is back it replays the queue, oldest first, through the same door to the same
endpoints. The server recomputes everything exactly as it does today, checks that the id is new and
the number continues the series, and writes. **The till's figures are never written.** They are
compared, and a bill whose recomputed payable differs from what was printed gets the server's figure
on the document plus a P0 audit row naming both.

Two alternatives, and why not:

- **Firestore SDK offline persistence in the till.** Breaks the layering rule (the till would read
  Firestore directly) and "server decides", and the SDK cannot run a transaction offline, so it
  cannot hand out an invoice number, which is the one hard thing. It solves the easy part and none of
  the hard part.
- **A box in the restaurant running the functions** (a small local server). Real answer for
  multi-hour outages; a second deployment target and a new dependency for v1. Named as the upgrade
  path, not built.

## Numbers: continue the series, do not reserve a range

BL-S20 says "numbers come from the reserved range". I want to change that sentence, because under
your one-till call (TD-018) the till is the **only** issuer of series A. So:

- After every online issue the server returns the counter's `next`; the till remembers it.
- Offline, the till hands out `next`, `next + 1`, … in the order it issues. No gaps by construction.
- On replay the server accepts the till's number **only if it equals the counter's `next` at that
  moment**. If it does not, a second issuer existed (TD-018 was broken), and the server refuses that
  replay and everything behind it. The queue is parked for a human. Nothing is renumbered, because
  the guest is holding the paper.
- The fiscal-year key on replay is judged at the time the till issued, not the time the line came back
  (a bill issued 31 March 23:50 replayed 1 April 00:20 stays in `2026-27`).

A reserved range (`counters/{key}.lease {tillId, from, to, until}`) only earns its keep when two
things issue at once, and it creates the unused-tail problem BL already called "an illegal gap". Not
built. Its day comes with the second till, and the counter document does not change either way.

## Same act, recognised: the client mints the document id

PY already does this (`paymentId` from the till is the document id, R13: a retry is one row). BL's
issue takes a server-random `billId` today. Proposed: the till may send `billId`; the create must fail
if it exists, and a repeat with the same `billId` on the same draft returns the existing bill as a
success. No new "requests" collection, no idempotency table: the document id is the key, and the
two acts that can run offline write **no audit row of their own** (an offer discount is the system's,
a take writes none). Every act that does write one needs a PIN, and a PIN needs the server, so:

**Rule: nothing that goes through ST's door works offline.** Manual bill discount, comp, cancel,
credit note, refund, void, drawer movement, line discount: refused at the till with "needs the
server", never queued.

## What the till may do with no server

| Act | Offline | Why |
|---|---|---|
| Preview a draft it has cached | yes | pure domain, same code as the server |
| Issue a bill (offer discount only, charges as configured or dropped) | **your call, q3** | number continues the series |
| Take cash | **your call, q5** | R13 already makes a retry one row |
| Record a card / UPI tender | **your call, q5** | the terminal has its own network; `captured` is the cashier's word today too |
| Refund, void, cancel, credit note, any discount, drawer open | no | PIN, or a second series |
| Day close | no | needs the whole ledger; refused while anything is unsynced (q4) |
| Log in | no | the session must already exist; the lease is shorter than the session |
| See a line that arrived after the lease | no | the till bills what it has seen and the rest stays on the draft for a second bill (BL-S12 shape) |

## What changes on documents the four modules already write

All additive. Existing documents keep working unread.

| Document | Change |
|---|---|
| `bills/{billId}` | id may be client-minted; `offline: {requestId, queuedAt, replayedAt, printedPayable} \| null` |
| `payments/{paymentId}` | `offline: {…}` as above; `businessDate` taken from `queuedAt`, not replay time, so DC-S28's "the date on the row" logic holds |
| `lines/{lineId}` | unchanged; `billId` stamped at replay. `billing-issue` gains an explicit `lineIds` so a line that landed during the outage is not swallowed into a bill that was already printed |
| `counters/{key}` | unchanged |
| `audit/` | one row per outage, `action: 'offline'`, `{from, to, acts, failed}`, so MN can tell an outage from a quiet night |
| `config/settings.offline` | `{leaseHours: 12, maxQueueDepth: 200, replayIntervalSeconds: 5, maxReplayAgeHours: 24}`, defaults in code |
| `dayClose/{date}` | unchanged; the till refuses to open the close screen with a non-empty queue |

Two shipped modules get touched: BL (`issue` accepts `billId`, `number`, `lineIds`, `offline`; replay is
idempotent) and PY (`take` accepts `offline`; `businessDate` from it). Characterization tests first,
their suites stay green, every change behind a scenario id.

## The three refusals, revisited on purpose

- `billing-issue` refuses when config cannot be read (BL R12). Unchanged on the server. The till-side
  twin is the **lease age**: cached config older than `offline.leaseHours` refuses an offline issue,
  because a tax rate may have changed under it.
- `payments-take` refuses when the day-close state is unknown (PY R15). Unchanged. A replayed take
  on a date DC has since closed is **refused and parked**, never re-dated to today; that is DC's
  straggler row and it stays a human's problem.
- `dayClose-close` refuses an unreadable ledger (DC-S13). Unchanged, plus: refused while the till
  holds unsynced acts, since the ledger it would freeze is missing them.

## Boundaries and stack: what I need a yes on

- **ui → domain** is a new allowed edge (the till imports `backend/…/domain/*` through a Vite path
  alias; no copy, no package, no dependency). `app` and `adapters` stay banned from the till and the
  boundary grep says so.
- **Queue storage** is `localStorage`, one JSON array per restaurant. ~5 MB is thousands of acts; a
  Saturday is a few hundred. IndexedDB when that ceiling is real, marked `ponytail:` at the site.
- **No new dependency.** Reconnect detection is `navigator.onLine` plus the failed fetch itself.
- **Module shape** as CLAUDE.md: `domain/offline.ts` (what may run offline, replay order, lease
  freshness, number continuity, mismatch judgement), `app/offline.ts` + `adapters/firestore/offline.ts`
  + `api/offline.ts` exported as `offline-lease` and `offline-report`, `frontend/till/src/features/offline/`.
  Replays go to the **original** endpoints, not a new one: a second write path is a banned dependency
  in disguise.

## Questions (answer inline; a bare "yes" takes every recommendation)

1. **The architecture above**: queue of intents, continue-not-reserve, client-minted ids, additive
   fields, ui → domain. Yes / no / change what?
2. **Guest QR app and the Flutter kitchen/captain apps offline**: recommend **out of scope** for OF,
   named in the sheet with the reason (guests reach the cloud on their own data; the staff apps are a
   different codebase and a different module).
3. **Issue a bill offline, or only park it?** Recommend **issue**. A parked bill cannot be printed
   with a GST number, and the guest at 20:40 wants to pay and leave; parking means a paper bill,
   which is the thing we are replacing. The cost is the mismatch case, which is recorded, not hidden.
4. **Day close with unsynced rows**: recommend **refuse** until the queue is empty. If the line is
   still down at closing time the day stays open and the morning float screen says so. DC has no
   reopen, so a close over a partial ledger is the one outcome we cannot undo.
5. **Overrule PY's "the till is online or it does not take money"** for cash and external tenders
   queued with their own `paymentId`. Recommend **yes**; it is the sentence the handoff's "keep taking
   money" cannot be met without. Refunds and voids stay online-only.

## Phase plan (also in `STATE.md` In flight)

0. DONE: this page and the plan.
1. `SPEC_OF_offline_and_sync.md` v1 from the approved answers; fan-out; Review section.
2. Test skeleton with hand-computed values (domain, app, e2e, Playwright); blind Opus and fan-out;
   donor review started.
3. `domain/offline.ts` green, one scenario at a time.
4. BL and PY seams under characterization tests: client `billId`/`number`/`lineIds`/`offline` on
   issue, `offline` on take, replay idempotent.
5. `app/offline.ts`, adapter, `offline-lease` / `offline-report`, e2e suite on slot 2.
6. Till `features/offline/`: queue, drain, banner; bill and tender hooks fall back to local domain;
   Playwright cuts the connection mid-bill and restores it; `journey.mjs` gains an offline step.
7. Donor review merged, debt rows, `STATE.md`.
