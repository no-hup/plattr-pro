// PY · Payments — till browser tests. Bill 0417: payable 60900 (₹609.00).
//
// SKELETON. Cases marked `todo: needs BL` wait on BL's finalise endpoint, because a
// tender screen needs an issued bill to render. The parsing cases below it do NOT
// wait: they are pure client-side and are the first thing to make green, because
// R8 says a float must never reach the wire.
import { test, expect } from '@playwright/test';

const NEEDS_BL = 'todo: needs BL billing-finalise to put an issued bill on the screen';

// ── R8 at the keyboard. No bill needed; these can go green immediately. ──────
test.describe('till amount pad — R8, typed text becomes integer minor units or nothing', () => {
  test.fixme(true, 'skeleton');
  test('PY-S31 "608.995" is refused at the pad; no request is issued', async () => {});
  test('"608.99" sends exactly 60899, asserted as an integer', async () => {});
  test('"8.49" sends 849, never 848. This is the float trap named in the Decisions', async () => {});
  test('"609" sends 60900; "609." sends 60900; ".5" sends 50', async () => {});
  test('"6 0 9", "6,09", "abc" and "" are all refused at the pad', async () => {});
  test('"-609" is refused; a negative is never a payment', async () => {});
  test('a very long run of digits is capped at the pad, not sent as MAX_SAFE_INTEGER', async () => {});
});

test.describe('till — R13, the paymentId the server trusts', () => {
  test.fixme(true, 'skeleton');
  test('R13 each new tap generates a fresh paymentId', async () => {});
  test('R13 a retry after a simulated network failure REUSES the same paymentId. This is the whole defence against PY-S23', async () => {});
  test('R13 the id survives a page reload mid-tender, so a refresh is not a second payment', async () => {});
});

// ── everything below needs a bill on the screen ──────────────────────────────
test.describe('till tender screen', () => {
  test.fixme(true, 'skeleton');
  test(`PY-S1 cash exact: outstanding shows ₹609.00, tender Cash, bill settles, drawer opens — ${NEEDS_BL}`, async () => {});
  test(`PY-S2 cash with change: tendered ₹700 shows change ₹91.00 on screen before confirm — ${NEEDS_BL}`, async () => {});
  test(`PY-S3 split: card ₹400 leaves ₹209.00 outstanding on screen and the bill is not settled — ${NEEDS_BL}`, async () => {});
  test(`PY-S4 the second tender's change is computed on ₹109.00, not ₹609.00 — ${NEEDS_BL}`, async () => {});
  test(`PY-S20 the card tender shows a reference field and will not confirm while it is empty — ${NEEDS_BL}`, async () => {});
  test(`PY-S20 the cash tender shows no reference field — ${NEEDS_BL}`, async () => {});
  test(`PY-S19 a tender added to config appears on the screen with no deploy — ${NEEDS_BL}`, async () => {});
  test(`PY-S8 a comped ₹0 bill shows "nothing to collect" and offers no tender button — ${NEEDS_BL}`, async () => {});
  test(`R10 a cash tender whose snapshot says opensDrawer fires the drawer signal — ${NEEDS_BL}`, async () => {});
  test(`R10 a card tender with opensDrawer false fires NO drawer signal. The drawer is the one thing the guest can see open — ${NEEDS_BL}`, async () => {});
  test(`PY-S28 a captured UPI of ₹650 against ₹609 shows ₹41.00 as an overpay on screen, not as change handed back — ${NEEDS_BL}`, async () => {});
  test(`PY-S5 a card tender of ₹700 with the terminal in hand is refused at the till before any call — ${NEEDS_BL}`, async () => {});
});

test.describe('till — the PIN challenge is ST\'s one interceptor, never a local popup', () => {
  test.fixme(true, 'skeleton');
  test(`PY-S9 a refund answers permission-denied + {requires:'pin'}; the shared PIN box appears and the retry carries the pin — ${NEEDS_BL}`, async () => {});
  test(`PY-S12 a SERVER-role session gets a plain 403 and NO PIN box. A 403 that looks like a challenge makes the till loop — ${NEEDS_BL}`, async () => {});
  test(`arch-5: the challenge is answered at most 10 times, then "start again" — the cap ST added, reused here — ${NEEDS_BL}`, async () => {});
});

test.describe('till — the states a cashier must be able to see and get out of', () => {
  test.fixme(true, 'skeleton');
  test(`PY-S17 a failed take shows "try again" and leaves the outstanding unchanged on screen — ${NEEDS_BL}`, async () => {});
  test(`PY-S24 a retry that the server answers with the original row shows SETTLED, not an error — ${NEEDS_BL}`, async () => {});
  test(`PY-S27 voiding the row that settled the bill puts ₹609.00 back on the screen as outstanding — ${NEEDS_BL}`, async () => {});
  test(`PY-S30 after a ₹84 refund the screen shows ₹84.00 outstanding and allows a new tender — ${NEEDS_BL}`, async () => {});
  test(`PY-S7 the loser of a race sees "nothing outstanding" and the bill as settled, not a hard error — ${NEEDS_BL}`, async () => {});
  test(`PY-S35 a void whose response is lost, retried by the same cashier with the same reason, shows done — not an error that invites a second correction — ${NEEDS_BL}`, async () => {});
  test(`R15 a void never fires the drawer signal. Cashiers reach for void to hand money back; the screen must not reward that — ${NEEDS_BL}`, async () => {});
});
