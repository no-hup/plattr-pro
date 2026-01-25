---
name: agent-driven-api-verification-through-curl-and-unit-test
description: Agent workflow for backend API changes, curl-based contract flows, and Flutter server app contract tests with minimal mock data updates.
---

# Agent-Driven API Verification

## Triggers (When to use this skill)
- Any backend API change (request/response, validation, error shape)
- Any DB schema change affecting API payloads
- Any change to Flutter server app parsing models or services

## Constants (Do not improvise)
- Read `constants.yaml` for strict invariants.
- Update `constants.yaml` only when schema/test fixtures change.

## Tools (Atomic Actions)
- Check emulator: `tools/check_emulator.sh`
- Start emulator: `tools/start_emulator.sh`
- Reset mock data: `tools/import_mock_data.sh`
- Reset emulator + data: `tools/reset_all.sh`
- Run backend curl flow: `tools/run_backend_flow.sh`
- Run Flutter contract tests: `tools/run_flutter_contract_tests.sh`
- Tail emulator logs: `tools/tail_emulator_logs.sh`

## Progressive Disclosure
- Backend API verification: open `cookbook/backend_workflow.md`
- Flutter server app verification: open `cookbook/flutter_workflow.md`

## Pattern Matching (Signals)
- **Emulator OK**: `check_emulator.sh` returns `200`
- **Emulator load failure**: log contains `Failed to load function definition` or syntax errors
- **Network down**: `check_emulator.sh` returns `000`
- **Not found errors**: confirm IDs in `constants.yaml` and mock data

## Mock Data Policy (Minimal Delta)
- Only update `mockDataV3.json` when schema changes require new fields or IDs.
- Keep mock data lean; no extra categories/items unless a test uses them.
- Preserve invariants from `constants.yaml` and runtime config files.

## Runtime Config Locations (single source of truth)
- Backend curl flow config: `backend/src-plattr/contract-tests/contract_test_config.sh`
- Flutter base URL override: `frontend/src-platter-apps/apps/platter_server/test/contract/contract_test_utils.dart`
- Mock import script path: `backend/src-plattr/contract-tests/contract_test_config.sh` (`MOCK_IMPORT_SCRIPT`)
