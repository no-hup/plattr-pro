#!/usr/bin/env node
/**
 * run-matrix.mjs — the live combinatorial lifecycle runner (Layer B).
 *
 * Drives real customers, waiters and kitchen staff through adversarial ordering
 * situations against the Firebase emulator, checks the money and the state
 * machine after every move, and writes anything suspicious to the shared
 * findings log.
 *
 * Usage:
 *   node run-matrix.mjs                          # every scenario, every restaurant
 *   node run-matrix.mjs --restaurant res_salt    # one restaurant
 *   node run-matrix.mjs --scenario concurrent    # substring match on scenario id
 *   node run-matrix.mjs --flags all              # also sweep the 4 global feature flags
 *   node run-matrix.mjs --no-seed                # skip the initial reseed (faster iteration)
 *   node run-matrix.mjs --verbose
 *
 * Preconditions: emulator up, MockData7 importable. The runner reseeds itself,
 * so it never inherits state from a previous run or from goalline.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

import { checkEmulator, setFeatureFlags, resetFeatureFlags } from '../lib/data.js';
import { Kitchen, Waiter, SLUG, writeFixtures, fixtureStats } from './actors.mjs';
import { SCENARIOS } from './scenarios.mjs';

const require = createRequire(import.meta.url);
const F = require('../../findings.cjs');
const staticFindings = require('./static-findings.cjs');

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_DIR = resolve(__dirname, '../../..');
const RESULTS_DIR = resolve(__dirname, '../results');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => (args.indexOf(`--${name}`) >= 0 ? args[args.indexOf(`--${name}`) + 1] : null);

const VERBOSE = flag('verbose');
const ONLY_RESTAURANT = value('restaurant');
const ONLY_SCENARIO = value('scenario');
const SWEEP_FLAGS = value('flags') === 'all';
const NO_SEED = flag('no-seed');

const ALL_RESTAURANTS = ['res_meghana', 'res_pizzabakery', 'res_truffles', 'res_salt', 'res_chowman'];

/**
 * Read the free tables straight out of the seed rather than assuming a range.
 * The restaurants do not all have the same number of tables, and a scenario
 * that "fails to join" because the harness invented a table id is a false
 * finding, which is worse than no finding at all.
 */
const SEED_PATH = resolve(FUNCTIONS_DIR, 'mock/MockData7ProductionMenus.json');
function vacantTablesOf(restaurantId) {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const tables = seed.restaurants?.[restaurantId]?.tables || {};
  return Object.entries(tables)
    .filter(([, t]) => t.status === 'vacant')
    .map(([id]) => id)
    .sort();
}

// ── Seeding ─────────────────────────────────────────────────────────────────
/**
 * The seed bakes wall-clock dates into offer validity as ISO strings, and the
 * importer's --refresh-timestamps only rewrites {_seconds,_nanoseconds}. So a
 * seed built weeks ago has "future" negative-case offers that have since become
 * current. Rebuilding before seeding makes that class of rot impossible.
 */
function reseed({ rebuild = true } = {}) {
  if (rebuild) {
    execSync('node mock/buildMockData7.js', { cwd: FUNCTIONS_DIR, stdio: 'pipe', timeout: 60000 });
  }
  execSync(
    'node mock/importMockData5.js --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps',
    { cwd: FUNCTIONS_DIR, stdio: 'pipe', timeout: 60000, env: { ...process.env, FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080' } },
  );
}

// ── Result recording ────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
let currentScenario = '-';
let currentRestaurant = '-';

function record(okFlag, label, detail) {
  if (okFlag) {
    pass++;
    if (VERBOSE) console.log(`    ok   ${label}`);
  } else {
    fail++;
    const line = `[${currentRestaurant}/${currentScenario}] ${label}${detail ? ` — ${detail}` : ''}`;
    failures.push(line);
    console.log(`    FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
  return okFlag;
}

function finding(f) {
  F.report({
    ...f,
    scenario: `${currentRestaurant}/${currentScenario}`,
    status: 'confirmed',
    repro: f.repro || `node test/e2e/matrix/run-matrix.mjs --restaurant ${currentRestaurant} --scenario ${currentScenario}`,
  });
}

// ── Runner ──────────────────────────────────────────────────────────────────
async function runRestaurant(restaurantId, scenarios, flagLabel) {
  currentRestaurant = restaurantId + (flagLabel ? ` ${flagLabel}` : '');
  console.log(`\n── ${currentRestaurant} ──`);

  let pool = [];
  const allVacant = vacantTablesOf(restaurantId);
  const refillPool = () => { pool = [...allVacant]; };
  if (!allVacant.length) { record(false, `${restaurantId} has no vacant tables in the seed`); return; }

  // Staff sessions are re-minted after every reseed, so keep them in a closure.
  let kitchen, waiter, waiter2;
  const loginStaff = async () => {
    kitchen = new Kitchen(restaurantId);
    waiter = new Waiter(restaurantId);
    waiter2 = new Waiter(restaurantId, '2');
    await kitchen.login();
    await waiter.login();
    await waiter2.login();
  };

  const freshSeed = async () => {
    reseed({ rebuild: false });
    if (flagLabel) await setFeatureFlags(currentFlags);
    refillPool();
    await loginStaff();
  };

  try {
    await freshSeed();
  } catch (err) {
    record(false, 'staff login / seed', err.message);
    return;
  }

  for (const sc of scenarios) {
    currentScenario = sc.id;
    // Guarantee the scenario has the tables it declared before it starts, so it
    // never half-runs and reports a misleading failure.
    if (pool.length < sc.tables) {
      if (VERBOSE) console.log(`  (reseeding: ${sc.id} needs ${sc.tables} tables, ${pool.length} left)`);
      try { await freshSeed(); } catch (err) { record(false, `${sc.id} reseed`, err.message); continue; }
    }
    console.log(`  · ${sc.id}`);
    const ctx = {
      restaurantId, kitchen, waiter, waiter2, record, finding,
      freshTable: () => pool.shift() || null,
    };
    try {
      await sc.run(ctx);
    } catch (err) {
      record(false, `${sc.id} threw`, err.message);
      finding({
        title: `Scenario ${sc.id} crashed the run`,
        severity: 'HIGH', area: 'lifecycle',
        detail: `The scenario threw instead of completing: ${err.message}. An unhandled throw usually means a response had a shape no caller expects.`,
        actual: err.stack?.split('\n').slice(0, 3).join(' | '),
      });
    }
  }
}

let currentFlags = null;

async function main() {
  console.log('Plattr Pro — live lifecycle matrix');

  // Each full run starts from a clean issue log, re-seeded with the findings the
  // code audit produced. Anything a scenario reproduces is then upgraded from
  // "unconfirmed" to "confirmed" by the dedupe, so the report distinguishes what
  // was merely read from what was actually observed.
  if (!flag('keep-findings')) {
    F.reset();
    staticFindings.seed();
  }

  if (!(await checkEmulator())) {
    console.error(`Emulator not reachable at ${process.env.PLATTR_BASE_URL || 'http://127.0.0.1:5002'}. Start it first (backend/src-plattr/emu.sh).`);
    process.exit(2);
  }

  if (!NO_SEED) {
    console.log('Rebuilding and importing MockData7 (defeats date rot in the fixture)...');
    reseed({ rebuild: true });
  }

  const restaurants = ONLY_RESTAURANT ? [ONLY_RESTAURANT] : ALL_RESTAURANTS;
  const scenarios = ONLY_SCENARIO ? SCENARIOS.filter(s => s.id.includes(ONLY_SCENARIO)) : SCENARIOS;
  if (!scenarios.length) {
    console.error(`No scenario matched "${ONLY_SCENARIO}". Available: ${SCENARIOS.map(s => s.id).join(', ')}`);
    process.exit(2);
  }

  await resetFeatureFlags();
  for (const r of restaurants) await runRestaurant(r, scenarios, null);

  // Feature-flag sweep: the flags are global, so each combination needs its own
  // pass. Only the flow-changing scenarios are worth repeating per combination.
  if (SWEEP_FLAGS) {
    const FLAG_SETS = [
      { isOtpManadatoryAtScan: false },
      { isUsernameEnabled: false },
      { isMultiUserSupportEnabled: true },
      { sendServerNotifications: true },
    ];
    const flagScenarios = scenarios.filter(s =>
      ['single-user-lifecycle', 'multi-user-table', 'cross-app-agreement'].includes(s.id));
    for (const flags of FLAG_SETS) {
      currentFlags = flags;
      const label = `[${Object.entries(flags).map(([k, v]) => `${k}=${v}`).join(',')}]`;
      await runRestaurant(restaurants[0], flagScenarios, label);
    }
    currentFlags = null;
    await resetFeatureFlags();
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const fixtureCount = writeFixtures();
  const findings = F.render();

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(resolve(RESULTS_DIR, 'matrix-summary.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPass: pass, totalFail: fail,
    status: fail === 0 ? 'PASSED' : 'FAILED',
    restaurants, scenarios: scenarios.map(s => s.id),
    failures,
    findings: findings.length,
    fixtures: fixtureStats(),
  }, null, 2));

  const bySeverity = findings.reduce((m, f) => { m[f.severity] = (m[f.severity] || 0) + 1; return m; }, {});
  console.log(`\n${'='.repeat(70)}`);
  console.log(`LIFECYCLE MATRIX — ${pass + fail} assertions, ${pass} pass, ${fail} fail`);
  console.log(`Fixtures captured: ${fixtureCount} across ${fixtureStats().length} endpoints`);
  console.log(`Findings: ${findings.length} (${Object.entries(bySeverity).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'})`);
  console.log(`  -> test/e2e/results/FINDINGS.md`);
  console.log('='.repeat(70));
  if (fail) {
    console.log('\nFailed assertions:');
    failures.forEach(f => console.log(`  ${f}`));
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(err => { console.error('matrix runner fatal:', err); process.exit(3); });
