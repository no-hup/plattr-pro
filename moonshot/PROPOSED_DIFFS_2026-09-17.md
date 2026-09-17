# Proposed diffs for `CLAUDE.md` and `STATE.md` — 2026-09-17

The contract reserves both files to Shaurya: *"Never edit `moonshot/CLAUDE.md`, `moonshot/STATE.md`
decisions, or the golden fixture directly. Propose the diff."* So these are written here, unapplied.
Everything else from the 2026-09-17 decisions is already applied — `DECISIONS_2026-09-17.md`, the
three sheets, `TECH_DEBT.md` and `PLATTR_PRO_PRD.md` §17.

---

## 1. `moonshot/CLAUDE.md` line 55 — the Stack block

The line is wrong twice over, and it is in the block a fresh session reads first.

```diff
 Staff web: Vite + React + TypeScript, PWA on Chrome for Android. Playwright for browser tests.
-Printing: LAN (TCP 9100) first, Web Serial over Bluetooth second, native wrapper never unless both fail.
+Printing: a print agent on the restaurant's LAN pulls jobs and speaks TCP 9100. No browser is ever on
+the print path — a page cannot open a TCP socket, and Web Serial over Bluetooth was rejected (KT-D1).
 Bans: no new dependency without asking. No Next.js, Redux, CSS-in-JS, component library. No second
```

**Why.** "LAN (TCP 9100) first" was never achievable from the till: a browser has HTTP, WebSocket and
WebTransport, and a thermal printer speaks none of them. The fallback named second — Web Serial over
Bluetooth — does work, but on **Chrome 148** (April 2026), not the Chrome 138 recorded in `STATE.md`,
and it was rejected on 2026-09-17 because it means replacing every printer a restaurant owns.

The correction is not a reversal: TCP 9100 is still how a printer is reached. What changed is *who
opens the socket* — a print agent on the LAN, not the till. Full reasoning in
`SPEC_KT_print_path.md`, decision KT-D1 / KT-D1b.

---

## 2. `moonshot/STATE.md` — supersede the stale Done row

Line 73. The contract wants the history kept, so this supersedes rather than deletes.

```diff
-- 2026-09-15 · Decision: staff screens in React web (Vite), Flutter apps untouched, LAN printing
-  first then Web Serial over Bluetooth (verified: Chrome 138 release notes).
+- 2026-09-15 · Decision: staff screens in React web (Vite), Flutter apps untouched. ~~LAN printing
+  first then Web Serial over Bluetooth (verified: Chrome 138 release notes)~~ — **the printing half is
+  superseded 2026-09-17.** Two errors: a browser cannot open a TCP socket at all, so "LAN first" was
+  never reachable from the till; and Web Serial over Bluetooth landed in Chrome **148** (Apr 2026),
+  not 138. Replaced by KT-D1: a print agent on the restaurant's LAN. The React decision stands.
```

---

## 3. `moonshot/STATE.md` — a new Done entry, newest at the top

```markdown
- 2026-09-17 · **Three sheets written and signed, nothing built.** `SPEC_KT_print_path.md` (22
  scenarios), `SPEC_OR_till_order_entry.md` (22) and `SPEC_UQ_upi_dynamic_qr.md` (25) close the last
  three go-live blocks on the build map. Shaurya answered all 20 Review calls in one sitting; the
  record, including the cost of the three that went against the sheets' own recommendations, is
  `DECISIONS_2026-09-17.md`. TD-026…TD-032 filed. `PLATTR_PRO_PRD.md` gained §17.
  **Neither the donor review nor the fan-out has run on any of the three** — both are contract steps
  and both are owed before phase 1 of any of them. Odoo `pos_printer.py` and
  `pos_restaurant/models/restaurant_printer.py` are not in the local sparse clone and must be added.
  Three findings worth carrying:
  - **KT was rewritten after the decision.** Draft v1 made the till the print station, holding
    Bluetooth links and a claim/lease loop. KT-D1 chose a LAN bridge that *pulls* jobs, so no device
    holds a link, the "sleeping tablet prints nothing" failure disappears, and KT-D3 ("both the till
    and the kitchen tablet can print") became free because neither of them prints.
  - **OR is far smaller than assumed.** No staff surface has ever placed an order — the captain app
    has eleven endpoints and no `cart-*` write but `updateCartStatus` and `removeItemFromCart`. But
    the guest order path is table-agnostic, so OR is one new endpoint (`table-openTable`) plus a
    screen. Merge, un-merge, `addedBy` and `requestId` already exist and work.
  - **UPI stopped being free.** 0.4 % above ₹2,000 from 15 Oct 2026, merchant-borne, no surcharge
    allowed. Decided: accept it, encode nothing, never split a bill to dodge it. Provider is Paytm
    (0 %) over Razorpay (~2.36 %), with phase 7 carrying a sandbox measurement gate because Paytm
    publishes no webhook retry policy, dedupe key or ordering guarantee.
```

---

## 4. `moonshot/STATE.md` — rows for the Decisions log

Six of the twenty reach beyond their own sheet. The rest stay in the sheets.

| Date | Decision | Why |
|---|---|---|
| 2026-09-17 | **Printing is a print agent on the restaurant's LAN that pulls jobs**, not a browser holding a link (KT-D1, KT-D1b) | A page cannot open a TCP socket, and the Bluetooth alternative meant replacing every printer a restaurant owns. Because the agent pulls, nothing on the LAN is addressable and no certificate is needed. It also removes the browser from the print path entirely, which is what made "till and kitchen tablet both print" cost nothing. The price is hardware per restaurant, a setup visit, and a second deployable with no update or monitoring story (TD-032) |
| 2026-09-17 | **`categoryId` is frozen onto the placed line** (KT-D2) | Schema. One additive field so a ticket routes by what the menu said when the round was placed, not when it is reprinted. Without it a station beyond kitchen/bar needs this migration later, after there is data |
| 2026-09-17 | **A staff member can open a table session with no OTP** (`table-openTable`, OR-1) | Session semantics. A walk-in has no phone, and `validateOTP` was the only thing that minted a table session. The session records `openedBy: 'staff:<serverId>'`. The exposure it adds — a table open with no guest verified — already exists for every OTP'd table |
| 2026-09-17 | **Opening an occupied table extends the live sitting and never mints a new one**; the four-hour expiry becomes `ordering.sessionHours` (OR-6) | Session lifetime, and it reaches the **guest** app too because `validateTableSession` is shared. Otherwise a 23:05 round on a table opened at 19:00 silently starts a second bill. A guest at a long dinner also stops being logged out mid-meal |
| 2026-09-17 | **UPI provider is Paytm**, and phases 1–6 ship with no provider at all (UQ-2, UQ-2b) | 0 % against Razorpay's ~2.36 % is ~₹21,000 a month on ₹9 lakh of UPI. What is given up is documentation: Paytm publishes no webhook retry policy, no dedupe key and no ordering guarantee, so phase 7 measures them in sandbox before trusting them. The adapter is one file, so the switch stays cheap |
| 2026-09-17 | **A public HTTP webhook endpoint on the production project is accepted** (UQ-3) | The first endpoint on `rms-app-dd875` anyone on the internet can reach. Raw-body HMAC checked before anything is read, constant-time compare, secret in Secret Manager. There is no automatic payment confirmation without one, and a forged request costs one hash and no Firestore read |

---

## 5. `moonshot/STATE.md` — **Next**

KT, OR and UQ are specified and unblocked. Suggested replacement for items 5 and 6:

```markdown
5. ~~Spec sheet BL~~ done; ~~PY~~ done; ~~DC~~ done; ~~OF~~ done; **~~KT, OR, UQ~~ done 2026-09-17**.
   Next sheets: RP · Reports (it reads DC's frozen close document, never recomputes one).
   Before building any of KT, OR or UQ: the donor review and the fan-out, neither of which has run.
6. **MN · Monitor** — unchanged, and three new rows now lean on it: TD-028 (money with no bill row
   that nobody is alerted about), TD-032 (a print agent that dies unnoticed) and UQ-5's manual
   confirm, which is deliberately a detected rather than prevented theft vector.
```
