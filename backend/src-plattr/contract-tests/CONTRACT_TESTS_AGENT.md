# Backend Contract Tests (Agent Instructions)

Purpose: Run backend-only contract tests against the Firebase emulator using curl-based flows and real mock data.

Current flow test:
- Customer login (table OTP) → add item → checkout → server login → get active orders → validate price
- Script: `run_customer_server_order_flow.sh`

Prereqs
1. Emulator running
   - Command:
     `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants`
   - Expect: `200`

2. Start emulator if needed
   - Command:
     `cd backend/src-plattr`
     `npm run emulators`
   - If ports are in use:
     `npm run preflight-ports`
     `npm run emulators`
   - Keep the emulator running while tests execute.

3. Import mock data (v3)
   - Command:
     `cd backend/src-plattr/functions`
     `node mock/importMockDataV3.js`

Run the test
- Command:
  `cd backend/src-plattr/contract-tests`
  `bash run_customer_server_order_flow.sh`

Config (single place)
- Edit `backend/src-plattr/contract-tests/contract_test_config.sh` to change the base URL and test fixtures.

What this test expects from mock data (defaults)
- Restaurant: `res_server-consumer_order_flow`
- Table + OTP for customer login: `table003` + `654321`
- Customer: `1234567890` (name: `John Customer`)
- Menu item: `item_pancakes` (expected order price = `80`)
- Server login: `alex@daynightkitchen.com` / `1234`

Reporting
- Logs are printed to stdout. If the script fails, include the full output and any emulator logs.
