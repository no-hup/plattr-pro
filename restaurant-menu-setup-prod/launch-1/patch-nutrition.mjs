// One-off: add the model-required nutritionalInfo to every prod menu item that
// lacks it. platter_core's MenuItem lists nutritionalInfo in requiredKeys, so the
// staff apps refuse to parse the menu without it ("Required keys are missing").
// MockData7 has the field, our prod seed never emitted it — hence emulator-green,
// prod-broken. build-seed.js now emits it too, so re-seeds stay correct.
import { createRequire } from 'node:module';
const require = createRequire('/Users/shaurya/Desktop/dev/plattr-pro/backend/src-plattr/functions/');
const admin = require('/Users/shaurya/Desktop/dev/plattr-pro/backend/src-plattr/functions/node_modules/firebase-admin');

if (process.env.FIRESTORE_EMULATOR_HOST) { console.error('FIRESTORE_EMULATOR_HOST set — refusing.'); process.exit(2); }
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) { console.error('GOOGLE_APPLICATION_CREDENTIALS required.'); process.exit(2); }

admin.initializeApp({ projectId: 'rms-app-dd875' });
const db = admin.firestore();
const col = db.collection('restaurants').doc('res_kaanchipuram_kaapi_hsr').collection('menuItems');

const snap = await col.get();
const need = [];
let ok = 0;
snap.forEach(d => { const n = d.get('nutritionalInfo'); if (n && typeof n === 'object') ok++; else need.push(d.id); });
console.log(`items=${snap.size}  already-ok=${ok}  to-patch=${need.length}`);
if (need.length) {
  const batch = db.batch();
  for (const id of need) batch.update(col.doc(id), { nutritionalInfo: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  await batch.commit();
  console.log('patched', need.length);
}
const after = await col.get();
let missing = 0; after.forEach(d => { if (!d.get('nutritionalInfo')) missing++; });
console.log('verify → items still missing nutritionalInfo:', missing);
process.exit(missing === 0 ? 0 : 1);
