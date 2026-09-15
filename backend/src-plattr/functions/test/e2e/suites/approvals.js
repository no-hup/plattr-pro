/**
 * Suite: approvals (ST · Staff PIN & approvals). Real Cloud Functions on the emulator.
 * Seeds its own staff and lines via the Firestore REST API (Bearer owner = emulator admin), same seam
 * the coverage suite uses. Config default limit 10 %, pitcher ₹1,250.
 */
import { call } from '../lib/api.js';
import config from '../lib/config.js';

const RID = config.RESTAURANT_ID;
const FS = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

// ── tiny Firestore REST codec ─────────────────────────────────────────────
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
async function seed(path, obj, mask) {
  const url = `${FS}/restaurants/${RID}/${path}${mask ? `?updateMask.fieldPaths=${mask}` : ''}`;
  const r = await fetch(url, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`);
}
async function getDoc(path) {
  const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { headers: H });
  if (r.status === 404) return null;
  const j = await r.json();
  return Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
}
async function listAudit() {
  const r = await fetch(`${FS}/restaurants/${RID}/audit?pageSize=300`, { headers: H });
  const j = await r.json();
  return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, dec(v)])) }));
}
const errData = resp => resp?.error?.details?.data || resp?.data || {};

export default async function approvalsSuite() {
  const results = { name: 'approvals', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── seed ───────────────────────────────────────────────────────────────
  const staff = (name, role, email) => ({ name, role, status: 'active', email, password: '1234' });
  await seed('servers/manager_st', staff('Manager ST', 'MANAGER', 'manager@st.test'));
  await seed('servers/manager_st2', staff('Manager ST Two', 'MANAGER', 'manager2@st.test'));
  await seed('servers/captain_st', staff('Captain ST', 'SERVER', 'captain@st.test'));
  await seed('lines/line_pitcher', { listPrice: 1250, sent: true, v: 0, countsTowardTotal: true });
  await seed('lines/line_dosa', { listPrice: 120, sent: false, v: 0, countsTowardTotal: true });

  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@st.test');
  const manager2 = await login('manager2@st.test');
  const captain = await login('captain@st.test');
  if (!manager || !captain || !manager2) { record(false, 'ABORT: staff login failed', { manager, manager2, captain }); return results; }

  const applyAs = (sessionId, body) => call('approvals-apply', { restaurantId: RID, sessionId, cid: 'cid_st', lineId: 'line_pitcher', action: 'discount', reason: 'regular', ...body });

  // ST-S1
  {
    const r = await applyAs(manager, { amount: 100 });
    check('ST-S1 manager ₹100 regular → success, discount 100 / 8 %', r.status === 'success' && r.data?.line?.discount?.amount === 100 && r.data?.line?.discount?.pct === 8, r);
    const a = await getDoc('audit/line_pitcher_v1');
    check('ST-S1 audit row line_pitcher_v1 sev P1, staffId manager_st', a?.sev === 'P1' && a?.staffId === 'manager_st' && a?.amount === 100, a);
  }
  // ST-S2
  {
    const r = await applyAs(manager, { amount: 251, reason: 'placard' });
    const d = errData(r);
    check('ST-S2 ₹251 no pin → permission-denied, requires pin, sev P0', r.status === 'error' && d.code === 'permission-denied' && d.requires === 'pin' && d.sev === 'P0', r);
    check('ST-S2 line unchanged (v 1)', (await getDoc('lines/line_pitcher'))?.v === 1);
    const ok = await applyAs(manager, { amount: 251, reason: 'placard', pin: '1234' });
    check('ST-S2 with pin 1234 → success, discount 251 / 20.08 %, v 2', ok.status === 'success' && ok.data?.line?.discount?.amount === 251 && ok.data?.line?.discount?.pct === 20.08 && ok.data?.line?.v === 2, ok);
    const a = await getDoc('audit/line_pitcher_v2');
    check('ST-S2 audit row sev P0 reason placard', a?.sev === 'P0' && a?.reason === 'placard', a);
    // ST-S9
    check('ST-S9 audit row and response carry no pin', !('pin' in (a || {})) && !JSON.stringify(ok).includes('"pin"') && !JSON.stringify(a).includes('1234'), { a, ok });
  }
  // ST-S4
  {
    const r = await applyAs(captain, { amount: 50 });
    const d = errData(r);
    check('ST-S4 captain (SERVER) ₹50 → permission-denied without requires', r.status === 'error' && d.code === 'permission-denied' && d.requires === undefined, r);
  }
  // ST-S6
  {
    const r = await applyAs(manager, { amount: 100, reason: '' });
    check('ST-S6 blank reason → invalid-argument', errData(r).code === 'invalid-argument', r);
  }
  // ST-S7: the next audit id is line_pitcher_v3; pre-seed it so the transactional create fails.
  {
    await seed('audit/line_pitcher_v3', { ts: 0, cid: 'stale', action: 'discount', staffId: 'x', sev: 'P1', amount: 0, pct: 0, reason: 'other', note: '', lineId: 'line_pitcher', before: null, after: null });
    const r = await applyAs(manager, { amount: 100 });
    const d = errData(r);
    check('ST-S7 audit write fails → "try again", not applied', r.status === 'error' && d.code === 'unavailable' && /try again/.test(r.message || ''), r);
    check('ST-S7 line still v 2, discount still 251', (await getDoc('lines/line_pitcher'))?.v === 2 && (await getDoc('lines/line_pitcher'))?.discount?.amount === 251);
  }
  // ST-S10
  {
    await seed('config/settings', { approvals: { discountPinAbovePercent: 5 } }, 'approvals');
    const r = await applyAs(manager, { amount: 100, lineId: 'line_dosa' });
    check('ST-S10 limit 5 → ₹100 on ₹1,250… on dosa ₹120: 83 % → requires pin (config read per request)', errData(r).requires === 'pin', r);
    const r2 = await applyAs(manager, { amount: 5, lineId: 'line_dosa' });
    check('ST-S10 ₹5 on ₹120 = 4.17 % under 5 → applied', r2.status === 'success' && r2.data?.line?.discount?.amount === 5, r2);
    await seed('config/settings', { approvals: { discountPinAbovePercent: 10 } }, 'approvals');
  }
  // concurrency: two parallel discounts on one line → both audit rows, v 2 (dosa is at v1 now)
  {
    const [a, b] = await Promise.all([applyAs(manager, { amount: 6, lineId: 'line_dosa', cid: 'par_a' }), applyAs(manager2, { amount: 7, lineId: 'line_dosa', cid: 'par_b' })]);
    const line = await getDoc('lines/line_dosa');
    const rows = (await listAudit()).filter(x => x.lineId === 'line_dosa');
    check('concurrency: two parallel discounts both apply serially → line v 3, three dosa audit rows, last discount is 6 or 7', a.status === 'success' && b.status === 'success' && line?.v === 3 && rows.length === 3 && [6, 7].includes(line?.discount?.amount), { a, b, line, rows });
  }
  // ST-S3 (manager): 4 wrong, 5th locks, correct pin still locked. Runs last: it locks the account.
  {
    const wrong = () => applyAs(manager, { amount: 251, reason: 'placard', pin: '0000' });
    const lefts = [];
    for (let i = 0; i < 4; i++) lefts.push(errData(await wrong()).attemptsLeft);
    check('ST-S3 wrong pin ×4 → attemptsLeft 4,3,2,1 with requires pin', JSON.stringify(lefts) === '[4,3,2,1]', lefts);
    const fifth = await wrong();
    check('ST-S3 5th wrong → locked:true, no requires', errData(fifth).locked === true && errData(fifth).requires === undefined, fifth);
    const still = await applyAs(manager, { amount: 251, reason: 'placard', pin: '1234' });
    check('ST-S3 correct pin while locked → still locked', errData(still).locked === true, still);
    const under = await applyAs(manager, { amount: 100 });
    check('ST-S3 locked account refused even for an under-limit ₹100', errData(under).locked === true, under);
    const lockRows = (await listAudit()).filter(x => x.action === 'pinLock' && x.staffId === 'manager_st');
    check('ST-S3 exactly one pinLock audit row, sev P0', lockRows.length === 1 && lockRows[0].sev === 'P0', lockRows);
  }
  // concurrency: 5 parallel wrong pins on manager2 from counter 0 → exactly one lock, one pinLock row
  {
    const wrong = () => applyAs(manager2, { amount: 251, reason: 'placard', pin: '0000' });
    await Promise.all([wrong(), wrong(), wrong(), wrong(), wrong()]);
    const lock = await getDoc('pinLocks/manager_st2');
    const lockRows = (await listAudit()).filter(x => x.action === 'pinLock' && x.staffId === 'manager_st2');
    check('concurrency: 5 parallel wrong pins → wrongAt length 5, locked once, one pinLock row', lock?.wrongAt?.length === 5 && typeof lock?.lockedUntil === 'number' && lockRows.length === 1, { lock, lockRows });
  }
  return results;
}
