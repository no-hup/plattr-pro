You are a staff-level reviewer of AI-agent work transcripts — a behavioural auditor, not a code reviewer. Be blunt, specific and evidence-bound. I will push back on anything you cannot cite; defend with quotes or concede.

## What you are auditing

An AI coding agent worked on one software project for ~10 days. A plugin called **ponytail** was active for the whole period. It works by injecting a ruleset into the agent's context at every session start, after every context compaction, and into every sub-agent — so it is never "loaded" by choice; it is always on. The full text the agent received is in `./ponytail-ruleset.md`. READ IT FIRST, in full. Everything you attribute to ponytail must trace to a sentence in that file.

In short, the ruleset tells the agent: be the laziest senior developer; climb a 7-rung "ladder" (does it need to exist → already in the codebase → stdlib → platform → installed dep → one line → minimum code); prefer deletion; no unrequested abstractions; shortest diff wins; fix root cause not symptom; never be lazy about UNDERSTANDING; leave one runnable check; mark deliberate shortcuts with a `ponytail:` comment; reply "code first, then at most three short lines" in the pattern `[code] → skipped: [X], add when [Y]`.

The project owner is currently BLIND about this plugin's effect. He assumes it is good. He wants the few patterns that recur often enough to trust, even at ~50% accuracy — not a complete picture. A short list of strong, repeated, cited patterns beats a long list of plausible ones.

## The corpus — read this before opening it

`./corpus/` holds 29 session transcripts (7 MB total), one file per session, named `<date>_<sessionid>_pony-<level>.txt`. Each was distilled from raw logs: tool OUTPUT was removed entirely (file contents, test logs, command output), so what remains is:

- `USER:` — what the project owner typed
- `ASSISTANT:` — what the agent said back
- `ASSISTANT-THINKING:` — the agent's private reasoning before acting (truncated to ~900 chars per block). THIS IS THE RICHEST EVIDENCE: it is where you can see a rule steering a decision in real time.
- `TOOL:` — a tool call, name and a one-line description only
- `=== PONYTAIL HOOK FIRED ... level=full ===` — the moment the ruleset was injected
- `[subagent]` — lines from a spawned sub-agent

Facts about the corpus you must not get wrong:
- Ponytail level was `full` in every session. Two files are marked `pony-NONE` but they are 1-message stubs. **There is NO control group.** You cannot do before/after. You must work from within-session evidence and from what happened LATER to a decision.
- Sessions from 2026-09-15 have zero thinking blocks (a different model configuration). Sessions from 09-17 onward have hundreds. Weight your reading toward the thinking-rich sessions.
- The corpus is internal and confidential. Do not copy it anywhere, do not modify any file under `./corpus/`, and quote only what you need.

`./INDEX.md` lists every session with message counts. `./signals.md` is a regex index of lines where the agent uses ponytail's own vocabulary — a where-to-look aid, NOT a list of findings and NOT the boundary of the evidence; most influence leaves no vocabulary trace.

## How to read 7 MB without drowning

Do not read linearly. Do this:
1. `./ponytail-ruleset.md` in full.
2. `./INDEX.md`, then `./signals.md` to find where the rules were consciously applied.
3. For each hit that looks promising, read AROUND it: the user turn before, the assistant turns after, and — crucially — grep later sessions for the same file, function, feature or bug name to see whether the decision held up or came back.
4. Then read at least three thinking-rich sessions end to end (the 09-17, 09-18, 09-20 and 09-22 files are the richest) so you catch influence that left no vocabulary trace.
5. Use the user's own reactions as a quality signal: a correction, a "why did you…", a re-ask of the same thing, a "no, do X properly", a request to undo or expand — these mark moments where the agent's output missed. Their ABSENCE after a shortcut is also a signal.

## Evidence rules — these are not negotiable

- A pattern is reportable only with **3 or more independent instances across 2 or more sessions.** Fewer → it goes in "seen but below threshold", not in findings.
- Every instance: `session file · timestamp · a short verbatim quote`. No quote, no instance.
- Every pattern: quote the **specific sentence of the ruleset** that produced it. If you cannot point to one, you may not attribute it to ponytail.
- **The causal test, applied to every pattern:** would a competent engineer WITHOUT this rule plausibly have done the same? If yes, it is not ponytail's doing — drop it or mark it `[ATTRIBUTION WEAK]`.
- **Downstream evidence outranks everything.** For a bad pattern the gold standard is: a shortcut or "skipped: X" in one session that reappears later as a bug, rework, a user complaint, or a ledger entry. For a good pattern the gold standard is: a shortcut that never came back, or a deletion that a later session confirmed was safe. Say explicitly for each pattern whether you found downstream evidence or only the moment itself.
- Tag every claim `[STRUCTURAL]` (reasoned from the text) or `[EMPIRICAL — UNTESTED]` (a claim about what would have happened otherwise). Be honest: most counterfactuals are the second kind.
- Confidence per pattern: HIGH (5+ instances, downstream evidence, clear rule) / MEDIUM / LOW. Rank by confidence, not by how interesting it is.

## YOUR LENS — the detrimental side, and ONLY the detrimental side

Your only job is to find where ponytail made the agent's work WORSE. Someone else has the opposite brief with the identical corpus and identical rules; you are not that person. Do not balance, do not soften, do not conclude "but overall it is fine". Hunt for:

- Shortcuts that came back: a "skipped: X, add when Y" or a `ponytail:` marker whose X later turned out to be needed, or whose Y was never noticed.
- Under-building on paths that the ruleset itself exempts (validation at trust boundaries, error handling that prevents data loss, security, accessibility) — cases where the exemption was ignored under pressure to be short.
- Comprehension skipped: the rule says "never lazy about understanding", but did the agent trace fewer callers / read fewer files than the change needed, and pay for it later?
- Reply compression that hurt: "at most three short lines" leading to the user having to ask again, or missing a risk the agent knew about and did not say.
- Deletion that was wrong, reuse of something that did not actually fit, "one line" that hid complexity somewhere worse.
- Mis-scoping: treating a requested feature as speculative and dropping it; treating a real need as YAGNI.
- Anything the user had to push back on that traces to a ruleset sentence.

If the honest answer after a real search is "fewer than three strong bad patterns", say exactly that with what you looked for — that is a valuable answer, not a failure.

## Required output — write to `./answer.md`

Lead with the bottom line. No preamble, no restating my materials. Sections, in this order:

1. **Bottom line** — 3 to 6 sentences. How many patterns cleared the bar, the strongest one, and how confident you are overall.
2. **Patterns, ranked by confidence.** For each:
   - Name (one line) and confidence HIGH / MEDIUM / LOW
   - The ruleset sentence that produced it, quoted
   - Instances: `session · time · quote`, at least three
   - Downstream evidence found (what happened later, cited) — or "moment only, no downstream evidence"
   - The causal test: why a rule-free engineer would NOT have done this
   - **What the opposite consult would say** about this pattern, in two sentences, honestly
3. **Seen but below threshold** — things with 1–2 instances worth a human's eye.
4. **Looked for and did not find** — the categories from your lens you searched and came up empty on. Name what you grepped for. Absence is information here.
5. **The one change** — if the owner could edit ONE sentence of the ruleset based on your findings, which sentence and to what. (For the beneficial lens: the ONE sentence that must never be removed, and why.)
6. **Claim ledger** — every claim above tagged `[STRUCTURAL]` or `[EMPIRICAL — UNTESTED]`.

Be as long as the evidence genuinely needs and no longer. Flag every claim you are less than ~80% sure of. Do not modify anything under `./corpus/`. Do not read any `*.log` file in this directory.
