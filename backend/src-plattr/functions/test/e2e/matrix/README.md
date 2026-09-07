# Lifecycle matrix — how to use it

The matrix answers one question: **when several customers, waiters and the
kitchen act on the same table at once, does the money stay right and does the
order end up in a legal state?** The 13 older suites each drive one actor down
one happy path; this drives all of them at each other on purpose.

## Run it

```bash
# everything: 6 layers, one command, one issue log
bash test/run-all.sh
bash test/run-all.sh --quick          # one restaurant, no feature-flag sweep

# just the matrix
cd test/e2e
node matrix/run-matrix.mjs                        # all 5 restaurants
node matrix/run-matrix.mjs --restaurant res_salt
node matrix/run-matrix.mjs --scenario concurrent  # substring match
node matrix/run-matrix.mjs --flags all            # + sweep the 4 global flags
node matrix/run-matrix.mjs --verbose
```

The runner reseeds itself, so it never inherits state from a previous run or
from `goalline.mjs`. It needs the emulator on `127.0.0.1:5002`.

## Read the results

**Read `test/e2e/results/FINDINGS.md`, not the console.** Every layer writes
into that one file, deduped and sorted by severity. `results/matrix-summary.json`
has the raw pass/fail if you want to script against it.

Each finding carries a `status`:

| status | meaning |
|---|---|
| `confirmed` | a live test reproduced it |
| `unconfirmed` | found by reading the code; no scenario exercises it yet |
| `known` | already tracked in `BUGS.md` |

An `unconfirmed` finding that survives a full run is worth a look: either it is
unreachable through the public API, or nobody has written the scenario for it.

## Why the seed is rebuilt every run

`mock/buildMockData7.js` bakes wall-clock dates into offer validity as **ISO
strings**, and the importer's `--refresh-timestamps` only rewrites
`{_seconds,_nanoseconds}` objects. So a seed built weeks ago has "starts in the
future" negative-case offers that have quietly become current, and the golden
suite starts failing for reasons that have nothing to do with the code. This is
exactly what the 12 long-standing Chowman goal-line failures were. Rebuilding
before every run makes that class of rot impossible.

## Adding a scenario

Add a function to `scenarios.mjs` and register it in `SCENARIOS`:

```js
async function myScenario(ctx) {
  const c = new Customer(ctx.restaurantId);
  await c.join(ctx.freshTable());
  await c.addItem(menuOf(ctx.restaurantId).rich);
  const co = await c.checkout();
  ctx.record(ok(co), 'checkout succeeds', co?.message);   // normal assertion
  if (somethingIsWrong) ctx.finding({ ... });             // triaged issue
}

export const SCENARIOS = [
  ...,
  { id: 'my-scenario', tables: 1, run: myScenario },
];
```

- `tables:` is how many fresh tables the scenario needs. The runner reseeds
  before the scenario if the pool is short, so a scenario never half-runs and
  reports a misleading failure.
- `ctx.record()` moves the pass/fail bar. `ctx.finding()` writes to FINDINGS.md.
  Use both when a failure is a real defect: the bar shows it regressed, the
  finding explains it to whoever picks it up.
- Actors live in `actors.mjs` (`Customer`, `Waiter`, `Kitchen`). Add endpoints
  there, not inline, so every call is captured as a fixture.

## Where the pieces are

| File | Does |
|---|---|
| `run-matrix.mjs` | seeds, logs staff in, hands each scenario a table pool, reports |
| `scenarios.mjs` | the 11 situations; this is where you add coverage |
| `actors.mjs` | `Customer` / `Waiter` / `Kitchen` over `lib/api.js`, plus fixture capture |
| `static-findings.cjs` | issues found by reading the code, seeded each run as `unconfirmed` |
| `../../findings.cjs` | the shared issue log every layer appends to |
| `../contracts/check-contracts.mjs` | derives required fields from each app's `*.g.dart` and checks captured responses against them |

## Fixtures

Every response the actors receive is written to
`test/e2e/fixtures/golden/<endpoint>/<label>.json`. Those files are the input to
both the contract checker and the Flutter `test/contract` suites, so the app-side
checks assert against what the backend really returned today. Re-run the matrix
to refresh them.
