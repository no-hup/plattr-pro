# Backend Verification Workflow

## When to use
- Backend API changes (request/response shape or business logic)
- DB schema changes that affect API payloads

## Steps
1. **Confirm emulator status**
   - Run: `.agent/skills/comprehensive-unit-test/tools/check_emulator.sh`
   - Success signal: HTTP `200`
   - Failure signals:
     - `000` → emulator down
     - `404` → functions failed to load

2. **Start emulator if needed**
   - Run: `.agent/skills/comprehensive-unit-test/tools/start_emulator.sh`
   - Success signal: “Emulator started” + HTTP `200` on check
   - Failure signal: log contains `Failed to load function definition` or syntax errors
   - Inspect logs: `.agent/skills/comprehensive-unit-test/tools/tail_emulator_logs.sh`

3. **Reset mock data (mandatory before flow tests)**
   - Configure import script in `backend/src-plattr/contract-tests/contract_test_config.sh` (`MOCK_IMPORT_SCRIPT`).
   - Run: `.agent/skills/comprehensive-unit-test/tools/import_mock_data.sh`

4. **Run curl flow**
   - Run: `.agent/skills/comprehensive-unit-test/tools/run_backend_flow.sh`

## Failure analysis (pattern matching)
- If checkout fails with `Firestore transactions require all reads to be executed before all writes`, inspect `orders/createOrUpdateOrder.js` transaction ordering.
- If responses show `NOT_FOUND`, confirm mock data IDs in `constants.yaml` and `backend/src-plattr/contract-tests/contract_test_config.sh`.
- If `validateOTP` fails, confirm OTP and table status in mock data.

## Mock data changes
- Only update `backend/src-plattr/functions/mock/mockDataV3.json` when schema changes require it.
- Preserve IDs in `constants.yaml`.
- Keep data minimal; no extra categories/items unless tests require them.
