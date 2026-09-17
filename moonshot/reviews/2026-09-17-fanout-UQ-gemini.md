# Bottom Line
**Verdict: Proceed with structural revisions.** The product choices (Paytm, MDR, `none` mode) are sound and well-argued. However, the backend execution is mechanically impossible on Firebase as written, your e2e testing strategy is checkmated by the emulator's limitations, and you have introduced a subtle ledger pollution risk by opening PY's `canTake` too widely.

Here are the specific holes and my reasoning.

## 1. What breaks in production? (The Firestore Transaction Hole)
**Claim:** Flow Step 4 says the webhook does "one transaction: find the collect, derive the paymentId, call `takeAs()`, stamp the collect."
**Reality:** Firestore does not support nested transactions. `takeAs()` is an App layer function that must run its own transaction to safely mutate the `payments` collection and the `bill` document. 
- If you wrap `takeAs()` in a `upi-webhook` transaction, it will crash.
- If you rewrite `takeAs()` to accept a `Transaction` object from the caller, you leak database adapter specifics into the App layer, violating your pure domain/app architecture rules.
**Fix:** Drop the "one transaction" mandate for the webhook. `takeAs()` is strictly idempotent by design (R2). 
1. Read the collect (no transaction).
2. Call `takeAs()` (which runs its own ledger-safe transaction).
3. Update the collect with `events = admin.firestore.FieldValue.arrayUnion(...)` and `paymentId = pyRes.id`.
If the function dies between 2 and 3, the ledger has the money but the collect doesn't know it. The system auto-recovers: the till's 20-second poll (UQ-S8) will eventually call the provider, call `takeAs()` again (which safely returns the existing row), and repair the collect.

## 2. What subtle failures would the phase plan's tests not catch? (The Emulator Checkmate)
**Claim:** You will "fail closed" (400) if `req.rawBody` is missing due to Firebase emulator issue 1830. You also claim Phase 6 Playwright tests will e2e test UQ-S1 (the happy path).
**Reality:** If the emulator always drops `rawBody`, your webhook always returns 400 locally. **Your Playwright e2e test can never trigger the webhook happy path.** The till UI will only ever close the bill via the 20-second `providerCheck` fallback (UQ-S8). You will ship a UI that has never reacted to a webhook in CI.
**Fix:** You cannot have both "no weakened tests" and "fail closed in the emulator". You must bypass the signature check *if and only if* `process.env.FUNCTIONS_EMULATOR === 'true'`. It is the only way to prove the frontend engine works end-to-end.

## 3. What is missing?
**Clock Skew on Expiry (R5):** You state "Expiry is `now > expiresAt`, computed on read". If the till computes this using the tablet's local `Date.now()`, a tablet with a clock 5 minutes fast will instantly hide every QR. The till must evaluate expiry against the *server's* clock. The 3-second poll must return a definitive `{ status: 'expired' }` or a synced `{ serverTime }`.
**Stateless Rate Limiting (R14):** The server polls the provider at most every 10 seconds. If `upi-status` is stateless, it must update `lastProviderCheckAt` in Firestore. If you update it *after* the provider call, concurrent 3-second polls from multiple tills during the 200ms network window will all fire provider calls, breaching the limit. If you update *before*, a failed network call locks you out for 10 seconds. **Fix:** Accept the loose rate limit (update *after*) under "catch it, don't cage it", but document that it will occasionally breach.

## 4. What did I get wrong — factually, or in the design? (The Overpaid Hole)
**Claim:** "PY's `canTake` allows a captured take on a settled bill (overpay row)" to solve UQ-S4 (double payment).
**Reality:** You are opening PY too wide. If a bill was settled in *cash*, and 10 minutes later a delayed UPI webhook arrives for an abandoned QR, PY will blindly accept it. A cash-settled bill suddenly has a UPI overpayment. 
*Note: I am about 80% sure this is a semantic trap rather than a fatal bug, because the money did arrive and belongs to that `cid`.* However, an `unrecorded` outcome (R8) is vastly superior for cross-tender pollution than injecting a UPI overpayment into a cash bill. 
**Fix:** The bypass in `canTake` must be strictly scoped. `if (captured === true)` is not enough. It must verify that the bill was actually settled by UPI, or it must strictly bind to the `collectId`.

## 5. What should be cut from scope, and what is wrongly out of scope?
**Wrongly in scope:** `qrcode` as the UI dependency (UQ-8). It is a Node-first library with built-ins (`Buffer`, `zlib` via `pngjs`) that Vite will choke on without explicit polyfill configuration. Switch to `qrcode.react`, which is zero-dependency and built for your exact stack.
**Wrongly out of scope:** Storing the payer's VPA. In UQ-S12 (Refunds), you push refunds through the dashboard by hand. In UQ-S4 (Double payment), the guest walks out leaving a ₹2,151 overpayment. How does the owner know *who* to refund in the Paytm dashboard? You aren't storing the payer's VPA on the collect. **Fix:** Ensure `events[]` captures the `payerVpa` (or equivalent payer identifier) from the webhook payload so the owner actually has the data needed to execute the manual refund.

## 6. What would you ask or do that I have not?
**Where is the backend dependency for Phase 7?** You flagged the frontend QR library, but missed the backend one. Paytm's checksum requires AES-128-CBC + SHA256. If you use their `paytmchecksum` library as advised, it is a new backend dependency. You must flag and approve it now, or you violate your own "no new dependency without asking" rule when Phase 7 lands.
