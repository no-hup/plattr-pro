# Plattr Pro — Agent Instructions

## Project Overview
Restaurant management platform with 4 apps: Consumer (QR scan → menu → order), Kitchen (order management), Server (table/order management), Admin (restaurant settings). Backend is Firebase Cloud Functions + Firestore.

## Critical: Change Impact Checklist

**Before changing any backend API or Cloud Function:**
1. Grep for `featureFlags.isEnabled` in the code path — read `backend/src-plattr/functions/singleton/FeatureFlags.js` for the full flag list and flow-impact map. Verify your change works for **both `true` and `false`** values of every flag in that path.
2. Identify **all frontend apps** that consume the API you're changing. Grep the endpoint name across Consumer, Kitchen, Server, and Admin apps. Verify behavior change is handled in every consuming app.
3. If your change alters the Firestore document schema (adding/removing/renaming fields), check all code that reads those documents — backend functions AND frontend apps. Existing documents in production won't have new fields; code must handle missing fields gracefully.

**Feature flags are per-restaurant overridable** via Firestore doc `_system/featureFlagOverrides` (emulator) or restaurant-level config. Never assume a flag has a single value across all restaurants.

## Architecture Notes

- **Monorepo structure:**
  - `backend/src-plattr/functions/` — Firebase Cloud Functions (Node.js)
  - `frontend/flutter_boilerplate/` — Consumer app (Flutter web)
  - `frontend/src-platter-apps/apps/platter_kitchen/` — Kitchen app
  - `frontend/src-platter-apps/apps/platter_server/` — Server app
  - `frontend/src-platter-apps/apps/platter_admin/` — Admin app
- **Shared core:** `frontend/src-platter-apps/packages/platter_core/` — models shared across kitchen/server/admin apps
- **Emulator-first development:** All local dev uses Firebase emulators. Mock data lives in `backend/src-plattr/functions/mock/`

## Backend Conventions

- Error handling uses `backend/src-plattr/functions/singleton/ErrorHandler.js` — never throw raw errors from cloud functions
- Array operations use `backend/src-plattr/functions/utils/arrayOperations.js` (`safeArrayUnion`, `applyArrayOperation`) — never use raw `FieldValue.arrayUnion` directly
- Session management through `backend/src-plattr/functions/session/sessionService.js`
- OTP generation/validation through `backend/src-plattr/functions/session/otpService.js`

## Data Defensiveness Rules

- Always null-guard array fields from Firestore before calling `.includes()`, `.length`, `.map()`, etc. Use `(field || [])` pattern
- Session documents may have been created by older code versions — never assume all fields exist
- Table documents may be in unexpected states (e.g., `OTP_PENDING` with expired OTP) — handle gracefully

## Testing

- E2E test data: `backend/src-plattr/functions/mock/MockData5EndToEndTesting.json`
- Test startup guide: `AGENT_TESTING_STARTUP_GUIDELINE.md`
- Consumer OTP for testing: `123456` (6 digits, matches `OTP_CONFIG.LENGTH`)
- Test customers: phone `9876543210` (Customer One), `9876543211` (Customer Two)
- Import mock data: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node functions/mock/importMockData5.js --clean --refresh-timestamps`

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
