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

## Project Context Instructions for AI Agents

This project contains multiple Flutter applications. When analyzing the codebase or performing tasks, please focus primarily on the `lib` folder where the core application logic resides.

### Flutter Applications
The main Flutter applications are located in:
- `frontend/flutter_boilerplate`
- `frontend/src-platter-apps/apps/platter_admin`
- `frontend/src-platter-apps/apps/platter_kitchen`
- `frontend/src-platter-apps/apps/platter_server`

### Ignored Files & Directories
To maintain relevant context and avoid analyzing unnecessary boilerplate or auto-generated code, the following directories and files should generally be IGNORED within each Flutter application directory, unless specifically requested otherwise:

#### Platform-Specific Boilerplate
- `android/`
- `ios/`
- `linux/`
- `macos/`
- `windows/`
- `web/` (Focus on `lib/` for web logic; `web/` contains static assets and config)

#### Build & Tooling
- `build/`
- `.dart_tool/`
- `.idea/`
- `.vscode/`

#### Configuration Files (Unless modification is required)
- `pubspec.lock`
- `.metadata`
- `analysis_options.yaml` (Unless checking lint rules)

#### Large Data Files (Ignore content by default)
The following files are large and should NOT be read or included in context unless specifically asked to modify or inspect their data structure:
- `backend/src-plattr/functions/mock/mockData.json`
- `backend/src-plattr/functions/mock/mockDataV2.json`

### Primary Focus
**`lib/`**: This directory contains the source code for the Flutter applications. Please prioritize searching and editing files within `lib/`.


## Handling Edge Cases in B2B-Facing Apps (Only for - Flutter Admin, Flutter Kitchen, Flutter Server)

When writing code for the source Flutter apps like **Flutter Admin**, **Flutter Kitchen**, and **Flutter Server** (which are B2B-facing apps), please follow the guidelines below:

- **Edge Cases**: It’s acceptable to **ignore** or **defer** certain rare edge cases if fixing them requires large code changes (e.g., over 20 lines) for issues that occur in **1-2%** of use cases. In these cases, staff or admins can simply **kill and relaunch the app** to resolve the issue.
  
- **Small Fixes**: If the fix for an edge case is a **small change** (less than **3-4 lines** of code), it should be **implemented**.

- **Tech Debt**: For edge cases not addressed immediately, document them as **to-dos** in the `tech-debt.md` file. Example to-dos:
  - *Passwords are checked as plain text.*
  - *The `generateTableOTP` function fails if the table is not vacant, meaning a waiter cannot regenerate an OTP for an active table without resetting it first.*

- **Code Quality**: Maintain **simple**, **readable**, and **maintainable** code. Only address small, rare fixes that do not complicate the codebase unnecessarily.
