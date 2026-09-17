#!/usr/bin/env node
/**
 * prod-smoke-cleanup.mjs — deletes exactly what prod-smoke.mjs created.
 *
 * Reads created.json and removes ONLY those ids under
 * restaurants/res_kaanchipuram_kaapi_hsr, plus the customer doc, then resets
 * tbl_1 to the vacant shape written by table/vacateTable.js.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=.../secure_stuff/service-account.json \
 *     node prod-smoke-cleanup.mjs
 *
 * Refuses to run if FIRESTORE_EMULATOR_HOST is set (this is a PROD tool).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, '../../backend/src-plattr/functions/'));
const admin = require('/Users/shaurya/Desktop/dev/plattr-pro/backend/src-plattr/functions/node_modules/firebase-admin');

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('FIRESTORE_EMULATOR_HOST is set — refusing to run (this targets PRODUCTION).');
  process.exit(2);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS is required.');
  process.exit(2);
}

const CREATED_PATH = path.join(__dirname, 'created.json');
if (!existsSync(CREATED_PATH)) { console.error('created.json not found — nothing to clean.'); process.exit(2); }
const created = JSON.parse(readFileSync(CREATED_PATH, 'utf8'));

const RESTAURANT = 'res_kaanchipuram_kaapi_hsr';
const TABLE = 'tbl_1';
if (created.restaurantId !== RESTAURANT || created.tableId !== TABLE) {
  console.error(`created.json targets ${created.restaurantId}/${created.tableId} — refusing.`);
  process.exit(2);
}

admin.initializeApp({ projectId: 'rms-app-dd875' });
const db = admin.firestore();
const rest = db.collection('restaurants').doc(RESTAURANT);

let deleted = 0;
async function del(ref, label) {
  const snap = await ref.get();
  if (!snap.exists) { console.log(`  skip (absent)  ${label}`); return; }
  await ref.delete();
  deleted++;
  console.log(`  DELETED        ${label}`);
}

console.log(`# prod-smoke-cleanup  ${new Date().toISOString()}  ${RESTAURANT}`);

for (const id of created.orderIds || []) await del(rest.collection('orders').doc(id), `orders/${id}`);
for (const id of [...(created.sessionIds || []), ...(created.staffSessionIds || [])]) {
  await del(rest.collection('sessions').doc(id), `sessions/${id}`);
}
for (const id of created.cartDocIds || []) await del(rest.collection('carts').doc(id), `carts/${id}`);
for (const p of created.customerPhones || []) await del(db.collection('customers').doc(p), `customers/${p}`);

// Reset tbl_1 to the vacant shape (table/vacateTable.js) with the transient
// scan/session fields removed outright rather than nulled.
await rest.collection('tables').doc(TABLE).update({
  status: 'vacant',
  occupiedBy: [],
  primaryCustomer: admin.firestore.FieldValue.delete(),
  activeOrderId: admin.firestore.FieldValue.delete(),
  currentOTP: admin.firestore.FieldValue.delete(),
  firstScannedAt: admin.firestore.FieldValue.delete(),
  lastActivity: admin.firestore.FieldValue.delete(),
  lastUpdated: admin.firestore.FieldValue.delete(),
});
console.log(`  RESET          tables/${TABLE} → vacant`);

// ── verify ──────────────────────────────────────────────────────────────────
console.log('\n# verify');
for (const c of ['orders', 'sessions', 'carts']) {
  const snap = await rest.collection(c).limit(5).get();
  console.log(`  ${c}: ${snap.size} doc(s)${snap.size ? ' → ' + snap.docs.map(d => d.id).join(', ') : ' (empty)'}`);
}
const t1 = (await rest.collection('tables').doc(TABLE).get()).data();
const t2 = (await rest.collection('tables').doc('tbl_2').get()).data();
console.log(`  tbl_1: ${JSON.stringify(t1)}`);
console.log(`  tbl_2: ${JSON.stringify(t2)}`);
const same = JSON.stringify(Object.keys(t1).sort()) === JSON.stringify(Object.keys(t2).sort()) && t1.status === t2.status;
console.log(`  tbl_1 matches the vacant shape of tbl_2: ${same ? 'YES' : 'NO'}`);
const cust = await db.collection('customers').doc('9000000001').get();
console.log(`  customers/9000000001 exists: ${cust.exists}`);
console.log(`\n# ${deleted} document(s) deleted, tbl_1 reset.`);
process.exit(0);
