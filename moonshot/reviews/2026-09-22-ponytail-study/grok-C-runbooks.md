# Ruleset vs the three runbooks

## 1. Collisions

Ranked by what a miss costs. The agent’s private line is the part I am inferring; the two quotes are not.

**1. Lost task — treat the re-read as already done.** Ruleset: "The ladder is a reflex, not a research project" (`ponytail-ruleset.md:28`) and "The shortest path to done is the right path" (`:99`). Runbook: "Re-read this runbook at every turn boundary — do not run a long task from memory" (`runbook-B.md:410`); "Resume after an interruption or compaction: read `ORCHESTRATOR-STATE.md` … re-read the SAFETY BLOCK" (`:92-95`); same ritual in `runbook-T.md:30` and `runbook-P.md:143-149`. Self-talk: "I read the safety block an hour ago; climbing it again is scaffolding." What gets shortened: the post-compact re-read, then the keep-alive log. Cost is measured: "Task-21 was lost … nobody opened the log for another 2h40m" (`runbook-B.md:49-51`). [STRUCTURAL] on the push; [EMPIRICAL] on the cost.

**2. Wrong rating — "already covered" instead of a second arm, a second trial, or a command.** Ruleset: "Already in this codebase? … reuse it" (`ponytail-ruleset.md:21`); "Two rungs work → take the higher one and move on" (`:29-30`); "Can it be one line? One line" (`:25`). Against: "Never reuse insights from model 1 to steer model 2" (`runbook-B.md:43`); "A verdict without a command behind it is a hypothesis" (`runbook-P.md:153`); "Difficulty is measured, never argued" (`runbook-T.md:138`); "A packet's 'done' is a claim, not a fact" (`runbook-T.md:65-66`); "Build only on ≥2/2 recurring, independent probe misses" (`runbook-T.md:46`). Self-talk: "Run 1 already has the probe; one line covers arm 2. The packet said done." Also "YAGNI applies to tests too" (`ponytail-ruleset.md:91`) against the second trial and the per-test fan-out. [STRUCTURAL]

**3. Wrong rating — the five records are "scaffolding for later".** Ruleset: "No boilerplate, no scaffolding 'for later'" (`ponytail-ruleset.md:42`); "Fewest files possible" (`:44`); "at most three short lines" (`:51`). Checklist: "Update the FIVE records every single turn" and "TURN-LEDGER … is the one that dies first if you skip" (`checklist-B.md:44-45`); "snapshot the whole TREE … Skip it and 'wrong when stated, or fixed later?' becomes unanswerable — that cost a whole comparison axis once" (`checklist-B.md:37-38`). Self-talk: "The diff is the record. The ledger is a second copy." [STRUCTURAL] The axis actually died once: "Only the final tree was kept … Cost a whole comparison axis" (`lessons-B.md:74`). [EMPIRICAL] that the skip costs a rating. Not evidence the ruleset caused that skip.

**4. Lost task — delete, don’t park.** "Deletion over addition" (`ponytail-ruleset.md:43`) against "Never delete during isolation — move only" (`runbook-B.md:36`) and "Deletion is the only irreversible act" (`runbook-P.md:35-36`). Self-talk: "Parking is scaffolding; rm is the one-line fix." [STRUCTURAL]

**5. Rework, not a lost task — skip a floor phase because it looks duplicate.** "Speculative need = skip it, say so in one line" (`ponytail-ruleset.md:19`) against "§3a has no `SKIPPED` state at all" (`runbook-P.md:31-32`). The runbook already recorded the self-talk, before any ruleset claim: "the lead reasoned '16 tests share one grounding question, low value', skipped the fan-out" (`runbook-P.md:121-122`). [STRUCTURAL] collision; [EMPIRICAL] that this skip shape already happens.

The output cap has an exit: "Explanation the user explicitly asked for (a report … per-phase notes) is not debt" (`ponytail-ruleset.md:55-56`). It holds only if the agent treats the runbook as the user. (VERIFY) I have not seen whether these sessions do.

## 2. Where the ruleset helps

Mostly in tooling the orchestrator writes, not in the orchestration. A keep-alive, a dashboard, a scraper: "shortest working diff" and "Never add a new one for what a few lines can do" (`ponytail-ruleset.md:24`, `:44`) are the right instinct, and the runs already bleed from the opposite. `runbook-T.md:466-467`: "the 135 KB playbook alone autocompact-thrashed two packets to death before any work happened." The same file already orders the cure: "brief workers to size-check files before reading (>20 KB → slice)" (`:469-470`) and "keep your own context lean … reading workers' state files, not their transcripts" (`:95-96`). Ponytail does not add that rule. It only adds a shove to apply it to the exit checks, which is the collision in §1. I would not credit it for review quality: "Deliberately drop the nitpicks" is already in `runbook-B.md:466-468`.

## 3. Fingerprint check

The exact fingerprint — "already covered / one line / done" written before a trace, then believed by a later step — is not in `lessons-B.md`. I grepped `already covered`, `one line`, `one-liner`, `nothing to repair`, `from memory`.

Nearest cousins, different mechanism:

- "both are already covered upstream, so they stayed in the task's own LESSONS file" (`lessons-B.md:79`). A decision not to promote a lesson. Nothing later rated off it.
- "still scored Task Success 4 by filing both under 'contention-only edge cases, quick to fix'. … however short the fix" (`lessons-B.md:145-150`). Size used as severity. Not a reuse claim. The blind re-grade caught it.
- "the sentence that should have stopped me was my own 'every normal single-node flow is byte-identical', which was never probed" (`lessons-B.md:162-166`). This is the untraced confident claim. It moved a 3 to a 4. It does not use the ruleset’s words.
- "Skipping run 2's repair turn because 'nothing to repair'" (`lessons-B.md:124-125`). A done-claim that shortened one arm. The ledger calls it a judgment error, not a ladder hit.

The 2026-09-15 audit is instruction-following decay, not this fingerprint: "skipped in 4/5 runs because a theme was already queued" (`lessons-B.md:242-244`); "Follow-ups byte-identical across arms in 3/5 runs" (`:236-237`). The audit’s named cause is the gap list and arc-mirroring, not a one-line reuse. (VERIFY) whether those five runs’ thinking cited the ladder. These materials do not contain thinking blocks.

## 4. The delivery mechanism

Yes. The ruleset is re-injected on every compact (stated by you; I have not seen the hook config — VERIFY). The runbooks survive only if the agent opens them: "what erodes first is never the loud rules, it is the quiet procedural ones" (`runbook-B.md:413-415`). After a compact the fresh text in context is the one that says "Still active if unsure" (`ponytail-ruleset.md:12`) and "shortest path". The 130 KB file is a path the agent must choose to read. `runbook-T.md:465-466` already records that ancestor `CLAUDE.md` files "auto-load into the packet and re-inject after every compact." (VERIFY) that the same auto-load applies to Project B and P, not only T.

Smallest delivery change that edits no runbook word: on the same compact hook, inject the existing SAFETY BLOCK bytes (B’s ten lines, T’s nine, P’s eight — each file already says the block is the index) plus the one line already in the runbook, "If this file and your recollection disagree, the runbook wins" (`runbook-B.md:69-70`). No new sentence. The block is the part whose violation "costs the task" (`runbook-B.md:23`). (VERIFY) that the hook can prepend a second file. I am inferring that from "it injects the ruleset."

## 5. The call

**(b) Switch it off for that project only.**

The upside the ruleset would bring is already a rule in `runbook-T.md:466-470`, bought with two dead packets. The downside is the thing these runs grade: an untraced "done" that the next record believes. In the earlier corpus the understanding brake lost to the ladder the same day, and the false sentence is what the other session acted on. Here that other session is a rating, a second arm, or a state file marked `DONE`. An override typed into project instructions loses the same race unless it rides the hook, and the ruleset already contains a brake ("Never lazy about understanding", `ponytail-ruleset.md:76-78`) that did not fire in time. Adding a second copy of a brake that lost is not a fix.

What would flip this, from the 56 sessions: after compactions, EXIT CHECK rows still contain pasted command output, the five B records update every turn, and no rating or `DONE` row rests on a "one line / already / skipped" claim whose trace was not re-run. One session that skipped a floor phase or a tree snapshot and cited the ladder flips nothing — it confirms (b).

## 6. What not to touch

- Keep-alive re-read before anything else (`runbook-B.md:44-51`). Skipping the log already lost a finished task.
- Park, never delete (`runbook-B.md:36`). Isolation deletes are how a second run sees the first.
- No model-1 insight into model 2 (`runbook-B.md:43`). That is the comparison.
- Tree snapshot plus the five records, ledger first (`checklist-B.md:37-45`). One missing tree already dropped a rating axis.
- Never add a duration up (`checklist-B.md:98-102`). It produced a conversation longer than the conversation.
- Human presses Submit, all three safety blocks. An agent default here is a voided submission.
- P: a verdict needs a command (`runbook-P.md:153`); §3a cannot be `SKIPPED` (`:31-32`).
- T: difficulty is a trial number (`runbook-T.md:138`); a packet’s "done" is re-run (`:65-66`); a failed exit check is a hard stop (`:48`).

Looked for and did not find:
- The "already covered / one line" handoff, quoted as such, moving a later Project-B rating inside `lessons-B.md`.
- The 2026-09-15 audit blaming a shortest-diff or reuse rule. It blames queued themes and copied follow-ups (`lessons-B.md:236-244`).
- Any runbook line that says to drop an exit check, a second trial, or a record to keep the diff short. They say the opposite.
