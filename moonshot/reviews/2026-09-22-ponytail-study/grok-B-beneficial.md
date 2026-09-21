# Beneficial effects of ponytail — audit

## 1. Bottom line

Three patterns clear the bar (3 or more instances, 2 or more sessions, a ruleset sentence, a causal test that is not "any careful engineer"). None is HIGH. The strongest is the agent heading at a new field, a second helper, or a second document, then stopping because the thing already existed — and the thing they did not add not coming back as a request. Close behind it: twice the agent had already picked the shorter edit and the "read first" sentence pulled them off a wrong one (a live PIN branch, a 35-line delete that would have zeroed a bill). A third pattern is the visible "skipped X, add when Y" deferral; it is real, and one of those skips was later built when the user asked again. Overall confidence is moderate. There is no control group, so every "they would not have done this without the rule" claim is untested. I do not count the agent's own 21 Sep sales pitch for the plugin (the `canMerge` story, the "error bar deleted four copies" story). That was written while explaining ponytail to you, and the contemporaneous thinking does not support the error-bar claim.

## 2. Patterns, ranked by confidence

### 1. Headed at a new artifact, found the existing one, did not write the parallel — MEDIUM

Ruleset sentence: "Already in this codebase? A helper, util, type, or pattern that already lives here → reuse it. Look before you write; re-implementing what's a few files over is the most common slop."

Instances:

- `corpus/2026-09-22_1230fa60_pony-full.txt` · 09-17 18:58 thinking, then 18:59: the user had just said "ok" to adding `businessDate` onto lines and bills. Thinking starts "I'll move forward with adding businessDate to lines and bills", then reverses: "Rather than plumbing config through the hot checkout path, I'm reconsidering: instead of writing a new businessDate field at all, I could derive the date range from timestamps already stored." Spoken: "`businessDateFor` is a pure shift-and-truncate, so it inverts exactly. That means no new field, no write-path change, no migration."
- `corpus/2026-09-17_75f55983_pony-full.txt` · 09-16 00:09: "`toMinor` and `fmt` already exist — reusing them rather than writing a second money parser." Same session's own file note later records the day-close screen "re-exports `toMinor`/`fmt` from `../payments/useTender` rather than writing a second money parser."
- `corpus/2026-09-17_75f55983_pony-full.txt` · 09-16 08:22, then 08:47 area: "My recommendation is to reuse ST's existing 'above this percent, ask' setting rather than inventing a second one." After building it: "A bill-level discount now goes through the same door ST already owns, judged by the same setting as a discount on one dish — `discountPinAbovePercent`... I deliberately didn't invent a second threshold; two numbers that mean nearly the same thing drift apart."
- `corpus/2026-09-15_191afc9e_pony-full.txt` · 09-08 11:17: "FRONTEND_TESTING.md already existed when I went to write the doc... I did **not** delete it — it's the better document, so I deleted my duplicate `FRONTEND_AGENT_TESTING.md`."
- `corpus/2026-09-20_68e0c52e_pony-full.txt` · 09-16 14:57 thinking: "Since DioClient has interceptors, the cleanest fix is to add one interceptor there that stamps `addedBy` on the three cart endpoints, rather than editing each repository separately."
- `corpus/2026-09-22_1230fa60_pony-full.txt` · 09-21 12:29 thinking: "I'm simplifying canMerge to delegate to canReceive for the child table after its own parent-specific checks... plus gains the currentOTP check canMerge was missing." 12:31: "canMerge delegating to canReceive looks consistent enough, so I'll leave that as is."
- `corpus/2026-09-22_1230fa60_pony-full.txt` · 09-21 11:14 thinking: "the server app can reuse the shared form too, which cuts roughly 180 lines of duplication—deletion is preferable to addition here." Later in the same session the file note says `login_screen.dart` went "from 264 lines to ~52" onto `PlatterLoginForm`. The phrase "deletion is preferable to addition" is the ruleset's "Deletion over addition," not a generic habit.

Downstream:

- The `businessDate` field was not added. `corpus/2026-09-18_760bad35_pony-full.txt` and `corpus/2026-09-18_ecd308d8_pony-full.txt` both restate the fix as "via a businessDayWindow inverse rather than a new field." It held for at least a day of other sessions reading the same code. It also made the fixed timezone offset load-bearing; the next session wrote that down as item 7 (too narrow a window drops a payment silently). The skip held. The shortcut had a real ceiling, and they recorded the ceiling.
- One discount-PIN percent, not two. `corpus/2026-09-20_68e0c52e_pony-full.txt` still shows a single config key `approvals.discountPinAbovePercent`. No second key appears anywhere I searched.
- `FRONTEND_TESTING.md` is the doc a later session follows (`corpus/2026-09-17_1ce5d68c_pony-full.txt` · 09-16 09:27, "Headless `/browse` per `FRONTEND_TESTING.md`"). The duplicate name does not come back.
- No later session introduces a second money parser. I searched `toMinor` / "second money parser". Absence after 09-16, not a proof it never will.
- The one `addedBy` interceptor is still the design later the same evening, while they debug a cart-UI bug. They do not split it back into three repositories. The bug was `DeviceId` at build time, not the single stamp.
- `canMerge` → `canReceive` and the 264-to-52 login screen have no later complaint inside this corpus. That is same-session or same-day only. I am less than 80% sure nobody reopened them after 21 Sep; the corpus ends on 22 Sep.

Causal test: four of these are what a careful engineer does, and I will not pretend otherwise. The one that fails that excuse is `businessDate`. The user had just approved the reviewer's field. A rule-free agent who treats "ok" as the spec writes the field. This one read `businessDateFor`, saw `issuedAt` / `placedAt` already on the documents, and did not write the field. That is rung 2 applied after the decision, not instead of reading. The login-form line is the only place I saw the ruleset's own "deletion over addition" wording inside private thinking while choosing the delete. The other four I mark [ATTRIBUTION WEAK] as individual acts and still count them, because the repeated shape is "I was about to write the second one, then I looked."

What the opposite consult would say: The `businessDate` inversion is the exhibit for a shortcut that shipped a quieter bug. A stored field cannot under-fetch; a window that is one hour narrow drops the payment and the domain filter cannot put it back, which the agent itself wrote down the next day. Reuse also kept a dead `line.sent` flag in the design conversation for a day (`1ce5d68c`) while the real gate had never fired, so "already there" delayed naming a behaviour change that was not actually live.

### 2. The short edit was already chosen; reading killed it — MEDIUM

Ruleset sentences, both required for this shape: "The smallest change in the wrong place isn't lazy, it's a second bug." and "Never lazy about understanding the problem. The ladder shortens the solution, never the reading. ... Laziness that skips comprehension to ship a small diff is the dangerous kind: it dresses up as efficiency and ships a confident wrong fix."

Instances:

- `corpus/2026-09-18_760bad35_pony-full.txt` · 09-17 20:19 the agent tells the user it will delete "the dead plaintext branch" as a one-line fix. 20:22 thinking: "the seed actually stores the plaintext PIN `1234`, which means the plaintext branch isn't dead code at all — it's the only thing making PINs work against MockData7, so my earlier claim that it could be deleted today was wrong." Spoken: "Two of my claims were wrong. Checking what's actually safe to fix before I write anything." The other retracted claim, same minute: item 6 (untaxed service charge) "is not a bug", reproduced as `{base: 0, amount: 0}`.
- `corpus/2026-09-13_048f5286_pony-full.txt` · 09-08 12:41: "I deliberately did *not* take the tidier-looking option of replacing that block with the existing `buildOrderPriceInfo`. It would have deleted 35 duplicated lines but also dropped the whole cart in that last control, so a customer would pay nothing for food they had already eaten." The fix they kept was one predicate, `isBillableItem`, in `calculateCartValue`. Control run in the same turn: without the fix the guest still sees ₹400 of dishes against a ₹200 subtotal; with it, ₹200 / ₹200.
- `corpus/2026-09-17_75f55983_pony-full.txt` · 09-16 02:57 thinking, right after the user said assume one till: "I'll keep the tested guards rather than strip them out for minimalism's sake, since removing working safety checks isn't worth the marginal simplicity." The session's own wrap-up says the same decision in plainer words: "assume one till, not multiple → logged TD-018; explicitly did NOT remove the in-transaction reads, documenting that one till is not one writer." The matching ruleset line for this one is also "Never simplify away: input validation at trust boundaries, error handling that prevents data loss."

Downstream:

- The PIN branch was not deleted that day. On 09-21 the same repo hashes PINs by rebuilding the seed (`1230fa60` · 09-21 11:14, "hashed PINs carried through"), which is the seed-and-schema change `760bad35` said a one-line delete was not. The wrong delete never landed. I did not find a user message asking why the PIN check had vanished.
- The 35-line `buildOrderPriceInfo` swap was not done. On 09-16 `a124e001` is still calling `isBillableItem` from `calculateCartValue` and calling a missing use of it a bug, not replacing the helper. The dangerous delete did not come back; the shared predicate did.
- TD-018 (one till) is still the stated assumption on 09-16 in `a124e001` and on 09-17 in `ecd308d8` ("one till and one drawer per restaurant is assumed everywhere (TD-018)"). I did not find a later session stripping the in-transaction close/payment reads. I am under 80% sure those reads are still in the code; I only know later sessions still talk about the assumption, not that they re-read the lock.

Causal test: a careful engineer also reads the seed before deleting a branch. What is not ordinary is the order. In the PIN case and the price-info case the agent had already chosen the shorter diff out loud, which is what "shortest working diff wins" pushes, and only then read the thing that made the short diff a second bug. Without the "never lazy about understanding" sentence, the rest of this ruleset is pressure to ship the version they had just announced. I cannot prove a rule-free agent would have shipped it. I can show this agent had selected it and then unselected it after reading. That counterfactual is [EMPIRICAL — UNTESTED].

What the opposite consult would say: Keeping the two-till lock after the user said "one till" is leftover code dressed up as care, and they only logged the assumption instead of doing the deletion the user asked for. The PIN episode also shows the short-diff reflex firing first — they told the user the branch was dead before they read the seed — so the rule that creates the bias and the rule that brakes it are the same plugin, and the brake did not fire until after a wrong claim was already in the chat.

### 3. Speculative build named, not silently dropped — MEDIUM, and the downstream is mixed

Ruleset sentences: "Does this need to exist at all? Speculative need = skip it, say so in one line. (YAGNI)." and "Pattern: `[code] → skipped: [X], add when [Y].`"

Instances (agent or a ponytail-injected sub-agent, not you repeating them back):

- `corpus/2026-09-13_048f5286_pony-full.txt` · 09-07 17:26, after you asked whether it could "check the logs smartly" without ingesting everything: "Skipped: a log-watcher daemon and a structured-tag pass over the backend. Add when grep-on-demand actually misses something."
- `corpus/2026-09-17_75f55983_pony-full.txt` · 09-15 15:24: "I'm dropping `payments.allowPartial` as speculative (nobody turns off splitting) but keeping the tender cap."
- `corpus/2026-09-18_721e8c65_pony-full.txt` · 09-15 22:33, after a one-key settings change: "skipped: a per-project override — global is what you want here." Your next message is "done". The follow-up ("I tried it didn't happen") is about thinking text not rendering, and the fix was a second existing key, `showThinkingSummaries`, not the per-project override.
- `corpus/2026-09-22_1230fa60_pony-full.txt` · 09-20 00:02, on dish search: "Skipped for now: spelling mistakes and short codes. Add when a real cashier asks."
- `corpus/2026-09-13_d28e6a65_pony-full.txt` · 09-01 15:56, sub-agent result the parent then adopted ("Taking: its standalone `service-day.mjs` design whole"): "Skipped: a `lib/actors.js`, a results writer, per-actor log files. Add when you have a second concurrency suite."

Downstream:

- `payments.allowPartial`, the per-project thinking override, spelling/short-code search, and `lib/actors.js` do not appear again as a build or as you asking for them. I searched those strings across the corpus. That is absence, not a proof they were never needed; the window is about ten days.
- The log-watcher skip did **not** stay skipped. `corpus/2026-09-15_0c314e82_pony-full.txt` · 09-10 10:23, after you asked again to monitor logs while you tested production: "Setting up a capture that records every backend call to a file and pings me only on errors" and the tool line "Write the backend log watcher". The "add when" condition was you asking a second time, three days later, during a live test. The pattern's own escape hatch fired. I will not call this "never needed."
- I am under 80% sure `service-day.mjs` itself was ever finished. Later in `d28e6a65` it is still listed as remaining work. The actors framework was skipped for a suite that may also not have shipped. The skip of the framework is real; the value of it is thinner.

Causal test: senior people skip speculative knobs without a plugin. What they do not reliably do is end the reply with "Skipped: X. Add when Y." That sentence shape is copied from the ruleset, and it is why I can find these decisions at all. A silent skip would have looked like ordinary editing. The benefit, when it works, is that the ceiling is in the chat. It is not a ledger: see section 4.

What the opposite consult would say: The template is cheap talk that lets the agent feel finished. The log watcher had to be built anyway, the service-day suite it was attached to looks unbuilt, and most of the corpus's real deferrals went into `TECH_DEBT.md` rows, not into this one-line pattern. "Add when a real cashier asks" is an untested bet that a cashier will know to ask.

### 4. One shared check instead of a patch at the symptom — LOW, [ATTRIBUTION WEAK]

I am including this because the downstream evidence is the best in the corpus, and then disqualifying it as ponytail's doing.

Ruleset sentence: "Bug fix = root cause, not symptom. ... grep every caller of the function you're about to touch. ... one guard in the shared function is a smaller diff than a guard in every caller."

Instances:

- `corpus/2026-09-13_048f5286_pony-full.txt` · 09-08 12:41: "Fixed at the source: `calculateCartValue` now treats RETURNED as non-billable alongside CANCELLED, via a small exported `isBillableItem` helper. Every caller inherits it, so no future caller can reopen the hole."
- `corpus/2026-09-17_a124e001_pony-full.txt` · 09-16 15:12 and 21:56: that claim was wrong. `updateOrderStatus` on COMPLETED still summed carts unfiltered, so a guest was charged ₹450 for a round staff had struck off, and two endpoints disagreed. The fix was not a new rule: "The COMPLETED recompute in updateOrderStatus.js was the fourth site and the only one not doing it. So the change is 'make the fourth one match', not a new policy." They imported the existing `isBillableItem`.
- `corpus/2026-09-22_1230fa60_pony-full.txt` · 09-21 13:21 thinking, before changing what a table code means: "since currentOTP passes through raw and canReceive rejects any table with a non-null OTP, this would break merge and move operations for every table system-wide." 13:22: "Good, I've confirmed nothing in the cart/order/offer/menu code reads table status."

Downstream: the ₹450 hole is the gold standard for this rule, and it is also proof the first session's "every caller inherits it" was unchecked. The second session did the grep the first one claimed to have done. The OTP sweep changed the design before code, same day; nothing later in the corpus reopens "we only patched the one refusal."

Causal test, failed: `corpus/2026-09-15_e339134f_pony-full.txt` quotes the project's own CLAUDE.md as already full of "grep every caller, check both flag values" rules. A competent engineer in this repo, with no ponytail, is told to do this. I will not credit the plugin for it.

What the opposite consult would say: The first "every caller" claim was false, and a guest could be overcharged for eight days until another session noticed. Calling that a ponytail success is grading the rule by the repair, not by the miss the rule was supposed to prevent.

## 3. Seen but below threshold

- **No new floor field.** `corpus/2026-09-18_e795856d_pony-full.txt` · 09-16 22:05: "one grouping field named `section`... No separate `floor` field ever." You pushed the terminology ("floor and section might be the same") before the agent conceded. One session, and the cause is you. Later sessions do not add a `floor` field; that is one downstream hit on a user-caused decision.
- **`line.sent` already meant "sent to the kitchen."** `1ce5d68c` · 09-16 08:18. Real find. By 09:27 the same session has walked it back: flipping `sent` "switches on a gate that has never once run." Reuse here surfaced a dead branch; it did not stay a "don't build it."
- **Admin settings endpoint already writes dot-paths, so the waiter-confirmation toggle needs no new backend.** `1ce5d68c` · 09-16 09:27. One session. I did not find `requireWaiterConfirmation` built in a later file. Moment only.
- **Copy the payments/day-close idempotency shape instead of a third request-id convention.** The sentence is in a peer-session message inside `a124e001` · 09-16 13:58, not in this agent's thinking. One peer, and I did not isolate a later "we invented a third shape" or a confirmation they copied it cleanly. Below the bar.
- **"Don't over-engineer for fraud" called out as the lazy excuse for skipping validation.** `75f55983` · around 09-16 08:58: "You flagged this and you're right to. 'Don't over-engineer for fraud' is precisely the sentence a lazy implementation reaches for when skipping input validation." They then wrote a contract line that detection is not a reason to skip a trust-boundary check. One session. The ruleset line is "Never simplify away: input validation at trust boundaries." Worth your eye because it is the plugin arguing with itself, in your favour, once.
- **`billing-check.sh` already existed, so the new infra doc points at it.** `d64eec81` · 09-13 13:55–13:56: "Let me check what already exists before writing anything" and then "scripts/billing-check.sh already exists." They still wrote `INFRASTRUCTURE.md`, which you had asked for. One look-before-write, not a refused build.
- **Offer-threshold-after-cancel test skipped and filed as TD-025.** `a124e001` · 09-16 22:00 thinking: "I'll skip the extra offers test as requested and instead add a brief, low-priority note to TECH_DEBT.md." You asked for the skip. Not the plugin.

## 4. Looked for and did not find

- **`ponytail:` comments making a shortcut trackable.** Searched `ponytail:` across the corpus. Hits are you reminding the agent the convention exists, and on 09-21 the agent reporting the repo has three such comments against 44 `TECH_DEBT.md` rows (`1230fa60` · 09-21 14:50: "deliberate shortcuts are being written into code without being marked"). I found no assistant turn where they write a `ponytail:` comment and a later session finds it. The visible deferrals are chat lines, not the code marker. The marker rule did not become a ledger in this window.
- **The error-bar "negative diff."** The only place "deleted four copies" appears is the 09-21 explanation of ponytail, after you asked why it helps. The thinking at 09-21 12:32 shows a new `onApiError` hook plus a Toaster, and the login screen still has a second `say()` that overwrites the bar. I will not call that a confirmed deletion.
- **Reply compression you accepted with no follow-up.** The output rule says code first, then at most three lines. The longest answers in the thinking-rich sessions (`1ce5d68c` 09:27, the walkout essay in `75f55983`) ignore it, and you had asked for the explanation, which the ruleset explicitly allows. The one short "done" (`721e8c65` · 09-15 22:35) is followed two minutes later by "I tried it didn't happen." I grepped `skipped:` and "three short lines" and did not find a repeated case of a three-line answer that closed the thread.
- **A deletion later confirmed safe by a test staying green in a different session**, as its own pattern. The duplicate-doc delete and the login-screen shrink are folded into pattern 1. I do not have three deletions where a later session says "that removal was fine, tests still green." The dead `getOrder` debug query is described as deleted inside `d28e6a65` plan summaries ("deleted the dead debug query on the consumer hot path") and I did not find it reappearing; that is one, and the confirmation is the same session's plan text.
- **Stdlib or platform winning over a library**, as a repeated move. `e795856d` uses already-installed Playwright rather than a new dependency, once. Not three.
- **`3bf1108c` (465 thinking blocks).** Grepped, not read linearly. It is hiring posts, Reddit replies, and scoring notes. I did not find the ladder steering code there. `68e0c52e` (1.7 MB) was searched and spot-read (the `addedBy` interceptor, the contract, the i18n refusal). I did not read it end to end.

i18n "not a framework" shows up in `51f74ffb` and `68e0c52e`. I do not count it. The portability rule you already gave those sessions was "a country is the sum of its config values" and "no i18n framework." That is your rule.

## 5. The one change

Do not remove this sentence:

"Never lazy about understanding the problem. The ladder shortens the solution, never the reading. Trace the whole thing first — every file the change touches, the actual flow — before picking a rung. Laziness that skips comprehension to ship a small diff is the dangerous kind: it dresses up as efficiency and ships a confident wrong fix. Read fully, then be lazy."

It is the only line that fired against the rest of the ruleset. The PIN branch and the 35-line price swap were both the short diff, already chosen, and this sentence is why they were unread. Rung 2 ("already in this codebase") produced more saves, including the `businessDate` reversal, but a careful engineer looks for an existing helper without a plugin. Nothing else in the file tells the agent to distrust the short diff it has just fallen in love with. If you keep one sentence, keep the brake.

## 6. Claim ledger

[STRUCTURAL] The three ruleset sentences quoted in sections 2 and 5 are in `ponytail-ruleset.md` and match the decisions cited. The output template "skipped / add when" is that file's pattern, not the agent's invention.

[STRUCTURAL] There is no control group. Both `pony-NONE` files are one-message stubs (`INDEX.md`). Every "without the rule they would have written the field" claim is a counterfactual.

[EMPIRICAL — UNTESTED] A rule-free agent who had just been told "ok, add businessDate" would have added the field. I observed the reversal. I did not observe the other agent.

[EMPIRICAL — UNTESTED] A rule-free agent would have deleted the plaintext PIN branch and swapped in `buildOrderPriceInfo` after announcing those as the small fixes. Same limit: I saw this agent unselect them after reading, not a paired run.

[STRUCTURAL] Pattern 4 fails the causal test because `e339134f` attributes "grep every caller" to the repo's own CLAUDE.md. The ₹450 repair is real; the credit to ponytail is not.

[EMPIRICAL — UNTESTED] `allowPartial`, the per-project override, fuzzy dish search, and `actors.js` "were never needed." What I know is they were not asked for again inside this corpus. The log watcher was asked for again and was built.

[STRUCTURAL] The 09-21 "ponytail paid for itself three times today" speech is not evidence. It was prompted by you asking why the plugin works, and the error-bar half is not in the earlier thinking.

[EMPIRICAL — UNTESTED] The in-transaction day-close reads survived past 09-16. Later sessions still cite TD-018. I did not see the code a second time.

[STRUCTURAL] The `ponytail:` marker did not become the tracking system in this window. The agent's own count on 09-21 was three markers versus 44 debt rows. I am less than 80% sure about the exact count of three; it is the agent's report, and this corpus does not include file contents, so I could not re-count the repo.

Confidence on pattern 1 as a repeated behaviour: about 75%. Confidence that ponytail, rather than ordinary engineering, caused the non-`businessDate` instances: under 50%, which is why the pattern is MEDIUM and the causal section splits them. Confidence on pattern 2's two reversals as real events: high. Confidence they were the ruleset and not just "I checked": about 60%. Confidence on pattern 3's template being the ruleset: high. Confidence those skips were the right product calls: about 50%, and the log watcher is the miss.
