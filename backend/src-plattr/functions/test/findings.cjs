/**
 * findings.cjs — the single issue log for every testing layer.
 *
 * CommonJS on purpose: Jest (CJS) and the matrix runner (ESM, via createRequire)
 * both append to ONE JSONL, so there is one issue list regardless of which layer
 * found the problem. Dedupe + render happen at the end, not at append time.
 *
 * Usage (CJS):   const F = require('../findings.cjs'); F.report({...});
 * Usage (ESM):   const F = createRequire(import.meta.url)('../../findings.cjs');
 *
 * Severity: CRITICAL (money wrong / data loss) | HIGH (flow broken) |
 *           MEDIUM (wrong behaviour, workaround exists) | LOW (cosmetic) |
 *           INFO (architecture note, no action this release)
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RESULTS_DIR = path.resolve(__dirname, 'e2e/results');
const JSONL = path.join(RESULTS_DIR, 'findings.jsonl');

const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

function ensureDir() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/** Stable identity for a finding, so repeated runs don't multiply entries. */
function keyOf(f) {
  return [f.area || '-', f.endpoint || '-', f.title || f.message || '-'].join('::');
}

/**
 * Append one finding. Never throws — a broken logger must not fail a test run.
 * @param {Object} f
 * @param {string} f.title      short, stable label (used for dedupe)
 * @param {string} f.severity   CRITICAL|HIGH|MEDIUM|LOW|INFO
 * @param {string} f.area       pricing|offers|lifecycle|concurrency|contract|config|frontend
 * @param {string} [f.endpoint] cloud function name, if any
 * @param {string} [f.file]     source file:line the problem lives in
 * @param {string} [f.detail]   what went wrong, in one or two sentences
 * @param {*}      [f.expected]
 * @param {*}      [f.actual]
 * @param {string} [f.scenario] scenario id that reproduced it
 * @param {string} [f.repro]    exact command to reproduce
 * @param {string} [f.status]   confirmed|unconfirmed|known
 */
function report(f) {
  try {
    ensureDir();
    const rec = {
      key: keyOf(f),
      title: f.title || f.message || 'untitled',
      severity: f.severity || 'MEDIUM',
      area: f.area || 'unknown',
      endpoint: f.endpoint || null,
      file: f.file || null,
      detail: f.detail || null,
      expected: f.expected === undefined ? null : f.expected,
      actual: f.actual === undefined ? null : f.actual,
      scenario: f.scenario || null,
      repro: f.repro || null,
      status: f.status || 'confirmed',
      at: new Date().toISOString(),
    };
    fs.appendFileSync(JSONL, JSON.stringify(rec) + '\n');
    return rec;
  } catch (err) {
    console.error('[findings] append failed:', err.message);
    return null;
  }
}

/** Wipe the log. Call once at the start of a full run. */
function reset() {
  ensureDir();
  try { fs.unlinkSync(JSONL); } catch { /* not there yet */ }
}

/** Read every appended record. */
function readAll() {
  try {
    return fs.readFileSync(JSONL, 'utf8')
      .split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Dedupe by key. A later CONFIRMED beats an earlier UNCONFIRMED, and the
 * occurrence count is kept so a flaky-but-real issue is visible as such.
 */
function dedupe(records) {
  const byKey = new Map();
  for (const r of records) {
    const prev = byKey.get(r.key);
    if (!prev) {
      byKey.set(r.key, { ...r, count: 1 });
      continue;
    }
    prev.count += 1;
    // A live reproduction upgrades a statically-guessed finding.
    if (prev.status !== 'confirmed' && r.status === 'confirmed') {
      Object.assign(prev, r, { count: prev.count });
    }
    if (SEVERITY_RANK[r.severity] < SEVERITY_RANK[prev.severity]) {
      prev.severity = r.severity;
    }
  }
  return [...byKey.values()].sort((a, b) =>
    (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
    a.area.localeCompare(b.area) || a.title.localeCompare(b.title)
  );
}

function mdEscape(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function fmtValue(v) {
  if (v === null || v === undefined) return '';
  return typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : String(v).slice(0, 160);
}

/** Write findings.json + FINDINGS.md. Returns the deduped list. */
function render() {
  ensureDir();
  const list = dedupe(readAll());
  fs.writeFileSync(path.join(RESULTS_DIR, 'findings.json'), JSON.stringify(list, null, 2));

  const counts = list.reduce((m, f) => { m[f.severity] = (m[f.severity] || 0) + 1; return m; }, {});
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  const lines = [];
  lines.push('# Findings — Plattr Pro pre-launch test run');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString()} · ${list.length} distinct findings`);
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|---|---:|');
  for (const s of order) if (counts[s]) lines.push(`| ${s} | ${counts[s]} |`);
  lines.push('');
  lines.push('`status: confirmed` = reproduced by a live test. `unconfirmed` = found by reading the code, not yet exercised. `known` = already documented in BUGS.md.');
  lines.push('');

  for (const s of order) {
    const group = list.filter(f => f.severity === s);
    if (!group.length) continue;
    lines.push(`## ${s}`);
    lines.push('');
    for (const f of group) {
      lines.push(`### ${f.title}`);
      lines.push('');
      lines.push(`- **area** ${f.area}${f.endpoint ? ` · **endpoint** \`${f.endpoint}\`` : ''}`);
      if (f.file) lines.push(`- **source** \`${f.file}\``);
      lines.push(`- **status** ${f.status}${f.count > 1 ? ` · seen ${f.count}×` : ''}`);
      if (f.scenario) lines.push(`- **scenario** \`${f.scenario}\``);
      if (f.detail) lines.push(`- **detail** ${f.detail}`);
      if (f.expected !== null || f.actual !== null) {
        lines.push(`- **expected** \`${fmtValue(f.expected)}\` · **actual** \`${fmtValue(f.actual)}\``);
      }
      if (f.repro) lines.push(`- **repro** \`${f.repro}\``);
      lines.push('');
    }
  }

  fs.writeFileSync(path.join(RESULTS_DIR, 'FINDINGS.md'), lines.join('\n'));
  return list;
}

module.exports = { report, reset, readAll, render, dedupe, JSONL, RESULTS_DIR };
