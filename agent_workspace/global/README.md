# Agent Workspace – Global Instructions

All agents share these rules regardless of their specialized role. The directory layout is intentionally minimal so you can see responsibilities at a glance.

## Directory Overview
- `global/` – cross-cutting references (this file, architecture guidelines).
- `agents/response_guard_runtime/` – runtime response monitoring toolkit.
- `agents/supervisor_change_review_dev/` – code-review supervisor instructions and reports.
- `agents/supervisor_befe_sync_dev/` – BE-FE correlation supervisor instructions and reports.
- `progress/` – per-session work logs (`MM-DD_<module>_<task>.md`).
- `learnings/` – shared knowledge base for all agents.

## Mandatory Behaviors

### 1. Session Work Tracking
Create or update a file inside `progress/` for each session. Use `MM-DD_<module>_<feature-or-change>.md` (e.g., `01-15_cart_tax-rounding.md`). Track:
- Files touched and why
- Key decisions or tradeoffs
- Short snippets illustrating important changes
- Blockers and mitigations

### 2. Learning from Mistakes
Whenever the user corrects you, log it under `learnings/` as `MM-DD_<module>_<nuance>.md`. Document:
- ❌ What was wrong
- ✅ What is correct
- 💡 Why it matters

### 3. Code Impact Analysis Before Editing
Before modifying a function/module:
1. Search for usages (`rg`, etc.).
2. Identify dependencies and shared utilities.
3. Consider ripple effects (cart/order/session/table are tightly coupled).

### 4. Preserve Existing Patterns
Study existing implementations before introducing changes:
- Reuse helper utilities (`timestamp.js`, `ResponseHelper`, etc.).
- Follow established error handling/logging approaches.
- Do not introduce new libraries/patterns without approval.

### 5. Verify Before Completion
Before calling a task done:
- Review your diff for unintended edits.
- Consider regressions in related modules.
- Run available tests/emulators when possible.
- Remove debug logs, commented code, and temp files.

## Reporting & Output Paths
- Change-review supervisor reports → `agents/supervisor_change_review_dev/reports/`
- BE-FE supervisor reports → `agents/supervisor_befe_sync_dev/reports/`
- Response Guard outputs → `agents/response_guard_runtime/output/`
- Session/progress logs → `progress/`
- Shared learnings → `learnings/`

Always use absolute paths in documentation so sub-agents can navigate without context.
