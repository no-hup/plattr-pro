// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared. A suite
// that seeds only a plaintext password logs in fine and then fails at every PIN. Same constant
// hash of 1234 the seeds carry.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm';
/**
 * Suite: payments (PY · Payments). Real Cloud Functions on the emulator.
 * Seeds its own staff, order, bill and credit note via the Firestore REST API (Bearer owner = emulator
 * admin), same seam the approvals suite uses, and re-seeds every document first so it reruns without a
 * reset. The bill is seeded in BL's committed shape (`domain/billing.ts` Bill): PY's adapter reads
 * `payable, status, cid, lines[].orderId` on a bill and `creditNoteOf, payable, refundedTotal` on a note.
 *
 * What this covers that the app tests cannot: real Firestore transactions, the real callable error
 * codes a client sees, the real security rules (R16), and the real ST PIN door.
 * Money is paise. Bill 0417 = payable 60900 (₹609.00). CN-0007 = ₹84.00.
 */
import { call } from '../lib/api.js';
import config from '../lib/config.js';

const RID = config.RESTAURANT_ID;
const FS = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

// ── tiny Firestore REST codec (same as approvals.js) ──────────────────────
function enc(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
}
function dec(f) {
  if (!f) return undefined;
  if ('nullValue' in f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(dec);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return undefined;
}
async function seed(path, obj, auth = H) {
  const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) });
  if (auth === H && !r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`);
  return r;
}
async function getDoc(path) {
  const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { headers: H });
  if (r.status === 404) return null;
  const j = await r.json();
  return Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
}
const delDoc = path => fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'DELETE', headers: H });
// onCall errors arrive as { error: { details: { data: { code, ...details } } } }; onRequest ones as { data }.
const errData = r => r?.error?.details?.data ?? r?.error?.data ?? r?.data ?? {};

export default async function paymentsSuite() {
  const results = { name: 'payments', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── clean, then seed. PATCH without a mask replaces the document, so bill and note state reset too. ──
  const IDS = ['py_s1', 'py_s3a', 'py_s3b', 'py_s5', 'py_s7', 'py_s20', 'py_s12', 'py_s9', 'py_s10', 'py_s26', 'py_s27', 'py_s8', 'py_s14', 'py_s13', 'py_s13x', 'py_r8', 'py_s28', 'py_s32', 'py_s36'];
  for (const id of IDS) { await delDoc(`payments/${id}`); await delDoc(`audit/${id}_refund`); await delDoc(`audit/${id}_void`); }
  await delDoc('payments/rules_probe');
  const staff = (name, role, email) => ({ name, role, status: 'active', email, password: '1234', pinHash: PIN_1234 });
  await seed('servers/manager_py', staff('Manager PY', 'MANAGER', 'manager@py.test'));
  await seed('servers/captain_py', staff('Captain PY', 'SERVER', 'captain@py.test'));
  const freshBill = async () => {
    for (const id of IDS) await delDoc(`payments/${id}`);   // a fresh bill has no rows; PATCH resets the bill doc, not its ledger
    await seed('orders/ord_py', { orderStatus: 'IN_PROGRESS', paymentStatus: 'unpaid', restaurantId: RID });
    await seed('bills/0417', { payable: 60900, status: 'issued', cid: 'cid_py', number: '0417', lines: [{ lineId: 'l1', orderId: 'ord_py', countsTowardTotal: true }] });
    await seed('bills/CN-0007', { payable: -8400, status: 'issued', cid: 'cid_py', number: 'CN-0007', creditNoteOf: { billId: '0417', number: '0417', issuedAt: 1 }, lines: [] });
  };
  await freshBill();
  await seed('bills/0419', { payable: 0, status: 'paid', paidTotal: 0, cid: 'cid_py0', number: '0419', lines: [{ lineId: 'l9', orderId: 'ord_py', countsTowardTotal: true }] });
  await seed('bills/0418', { payable: 60900, status: 'cancelled', cid: 'cid_py18', number: '0418', lines: [{ lineId: 'l8', orderId: 'ord_py', countsTowardTotal: true }] });

  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@py.test');
  const captain = await login('captain@py.test');
  if (!manager || !captain) { record(false, 'ABORT: staff login failed', { manager, captain }); return results; }

  const takeAs = (sessionId, body) => call('payments-take', { restaurantId: RID, sessionId, billId: '0417', ...body });
  const refundAs = (sessionId, body) => call('payments-refund', { restaurantId: RID, sessionId, billId: '0417', tenderId: 'cash', creditNoteId: 'CN-0007', reason: 'wrong dish', ...body });
  const voidAs = (sessionId, body) => call('payments-void', { restaurantId: RID, sessionId, reason: 'wrong tender', ...body });
  const listAs = (sessionId, body) => call('payments-list', { restaurantId: RID, sessionId, ...body });

  // ── PY-S1, PY-S24, PY-S7, R4, R10, R14 ──────────────────────────────────
  {
    const r = await takeAs(manager, { paymentId: 'py_s1', tenderId: 'cash', tendered: 60900, businessDate: '2020-01-01', at: 0 });
    check('PY-S1 cash 60900 → success, row amount 60900 change 0, bill paid, opensDrawer', r.status === 'success' && r.data?.row?.amount === 60900 && r.data?.row?.change === 0 && r.data?.bill?.status === 'paid' && r.data?.opensDrawer === true, r);
    const bill = await getDoc('bills/0417');
    check('PY-S1 bill doc stamped {status paid, paidTotal 60900, paidBy manager_py}', bill?.status === 'paid' && bill?.paidTotal === 60900 && bill?.paidBy === 'manager_py', bill);
    check('R4 order mirror written in the same transaction: orders/ord_py.paymentStatus = paid', (await getDoc('orders/ord_py'))?.paymentStatus === 'paid');
    const row = await getDoc('payments/py_s1');
    check("R14 businessDate is the server's (YYYY-MM-DD), not the body's 2020-01-01; at is not 0", /^\d{4}-\d{2}-\d{2}$/.test(row?.businessDate) && row.businessDate !== '2020-01-01' && row?.at > 0, row);
    check('R10 the whole tender row is snapshotted on the payment', row?.tender?.kind === 'cash' && row?.tender?.opensDrawer === true && row?.tender?.needsRef === false, row);
    const again = await takeAs(manager, { paymentId: 'py_s1', tenderId: 'cash', tendered: 60900 });
    check('PY-S24 same paymentId again → success with retry:true, never failed-precondition', again.status === 'success' && again.data?.retry === true, again);
    check('PY-S24 paidTotal still 60900 after the retry', (await getDoc('bills/0417'))?.paidTotal === 60900);
    const r7 = await takeAs(manager, { paymentId: 'py_s7', tenderId: 'cash', tendered: 20900 });
    check('PY-S7 a further take on a settled bill → failed-precondition "nothing outstanding"', r7.status === 'error' && errData(r7).code === 'failed-precondition' && /nothing outstanding/i.test(r7.message || ''), r7);
    check('PY-S7 no row was written for the refused take', (await getDoc('payments/py_s7')) === null);
  }

  // ── PY-S9, PY-S10, PY-S26, PY-S30, PY-S36 ──────────────────────────────
  {
    const noPin = await refundAs(manager, { paymentId: 'py_s9', amount: 8400 });
    const d = errData(noPin);
    check('PY-S9 refund without a PIN → permission-denied {requires pin, action refund, sev P0}', noPin.status === 'error' && d.code === 'permission-denied' && d.requires === 'pin' && d.action === 'refund' && d.sev === 'P0', noPin);
    check('PY-S9 nothing written without the PIN', (await getDoc('payments/py_s9')) === null && (await getDoc('bills/CN-0007'))?.refundedTotal === undefined);
    const upi = await refundAs(manager, { paymentId: 'py_s36', amount: 8400, tenderId: 'upi', pin: '1234' });
    check('PY-S36 refund on UPI when the bill was paid in cash → failed-precondition (back the way it came, cash last resort)', upi.status === 'error' && errData(upi).code === 'failed-precondition', upi);
    const ok = await refundAs(manager, { paymentId: 'py_s9', amount: 8400, pin: '1234' });
    check('PY-S9 refund 8400 with pin → success, row kind refund creditNoteId CN-0007', ok.status === 'success' && ok.data?.row?.kind === 'refund' && ok.data?.row?.creditNoteId === 'CN-0007', ok);
    check('PY-S9 note stamped refundedTotal 8400', (await getDoc('bills/CN-0007'))?.refundedTotal === 8400);
    const bill = await getDoc('bills/0417');
    check('PY-S30 bill paidTotal 52500, status back to issued, paidAt cleared', bill?.paidTotal === 52500 && bill?.status === 'issued' && bill?.paidAt === null, bill);
    const audit = await getDoc('audit/py_s9_refund');
    check('PY-S9 audit row py_s9_refund sev P0 action refund amount 8400', audit?.sev === 'P0' && audit?.action === 'refund' && audit?.amount === 8400, audit);
    const over = await refundAs(manager, { paymentId: 'py_s10', amount: 10000, pin: '1234' });
    check('PY-S10 refund 10000 against an 8400 note → failed-precondition', over.status === 'error' && errData(over).code === 'failed-precondition', over);
    const second = await refundAs(manager, { paymentId: 'py_s26', amount: 8400, pin: '1234' });
    check('PY-S26 a second full refund of the same note → failed-precondition; refundedTotal stays 8400', second.status === 'error' && errData(second).code === 'failed-precondition' && (await getDoc('bills/CN-0007'))?.refundedTotal === 8400, second);
    const s30 = await takeAs(manager, { paymentId: 'py_s28', tenderId: 'cash', tendered: 8400 });
    check('PY-S30 a fresh cash 8400 against the reopened bill → paid again, paidTotal 60900', s30.status === 'success' && s30.data?.bill?.status === 'paid' && s30.data?.bill?.paidTotal === 60900, s30);
  }

  // ── PY-S3, PY-S23, PY-S6, PY-S20, PY-S12, PY-S4, PY-S2 on a fresh bill ──
  await freshBill();
  {
    const c = await takeAs(manager, { paymentId: 'py_s3a', tenderId: 'card', amount: 40000, ref: 'slip-1' });
    check('PY-S3 card 40000 → issued, paidTotal 40000, outstanding 20900, mirror partially_paid', c.status === 'success' && c.data?.bill?.status === 'issued' && c.data?.bill?.paidTotal === 40000 && c.data?.bill?.outstanding === 20900 && (await getDoc('orders/ord_py'))?.paymentStatus === 'partially_paid', c);
    const retry = await takeAs(manager, { paymentId: 'py_s3a', tenderId: 'card', amount: 40000, ref: 'slip-1' });
    check('PY-S23 retry of the partial → retry:true, paidTotal still 40000, one row', retry.status === 'success' && retry.data?.retry === true && retry.data?.bill?.paidTotal === 40000, retry);
    const s6 = await takeAs(manager, { paymentId: 'py_s5', tenderId: 'card', amount: 30000, ref: 'slip-2' });
    check('PY-S6 second card 30000 against outstanding 20900 → invalid-argument', s6.status === 'error' && errData(s6).code === 'invalid-argument', s6);
    const noRef = await takeAs(manager, { paymentId: 'py_s20', tenderId: 'card', amount: 20900 });
    check('PY-S20 card with needsRef and no ref → invalid-argument', noRef.status === 'error' && errData(noRef).code === 'invalid-argument', noRef);
    const cap = await takeAs(captain, { paymentId: 'py_s12', tenderId: 'cash', tendered: 20900 });
    check('PY-S12 SERVER role take → permission-denied with NO requires', cap.status === 'error' && errData(cap).code === 'permission-denied' && errData(cap).requires === undefined, cap);
    const s4 = await takeAs(manager, { paymentId: 'py_s3b', tenderId: 'cash', tendered: 20000 });
    check('PY-S4 cash tendered 20000 against outstanding 20900 → amount 20000 change 0 (a partial), outstanding 900', s4.status === 'success' && s4.data?.row?.amount === 20000 && s4.data?.row?.change === 0 && s4.data?.bill?.outstanding === 900, s4);
    const s2 = await takeAs(manager, { paymentId: 'py_s13', tenderId: 'cash', tendered: 1000 });
    check('PY-S2 cash 1000 against outstanding 900 → amount 900, change 100, bill paid', s2.status === 'success' && s2.data?.row?.amount === 900 && s2.data?.row?.change === 100 && s2.data?.bill?.status === 'paid', s2);
  }

  // ── PY-S27, PY-S29, PY-S35, PY-S16: void the settling row, reopen, retry the void ──
  await freshBill();
  {
    await takeAs(manager, { paymentId: 'py_s27', tenderId: 'cash', tendered: 60900 });
    const noPin = await voidAs(manager, { paymentId: 'py_s27' });
    check('PY-S16 void without a PIN → permission-denied {requires pin, action voidPayment}', noPin.status === 'error' && errData(noPin).requires === 'pin' && errData(noPin).action === 'voidPayment', noPin);
    const v = await voidAs(manager, { paymentId: 'py_s27', pin: '1234' });
    check('PY-S27 void the settling row → bill issued, paidTotal 0, mirror unpaid, drawer stays shut', v.status === 'success' && v.data?.bill?.status === 'issued' && v.data?.bill?.paidTotal === 0 && v.data?.opensDrawer === false && (await getDoc('orders/ord_py'))?.paymentStatus === 'unpaid', v);
    const row = await getDoc('payments/py_s27');
    check('R1 the voided row still exists with its void block and original amount', row?.amount === 60900 && row?.void?.reason === 'wrong tender' && row?.void?.by === 'manager_py', row);
    const again = await voidAs(manager, { paymentId: 'py_s27', pin: '1234' });
    check('PY-S35 same staff, same reason, void again → success retry:true', again.status === 'success' && again.data?.retry === true, again);
    const other = await voidAs(manager, { paymentId: 'py_s27', pin: '1234', reason: 'guest left' });
    check('PY-S29 a different reason on the voided row → failed-precondition', other.status === 'error' && errData(other).code === 'failed-precondition', other);
    const re = await takeAs(manager, { paymentId: 'py_s32', tenderId: 'upi', amount: 60900, ref: 'upi-ref-1' });
    check('PY-S27 a fresh UPI 60900 then settles it again', re.status === 'success' && re.data?.bill?.status === 'paid', re);
  }

  // ── PY-S8, PY-S13, PY-S14, R8, R13 ──────────────────────────────────────
  {
    const s8 = await takeAs(manager, { billId: '0419', paymentId: 'py_s8', tenderId: 'cash', tendered: 100 });
    check('PY-S8 take against a payable-0 comped bill → failed-precondition', s8.status === 'error' && errData(s8).code === 'failed-precondition', s8);
    const s14 = await takeAs(manager, { billId: '0418', paymentId: 'py_s14', tenderId: 'cash', tendered: 60900 });
    check('PY-S14 take against a cancelled bill → failed-precondition', s14.status === 'error' && errData(s14).code === 'failed-precondition', s14);
    const s13 = await takeAs(manager, { billId: 'no_such_bill', paymentId: 'py_s13x', tenderId: 'cash', tendered: 60900 });
    check('PY-S13 take against no bill → failed-precondition', s13.status === 'error' && errData(s13).code === 'failed-precondition', s13);
    const f = await takeAs(manager, { paymentId: 'py_r8', tenderId: 'cash', tendered: 608.995 });
    check('R8 tendered 608.995 → invalid-argument, never rounded', f.status === 'error' && errData(f).code === 'invalid-argument', f);
    const s = await takeAs(manager, { paymentId: 'py_r8', tenderId: 'cash', tendered: '60900' });
    check('R8 tendered "60900" as a string → invalid-argument', s.status === 'error' && errData(s).code === 'invalid-argument', s);
    const noId = await takeAs(manager, { tenderId: 'cash', tendered: 60900 });
    check('R13 missing paymentId → invalid-argument; the server never generates one', noId.status === 'error' && errData(noId).code === 'invalid-argument', noId);
    const slash = await takeAs(manager, { paymentId: 'a/b', tenderId: 'cash', tendered: 60900 });
    check("R13 paymentId 'a/b' → invalid-argument", slash.status === 'error' && errData(slash).code === 'invalid-argument', slash);
  }

  // ── PY-S18 / R19: list by day and by bill; who-can row 1 ────────────────
  {
    const byBill = await listAs(captain, { billId: '0417' });
    check('Who-can row 1: a SERVER session may list a bill; sees payable 60900, status paid, three tenders offered', byBill.status === 'success' && byBill.data?.payable === 60900 && byBill.data?.status === 'paid' && Array.isArray(byBill.data?.tenders) && byBill.data.tenders.length === 3, byBill);
    const today = (await getDoc('payments/py_s32'))?.businessDate;   // py_s1 was cleared by freshBill(); py_s32 is the last live row
    const day = await listAs(manager, { businessDate: today });
    const bt = day.data?.byTender || {};
    check('PY-S18 list by businessDate groups by tenderId (cash, card, upi) and by staff (manager_py)', day.status === 'success' && 'cash' in bt && 'card' in bt && 'upi' in bt && 'manager_py' in (day.data?.byStaff || {}), day);
    const rows = day.data?.rows || [];
    check('PY-S18 the voided row py_s27 is returned but excluded from the totals', rows.some(r => r.paymentId === 'py_s27' && r.void) && bt.cash?.taken === rows.filter(r => !r.void && r.kind === 'take' && r.tenderId === 'cash').reduce((n, r) => n + r.amount, 0), { cash: bt.cash });
    const none = await listAs(manager, { businessDate: '1999-01-01' });
    check('PY-S18 a day with no rows → zeros for every configured tender, not an error', none.status === 'success' && none.data?.byTender?.cash?.taken === 0 && none.data?.cashNet === 0, none);
  }

  // ── R16: the rules deny a client write; only the Admin SDK (Bearer owner) may touch payments/ ──
  {
    // An unsigned JWT: the emulator runs with skipTokenVerification, so this authenticates as uid `staff_1`
    // and the RULES decide, not the token parser. A bare string would be a 400 before rules ever ran.
    const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const jwt = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'staff_1', user_id: 'staff_1', aud: config.PROJECT_ID, iss: `https://securetoken.google.com/${config.PROJECT_ID}`, iat: now, exp: now + 3600 })}.`;
    const client = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` };
    const r = await seed('payments/rules_probe', { amount: 1 }, client);
    check('R16 a client write to payments/ with a non-owner bearer → refused by firestore.rules (403), never a row', r.status === 403 && (await getDoc('payments/rules_probe')) === null, { status: r.status });
    const b = await seed('bills/0417', { status: 'paid', paidTotal: 60900 }, client);
    check('R16 a client write of bill.status = paid → refused (403). Without this R3 is theatre', b.status === 403, { status: b.status });
  }

  return results;
}
