# Aggregator intake for a one-outlet Bangalore POS

## Bottom line

Do not build a direct Swiggy or Zomato integration. You will not clear Zomato’s published gate (50 outlets **or** 10,000 orders a month, plus a 24×7 on-call), and I could not find a self-serve Swiggy merchant API that a new POS can sign itself up to. Buy a pipe from a middleware that is already the mapped POS partner, and keep their payload behind an adapter.

The build that is actually weeks, not quarters, is narrower than B: **order in, idempotent kitchen ticket, accept / reject with their reason codes, food-ready, variant-level stock push, and a mapping table.** Not menu authorship, not payout matching.

D is the right shape and the wrong accounting. Aggregator orders must not become GST invoices and must not touch the cash drawer. They must still be a sales channel and a receivable. “Excluded from day close entirely” is how the owner decides your numbers are fake in week four, and how the CA double-counts or under-reports turnover at month end.

The decision that hurts to reverse is the document model: a delivery order is not a bill. Make it a different record that can print a kitchen ticket and can never emit a tax invoice or a tender.

---

## 1. Is A true in 2026, and what do you actually buy?

**Zomato direct: A is correct.** Their own POS integration docs (developer portal, updated May 2026) say, before you write code:

- 50 restaurants onboarded, **or** 10,000 orders a month. They add that this minimum is not a guarantee; their team still decides.
- 100% of a critical-feature list, not a happy-path webhook.
- A dedicated Slack or WhatsApp with tech, product, and ops, **under 10 minutes** turnaround, 24×7.
- They also write “uptime greater than 99.999%.” Treat that as a posture, not a meter they will certify on day one. The on-call rule is the one that actually kills a solo founder.
- A named Zomato POC creates your POS id, configures your webhooks, and shares keys. You sign an NDA and a legal agreement. Go-live is them mapping the first live restaurant. Later map/unmap goes to posintegrations@zomato.com.

There is no “create an account and get a key” path. One pilot outlet fails the volume test on its face. Confidence ~90% on the gate as published. Confidence ~80% they will not waive it for an unknown POS with one Bangalore restaurant and no on-call rota. A chain that already wants you can sometimes drag a vendor through; you do not have that chain.

**Swiggy direct: same conclusion, weaker public evidence.** I could not find a Swiggy POS-vendor portal comparable to Zomato’s. What is public:

- Merchant onboarding asks whether the restaurant already has a POS, then asks for **the POS partner’s name**. Swiggy contacts that partner. The restaurant does not paste an API token from settings. (A 2025 blog that says “Settings → API Access, approved in 24–48 hours” is marketing fiction. Do not plan on it.)
- Swiggy’s partner FAQ splits the world into “POS enabled” and not. Menu changes for a POS-enabled outlet go through the POS partner, who raises a revision with Swiggy. They are not a live push you own.
- Swiggy’s 2026 MCP (`mcp.swiggy.com`) is a consumer-agent surface: search restaurants, food, Instamart. It does not inject a live order into your kitchen. Building against it is a dead end.

Confidence ~70% that no self-serve Swiggy order API exists for a new POS. I am sure enough to refuse the direct build. I am not sure enough to claim I have read every private partner programme.

**ONDC is not the substitute.** A seller-app integration is more open than Swiggy/Zomato. It does not replace the two apps the restaurant actually runs, and you already said the requirement is those two. Magicpin is a third tab, not the wedge. Leave both out of v1.

**What a one-outlet founder can actually shortlist**

| Route | What it is | Use it? |
|---|---|---|
| UrbanPiper Hub, as a **POS integration partner**, not as their Prime POS | The pipe the market already trusts. Sandbox, a named integrations engineer, their claim of a flat fee and no cut of GMV. They are the POS of record to Zomato; the 10-minute on-call is their problem, not yours. | Yes. First call. |
| Wera “Merge” | A smaller Indian POS that also sells an API so *someone else’s* POS can receive Swiggy/Zomato. | Second call. Ask them to show one outlet where the official tablet is actually unmapped, not mirrored. |
| Dyno APIs and the long tail of “cheap Swiggy API” sites | Often a tablet bridge or an unofficial client. | No, until they show the partner agreement and a live mapped outlet. A ban lands on the restaurant, not the vendor. |
| Deliverect | Real middleware globally. | Do not assume India Swiggy/Zomato coverage. I am not confident they are a serious India route in 2026. Ask; don’t default. |
| Screen-scrape / second tablet automation | — | No. It is how outlets get unmapped. |
| Stay on the incumbent just for delivery, your POS for dine-in | Two systems. You said that is failure. | Only as a bridge for the dine-in pilot if the pipe’s sales cycle slips. Do not call it the product. |

**Price.** UrbanPiper does not publish India rates. Competitor blogs in 2026 quote roughly ₹2,000–₹6,000 per outlet per month, some as high as ₹8,000, plus a one-time onboarding fee. Those pages are selling against UrbanPiper. **Every one of those numbers is under 80% — I am guessing a band, not quoting a contract.** Their UK Hub page shows “from £79 / site”; that is a different price list, ignore it. Wera’s own site prices *their* POS (₹10,000 a year on the page I saw), not the Merge API. Budget a sales call, not a spreadsheet. For one outlet the fee is noise next to a wrong GST return. At fifty outlets it becomes a real COGS line; that is a later problem, and it is still cheaper than a certification you cannot pass.

**Where B is wrong.** “One adapter, one webhook, item mapping, a few weeks” is true only for the narrow slice above, and only because the middleware is already certified. It is false if v1 includes bidirectional menu sync. Zomato’s critical list is the size of a product: variants, add-ons, variant-level out-of-stock, category day-and-time schedules, goods-vs-service tagging under 9(5), nutrition, rejection reasons that match their enum, rejection for item-out-of-stock **with the item id**, kitchen prep time on screen, food-ready, a cancellation loop back to the merchant, masked-call on demand. You do not have to build all of that in v1 if the middleware’s dashboard is the fallback for the rare ones (masked call, outlet holiday). You do have to build the ones that fire every Friday night: ring, accept, reject-with-code, ready, stock, idempotent ticket. That is weeks. Menu authorship is a quarter, and it is the wrong quarter (see §5).

Also, your Cloud Function is on the latency path even with a middleware in front. Return 2xx only after the order is durably stored. A timeout after you printed the ticket is how you print it twice. Cold starts during the Friday deploy window will time the outlet out. I am **not** confident of the exact 2026 accept window in seconds; the working assumption in this market is one to three minutes, and auto-timeout counts as a rejection. Confirm the number on the middleware’s docs before you promise the owner anything.

You will not delete the partner **phone app**. You delete the order tablet. The owner still lives in that app for ads, discounts, reviews, and payout PDFs. Say that out loud or they will think the integration is broken.

---

## 2. What C and D get wrong

### GST — the reading is right, the conclusion is short

For a standalone restaurant, restaurant service supplied through Swiggy or Zomato is under section 9(5) of the CGST Act, notified from 1 January 2022. The aggregator is the deemed supplier for GST, charges the customer, and pays 5%. You do not issue a tax invoice for that supply, and you do not put that 5% in your own cash GST. Confidence high.

Three holes:

1. **You still report it.** Since the January 2024 returns, the restaurant reports these supplies in **GSTR-1 Table 14(b)** (supplies through an e-commerce operator on which the operator pays tax under 9(5)), and that value is supposed to land in **GSTR-3B Table 3.1.1(ii)**. It must not also be reported as ordinary B2C. A system that emits no figure forces the CA to type from the aggregator panel, and they will get the base wrong. A system that emits a normal tax invoice makes them pay the 5% twice. Both are your bug. v1 needs a monthly export: operator GSTIN, taxable value, no tax charged by you. Not a full return filer.

2. **The hotel exception.** If the restaurant sits in a hotel where any declared room tariff is ₹7,500 a night or more, 9(5) does not apply and the restaurant charges GST itself (the 18% with-ITC case). A normal Bangalore standalone is in the 9(5) bucket. Ask anyway. Confidence ~80% the ₹7,500 line is still the rule; it is what 2026 secondary write-ups still say, and I have not re-read the notification this week.

3. **Not every line is restaurant service.** Zomato’s critical list has an explicit item: goods vs services at item level, for 9(5). A thali is restaurant service. A bottled drink may not be. Liquor is a third thing (state excise, and it is generally not what these apps are delivering in Karnataka — confirm with the pilot, don’t design a liquor-on-Swiggy tax block). You are not the tax engine for these orders. Do not compute GST. Store the lines the webhook sends. If you later push a menu, the goods/service tag is mandatory or the menu fails moderation.

**TCS under GST section 52 does not apply to 9(5) supplies.** Blogs that still say “subtract TCS from the Swiggy payout” are describing the pre-2022 model. Don’t build it.

**Income-tax TDS is a different line, and it does apply.** The operator deducts TDS on the gross facilitated amount. The rate is **0.1%** from 1 October 2024 (it was 1% before that). From 1 April 2026 the section number moved (194-O → section 393(1) of the new Act) and the rate stayed 0.1%. Confidence ~85%; a pile of SEO posts still say 1% and they are stale. You do not deduct this. It shows up on the settlement and in 26AS. If you ever predict a payout, use 0.1%, not 1%. Firms have no ₹5 lakh threshold; individuals/HUFs do. Irrelevant to v1 code, relevant the moment someone asks why the bank credit is short.

**Commission GST.** The platform bills the restaurant commission plus 18% GST on that commission. A standalone restaurant on the 5% no-ITC scheme eats that 18%. It is not a dine-in tax-block problem. Don’t design an ITC feature for this pilot unless they are actually on the 18% regime.

### Day close — excluding them is naive

You named two different things and then picked the wrong one to be absolute.

The drawer close is a count of money that hit the till: cash, card, UPI, whatever tenders you configured. Aggregator orders never hit it. Keeping them out of **that** close is correct. A cashier who “settles” a Swiggy order against cash or a dummy tender to make a screen go green will make the drawer wrong every night. The software should make that impossible.

The business day is not the drawer. Three ledgers, not one:

| Ledger | Aggregator order |
|---|---|
| Till / tender close | Out. No tender exists. |
| Sales by channel | In. Order count, kitchen items, voids, food-ready time. This is how they see the night. |
| Books | A receivable. Dr aggregator, Cr sales, **no output GST**. Not cash, not “ignore”. |

If sales omit the channel, food cost (which did get consumed) looks disastrous and the owner thinks the POS lost orders. If you only store “customer total”, the Sunday payout will be a third lower and they will think you inflated sales. The webhook already carries the split that matters: menu gross, restaurant-funded discount vs platform-funded discount, packaging, commission if present. **Persist that breakdown in v1. Do not match it to the bank in v1.** Matching is a weekly job for later. Forgetting the fields is how later becomes impossible.

“Pass-through accept, ready, and rider status” is not a thin layer:

- Reject must send **their** reason code. Item-out-of-stock must send the **item id**, or the item stays buyable and the rejection still counts.
- Show kitchen prep time. Don’t auto-mark food-ready on accept. Marking ready early is a trick the platforms look for; marking it late is how the rider stands at the pass and the rank drops.
- Cancellation after the ticket is printed is a v1 event, not a payout-v2 event. Void the ticket on the kitchen screen, or the kitchen cooks a ghost and the next rider takes it.
- Rider assigned / reassigned / arrived is worth showing. It is not your terminal state. Your kitchen is done at food-ready. “Picked up” is logistics. “Delivered” is theirs.

### E — right, and slightly worse than you said

A fake table called `SWIGGY` that stays occupied will poison anything you later build on “table is the session”: section printers, captain load, cover counts, end-of-day “tables open”. Don’t.

Also outside the table model, and easy to miss:

- **Scheduled orders** must not print when the webhook arrives. A 4pm webhook for an 8pm slot that prints now is a cold biryani.
- **Self-delivery**, if this outlet does any. Then you, not the platform, mark picked-up and delivered. “Rider status is pass-through” is false for that mode. Ask before you assume platform riders only.
- Delivery tickets go to the packer, not only to the section printer the captain uses for table 12.
- The terminal state for the kitchen is food-ready or voided. The terminal state for the commercial document is picked-up, or cancelled, and those are different fields.

---

## 3. What to go ask the pilot, this week

Sit with their last **settlement spreadsheet**, not their opinion of it. One month of Swiggy and one of Zomato. You want to see, on a real row: menu value, who funded the discount, packaging, commission base, GST on commission, ads, complaint clawbacks, TDS, net. Until you have seen that, you are designing a money model from blog posts. I am doing the same, and I am discounting myself accordingly.

Then these, in this order:

1. Share of orders and of rupees: dine-in, direct takeaway, Swiggy, Zomato, by lunch and dinner. If delivery is under ~10% of sales, this work is not what makes them switch, and you should hear that before you bet the schedule on it. If it is a third or more, D is the product.
2. Who 86s a dish today, on which phone, and the last time a stock-out became a cancellation. Pull the rejection report from the partner app. That is your real v1 bug list.
3. Do they auto-accept today? If yes, a manual accept on the cashier till will time out, because the cashier is on a table. Accept on the kitchen screen, or auto-accept and print, with reject as the exception.
4. Who edits the aggregator menu — the owner, a captain, or the aggregator’s account manager? How often is it a combo or a photo, rather than a price? That answer picks the ownership model in §5.
5. Are aggregator prices a fixed markup on the dine-in card, or a different catalogue (different names, combos, portion sizes)? Open both menus side by side and count the rows that don’t match 1:1. That count is your mapping project.
6. Regular GST or composition? Who files, and where did last month’s Swiggy number go — Table 14(b), ordinary B2C, or nowhere? If they have been double-paying, your “no invoice” rule is a favour. If their CA has never heard of 14(b), you need the export anyway and a one-page note for the CA.
7. Any orders that are not “platform rider, ASAP”? Scheduled sweets, bulk, self-delivery, a second brand out of the same kitchen. A second brand means two catalogues and two outlet ids. Your “one outlet” model is then wrong.
8. What does the incumbent actually do on a live order, versus what they still do on the tablet or the phone? Many “integrated” sites still toggle the outlet and edit offers on the partner app. Match that, don’t exceed it.
9. Where is the delivery printer, and who packs? Watch one Friday service. Don’t ask; watch.
10. Their commission letter. The rate is a contract, not an industry constant. Published ranges (Swiggy told the CCI 10–24% back in 2022; later press talks about a Zomato all-in cap around 30%) are not this restaurant’s number. Copy the contract.

Also ask the middleware, before you sign: **once the outlet is mapped, does the official order tablet go dark?** I believe mapping replaces the tablet rather than duplicating it — confidence only ~70%. If I’m right, you cannot parallel-run live orders on both. The cutover is one service, owner on site, tablet still in a drawer for one evening as the rollback. Shadow-test with their test restaurant first.

---

## 4. Scenes from the first month if you ship D as written

1. **Friday 8:12pm.** Prawns are off on your screen. The Zomato stock call succeeds. The Swiggy call returns 500 and you do not retry, because you treated stock as a fire-and-forget write. At 8:19 a prawn order lands. The captain rejects it as “out of stock” and your adapter sends the reason without the item id. The dish stays live. Two more orders arrive. Monday’s mail is about rejection rate, and the owner’s memory is that your POS “turned the item off”.

2. **The double biryani.** Your function prints the ticket, then times out before the 200. The middleware retries. There is no unique constraint on the aggregator order id. The kitchen makes two. The rider takes one. You have no void on the second because the second isn’t a cancellation, it’s a duplicate you created.

3. **“Couple meal”.** It is one aggregator sku. Your map points it at one dish named Couple Meal. The ticket does not say biryani + starter + two drinks. The packer forgets the drinks. The complaint clawback hits a payout you don’t store. Nobody can tie the complaint to the ticket.

4. **“No onion, less spicy”** is on the payload and not on the ticket, because you mapped ids and dropped notes. It is the one order the customer writes about. Zomato lists cooking instructions as a critical feature for a reason.

5. **1:40pm, rider not found, customer cancels** after the food is packed. Your state machine has no inbound cancel, because terminal state was “picked up” and you didn’t model a cancel from the middle. The bag sits on the pass. The next rider is handed it. Inventory, if you decremented it, stays decremented.

6. **Month end.** The CA asks for Swiggy taxable value for Table 14(b). Your day close omitted the channel, so the monthly sales report omitted it too. They pull the partner panel, which shows customer gross including the GST the platform charged, and they either pay 5% again or report a base that doesn’t match what Swiggy files in Table 15. The notice is the owner’s. They will not describe it as a reporting nuance.

7. **Sunday credit ₹1.8 lakh.** Your channel report says ₹3.1 lakh of “Swiggy sales” because you stored menu price times quantity. You did not store restaurant-funded discounts. You are not wrong that the food was sold. You have no sentence to say when the owner does the subtraction in front of you. Trust ends here, not at the kitchen.

8. **The till is the acceptor.** Three orders, cashier is taking a card payment, the kitchen display never rang. Timeouts. The outlet gets pushed down or turned off, and the only person who can see that is on the partner app you told them to stop watching. You also have no “mark outlet closed” button, so a function booking that used to be a toggle on the tablet becomes a pile of rejections.

9. **Half and full.** Two aggregator items, one recipe record, no quantity multiplier. The half plate decrements a full portion. Or both print as “biryani”. Food cost is “inexplicable” by week three. You will go looking for theft.

10. **4pm webhook, 8pm slot.** You print on receive. The kitchen starts it between lunch and dinner. It is dead by the time the rider is assigned. The reverse failure — holding it until 8pm with no prep offset — means the rider is outside while the rice goes on.

11. **Deploy at 7:40pm.** Four minutes of 500s. Some retries become duplicates (scene 2), some become timeouts (scene 8). You did this to yourself.

12. **A new combo went live from the partner phone** at noon, pushed by the account manager. Your map doesn’t have it. You still accept the order, skip the unknown line, and print a ticket that looks complete. The missing ladoo is discovered at the door.

13. **Soft drink on a meal order.** You file the whole order as “not a tax invoice”, which is right. Later someone adds 5% in a “helpful” report so the channel matches dine-in gross. The CA uses the report. You are back to double tax, via a spreadsheet.

14. **Manager closes the outlet on the Zomato app** for a private lunch, your system still shows the channel open, and the next stock push or menu refresh from you turns it back on. Or the reverse. Two switches, no owner. This happens the first week someone other than you operates it.

---

## 5. Who owns the catalogue

Stop calling it bidirectional. Both sides writing the same fields is how a festival combo disappears at 6pm because a captain hit save on a dine-in price.

**Least bad model: own fields, not systems.**

| Field | Owner | Why |
|---|---|---|
| Recipe, station, inventory sku | Your POS | The aggregator does not know what prawns are in. |
| Sellable listing: marketing name, photos, description, category, combos, **channel price** | One editor, and for v1 that editor is **not** your dine-in menu | See below. |
| Map from their item + variant + add-on ids to KOT lines (with quantity) | Your POS | This is the actual product. |
| Availability | Kitchen pushes out. You pull back what they think is true. | A push you never read back is a rumour. |

v1 is a **read-only mirror of their catalogue, a map, and an outbound stock switch.** You do not author their menu. You do not copy dine-in prices onto it.

What breaks if you reject this and let the POS own the listing:

- Zomato does not treat a menu push as live. `menu/add` is a request. You get a processing webhook and a **moderation** webhook. New items and photos on the partner app have historically sat for moderation (on the order of hours to a day); price and text edits often appear and are then reviewed. I am ~75% that the POS path is the same shape, because they bothered to document a moderation webhook. Your UI will say “live” while the app still shows yesterday.
- Swiggy structural edits are a revision request. Their own FAQ still talks about attaching a bill copy, and for POS-enabled outlets the POS partner raises that request. Confidence ~75% that a POST from you does not skip human review. Out-of-stock is the fast path. A new combo is not.
- The owner’s phone and the account manager will keep editing. Last write wins, and it will win against you on a Friday.

What breaks if you reject this the other way and let the aggregator own everything, including availability:

- You cannot 86 from the pass, which you correctly called the underestimated write.
- Zomato’s stock API is fussier than a boolean. Marking out of stock requires an auto-on time: 2 hours, 4 hours, or next business day. “Off until the prawns come” is not an open choice. You also cannot mark every variant out of stock and leave the parent; the parent has to go off. (This is their documented rule.)
- Every new sku arrives unmapped and becomes scene 12.

Ingredient-level 86 (prawns out → seven dishes) is yours alone. No middleware has your recipes. A single-item toggle is the v1. A recipe explosion is how you stop depending on the captain’s memory, and it can wait until the map is trusted.

Disable, or at least alarm on, stock toggles made in the partner app. If you can’t disable them, poll and surface drift. Do not pretend it won’t happen.

---

## 6. The decision that is expensive to reverse

**Not the middleware.** That is reversible if, and only if, their JSON never leaks into your core records. Hide it in an adapter. Store their raw body, immutable, keyed by **the aggregator’s order id** (the one printed on the rider’s phone) and secondarily by the middleware id. Disputes are always in the aggregator’s id.

**The expensive call is: a delivery order is not a bill.**

Make a separate document. It may create kitchen tickets through the same printer path as a table. It must be incapable of:

- taking the next GST invoice number (your document-series report, GSTR-1 table 13, will show gaps and junk forever if you burn invoice numbers on Swiggy dockets),
- carrying an output-tax block,
- being settled to cash, card, or UPI.

Give the packer a slip that says **ORDER DOCKET — NOT A TAX INVOICE**, with their short order id and the items. If your bill renderer always prints the GSTIN and a sequential invoice number, you have issued invoices whether you meant to or not. That is the bug that makes D collapse in implementation even if you agree with it in prose.

The map is the second schema choice, cheaper than the document but still miserable to migrate during service: its own table of `(channel, external item id, variant id, addon id) → KOT components + quantities`. A `swiggyItemId` column on `Dish` cannot represent a combo, two channels, or an add-on. You will know you needed the table the first week. Build it now.

Call the document split **this way**. Putting aggregator volume inside the dine-in bill “so reports just work” feels like less code. It is less code for a month and a rewrite after the first GST period, with issued numbers you cannot un-issue. I have seen the fake `SWIGGY` table version of this. It always leaks into tender close.

Direct integration is the other call people think is strategic. It isn’t, yet. Revisit when you have something like the volume gate and a human who answers a phone at 9pm. Not before.

---

## 7. Historical sales from the incumbent

There is no standard export in this market. Nothing like a common POS journal. Petpooja, Posist, GoFrugal, Rista, Torqus, LimeTray — each will give the restaurant whatever that product’s “download Excel” buttons produce: bill-wise, item-wise, day summary. Coverage is spotty (modifiers, voids, split tenders, and timezone-naive strings are the usual holes). A full dump, if it exists, comes from their support desk and arrives when it arrives. Confidence ~85% there is no cross-vendor format; I have never seen one used in a real handover, and nothing in the current public material describes one.

What migrations actually look like: a few Excels in a folder, a parallel run of a few days, one day reconciled by hand against the old tender summary, then the old login kept alive for the CA. They do not replay old bills into the new invoice sequence.

Worth doing for this pilot:

- Tax configuration, tables, users, and the dine-in menu, if the old menu is cleaner than retyping. Often it isn’t.
- A **spreadsheet** of item sales for the last 90 days, so the owner can compare mix. Not live documents.
- Monthly totals if the CA wants a bridge. The filed returns are the legal record, not your database.

Not worth doing:

- Importing historical bills as bills. You contaminate invoice numbering for a period that is already filed. If an assessment comes, they open the old POS.
- Customer phone numbers. Dine-in capture is thin, aggregator numbers are masked, and you don’t have a reason under the privacy rules to warehouse a dump “just in case”.

Owners ask for history, then never open it. Do not let the import sit on the critical path of the Saturday you unmap the tablet.

---

## What I would hold you to

Ship, for this one restaurant: mapped outlet, idempotent ticket, loud unmapped-item failure (do not accept-and-skip), reject codes, food-ready, stock push with retry and a read-back, channel sales **plus** a receivable memo with the discount split stored, Table 14(b) monthly export, no invoice number, no tender. Payout matching, menu authoring, and recipe-level 86 are explicitly later.

If the middleware cannot turn this outlet on without you pretending to be a 50-outlet vendor, you do not have a cleverer API strategy. You have a commercial problem, and a second tablet, until someone with a partnership will take your money.
