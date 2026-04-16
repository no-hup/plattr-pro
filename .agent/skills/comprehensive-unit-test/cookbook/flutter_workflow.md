# Flutter Server App Contract Tests

## When to use
- Changes to backend APIs consumed by the server app
- Changes to parsing logic or models in server app

## Steps
1. **Confirm emulator status**
   - Run: `.agent/skills/comprehensive-unit-test/tools/check_emulator.sh`
   - Success signal: HTTP `200`
   - Failure signals:
     - `000` → emulator down
     - `404` → functions failed to load

2. **Reset mock data (recommended)**
   - Configure import script in `backend/src-plattr/contract-tests/contract_test_config.sh` (`MOCK_IMPORT_SCRIPT`).
   - Run: `.agent/skills/comprehensive-unit-test/tools/import_mock_data.sh`

3. **Run Flutter contract tests (sequential)**
   - Run: `.agent/skills/comprehensive-unit-test/tools/run_flutter_contract_tests.sh`

## Failure analysis (pattern matching)
- `DioException [bad response]` → inspect error payload; confirm error parsing in `lib/network/dio_client.dart`.
- Parsing errors → check model fields vs. API response shape.
- If only one test fails after a state change, re-import mock data and rerun.
