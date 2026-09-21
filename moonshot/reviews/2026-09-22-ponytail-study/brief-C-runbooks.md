Follow-up round, same session. You audited ten days of transcripts and found one pattern that cleared the bar: the ruleset's "already in this codebase → reuse it" + "one line" producing untraced claims that travelled into handoffs, with the "never lazy about understanding" brake firing late.

NEW FACT. The same ruleset (ponytail-ruleset.md, level full) was injected by a global hook into every one of 56 sessions of a DIFFERENT project — the owner's paid, revenue-critical work. Those sessions are 6–8 hour orchestration runs governed by three runbooks. The runbooks never mention the ruleset; the owner did not know it was active there. The owner is skeptical of any change to these runbooks, rightly, and wants an unbiased read before touching anything. Nothing will be edited on your say-so.

MATERIALS (read fully, in ./runbooks/):
- runbook-B.md — Project B: A/B comparison of two coding agents on a repo, 5–8 turns each, human drafts follow-ups and ratings; the most complex, ~130 KB.
- runbook-T.md — Project T: build a hard benchmark task, measure difficulty by trials, package; ~80 KB.
- runbook-P.md — Project P: verify a set of tests against a spec; the straightforward one.
- lessons-B.md — Project B's append-only ledger of what actually went wrong per task (read the 2026-09-15 cross-run audit especially: five blind reviewers found instruction-following decay across five runs).
- checklist-B.md — the per-turn checklist Project B re-reads at every turn boundary.
Also re-read ./ponytail-ruleset.md.

The runbooks' design is the OPPOSITE temperament to the ruleset: they demand full re-reads at boundaries, state files, three running records, exit checks, judges, ledgers, verified claims. The ruleset says skip speculative work, no scaffolding for later, shortest diff, at most three lines of output, "reuse what's already here".

QUESTIONS — answer each, evidence-tagged like before (STRUCTURAL = follows from reading the two texts side by side; EMPIRICAL = you saw it happen in lessons-B.md or the earlier transcripts). Flag anything under ~80% sure with (VERIFY).

1. COLLISIONS. Name the specific ruleset sentences that, when both are in context, would push an agent AGAINST a specific runbook rule. Quote both sides. Rank by how much a miss would cost (a lost task or a wrong rating > rework). Be concrete: which runbook step gets skipped or shortened, and what the agent would say to itself while doing it.
2. WHERE THE RULESET HELPS. The runbooks have their own bloat problem (130 KB; the ledger notes a 135 KB playbook thrashed worker contexts to death). Where would the ruleset's instinct — delete, shortest path, reuse — genuinely serve these runs? Be honest if the answer is "mostly in the tooling the orchestrator writes, not in the orchestration".
3. FINGERPRINT CHECK. In lessons-B.md, do any recorded failures carry the fingerprint you found before — a confident "already covered / one line / done" claim made before tracing, that a later step believed? Quote them. If none, say so; the owner needs the absence as much as the presence.
4. THE DELIVERY MECHANISM. The ruleset survives compaction because a hook re-injects it on every compact; the runbooks survive compaction only if the agent remembers to re-read the SAFETY BLOCK and state file. Is that asymmetry itself a risk here — the terse ruleset is always fresh, the 130 KB runbook is only as fresh as the agent's discipline? What is the smallest delivery change that would fix it without changing a word of the runbooks? (VERIFY-tag anything about how the hook system works that you are inferring.)
5. THE CALL. Three options, pick one and defend it in five lines: (a) leave the ruleset active in that project as is; (b) switch it off for that project only; (c) keep it on but add one inlined override in the project's instructions. If (c), write the override — one sentence, no new rules, only naming which runbook rules outrank which ruleset sentences. Then say what evidence, gathered from the 56 sessions, would flip your call.
6. WHAT YOU WOULD NOT TOUCH. Name the runbook rules the owner should protect from any "simplify" instinct, with one line each on why.

OUTPUT CONTRACT. Write ONLY ./answer-C.md. Under 120 lines. Sections 1–6 in order. Every claim tagged STRUCTURAL or EMPIRICAL with a quote and file:line. End with "Looked for and did not find:" — three lines. No preamble, no restating the brief. Nothing outbound; do not search the web.
