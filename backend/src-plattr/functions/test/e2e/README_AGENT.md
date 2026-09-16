# E2E API Test Suite — Agent Instructions

## Before anything: claim an emulator slot

Other agents are testing on this machine right now. Each gets its own emulator, so a busy port
is never a reason to stop. Find a free slot and take it:

```bash
cd ../../..                              # backend/src-plattr
./emu.sh                                 # background shell; takes the first free slot and prints it
eval "$(EMU_SLOT=3 ./emu.sh env)"        # THIS shell, with the slot it printed, before run-tests.sh
```

`./emu.sh` picks a free slot on its own. There are four (0-3); if all are busy it refuses rather
than landing on slot 0 and wiping someone's data. `env` will not guess a slot for you.

Slot N = firestore `8080+N*100`, functions `5002+N*100`. Separate databases, so nobody's seed data
can wipe yours. `run-tests.sh` reads `PLATTR_BASE_URL` from that `eval`, so skipping it silently
tests slot 0 — somebody else's data.

8080 and 5002 busy means *slot 0* is busy, nothing more. Do not report the emulator as blocked
without running the loop above.

## Quick Start

```bash
bash run-tests.sh                         # run all (summary-only output)
bash run-tests.sh --suite cart            # run single suite
bash run-tests.sh --suite cart pricing    # run multiple suites
bash run-tests.sh --verbose               # full output (for debugging)
bash run-tests.sh --no-reset              # skip data reset (fast iteration)
```

## Reading Results

1. Check exit code: `0` = all passed, `1` = failures exist
2. Read `results/summary.json` — look at `failedTests` array only
3. DO NOT read full test output or `results/narrative.log` — those are for human observation

```bash
# Quick check
cat results/last_run.txt

# If failures, read only the failed tests
node -e "const s=require('./results/summary.json'); console.log(s.failedTests)"
```

## Debugging a Failure

1. Read the failure output — it shows `[suite] test name → expected vs actual`
2. Re-run the failing suite with verbose output:
   ```bash
   node run.js --suite <failing_suite> --verbose --no-reset
   ```
3. Check `BUGS.md` for known backend bugs (failures with "KNOWN BUG" or "SKIP" are documented issues)
4. DO NOT dump full emulator logs. If needed: `tail -20 /tmp/plattr-emulator.log`

## Available Suites

| Name | Tests | What it covers |
|------|-------|----------------|
| **admin** | 16 | Settings, staff CRUD, tables, categories, orders |
| **cart** | 16 | Add/remove/get/clear/checkout, variants, addons |
| **coverage** | 11 | Orphaned endpoints no other suite hits: customer profile/visit (auth-gated), `menu-fetchMenu-fetchMenu`, `table-updateTableStatus`, `server-getOrderDetails`, `server-markItemServed` |
| **customer-journey** | 13 | Full flow: OTP → menu → cart → checkout → multi-cart |
| **error-cases** | 25 | Missing params, invalid IDs, auth failures, cross-restaurant |
| **feature-flags** | 7 | Toggle flags, verify behavior changes |
| **menu** | 10 | Fetch menu, structure, stock status, empty/OOS restaurants |
| **offer-pricing** | 13 | Offer × pricing interactions: BOGO, PERCENTAGE, FLAT, caps |
| **offers** | 16 | Offer lifecycle: get/apply/remove, conditions, recalculation |
| **order-lifecycle** | 18 | State machine: PENDING → COMPLETED, CANCELLED, cart-level status |
| **pricing** | 23 | Exact price verification: discounts, variants, addons, multi-item |
| **server-journey** | 8 | Server login, tables, orders, mark served |
| **table** | 20 | Scan, OTP, session resume, disabled table, assignment |

## Suite Isolation

Each suite uses dedicated tables to avoid interference:

| Table | Suite |
|-------|-------|
| `table_clean_1` | customer-journey, order-lifecycle |
| `table_clean_2` | cart |
| `table_clean_3` | pricing |
| `table_clean_4` | error-cases (DISABLED table) |
| `table_clean_5` | offer-pricing |
| `table_clean_6` | order-lifecycle (cancel flow) |
| `table_clean_7` | customer-journey (expanded) |
| `table_clean_8` | coverage (checkout → server order detail / mark served) |
| `table_clean_9` | waiter-confirmation (guest order held back from the kitchen) |

## Auth-gated endpoints (coverage suite)

The customer profile/visit endpoints (`customer-getOrCreateCustomerProfile`,
`updateCustomerVisit`, `endCustomerVisit`) are `onCall` functions bound to
`context.auth`. To exercise the full authed path against the emulator, start it
with token verification skipped — `npm run emulators` now sets
`FIREBASE_DEBUG_MODE=true` and `FIREBASE_DEBUG_FEATURES='{"skipTokenVerification":true}'`,
so an unsigned bearer token (sub = phone number) authenticates. If the emulator
is started WITHOUT those flags, the coverage suite auto-detects enforcement and
asserts the auth GATE instead (each endpoint must reject with `UNAUTHENTICATED`,
proving it exists and is wired), so the suite is green either way.

## Cross-app consistency layer (goalline.mjs)

`goalline.mjs` no longer verifies only the consumer read path. After each golden
checkout it re-reads the same order through every app's lens and asserts the
**same golden offer-adjusted total**:
- Kitchen — `order-getActiveCartsForKitchen`
- Server list — `order-getActiveOrdersForRestaurant`
- Server detail — `server-getOrderDetails`

Layer-2b property: if the consumer order matched golden but an app view
disagrees, the bug is provably in that app's read/sanitize path, not pricing.
Staff sessions use MockData7 easy-auth (`kitchen@<slug>.test` / `server@<slug>.test`,
password `1234`). Full run: **79 assertions** (was 46).

> Re-running goalline without re-importing MockData7 produces false failures:
> repeated checkouts on the same session are grouped into ONE multi-cart order,
> so totals accumulate. Always `--clean` re-import before a fresh run.

## Known Issues

See `BUGS.md` for full details. Key blockers:
- **BUG-1**: Firestore transaction ordering blocks checkout → affects order-lifecycle, customer-journey
- **BUG-2**: Admin endpoint dash-naming fails in emulator
- **BUG-3**: server-getTables param validation issue
- **Design gap**: no API sets item-level `READY`; kitchen's `cart-updateCartStatus`
  updates cart status only and does not cascade to items, yet `server-markItemServed`
  requires items to be `READY` first. The coverage suite documents this by asserting
  the `PENDING→SERVED` rejection, then seeding `READY` via a Firestore test seam.

## Architecture

```
run-tests.sh          ← Wrapper: check emulator, run, report
run.js                ← Entry: reset data, discover suites, run, summarize
lib/
  config.js           ← All constants (IDs, prices, offers)
  api.js              ← fetch wrapper for Cloud Functions
  assert.js           ← assertSuccess, assertError, assertField, assertPrice, etc.
  auth.js             ← customerLogin(), serverLogin()
  data.js             ← resetData(), setFeatureFlags(), checkEmulator()
  narrator.js         ← Narrative log writer (results/narrative.log)
suites/
  *.js                ← Each exports default async → { name, pass, fail, tests }
results/
  summary.json        ← Structured results with failedTests array
  last_run.txt        ← One-line status
  narrative.log       ← Human-readable narrative (tail -f in separate terminal)
```

## Human Observation

While tests run, tail the narrative log in a separate terminal:
```bash
tail -f results/narrative.log
```

This shows a business-logic-focused story: what items were added, with what configurations, what prices were expected, what offers were applied, what order status transitions happened.

## Adding a New Test

1. Find the appropriate suite in `suites/`
2. Add an async block:
```js
{
  const resp = await call('endpoint-name', { restaurantId, ... });
  record(assertSuccess(resp, 'N. Description'));
  narrator.cartAdd('Item Name', { variant: 'Large', addon: 'Cheese' }, 245);
}
```
3. Add expected prices to `lib/config.js` `EXPECTED_PRICES`
4. Add narrator calls for the narrative log

## Lifecycle matrix + findings log (start here for pre-launch work)

The suites documented above each drive one actor down one path. For the
multi-actor, concurrency and pricing-under-state-change questions, use the
matrix instead:

```bash
bash test/run-all.sh          # all 6 layers, one issue log
bash test/run-all.sh --quick  # one restaurant, no flag sweep
```

Then **read `results/FINDINGS.md`** rather than the console output. Every layer
(jest pricing matrix, verifyGolden, goalline, lifecycle matrix, contract checker,
Flutter parse tests) appends to that one deduped, severity-sorted file.

See `matrix/README.md` for how to add a scenario and what each `status` means.

> Note on the historic 12 Chowman goal-line failures: they were fixture rot, not
> a product bug. The seed baked absolute ISO dates into offer validity, so a
> "starts in the future" negative-case offer became current with the passage of
> time and legitimately won. `run-all.sh` rebuilds the seed before every run,
> which is why goalline is now 79/79.
