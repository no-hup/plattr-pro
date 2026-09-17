**Verdict:** The core mechanic—reusing the guest path with `addedBy: 'staff'`—is elegant and correctly avoids a parallel money path. However, the spec is dangerously optimistic about state transitions, caching, and concurrency. You are trading backend purity for frontend race conditions that will cause billing errors and screaming matches on the floor. 

Here are the specific holes.

### 1. What is missing? Name scenarios a real restaurant will hit that this sheet does not cover.
*   **Open / Custom Items:** "Glass breakage fee ₹500" or "Off-menu special ₹250". A rigid menu read from the server means the cashier cannot punch anything that doesn't exist in the database. In dine-in, custom charges happen daily.
*   **Moving a single line item:** You covered Table Transfers (OR-S15) which moves the *sitting*. You missed moving a *single beer* from Table 5 to Table 9 because a guest wants to pay for their friend. Voiding and re-punching a sent item loses the original order time, ruins the KOT trail, and requires an ST PIN.
*   **Item-level vs. Cart-level notes:** R7 says "The till sends... and a note." A restaurant needs notes per *item* (e.g., "Extra spicy" on the Biryani), not just a cart-level note. I am ~80% sure your backend supports item notes, but the spec's phrasing implies a singular cart note.

### 2. What breaks in production? Be specific about the failure and the conditions.
*   **The Price Bait-and-Switch (Menu Cache):** You set `ordering.menuCacheMinutes` to 60 (OR-S17). At 19:30, the manager updates the Biryani price from ₹400 to ₹450. At 19:45, the cashier's till still shows ₹400. They quote the guest ₹400 and tap Send. `checkoutCart` applies server-side pricing (R7) at ₹450. The bill prints ₹450. The guest fights the cashier. Your UI silently submitted a financial transaction at a different price than it displayed.
*   **The Dead Session Race (OR-S19):** You state `validateTableSession` flips an expired session to `expired` and refuses the add. You then claim the till calls `table-openTable` to extend it. But `table-openTable`'s rule (Flow 1) is: "if `active`, extend". If `validateTableSession` *already mutated it to expired*, the session is no longer `active`. `table-openTable` will mint a *new* session. The bill splits exactly as you were trying to prevent.
*   **Abandoned Counter Tickets Blocking the Queue:** Takeaways are tables (OR-8). Tables wait for a paid bill to become `vacant`. If a phone order is placed (OR-S2) but the customer ghosts, that "table" sits `active` until the 4-hour session expiry. If you have 5 configured counter tickets, 5 abandoned phone orders take down your entire takeaway capability for the night.

### 3. What should be cut from scope, and what in 'Out of scope' is wrongly there?
*   **Cut from scope:** Table Move (OR-S15). It's a nice-to-have, but moving the session/cart/order/lines transactionally is complex enough to deserve its own spec. Cut it for v1 if velocity is a concern.
*   **Wrongly Out of Scope:** Single-line un-merge (OR-5a). You accepted the "foot-gun" of releasing all children as a TD. You are severely underestimating the chaos. If Table 5 is joined with 6, 7, and 8, and they unmerge 8, tables 6 and 7 become `vacant`. Before the cashier taps re-merge, a guest at 6 scans the QR. They just minted a new session on 6. You now have a split-brain table that the cashier cannot fix without database surgery.

### 4. What did I get wrong — factually, or in the design?
*   **"if (isTakeaway) in business logic is a lint failure" (R8):** You haven't eliminated this branch; you just disguised it and moved it to the client. To render the floor plan vs. the counter list, the frontend *must* execute `takeawayTableIds.includes(tableId)`. The types don't make it impossible to treat a counter ticket as a physical table—they actively encourage it, forcing UI filtering.
*   **Waiters vs. Cashiers:** You state "The cashier is the waiter" to bypass the confirmation gate, and claim the captain app has no menu-to-cart screen. If the captain app is genuinely read-only for orders, fine. But if a captain *does* punch an order, and the system assumes `staff == cashier`, you bypass the very confirmation gate designed for waiters. 

### 5. Where does this design fight the architecture rules above without admitting it?
*   **Rule:** "a pure 'domain' layer with no vendor or database imports".
*   **Violation:** You explicitly throw this out in the Decisions table to write `table-openTable` as a flat directory script (`table/table.js`). You justify it by saying "Same call OF made". Precedent is not an excuse to break a hard architecture rule you claim to hold yourselves to. You are writing untestable flat scripts rather than domain use-cases.

### 6. What subtle failures would the phase plan's tests not catch?
*   **Phase 2 misses the `expired` state transition:** It tests the extend-not-mint rule on an `active` session. It does *not* test trying to extend a session that a failed `addItemToCart` just mutated to `expired`.
*   **Phase 3 misses concurrent checkouts:** It tests `addedBy` isolation, but it doesn't test the race condition of a guest and a cashier tapping Send at the exact same millisecond. If both hit `createOrUpdateOrder` concurrently, do they cleanly merge into the array, or does one database write overwrite the other's snapshot? 

### 7. What would you ask or do that I have not?
*   **Do:** Force the UI to send its *expected* line price in the `checkoutCart` payload. If the server calculates a different price (due to cache staleness), the server must reject the transaction with a `PRICE_MISMATCH` error, forcing the UI to refresh. Never silently charge a different amount.
*   **Ask:** How do you clear an abandoned counter ticket? If you void the items, the ticket is empty but is it still `active`? Does it close automatically when cart total is zero?
*   **Ask:** If a cashier taps a table to open it, and it's currently `pending` (a guest scanned the QR 5 seconds ago but hasn't entered the OTP yet), what does `table-openTable` do? Override the guest, extend the pending session, or crash?
