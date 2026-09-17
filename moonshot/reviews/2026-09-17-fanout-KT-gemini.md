# Verdict: The design is elegant in the domain, but the infrastructure choice is a catastrophic overcomplication.

You have engineered a ₹4,000 headless box, a new deployable, and a massive point of failure to solve a problem that your existing hardware can solve for free. By choosing KT-D1, you are bouncing local LAN traffic off a cloud server and breaking printing every time the internet blinks, which contradicts your own operational goals.

Here are the specific holes.

---

### 1. What is missing?

- **The Stale Avalanche:** The bridge's internet connection goes down for two hours on a Friday. The LAN is fine, the kitchen uses screens, and the restaurant survives. When the internet returns, the bridge blindly pulls 50 stale KOTs from the queue and prints them all, causing massive confusion. There is no TTL (Time-To-Live) or expiration on print jobs.
- **The Print Buffer Hang:** KT-S7 and KT-S8 cover connection failure and paper out. But what if the printer accepts the TCP connection, reads half the bytes, and then its hardware buffer fills due to a minor jam? TCP windowing stops. Does your `agent.ts` have a write timeout, or does the Node event loop stall forever holding the lease?
- **The Z-Report:** Day-end or shift-end summaries are the most critical piece of paper for the owner to reconcile cash. It is entirely absent from your scenarios and not listed in out-of-scope.
- **Clock Drift:** Raspberry Pi-class devices lack a hardware RTC. If the bridge boots during a network outage and its clock is 1970, how does it evaluate `claimedUntil` leases? If you use `Date.now()` locally, the lease logic breaks entirely.

### 2. What breaks in production?

- **The 3-Second Status Trap:** `print.statusTimeoutMs = 3000`. A 25-item KOT takes 5+ seconds to physically print on a cheap 58mm printer. The bridge sends the bytes, sends `DLE EOT`, and waits. The printer buffers and delays the `DLE EOT` response until printing finishes. The bridge times out at 3s, fails to ack, the lease expires, and the ticket REPRINTS. You will enter an infinite reprint loop on long tickets.
- **Total Offline Failure (The Core Contradiction):** You claim KT-S9 ensures the guest gets paper during an outage. This is false. The till queues the estimate *locally*. The bridge pulls from the *server*. Without internet on the till, it cannot push to the server; without internet on the bridge, it cannot pull. The printer sits silently on a working LAN while the guest gets no paper.

### 3. What should be cut from scope, and what in 'Out of scope' is wrongly there?

- **Cut from scope:** The entire bridge box, the `bridge/` folder, and the setup visits.
- **Wrongly 'Out of scope':** "Printing from the Flutter kitchen or captain apps." This is the fatal flaw in your reasoning (see below).

### 4. What did I get wrong — factually, or in the design?

- **Design:** You concluded that because the *till* is React, you need a Raspberry Pi to open TCP 9100. This willfully ignores that your kitchen screen is a Flutter app. Dart has `dart:io Socket`. The Flutter kitchen tablet is already on the LAN, already authenticates to your backend, and has the computing power to poll the queue. The kitchen app *should be the print agent*. You chose a new headless deployable over 50 lines of Dart in an existing app.
- **Factually:** You claim "Without this [offline estimate] an outage takes away the one piece of paper". But even *with* it, the guest still doesn't get paper during an outage because the till can't reach the bridge! The cashier just turns the tablet around. Your offline path doesn't actually solve the offline paper problem.

### 5. Where does this design fight the architecture rules?

- **"Twenty lines of plain code beat a hundred abstracted ones" & "No new dependency":** You added a new OS-level deployable, hardware procurement, and a custom pull loop to avoid adding printing capability to a Flutter app that is already sitting in the kitchen.
- **"Every business number is a config key":** `print.drawerPulseMs` is 25. The ESC/POS drawer kick sequence is `1B 70 00 t1 t2`, where `t1` and `t2` are times in 2ms increments. If your 70-line encoder doesn't dynamically calculate `Math.floor(pulseMs / 2)`, you are hardcoding `19` (hex for 25) into `escpos.ts`, violating the rule.

### 6. What subtle failures would the phase plan's tests not catch?

- **UTF-16 Truncation:** Phase 4 tests strings to bytes. JS strings are UTF-16. Your 70-line encoder likely uses `.charCodeAt()`. A Devanagari character like `क` (0x0915) truncated to a `Uint8Array` becomes `0x15` (NAK control character). Instead of printing `?`, you will send random control bytes to the printer, corrupting its state and spitting out miles of blank paper. Your test will pass because it only tests ASCII.
- **TCP Backpressure:** Phase 5's fake TCP server accepts bytes instantly. Real printers have tiny 4KB buffers. If a ticket exceeds this, the OS TCP stack blocks. If your `link.ts` calls `socket.write()` synchronously on a large `Uint8Array` without respecting the `drain` event, Node buffers it in memory. You might close the socket or fire the status check before the OS actually flushes to the printer.

### 7. What would you ask or do that I have not?

- **Ask:** Why bounce LAN print jobs off a cloud server? If the internet drops but the LAN is up, your kitchen halts. I would demand a local fallback route (e.g., till addresses the Flutter Kitchen app via local IP) for critical KOTs.
- **Do:** I would take a real 58mm printer, write a script to send a 50-item KOT, and measure exactly how long it takes to return the `DLE EOT` byte. I am 90% sure your 3-second timeout is too short for real-world heavy loads.
