# QA grid: till bill screen (`?r=&draft=`), 2026-09-25

Prep for a driver agent (AGENT_QA.md §5–7). Read-only prep: nothing was run. Every "expected" cites
[SPEC_BL](../SPEC_BL_billing_and_tax.md) (BL-Sn, Rn, D = a Decisions row by date) or the code that
decides it. Code read: [BillScreen.tsx](../../frontend/till/src/features/billing/BillScreen.tsx),
[useBill.ts](../../frontend/till/src/features/billing/useBill.ts), [App.tsx](../../frontend/till/src/App.tsx),
[PinPrompt.tsx](../../frontend/till/src/features/approvals/PinPrompt.tsx),
[app/billing.ts](../../backend/src-plattr/functions/app/billing.ts), [domain/billing.ts](../../backend/src-plattr/functions/domain/billing.ts).

Coverage tags: **[PW]** till `e2e/billing.spec.ts` / `approvals.spec.ts` · **[APP]** `app/billing.test.ts` ·
**[E2E]** `test/e2e/suites/billing.js` · **[DOM]** `domain/billing.test.ts`. No tag = no test. Explore the untagged cells first.

Facts the driver needs before starting:
- **The screen only shows a draft on load.** It calls `billing-preview`, which bills only lines with `billId == null`. An issued, paid, cancelled or comped bill is on screen **only in the same page, right after the act** (the returned bill replaces the preview). Reloading `?draft=` of an issued draft shows an empty ₹0.00 draft. The floor sends an issued bill to `?bill=` (the tender screen), never here.
- **The draft id is the guest session id** (`orders/lineSnapshots.js:96`). The helper prints it as `guest session …`. A split half is whatever `toDraftId` said (the helper uses `<guest>_b`).
- Seed MockData7, restaurant `res_meghana`. Till login `till@meg.test` / `1234` (MANAGER). Also `admin@meg.test` (ADMIN), `server@meg.test` (SERVER), `kitchen@meg.test` (KITCHEN), `manager@meg.test` (MANAGER, which the helper uses). Every PIN is `1234`.
- Meghana config: food block exclusive CGST 2.5 + SGST 2.5 (`rateBps` 250+250), liquor block inclusive with `parts: []`, `SERVICE_CHARGE` 5 % (`percentage: 5` → `pctBps` 500, block food), `PACKING` flat ₹20.00 (`amount: 2000`, `optIn: true`, only on tables P1/P2), `roundTo` 100, `partRounding` independent. Approvals defaults: PIN above 10 %, line-discount cap 50 %, reasons `placard, regular, complaint, birthday, guest left, staff meal, complimentary, other`.
- The helper's dish is **Butter Naan ₹60** (first plain, undiscounted, non-liquor item by id).

## 1. Controls

| data-testid | What it does | Who may (spec) | What the code does |
|---|---|---|---|
| `bill`, `line` ×n, `block-<id>`, `charge-<TYPE>`, `roundoff`, `payable`, `as-of`, `bill-number`, `bill-msg` | Read-outs. `line` rows are only lines with `countsTowardTotal` (a voided line is hidden, BL-S17). `bill-number` = `#A-0417`, plus ` (cancelled)` | anyone logged in | `roundoff` is shown only when ≠ 0 |
| `preview` | Re-reads the draft (`billing-preview`) and replaces the bill on screen | Preview: SERVER ✓, MANAGER ✓, ADMIN ✓ | Always visible once a bill is on screen, **including over an issued bill** |
| `issue` "Generate bill" | `billing-issue` with `expectedV` = every line's `v` from the preview on screen, plus `dropCharges` | MANAGER, ADMIN; SERVER "–" (BL-S7) | Only while there is no number. Role check first, then the transaction |
| `toggle-charge` (service charge), `toggle-charge-PACKING` (parcel) | Client-side: adds or removes the type in `dropCharges`, then re-previews. "Remove service charge" / "Add service charge back" | MANAGER/ADMIN, **audit P1, no PIN** (BL-S10); SERVER "–" | Only before issue. **Shown to SERVER too.** No server call except the preview, so no audit row |
| `comp-reason`, `comp-note` (≤120), `comp` "Comp the whole bill" | `billing-issue` with a 100 % bill discount = Σ net of live lines. PIN through ST (`billDiscount`, above 10 % → PIN) | MANAGER/ADMIN, PIN, reason (BL-S22, D 2026-09-23 NC) | Only before issue. Disabled until reasons load. Client refuses "Nothing to comp" when net ≤ 0. Success text is **hard-coded** "comped to ₹0.00" |
| `cancel-reason`, `cancel-note` (≤120), `cancel` "Cancel bill" | `billing-cancel`: PIN, reason from ST's list | MANAGER/ADMIN, PIN + reason (BL-S9) | Only when `status === 'issued'` (so hidden for `paid`, `cancelled`) |
| `pin-prompt`, `pin-hint`, `pin-input`, `pin-ok`, `pin-cancel` | Shared PIN box (one per app). The same body is sent again with `pin` | – | `pin-ok` is disabled while the input is empty. Hints: `Needed for this <action>` / `Wrong PIN, n left` / `Wrong PIN, wait n s` / `Too soon, wait n s`. At most 10 answered challenges per call |
| `?line=<lineId>` form: `amount` (rupees), `reason`, `note` (≤200), `apply`, `msg` | ST line discount (`approvals-apply` `discount`) | MANAGER/ADMIN; PIN above 10 %; refused above 50 % (TD-004); SERVER "Not allowed" | A separate screen. **Nothing on the bill screen links to it**, so the cashier must know the lineId |
| Not on this screen | credit note (BL-S11), split (BL-S12), reprint (BL-S16), customer tax id (BL-S19), a link to the tender screen | D 2026-09-15: "Credit notes and split have no screen yet" | Cells marked **not built**. Do not report them as bugs |

Error text: a `permission-denied` with no `requires` is shown as **"Not allowed"** (`ui/says.tsx:23`). Everything else shows the server message.

## 2. States and how to produce each

Helper: `node backend/src-plattr/functions/test/e2e/qa/floorstate.mjs <table> <state>` with env from `EMU_SLOT=<n> ./emu.sh env`. **Never slot 1** (another agent is on 8180/5102). Test the helper on each state you use before trusting the screen (§5).

| # | State | How | Helper can? |
|---|---|---|---|
| S1 | Draft, one line | `floorstate 6 ordered` → `?r=res_meghana&draft=<guest>` (or tap tile 6) | yes |
| S2 | Draft, several lines | `floorstate 7 seated`, then `cart-addItemToCart` ×n `{restaurantId, tableId, menuItemId, quantity, sessionId:<guest>}` and one `cart-checkoutCart {restaurantId, tableId, sessionId:<guest>}` | **no** |
| S3 | Voided line | S2, then `approvals-apply {restaurantId, sessionId:<staff>, action:'void', cid, lineId, reason:'complaint', pin:'1234'}` (the line was sent to the kitchen, so the PIN is needed) | **no** |
| S4 | Line discount | S1/S2, then `approvals-apply {…, action:'discount', lineId, amount:<rupees>, reason:'regular'}` (≤10 % no PIN), or the `?line=` screen | **no** |
| S5 | Order offer | S2 with **Chicken 65 (`mi_chicken65`) + Coastal Crab Roast (`mi_crab_roast`)** in one checkout → FLAT ₹100 (min ₹499). Or Veg Biryani single (`mi_veg_bir`, `selectedVariants:{mv_bir_portion:'single'}`) → category 10 % | **no** |
| S6 | Charges dropped | S1 + click `toggle-charge` | in-screen |
| S7 | Parcel with packing | `floorstate P1 ordered` (**untested**: the table number is the string `P1` and it seats through an OTP it normally never uses; if it aborts, use the captain's Add-dishes on P1) | maybe |
| S8 | Issued | In-page: S1 + `issue`. (`floorstate 8 billed` makes one, but the screen then shows an empty draft) | partly |
| S9 | Part-paid | S8 in-page, then from outside: `payments-take {restaurantId, sessionId:<staff>, billId, paymentId, tenderId:'cash', amount:<half>, tendered:<half>}`. Do not reload | partly (`partpaid` exists, screen cannot show it) |
| S10 | Paid | As S9 with the full `payable` | partly (`settled`) |
| S11 | Cancelled | S8 + `cancel` in-page | **no** |
| S12 | Comped | S1 + `comp` in-page (becomes `status: 'paid'`, payable 0) | **no** |
| S13 | Credit note | S10, then `billing-creditNote {restaurantId, sessionId, cid, billId, reason:'complaint', note, pin:'1234', credits:[{lineId, qty:1}]}`. The screen cannot show a note | **no** (and not built on screen) |
| S14 | Split drafts | `floorstate 9 split` → `?draft=<guest>` and `?draft=<guest>_b`. For an offer split: S5, then `billing-split {restaurantId, sessionId:<staff>, cid, draftId:<guest>, moves:[{lineId:<crab>, toDraftId:'<guest>_b'}]}` | yes (no offer) |
| S15 | Stale draft (TD-040) | Open S1 in the browser (preview on screen). From outside, add and check out a dish with the guest session, **or** void a line (S3's call). Then press `issue` without Preview | **no** |
| S16 | Draft of another restaurant | `QA_RID=res_pizzabakery floorstate 6 ordered` (`ordered` needs no staff login; billed states would fail because the helper logs in as `manager@meg.test`). Open `?r=res_meghana&draft=<that guest>` | partly |
| S17 | Non-existent draft | `?r=res_meghana&draft=nope` | trivial |
| S18 | New round after issue (FL-S20) | `floorstate 10 dessert` → floor picker → the draft | yes |
| S19 | Issued bill on screen, then Preview pressed | S8 + `preview` | in-screen |

## 3. The grid

MGR = till/manager/admin. SRV = server@. Row = control, column = state. **Bold = most likely bug.**

### Preview / on-load
| State | Expected |
|---|---|
| S1 | Naan ₹60: food `GST: ₹63.00 · CGST 2.5% ₹1.58 · SGST 2.5% ₹1.58`, `SERVICE_CHARGE 5%: ₹3.00`, round-off −₹0.16, **Payable ₹66.00**, no number (BL-S1, S6, S21) [PW on a different seed] |
| S2 | One `line` per placed line, blocks as sums (R5) [DOM] |
| S3 | Voided line not listed, not taxed; count drops by one (BL-S17) [DOM] |
| S4 | Line cell shows `−₹x` after list price; tax on the net (R1) [DOM] |
| S5 | −₹100 spread across both lines by net share (BL-S24, R1). **The offer name is not shown anywhere**, only unlabelled −₹ figures (human lens). Payable ₹882.00 (§6 case 4) [E2E BL-S24] |
| S7 | `PACKING: ₹20.00 flat`, no service-charge row, button `toggle-charge-PACKING` (BT-P) [E2E BT-P, APP BT-P4] |
| S14 | Each half previews only its own lines, with its own service charge [APP BL-S12]. **With an ORDER-scope offer, each half gets the full −₹100.** D 2026-09-15 says a split drops the bill discount on both drafts, "the alternative, cloning it, cuts twice". A half whose net is under ₹100 is refused "discount exceeds bill" and the screen stays blank |
| S16, S17 | Spec (Talks to, PO row): "preview shows 'no lines placed'". **The code returns an empty ₹0.00 draft with a `SERVICE_CHARGE 5%: ₹0.00` row, Generate, Remove and Comp all live** |
| S18 | Only the new round (₹66.00 for a naan) |
| S19 | **The issued bill is replaced by an empty ₹0.00 "draft" with Generate and Comp enabled.** Misleading (P2) |
| any refused preview (BL-S14, "discount exceeds bill") | Message in `bill-msg`. The bill is null, so **no Preview button is left to retry**: only a reload works (human lens) |

### Generate bill (`issue`)
| State | Expected |
|---|---|
| S1–S5, S7 as MGR | Number `#A-nnnn`, `Bill nnnn issued`, Generate/Remove/Comp gone, Cancel form shown, lines stamped, counter +1 (BL-S7, R3) [PW, APP, E2E] |
| any, SRV | "Not allowed", no number, no PIN box (BL-S7, Who) [PW, APP] |
| S6 | Bill with no service-charge row. **Expect an ST audit row P1 for dropping the charge (BL-S10, Who can do what). Nothing in `app/billing.ts` writes one.** Check `floorstate audit` |
| S14 each half | Two consecutive numbers (BL-S12) [APP, E2E] |
| S15 | Refused "the bill changed since the preview, preview again", no number taken, counter unmoved; Preview then Generate works (TD-040 closed) [APP, E2E] — not in the browser |
| S17, S16 | Refused "nothing to bill" (`billSitting`). No number [APP "empty draft"] |
| **S18** | **Refused "already issued <billId>"**: `issue` reads every line of the draft, including those already on the first bill, and the new round shares the draft id. The dessert can never be billed from this screen. Also the message names the internal `billId`, where BL-S7 says "already issued 0417" (the number) |
| S19 | Refused "already issued <billId>" (same wording issue) |
| S8–S12 | Hidden (number present) ✓ |

### Remove / Add back charge (`toggle-charge*`)
| State | Expected |
|---|---|
| S1 MGR | ₹66.00 → ₹63.00, `charge-SERVICE_CHARGE` gone, label flips to "Add service charge back"; a second tap restores ₹66.00 (BL-S10) [PW on another seed] |
| S1 SRV | Spec: SERVER "–". **Button is shown and works on the preview.** Issue is refused anyway, so only a finding if it misleads (P3) |
| S7 | "Remove packing" → ₹84.00 → ₹63.00 (BT, dropCharges on top) [E2E BT-P] |
| S8+ | Hidden ✓ |

### Comp the whole bill (`comp`)
| State | Expected |
|---|---|
| S1 MGR | PIN box `Needed for this billDiscount` → 1234 → `#A-nnnn`, Payable ₹0.00, status `paid`, no Cancel form (BL-S22, PY-S8) [PW] |
| wrong PIN then Cancel | No number, draft unchanged, "Wrong PIN" [PW] |
| SRV | "Not allowed" before any PIN box [APP] |
| no reason | Browser blocks the submit (required select) |
| S5 | Payable ₹0.00; the manual 100 % replaces the order offer |
| **S7** | BL-S22: "every line taxable 0, tax 0, payable 0.00". **The code keeps the flat ₹20 packing: payable ₹21.00, status `issued`. The screen still says "comped to ₹0.00" (hard-coded text).** |
| S15 | Refused "bill changed". **But ST's P0 `billDiscount` audit row is written in its own transaction before BL's refusal**, so the audit shows a comp that never happened. D 2026-09-15 row: "no P0 row is written for a thing that did not happen" |
| S17, S19 | Client: "Nothing to comp", no call |

### Cancel bill (`cancel`)
| State | Expected |
|---|---|
| S8 MGR | PIN `Needed for this cancelBill` → `(cancelled)`, number kept, form gone; lines freed (BL-S9, R3) [PW, APP] |
| S8 then Preview | The draft comes back with its lines and charges; Generate gives the next number (BL-S9) [E2E] — not in the browser |
| S8 SRV | "Not allowed" before a PIN box (ST decide) |
| no reason | Browser blocks the submit |
| wrong PIN ×5 | `Wrong PIN, 4 left` … `wait n s`; bill stays issued |
| **S9 (part-paid, stale screen)** | Spec Who: "Cancel an issued, **unpaid** bill". **The code checks only `status === 'issued'`, and PY keeps a part-paid bill `issued`, so the cancel goes through with money taken against it.** Record what happens to the cash row |
| S10 (paid, stale screen) | Refused "cannot cancel a paid bill" **before** the PIN box [APP] |
| S11, S12 | Hidden ✓ |
| S13 | Not showable; a note is refused cancel in the domain |

### PIN box
| Case | Expected |
|---|---|
| empty | `pin-ok` disabled |
| `pin-cancel` | Box closes, "PIN required", nothing written [PW on the line screen] |
| 10 answered challenges | "Too many PIN attempts, start again" [PW on the line screen] |

### Line discount (`?line=`)
| State | Expected |
|---|---|
| open line, ≤10 % | Applied, no PIN, P1 audit [PW] |
| >10 % ≤50 % | PIN [PW] |
| >50 % | Refused "discount is above the 50 % limit", PIN or not (TD-004) |
| line on an issued bill (S8) | Refused "bill already issued" (BL-S8) [E2E BL-S8] |
| voided line | Expect a refusal |

## 4. Misuses

| Misuse | Expected |
|---|---|
| Double-tap Generate | Buttons disable while busy. One number. If two requests land, the second gets "already issued", counter +1 only (BL-S7) [APP]. Check with `floorstate <t> dump` |
| Two tills, one draft | Both preview; A issues; B presses Generate → "already issued" (message names the billId, not the number). B's Comp → PIN → **audit row written**, then refused |
| Browser Back after issue | Full page load → login again (TD-052). Forward to `?draft=` → empty ₹0 draft (see S19) |
| Reload mid-PIN | Box gone, login gone (TD-052), nothing issued or cancelled, and **no** audit row (the PIN-less first call writes none) |
| Deep link `?draft=` of an issued draft | Empty ₹0 draft (S19 behaviour); Generate → "already issued" |
| Deep link to a draft of another restaurant / a bogus id | S16/S17 row |
| Hand-crafted API call with a Meghana session and `restaurantId: res_pizzabakery` | Refused unauthenticated on the session (`staff.bySession`) |
| Cancel an already-paid bill | Refused before the PIN (S10) [APP] |
| Cancel a comped bill | No form (status `paid`); see §7 Q8 |
| Wrong / empty PIN | Per the PIN box table; the bill does not move [PW for comp] |
| SERVER login | Preview ✓; Generate, Comp, Cancel → "Not allowed", never a PIN box |
| KITCHEN login (`kitchen@meg.test`) | Spec has no column. Expect Preview allowed (any staff), and Generate/Comp/Cancel "Not allowed" |
| Staff session expired mid-screen | Next call refused unauthenticated; screen keeps the old figures |
| Offline | OF's estimate screen appears only after a failed call on a draft. Out of scope here; note it and move on |

## 5. Do not report

- **TD-052** re-login after every navigation (floor → bill, Back, reload).
- **Tile ₹60 vs bill ₹66** for a naan: by design. The tile is net food, the bill adds service charge, GST and round-off.
- **TD-053** tile vs bill once an order offer fires (tile ₹900, bill ₹882 in case 4).
- **Not built on this screen:** credit note, split, reprint, customer tax id, a link to the tender screen (D 2026-09-15).
- Charge label reads `SERVICE_CHARGE 5%` (raw type) on the read-out; Playwright asserts it. A P3 at most.
- `₹-0.16` style round-off text (the minus sits after ₹): P3 cosmetic. Report once, not per state.
- TD-005 (nobody reads audit), TD-009 (PIN threshold on list, not net), TD-011 (rate frozen at placement), TD-012 (offer clock / on-account), TD-017 (issue onto a closed day), TD-018 (one till per restaurant), TD-039 (config unvalidated), TD-003 (Flutter apps have no PIN box).
- "Liquor block has no tax line": decided (D 2026-09-15).
- CGST and SGST each rounded on their own (8.33 + 8.33): decided (R5, BL-S5).
- ₹200 off the bill drops the payable by ₹210 on food: decided (D 2026-09-15 donor push-back).

## 6. Money cases worth checking by hand

Rules: tax per component, then summed (R5). Independent rounding per part, `Math.round` (half up). A bill discount goes onto lines by net share, cumulative floor, lines ordered by lineId (R1). Service-charge base = food-block taxable **after** discounts; amount = floor(base × 500 ÷ 10000) + flat; taxed in the food block (BL-S21). Liquor inclusive at rate 0 means taxable = gross. One round-off, half up to 100 paise (R7). Money in paise.

1. **Naan ₹60** (`floorstate 6 ordered`). Line 6000. SC floor(6000×0.05) = 300. Tax: line 6000×2.5 % = 150 per part; charge 300×2.5 % = 7.5 → 8 per part. CGST = SGST = 158. Food taxable 6300, total 6300 + 316 = 6616. Round: 6600, round-off −16. **Payable ₹66.00.**
2. **Same, service charge removed.** 6000 + 150 + 150 = 6300. **₹63.00**, no round-off row.
3. **Chicken 65 ₹280 + Old Monk ₹180** (₹460, under the ₹499 offer gate). Food: line 28000 → 700 per part; SC floor(28000×0.05) = 1400 → 35 per part; food taxable 29400, CGST = SGST = 735, total 30870. Liquor: 18000, no parts, total 18000 (no service charge on liquor, BL-S21). Sum 48870 → 48900, round-off **+30**. **Payable ₹489.00.**
4. **Chicken 65 ₹280 + Crab Roast ₹620**, one checkout → FLAT ₹100 (10000 paise), no targets. Split by net 28000 : 62000, cumulative floor: first line by lineId gets floor(10000×w÷90000), i.e. chicken 3111 / crab 6889, or crab 6888 / chicken 3112. Either way: grosses about 24889 + 55111 = 80000; per-part tax 622 + 1378 = 2000. SC floor(80000×0.05) = 4000 → 100 per part. CGST = SGST = 2100, taxable 84000, total 88200. **Payable ₹882.00**, no round-off.
   - **4-split:** move the crab to `<guest>_b`. Per D 2026-09-15 (discount dropped on a split): A = 28000 + 1400 + 2×735 = 30870 → **₹309.00** (+0.30); B = 62000 + 3100 + 2×(1550 + 78) = 68356 → **₹684.00** (+0.44). If each half carries −₹100 instead, you will see A = 18000 + 900 + 2×(450 + 23) = 19846 → ₹198.00, and B = 52000 + 2600 + 2×(1300 + 65) = 57330 → ₹573.00. Together that is ₹111 under the unsplit ₹882: the offer was cut twice.
5. **Parcel P1, naan ₹60.** Packing flat 2000, no service charge. Tax: line 150 per part, packing 50 per part. Taxable 8000, total 8400. **Payable ₹84.00.** **Comp it:** the lines go to 0 and packing stays 2000 + 50 + 50 = 2100. The code gives **₹21.00**, where BL-S22 says ₹0.00.

## 7. Unclear spec (questions, not bugs)

1. **A round after issue.** R13: "ordering for a table stops at issue". FL-S20 and the helper's `dessert` state treat "billed and still ordering" as normal. So which is it: should OR refuse that round, or should BL bill it on a fresh draft? Today it is stuck (S18).
2. **Cancelling a part-paid bill.** BL Who says "issued, unpaid". PY-S25 says the floor "cancels the bill (PY-S14) and issues a new one" for a half-paid bill. What happens to the ₹400 already taken: refunded, or moved to the new bill?
3. **The order offer on split drafts.** D 2026-09-15 says the bill discount is dropped on a split. BL-S24 / D 2026-09-15 say the order offer is re-read at every preview. TD-016 only covers targeted offers. For an ORDER-scope offer: drop it, clone it, or apportion it?
4. **Charges after a cancel.** BL-S9 says lines return "with their charges as they were". Charges live on no line, and the till's `dropCharges` is page memory only. After a reload, a dropped charge comes back. Intended?
5. **Comp and flat charges.** Does a whole-bill comp take the packing charge (BL-S22 says payable 0), or is packing money that the parcel still owes?
6. **KITCHEN role on the till.** There is no column for it. May it preview a bill?
7. **SERVER and Remove service charge.** The spec says "–" for SERVER. Should the button be hidden, as FL-S29 hides Merge and Move?
8. **Undoing a mistaken comp.** A ₹0 bill is born `paid`, so it cannot be cancelled. Is a credit note on a ₹0 bill the path?
9. **Offers on liquor.** The seed says liquor is "never discounted (offers must not touch alcohol)". R1 spreads an ORDER offer over every line by net share, beer included. Which rule wins? (Try food + a Kingfisher ₹260 above ₹499.)
10. **Audit row for a comp that was then refused.** The D 2026-09-15 row covers only the wrong-state case ("BL refuses before the PIN"). Must a stale-preview refusal also leave no P0 row?
