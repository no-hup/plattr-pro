# Handoff · build ST · Staff PIN & approvals

Register first: `/moonshot-session start ST staff approvals`.
Read, in order: `moonshot/CLAUDE.md`, `moonshot/STATE.md`, `moonshot/SPEC_ST_staff_pin_and_approvals.md`.
From `moonshot/CRITICAL_EXISTING_PIECES.md` read only the sections this module's ports touch.
For existing code, start from "Read these to copy the shape" in CLAUDE.md; grep past it only for
what those examples leave unanswered. Follow "Building a module" in CLAUDE.md exactly.

Task: build ST end to end on branch `moonshot`, the first module in the new layout.

Steps
1. Setup that STATE.md lists as Next 1 and 2, only as far as this module needs: `make check`
   (lint + typecheck + unit + boundary grep) and `frontend/till/` scaffold with one Playwright
   smoke test against the emulator. Keep both minimal.
2. Test skeleton for every ST-S scenario, expected values computed by hand from the sheet
   (limit 10%, pitcher ₹1,250, lock after 5 wrong in 10 min). Body `todo`.
3. Second opinion, blind: Opus subagent + `/custom-fanout-consult`, prompted with the sheet and
   rules only. Merge. Rejected cases get one line each in the sheet's Decisions table.
   Show Shaurya the final skeleton before implementing. Wait for a yes.
4. Implement in the sheet's Files order: `domain/approvals.ts` (+test) → `adapters/firestore/
   {staff,audit}.ts` → `app/approvals.ts` → `api/approvals.ts` → till `features/approvals/`
   with the `requires` interceptor in `api/client.ts`. One test red then green at a time.
5. E2E suite `test/e2e/suites/approvals.js` for ST-S2, S3, S4, S7. Playwright for ST-S2.
6. Definition of done in CLAUDE.md. Commit per scenario ID. Do not push.

Constraints
- Existing dirs untouched except `index.js` export and reuse of `adminApp/auth.js` roles and the
  PIN hash in `servers/{id}.password`.
- Config keys exactly as the sheet names them, defaults in `app/config.ts`.
- Any shortcut: `// DEBT(TD-nnn)` + row in `TECH_DEBT.md`.
- Any "for now / later" → the sheet's Decisions table, then the reply summary line.
- Reply style: summary line first, short bullets. Long output on a page.

Stop and ask only for: ST-Q1 (owner PIN), PO-Q1 (rupees vs percent), or a schema change.
Everything else: pick the lazy default, write it down, continue.
