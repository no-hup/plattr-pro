# Ponytail study — what two blind Grok consults found (2026-09-22)

Two Grok 4.7 runs, identical corpus and rules, opposite lenses. Corpus: all 29 plattr-pro sessions
2026-09-13 → 09-22, distilled to user/assistant text, assistant thinking (truncated), tool names and
hook markers (7 MB from 169 MB raw). **Ponytail was `full` in every session — there is no control
group.** Every counterfactual below is untested by construction.

- [grok-A-detrimental.md](grok-A-detrimental.md) · [grok-B-beneficial.md](grok-B-beneficial.md)
- [brief-A-detrimental.md](brief-A-detrimental.md) · [brief-B-beneficial.md](brief-B-beneficial.md) · [INDEX.md](INDEX.md)

## The one thing both found, from opposite sides

Rung 2 of the ladder — *"Already in this codebase? … reuse it"* — plus *"Can it be one line? One line"*:

- **Good (B, medium):** the agent, heading at a new field / second helper / second doc, stops because the
  thing exists. `businessDate` never became a field (derived from timestamps already stored); one
  discount-PIN threshold not two; no second money parser; duplicate testing doc deleted; login screen
  264→52 lines. None came back as a request within the window.
- **Bad (A, medium — the only pattern that cleared its bar):** the same rung produces the sentence
  *before the path is traced*, and the sentence travels. "`line.sent` already covers it", "two lines,
  `loadTaxBlocks` already reads it", "delete the PIN branch in one line", "the kitchen screen already
  sees every round". Other sessions acted on the sentence, not the code. All caught same-day; nothing
  shipped broken; cost was rework, one red suite for everyone, and one instruction to delete a live PIN
  comparison that was retracted before anyone ran it.

Both independently name the same brake — *"Never lazy about understanding… Read fully, then be lazy"* —
B as the one sentence never to remove, A as the sentence that "lost" to the reuse rung. Convergent
reading: **the brake exists but fires after the short diff has already been announced.**

## Also convergent

- `ponytail:` markers are not functioning as a ledger: 3 in the repo vs 46 TECH_DEBT rows. Deferrals
  live in chat lines and the ledger file, not in code.
- "Skipped: X, add when Y" is real and findable because of the template; one skip (log watcher)
  came back and was built when asked again — the escape hatch worked.
- B refused to credit ponytail for "grep every caller" (repo CLAUDE.md already says it) and refused
  to count the agent's own 09-21 explanation of ponytail as evidence. A refused to blame the
  three-line reply cap because the agent was not obeying it.

## The change both point at (A's wording)

Replace *"Already in this codebase? A helper, util, type, or pattern that already lives here → reuse it."* with:

> Already in this codebase? Reuse it only if you have seen a live caller do the job on this path. A flag
> nothing sets, a function on another module's path, and a screen that does not show this case are
> not reuse — say that, and do not write "one line" or "already covered" into anything another session
> will read.

The plugin's own file is overwritten on update, so the place for this is the user's global CLAUDE.md
(or the repo's), as an addendum that overrides rung 2.
