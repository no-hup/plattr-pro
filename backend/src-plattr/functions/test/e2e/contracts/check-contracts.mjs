#!/usr/bin/env node
/**
 * check-contracts.mjs — validate captured backend responses against what the
 * Flutter models actually require (Layer C, Node side).
 *
 * Two of the four apps cannot currently be built on this machine (see FINDINGS),
 * so `flutter test` alone would leave their parsing unverified. The contract a
 * Dart model imposes is fully described by its generated *.g.dart file: a cast
 * written `json['x'] as String` throws on a missing or null value, while
 * `as String?` tolerates it. This script derives those required fields straight
 * from the generated code, so the contract cannot drift from the models, then
 * checks every captured response against them.
 *
 * Run: node test/e2e/contracts/check-contracts.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const F = require('../../findings.cjs');

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '../../../../../..');
const FIXTURES = resolve(__dirname, '../fixtures/golden');

const APPS = {
  consumer: 'frontend/flutter_boilerplate/lib',
  waiter: 'frontend/src-platter-apps/apps/platter_server/lib',
  kitchen: 'frontend/src-platter-apps/apps/platter_kitchen/lib',
  core: 'frontend/src-platter-apps/modules/platter_core/lib',
};

// ── Derive each model's required fields from its generated parser ────────────
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    try {
      // Broken symlinks exist under some app lib trees; skip rather than abort.
      if (statSync(p).isDirectory()) walk(p, out);
      else if (entry.endsWith('.g.dart')) out.push(p);
    } catch { /* unreadable entry */ }
  }
  return out;
}

/**
 * Pull the generated `fromJson` bodies and record which keys are cast without a
 * `?`, i.e. which ones throw when absent.
 *
 * json_serializable emits TWO shapes and we must read both. The arrow form
 * `Class _$ClassFromJson(json) => Class(...)` is the common one; the block form
 * `Class _$ClassFromJson(json) { $checkKeys(...); return Class(...); }` is what
 * it emits once a model declares required/disallow-null keys — i.e. exactly the
 * STRICTEST models, the ones most likely to hard-crash on a field change.
 * Matching only the arrow form silently skipped all of platter_core's menu
 * models plus the waiter's TableModel, which is how `primaryCustomer` landed
 * with no contract coverage at all.
 */
function parseGenerated(file) {
  const src = readFileSync(file, 'utf8');
  const models = {};
  const fnRe = /(\w+)\s+_\$+(\w+)FromJson\(Map(?:<String, dynamic>)? json\)\s*(?:=>\s*\1\(|\{[\s\S]*?\breturn\s+\1\()([\s\S]*?)\n\s*\);/g;
  let m;
  while ((m = fnRe.exec(src))) {
    const className = m[1];
    const body = m[3];
    const required = [];
    const optional = [];
    // The type must be matched as a whole, generics included: a lazy
    // `[A-Za-z<>, ]+?` stops at the comma inside `Map<String, dynamic>`, reads
    // the type as `Map<String`, misses the trailing `?` and reports a nullable
    // field as required. That is how `primaryCustomer` came back as a violation.
    const fieldRe = /(\w+):\s*(?:\(\s*)?json\['([^']+)'\]\s*as\s+([A-Za-z_]\w*(?:<(?:[^<>]|<[^<>]*>)*>)?)(\?)?/g;
    let f;
    while ((f = fieldRe.exec(body))) {
      const [, , key, type, nullable] = f;
      (nullable ? optional : required).push({ key, type: type.trim() });
    }
    models[className] = { required, optional, file: file.replace(REPO + '/', '') };
  }
  return models;
}

const MODELS = {};
for (const [app, libDir] of Object.entries(APPS)) {
  for (const file of walk(resolve(REPO, libDir))) {
    for (const [cls, def] of Object.entries(parseGenerated(file))) {
      MODELS[`${app}.${cls}`] = def;
    }
  }
}

// ── Where each model is fed from in a real response ──────────────────────────
// path uses `[]` to mean "every element of this array".
const BINDINGS = [
  { endpoint: 'server-getOrderDetails', path: 'data', model: 'waiter.OrderDetailResponse' },
  { endpoint: 'server-getOrderDetails', path: 'data.items[]', model: 'waiter.OrderItemDetail' },
  { endpoint: 'server-getOrderDetails', path: 'data.items[].variants[]', model: 'waiter.VariantDetail' },
  { endpoint: 'server-getOrderDetails', path: 'data.items[].addons[]', model: 'waiter.AddonDetail' },
  { endpoint: 'order-getActiveOrdersForRestaurant', path: 'data.orders[]', model: 'waiter.OrderSummary' },
  { endpoint: 'order-getActiveOrdersForRestaurant', path: 'data.orders[].carts[]', model: 'waiter.CartSummary' },
  { endpoint: 'order-getActiveOrdersForRestaurant', path: 'data.orders[].carts[].items[]', model: 'waiter.CartItemSummary' },
  { endpoint: 'order-getActiveCartsForKitchen', path: 'data.orders[]', model: 'waiter.OrderSummary' },
  { endpoint: 'order-getServedCartsForServer', path: 'data.servedCarts[]', model: 'waiter.ServedCart' },
  // The waiter's home screen. TableModel is $checkKeys-guarded (number, id,
  // capacity, status are all required AND disallow null) while the backend
  // emits `capacity: tableData.capacity || null`, so this binding is the one
  // that catches a table doc without a capacity before it blanks the screen.
  { endpoint: 'server-getTables', path: 'data.tables[]', model: 'waiter.TableModel' },
];

function selectPath(root, path) {
  let nodes = [root];
  for (const seg of path.split('.')) {
    const isArray = seg.endsWith('[]');
    const key = isArray ? seg.slice(0, -2) : seg;
    const next = [];
    for (const n of nodes) {
      if (n == null || typeof n !== 'object') continue;
      const v = key ? n[key] : n;
      if (v == null) continue;
      if (isArray) { if (Array.isArray(v)) next.push(...v); }
      else next.push(v);
    }
    nodes = next;
  }
  return nodes;
}

const DART_TYPE_OK = {
  String: (v) => typeof v === 'string',
  num: (v) => typeof v === 'number',
  int: (v) => typeof v === 'number',
  double: (v) => typeof v === 'number',
  bool: (v) => typeof v === 'boolean',
};
function typeOk(type, v) {
  if (type.startsWith('List')) return Array.isArray(v);
  if (type.startsWith('Map')) return v !== null && typeof v === 'object' && !Array.isArray(v);
  const check = DART_TYPE_OK[type];
  return check ? check(v) : true;   // unknown/nested types are validated by their own binding
}

// ── Run ─────────────────────────────────────────────────────────────────────
let checked = 0, violations = 0;
const seen = new Set();
const coverage = [];   // per binding, so an unexercised model is visible, not silently green

for (const b of BINDINGS) {
  const model = MODELS[b.model];
  if (!model) {
    // Report it. A renamed or deleted model used to `continue` before the
    // coverage push, so it was neither a violation nor a gap — the binding
    // just quietly stopped checking anything.
    coverage.push({ ...b, nodes: 0, reason: 'no generated parser found for this model' });
    console.log(`  ?  no generated parser found for ${b.model} (skipped)`);
    continue;
  }
  const dir = resolve(FIXTURES, b.endpoint);
  if (!existsSync(dir)) { coverage.push({ ...b, nodes: 0, reason: 'no fixtures for this endpoint' }); continue; }
  let nodesForBinding = 0;

  for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const body = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    if (body.status !== 'success') continue;

    for (const node of selectPath(body, b.path)) {
      checked++; nodesForBinding++;
      for (const { key, type } of model.required) {
        const v = node[key];
        const missing = v === undefined || v === null;
        const wrongType = !missing && !typeOk(type, v);
        if (!missing && !wrongType) continue;

        violations++;
        const dedupeKey = `${b.model}.${key}.${missing ? 'missing' : 'type'}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        console.log(`  FAIL ${b.endpoint} ${b.path} -> ${b.model}.${key}: ${missing ? 'missing' : `expected ${type}, got ${typeof v}`}`);
        F.report({
          title: `${b.model.split('.')[1]} requires "${key}", which ${missing ? 'the backend does not send' : 'has the wrong type'}`,
          severity: 'HIGH', area: 'contract', endpoint: b.endpoint,
          file: model.file,
          detail: `The generated parser reads json['${key}'] as ${type} with no null fallback, so this response throws during parsing and the screen using it fails to open. Observed in ${b.endpoint} at ${b.path}. Either the backend must always send ${key}, or the model must declare it nullable with a default.`,
          expected: `${key}: ${type}`,
          actual: missing ? 'missing or null' : `${typeof v} (${JSON.stringify(v).slice(0, 60)})`,
          scenario: `fixture ${file}`,
          repro: 'node test/e2e/contracts/check-contracts.mjs',
          status: 'confirmed',
        });
      }
    }
  }
  coverage.push({ ...b, nodes: nodesForBinding });
}

console.log('\nCoverage per binding:');
for (const c of coverage) {
  const mark = c.nodes > 0 ? 'ok  ' : 'GAP ';
  console.log(`  ${mark} ${String(c.nodes).padStart(4)} node(s)  ${c.model} <- ${c.endpoint} ${c.path}${c.reason ? `  (${c.reason})` : ''}`);
}
const gaps = coverage.filter(c => c.nodes === 0);
for (const g of gaps) {
  F.report({
    title: `No captured response exercises ${g.model}`,
    severity: 'MEDIUM', area: 'contract', endpoint: g.endpoint,
    detail: `The model is never fed by any captured response at ${g.path}, so its required-field contract is unverified. Either the endpoint never returns that structure in the scenarios run so far, or the app reads a shape the backend does not produce. Worth resolving before trusting a green contract run.`,
    expected: 'at least one response node to validate',
    actual: g.reason || 'path matched nothing in any fixture',
    repro: 'node test/e2e/contracts/check-contracts.mjs',
    status: 'confirmed',
  });
}
console.log(`\nContracts: ${Object.keys(MODELS).length} generated models parsed, ${checked} response nodes checked, ${violations} violation(s), ${seen.size} distinct, ${gaps.length} unexercised binding(s).`);
F.render();
if (violations) F.render();
process.exit(violations ? 1 : 0);
