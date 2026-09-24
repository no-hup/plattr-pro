// TD-041/TD-043: the approval PIN is a bcrypt `pinHash` and nothing else is compared. A suite
// that seeds only a plaintext password logs in fine and then fails at every PIN. Same constant
// hash of 1234 the seeds carry.
const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm';
/**
 * Suite: approvals (ST · Staff PIN & approvals). Real Cloud Functions on the emulator.
 * Seeds its own staff and lines via the Firestore REST API (Bearer owner = emulator admin), same seam
 * the coverage suite uses, and deletes its own docs first so it can rerun without a reset.
 * Money is paise on the line (R9); the request amount is rupees as typed. Limit 10 %, pitcher ₹1,250 = 125000.
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
async function delDoc(path) { await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'DELETE', headers: H }); }
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

  // ── clean, then seed (PATCH without a mask replaces the doc, so staff pin fields reset too) ──
  const OURS_STAFF = ['manager_st', 'manager_st2', 'captain_st'];
  const OURS_LINES = ['line_pitcher', 'line_dosa', 'line_tikka'];
  for (const a of await listAudit()) if (OURS_LINES.includes(a.lineId) || OURS_STAFF.includes(a.staffId)) await delDoc(`audit/${a.id}`);
  for (const l of OURS_LINES) await delDoc(`lines/${l}`);
  const staff = (name, role, email) => ({ name, role, status: 'active', email, password: '1234', pinHash: PIN_1234 });
  await seed('servers/manager_st', staff('Manager ST', 'MANAGER', 'manager@st.test'));
  await seed('servers/manager_st2', staff('Manager ST Two', 'MANAGER', 'manager2@st.test'));
  await seed('servers/captain_st', staff('Captain ST', 'SERVER', 'captain@st.test'));
  await seed('lines/line_pitcher', { listPrice: 125000, sent: true, v: 0, countsTowardTotal: true });
  await seed('lines/line_dosa', { listPrice: 12000, sent: false, v: 0, countsTowardTotal: true });
  await seed('lines/line_tikka', { listPrice: 32000, sent: true, v: 0, countsTowardTotal: true, offer: { id: 'happy_hour', amount: 6400 } });

  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@st.test');
  const manager2 = await login('manager2@st.test');
  const captain = await login('captain@st.test');
  if (!manager || !captain || !manager2) { record(false, 'ABORT: staff login failed', { manager, manager2, captain }); return results; }

  const applyAs = (sessionId, body) => call('approvals-apply', { restaurantId: RID, sessionId, cid: 'cid_st', lineId: 'line_pitcher', action: 'discount', reason: 'regular', ...body });

  // ST-S1
  {
    const r = await applyAs(manager, { amount: 100 });
    check('ST-S1 manager ₹100 regular → success, discount 10000 paise / 8 %', r.status === 'success' && r.data?.line?.discount?.amount === 10000 && r.data?.line?.discount?.pct === 8, r);
    const a = await getDoc('audit/line_pitcher_v1');
    check('ST-S1 audit row line_pitcher_v1 sev P1, staffId manager_st, amount 10000', a?.sev === 'P1' && a?.staffId === 'manager_st' && a?.amount === 10000, a);
  }
  // ST-S2
  {
    const r = await applyAs(manager, { amount: 251, reason: 'placard' });
    const d = errData(r);
    check('ST-S2 ₹251 no pin → permission-denied, requires pin, sev P0', r.status === 'error' && d.code === 'permission-denied' && d.requires === 'pin' && d.sev === 'P0', r);
    check('ST-S2 line unchanged (v 1)', (await getDoc('lines/line_pitcher'))?.v === 1);
    const ok = await applyAs(manager, { amount: 251, reason: 'placard', pin: '1234' });
    check('ST-S2 with pin 1234 → success, discount 25100 / 20.08 %, v 2', ok.status === 'success' && ok.data?.line?.discount?.amount === 25100 && ok.data?.line?.discount?.pct === 20.08 && ok.data?.line?.v === 2, ok);
    check('ST-S12 the second discount replaced the first: 25100, not 35100', ok.data?.line?.discount?.amount === 25100, ok);
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
    check('ST-S7 line still v 2, discount still 25100', (await getDoc('lines/line_pitcher'))?.v === 2 && (await getDoc('lines/line_pitcher'))?.discount?.amount === 25100);
    await delDoc('audit/line_pitcher_v3');
  }
  // ST-S11 / ST-S13 on the tikka with a ₹64 offer
  {
    const ask = await applyAs(manager, { amount: 40, lineId: 'line_tikka' });
    check('ST-S11 ₹40 on ₹320 tikka (₹64 offer) → 12.5 % of list → requires pin', errData(ask).requires === 'pin' && errData(ask).sev === 'P0', ask);
    const ok = await applyAs(manager, { amount: 40, lineId: 'line_tikka', pin: '1234' });
    const l = ok.data?.line;
    check('ST-S11 with pin → discount 4000 beside offer 6400; net 32000−6400−4000 = 21600', ok.status === 'success' && l?.discount?.amount === 4000 && l?.offer?.amount === 6400 && (l.listPrice - l.offer.amount - l.discount.amount) === 21600, ok);
    const big = await applyAs(manager, { amount: 400, lineId: 'line_tikka', pin: '1234' });
    check('ST-S13 ₹400 on that line → failed-precondition, line cannot go below zero', errData(big).code === 'failed-precondition', big);
    check('ST-S13 nothing written: tikka still v 1', (await getDoc('lines/line_tikka'))?.v === 1);
  }
  // ST-S10
  {
    await seed('config/settings', { approvals: { discountPinAbovePercent: 5 } }, 'approvals');
    const r = await applyAs(manager, { amount: 10, lineId: 'line_dosa' });
    check('ST-S10 limit 5 → ₹10 on dosa ₹120 = 8.33 % → requires pin (config read per request)', errData(r).requires === 'pin', r);
    const r2 = await applyAs(manager, { amount: 5, lineId: 'line_dosa' });
    check('ST-S10 ₹5 on ₹120 = 4.17 % under 5 → applied, 500 paise', r2.status === 'success' && r2.data?.line?.discount?.amount === 500, r2);
    await seed('config/settings', { approvals: { discountPinAbovePercent: 10 } }, 'approvals');
  }
  // concurrency: two parallel discounts on one line → both audit rows, v 2 (dosa is at v1 now)
  {
    const [a, b] = await Promise.all([applyAs(manager, { amount: 6, lineId: 'line_dosa', cid: 'par_a' }), applyAs(manager2, { amount: 7, lineId: 'line_dosa', cid: 'par_b' })]);
    const line = await getDoc('lines/line_dosa');
    const rows = (await listAudit()).filter(x => x.lineId === 'line_dosa');
    check('concurrency: two parallel discounts both apply serially → line v 3, three dosa audit rows, last discount is 600 or 700', a.status === 'success' && b.status === 'success' && line?.v === 3 && rows.length === 3 && [600, 700].includes(line?.discount?.amount), { a, b, line, rows });
  }
  // ST-S3 (manager): 4 wrong, 5th slows, too-soon refused unchecked, never locked, then applied after the wait.
  {
    const wrong = () => applyAs(manager, { amount: 251, reason: 'placard', pin: '0000' });
    const lefts = [];
    for (let i = 0; i < 4; i++) { const d = errData(await wrong()); lefts.push(d.attemptsLeft); if (d.retryAfter !== undefined) lefts.push('retryAfter?!'); }
    check('ST-S3 wrong pin ×4 → attemptsLeft 4,3,2,1, requires pin, no retryAfter yet', JSON.stringify(lefts) === '[4,3,2,1]', lefts);
    const fifth = errData(await wrong());
    check('ST-S3 5th wrong → wrong:true, attemptsLeft 0, retryAfter set (≈ now + 1 s)', fifth.wrong === true && fifth.attemptsLeft === 0 && typeof fifth.retryAfter === 'number' && fifth.retryAfter > Date.now() - 5000, fifth);
    const soon = errData(await applyAs(manager, { amount: 251, reason: 'placard', pin: '1234' }));
    check('ST-S3 correct pin too soon → tooSoon:true, requires pin, not checked', soon.tooSoon === true && soon.requires === 'pin', soon);
    const st = await getDoc('servers/manager_st');
    check('ST-S3 staff doc carries pinWrongAt (5, too-soon not counted) and pinRetryAfter; never a lock', st?.pinWrongAt?.length === 5 && typeof st?.pinRetryAfter === 'number', st);
    const under = await applyAs(manager, { amount: 1, lineId: 'line_dosa' });
    check('ST-S3 account never locked: under-limit ₹1 on the dosa with no PIN → applied', under.status === 'success', under);
    const streakRows = (await listAudit()).filter(x => x.action === 'pinStreak' && x.staffId === 'manager_st');
    check('ST-S3 exactly one pinStreak audit row, sev P0', streakRows.length === 1 && streakRows[0].sev === 'P0', streakRows);
    await seed('servers/manager_st', { pinRetryAfter: 0 }, 'pinRetryAfter');   // the wait has passed (no sleeps in tests)
    const ok = await applyAs(manager, { amount: 251, reason: 'placard', pin: '1234' });
    check('ST-S3 after the wait, correct pin → applied, pin state cleared', ok.status === 'success' && (await getDoc('servers/manager_st'))?.pinWrongAt?.length === 0, ok);
  }
  // concurrency: 5 parallel wrong pins on manager2 from counter 0 → one streak, one pinStreak row
  {
    const wrong = () => applyAs(manager2, { amount: 251, reason: 'placard', pin: '0000' });
    await Promise.all([wrong(), wrong(), wrong(), wrong(), wrong()]);
    const st = await getDoc('servers/manager_st2');
    const rows = (await listAudit()).filter(x => x.action === 'pinStreak' && x.staffId === 'manager_st2');
    check('concurrency: 5 parallel wrong pins → pinWrongAt length 5, retryAfter set, exactly one pinStreak row', st?.pinWrongAt?.length === 5 && typeof st?.pinRetryAfter === 'number' && rows.length === 1, { st, rows });
  }
  return results;
}
