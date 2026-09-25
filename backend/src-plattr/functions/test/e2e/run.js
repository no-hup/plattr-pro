#!/usr/bin/env node

/**
 * E2E Test Runner for Plattr Pro.
 *
 * Usage:
 *   node run.js                    # run all suites (summary-only output)
 *   node run.js --verbose          # run all suites (print every test result)
 *   node run.js --suite cart       # run a single suite
 *   node run.js --suite cart pricing  # run multiple suites
 *   node run.js --no-reset         # skip data reset (fast iteration)
 */

import { readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import { checkEmulator, resetData, resetFeatureFlags } from './lib/data.js';
import config from './lib/config.js';
import { narrator } from './lib/narrator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITES_DIR = resolve(__dirname, 'suites');
const RESULTS_DIR = resolve(__dirname, 'results');

// ── Parse args ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const noReset = args.includes('--no-reset');
const verbose = args.includes('--verbose');
const suiteIdx = args.indexOf('--suite');
const requestedSuites = suiteIdx >= 0 ? args.slice(suiteIdx + 1).filter(a => !a.startsWith('--')) : [];

// ── Discover suites ──────────────────────────────────────────────
async function discoverSuites() {
  const files = await readdir(SUITES_DIR);
  return files
    .filter(f => f.endsWith('.js'))
    .sort()
    .map(f => ({
      file: f,
      name: f.replace('.js', ''),
    }));
}

function matchSuites(available, requested) {
  if (requested.length === 0) return available;
  return available.filter(s =>
    requested.some(r => s.name === r || s.name.includes(r) || s.file.includes(r))
  );
}

// ── Run a single suite ───────────────────────────────────────────
async function runSuite(suite) {
  const modulePath = resolve(SUITES_DIR, suite.file);
  const mod = await import(modulePath);
  const fn = mod.default || mod.run;
  if (typeof fn !== 'function') {
    return { name: suite.name, pass: 0, fail: 1, tests: [{ name: 'module', pass: false, message: 'No default export function' }] };
  }
  return fn();
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Plattr Pro E2E API Test Suite          ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Check emulator
  const alive = await checkEmulator();
  if (!alive) {
    console.error(`[runner] ERROR: Firebase emulator not reachable at ${config.BASE_URL}`);
    console.error('[runner] Start it with: cd backend/src-plattr && ./emu.sh  (see AGENT_TESTING_STARTUP_GUIDELINE.md)');
    process.exit(1);
  }
  console.log('[runner] Emulator: OK\n');

  // 2. Reset data
  if (!noReset) {
    await resetData();
    await resetFeatureFlags();
    console.log('[runner] Data reset: OK\n');
  } else {
    console.log('[runner] Skipping data reset (--no-reset)\n');
  }

  // 3. Discover and filter suites
  const allSuites = await discoverSuites();
  const suites = matchSuites(allSuites, requestedSuites);
  if (suites.length === 0) {
    console.error(`[runner] No suites matched: ${requestedSuites.join(', ')}`);
    console.error(`[runner] Available: ${allSuites.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`[runner] Running ${suites.length} suite(s): ${suites.map(s => s.name).join(', ')}\n`);

  // 4. Initialize narrative log
  narrator.init();

  // 5. Run suites
  const results = [];
  const failedTests = [];
  const knownBugs = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const suite of suites) {
    if (verbose) {
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  SUITE: ${suite.name}`);
      console.log(`${'═'.repeat(50)}\n`);
    }

    try {
      const result = await runSuite(suite);
      // Known bug (TESTING.md): a test carrying `knownBug: 'QB-2'` is expected to fail today. Its failure is
      // listed and counted as known, not failed; the day it passes it becomes a failure, so the mark is removed.
      for (const t of result.tests || []) {
        if (!t.knownBug) continue;
        if (t.known) {
          console.log(`  ⚠ [${suite.name}] ${t.message}`);
          if (t.actual) console.log(`    Response: ${JSON.stringify(t.actual).substring(0, 200)}`);
        } else if (t.pass) { t.pass = false; result.pass--; result.fail++; t.message = `${t.knownBug} now passes, remove its knownBug mark: ${t.message}`; }
        else { t.known = true; result.fail--; result.known = (result.known || 0) + 1; knownBugs.push(`${suite.name}: ${t.message}`); }
      }
      results.push(result);
      totalPass += result.pass;
      totalFail += result.fail;

      // Print individual test results
      for (const t of result.tests || []) {
        if (t.known) {
          console.log(`  ⚠ [${suite.name}] ${t.message}`);
          if (t.actual) console.log(`    Response: ${JSON.stringify(t.actual).substring(0, 200)}`);
        } else if (t.pass) {
          // Only print passes in verbose mode
          if (verbose) console.log(`  ✓ ${t.message}`);
        } else {
          // Always print failures with context
          console.log(`  ✗ [${suite.name}] ${t.message}`);
          if (t.actual) {
            console.log(`    Response: ${JSON.stringify(t.actual).substring(0, 200)}`);
          }
          failedTests.push({
            suite: suite.name,
            testName: t.message,
            responseSnippet: t.actual ? JSON.stringify(t.actual).substring(0, 200) : null,
          });
        }
      }
      if (verbose) console.log(`\n  ${suite.name}: ${result.pass} pass, ${result.fail} fail`);
    } catch (err) {
      console.error(`  ✗ [${suite.name}] SUITE ERROR: ${err.message}`);
      results.push({ name: suite.name, pass: 0, fail: 1, tests: [{ name: 'suite', pass: false, message: err.message }] });
      totalFail++;
      failedTests.push({ suite: suite.name, testName: 'SUITE ERROR', responseSnippet: err.message });
    }
  }

  // 6. Summary
  console.log(`\n${'═'.repeat(50)}`);
  console.log('  SUMMARY');
  console.log(`${'═'.repeat(50)}`);
  for (const r of results) {
    const status = r.fail === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${status.padEnd(5)} ${r.name}: ${r.pass} pass, ${r.fail} fail${r.known ? `, ${r.known} known bug` : ''}`);
  }
  console.log(`${'─'.repeat(50)}`);
  console.log(`  TOTAL: ${totalPass} pass, ${totalFail} fail, ${knownBugs.length} known bug`);
  for (const k of knownBugs) console.log(`  KNOWN ${k}`);
  console.log(`  STATUS: ${totalFail === 0 ? 'ALL PASSED' : 'FAILED'}`);
  console.log(`${'═'.repeat(50)}\n`);

  // 7. Write results file
  await mkdir(RESULTS_DIR, { recursive: true });
  const summary = {
    timestamp: new Date().toISOString(),
    totalPass,
    totalFail,
    status: totalFail === 0 ? 'PASSED' : 'FAILED',
    suites: results.map(r => ({ name: r.name, pass: r.pass, fail: r.fail })),
    failedTests,
    knownBugs,
  };
  await writeFile(resolve(RESULTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  await writeFile(resolve(RESULTS_DIR, 'last_run.txt'), `${summary.status} | ${totalPass} pass, ${totalFail} fail | ${summary.timestamp}`);

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[runner] Fatal error:', err);
  process.exit(1);
});
