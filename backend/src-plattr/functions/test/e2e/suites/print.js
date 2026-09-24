/**
 * Suite: print (KT · the print path, server side). Real Cloud Functions on the emulator.
 * Sheet: moonshot/SPEC_KT_print_path.md v4. Own fixtures: table_kt_1, staff manager@kt.test / server@kt.test /
 * kitchen@kt.test (password 1234). The restaurant's `print` block is written with an updateMask so the rest of
 * the settings document is untouched. Default routing: everything to `kitchen`.
 *
 * What is proven here, in order:
 *   KT-S1   a staff round → one kot:<cartId>:kitchen job, queued, ticket "<orderNumber>-1"
 *   R13     kind 'bridge' is refused (print.agents = ['kitchen']); an install id is not a credential
 *   claim   tab_A gets base64 bytes starting ESC @ (1b 40) with TABLE KT1 and the dish; the same tablet again gets the same bytes
 *   KT-S10  tab_B is refused "taken"; two OVERLAPPING claims on a fresh job → exactly one wins
 *   ack     tab_B cannot ack; tab_A acks → printed; acking again is a no-op success
 *   KT-S11  the manager cancels the round → cancel:<cartId>:kitchen:* job with the line, queued
 *   KT-S6   billing-issue → bill:<billId> job; claimed bytes carry "Tax Invoice" and the bill number
 *   KT-S16  print-reprint {billId} → duplicate:<billId>:1 and an ST audit row for `reprint`
 *   KT-S5   print-reprint {cartId} → reprint:<cartId>:kitchen:2
 *   stale   a seeded job queued 2 h ago is not offered; print-reprint {jobId} forces it; then it is
 *   KT-S23  print-status counts waiting; print-sweepNow logs an overdue job and answers a report
 */
import { call } from '../lib/api.js';
import { draftVersions } from '../lib/rest.mjs';
import config from '../lib/config.js';

const PIN_1234 = '$2a$10$2fnA8FQ9yXqhZsxpmOuLte23Ju5XigDAfapHtcUDvsT7OWGgYrbTm';
const RID = config.RESTAURANT_ID;
const FS = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

function enc(v) {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
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
  if ('timestampValue' in f) return f.timestampValue;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(dec);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return undefined;
}
const doc = j => Object.fromEntries(Object.entries(j.fields || {}).map(([k, v]) => [k, dec(v)]));
async function seed(path, obj, mask) {
  const url = `${FS}/restaurants/${RID}/${path}` + (mask ? '?' + mask.map(f => `updateMask.fieldPaths=${f}`).join('&') : '');
  const r = await fetch(url, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error(`seed ${path}: ${r.status} ${await r.text()}`);
}
async function getDoc(path) { const r = await fetch(`${FS}/restaurants/${RID}/${path}`, { headers: H }); return r.status === 404 ? null : doc(await r.json()); }
async function delDoc(path) { await fetch(`${FS}/restaurants/${RID}/${path}`, { method: 'DELETE', headers: H }); }
async function listCol(col) { const j = await (await fetch(`${FS}/restaurants/${RID}/${col}?pageSize=300`, { headers: H })).json(); return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...doc(d) })); }
const errData = r => r?.error?.details?.data || r?.data || {};
const codeOf = r => errData(r).code || r?.error?.code;
const ok = r => r?.status === 'success' || r?.success === true;
const bytesOf = r => Buffer.from(r.data?.bytes || '', 'base64');
const ITEM = config.ITEMS.TIRAMISU.id;

export default async function printSuite() {
  const results = { name: 'print', pass: 0, fail: 0, tests: [] };
  const record = (pass, message, actual) => { results.tests.push({ pass, message, actual: pass ? undefined : actual }); pass ? results.pass++ : results.fail++; };
  const check = (label, cond, actual) => record(Boolean(cond), `${label} → ${cond ? 'ok' : 'FAILED'}`, actual);

  // ── clean, then seed ────────────────────────────────────────────────────
  for (const s of (await listCol('sessions')).filter(s => s.tableId === 'table_kt_1')) await delDoc(`sessions/${s.id}`);
  for (const l of await listCol('lines')) if (l.tableId === 'table_kt_1') await delDoc(`lines/${l.id}`);
  for (const o of await listCol('orders')) if (o.tableId === 'table_kt_1') await delDoc(`orders/${o.id}`);
  for (const j of await listCol('printJobs')) await delDoc(`printJobs/${j.id}`);
  for (const b of await listCol('bills')) if ((b.tableIds || []).includes('table_kt_1')) await delDoc(`bills/${b.id}`);
  await delDoc('tables/table_kt_1'); await delDoc('carts/table_kt_1');
  await seed('tables/table_kt_1', { number: 'KT1', capacity: 4, status: 'vacant' });
  await seed('config/settings', { print: { agents: ['kitchen'], stations: { kitchen: { label: 'KITCHEN', charsPerLine: 48 }, counter: { label: 'COUNTER', charsPerLine: 48 } } } }, ['print']);
  for (const [id, role, email] of [['manager_kt', 'MANAGER', 'manager@kt.test'], ['server_kt', 'SERVER', 'server@kt.test'], ['kitchen_kt', 'KITCHEN', 'kitchen@kt.test']]) {
    await seed(`servers/${id}`, { name: `${role[0]}${role.slice(1).toLowerCase()} KT`, role, status: 'active', email, password: '1234', pinHash: PIN_1234 });
  }
  const login = async email => (await call('server-serverLogin', { restaurantId: RID, username: email, password: '1234' })).data?.sessionId;
  const manager = await login('manager@kt.test');
  const server = await login('server@kt.test');
  const kitchen = await login('kitchen@kt.test');
  check('staff logins resolve for manager, server and kitchen @kt.test', manager && server && kitchen, { manager, server, kitchen });

  const A = { restaurantId: RID, sessionId: kitchen, kind: 'kitchen', agentId: 'tab_A' };
  const B = { ...A, agentId: 'tab_B' };
  const pending = (as = A) => call('print-pending', as);
  const claim = (jobId, as = A) => call('print-claim', { ...as, jobId });
  const ack = (jobId, as = A) => call('print-ack', { ...as, jobId });
  const status = () => call('print-status', { restaurantId: RID, sessionId: manager });

  // ── KT-S1: a staff round becomes a job in the placing transaction ───────
  let sitting, addedBy, orderId, orderNumber, cartId;
  {
    const o = await call('table-openTable', { restaurantId: RID, sessionId: server, tableId: 'table_kt_1', covers: 2 });
    sitting = o.data?.sessionId; addedBy = o.data?.addedBy;
    await call('cart-addItemToCart', { restaurantId: RID, tableId: 'table_kt_1', sessionId: sitting, addedBy, menuItemId: ITEM, quantity: 2 });
    const c = await call('cart-checkoutCart', { restaurantId: RID, tableId: 'table_kt_1', sessionId: sitting, addedBy });
    orderId = c.data?.orderId; orderNumber = c.data?.orderNumber;
    const jobs = (await listCol('printJobs')).filter(j => j.orderId === orderId);
    cartId = jobs[0]?.cartId;
    check('KT-S1 checkout queued exactly one kot:<cartId>:kitchen job, state queued, part 1/1, ticket <orderNumber>-1', jobs.length === 1 && jobs[0].id === `kot:${cartId}:kitchen` && jobs[0].state === 'queued' && jobs[0].parts === 1 && jobs[0].ticketNo === `${orderNumber}-1`, jobs);
    check('KT-S1 the job names the line it carries and the table as a person reads it (KT1), never the id', jobs[0]?.lineIds?.length === 1 && jobs[0]?.tableLabel === 'KT1' && jobs[0]?.queuedAt > 0, jobs[0]);
  }
  const kotId = `kot:${cartId}:kitchen`;

  // ── R13: kinds and credentials ──────────────────────────────────────────
  {
    const bridge = await pending({ ...A, kind: 'bridge' });
    check('R13 kind "bridge" is refused permission-denied: print.agents is ["kitchen"]', codeOf(bridge) === 'permission-denied', bridge);
    const noSession = await pending({ ...A, sessionId: 'not-a-session' });
    check('R13 an install id without a staff session is refused', !ok(noSession), noSession);
    const p = await pending();
    check('pending offers the KOT to a logged-in kitchen agent, oldest first', ok(p) && (p.data?.jobs || []).some(j => j.jobId === kotId && j.stationId === 'kitchen'), p);
  }

  // ── claim / lease / ack ─────────────────────────────────────────────────
  {
    const a = await claim(kotId);
    const bytes = bytesOf(a);
    check('claim answers base64 bytes that start with ESC @ (1b 40), name the table KT1 and the dish', ok(a) && bytes[0] === 0x1b && bytes[1] === 0x40 && bytes.toString('latin1').includes('TABLE KT1') && bytes.toString('latin1').includes('2 x'), { head: [...bytes.slice(0, 8)], text: bytes.toString('latin1').slice(0, 120) });
    check('claim returns ticketNo, stationId and copies', a.data?.ticketNo === `${orderNumber}-1` && a.data?.stationId === 'kitchen' && a.data?.copies === 1, a.data);
    const b = await claim(kotId, B);
    check('KT-S10 the second tablet is refused failed-precondition "taken"', codeOf(b) === 'failed-precondition' && errData(b).why === 'taken', b);
    const again = await claim(kotId);
    check('the same tablet claiming again inside its lease is handed the SAME bytes (a lost answer is recoverable)', ok(again) && again.data?.bytes === a.data?.bytes, again);
    const j = await getDoc(`printJobs/${kotId}`);
    check('the job is claimed by tab_A with a lease 60 s ahead; no bytes are stored on it', j?.state === 'claimed' && j?.claimedBy === 'tab_A' && j?.claimedUntil - j?.queuedAt < 70_000 && !('bytes' in j), j);
    const badAck = await ack(kotId, B);
    check('ack by a non-holder is refused permission-denied', codeOf(badAck) === 'permission-denied', badAck);
    const good = await ack(kotId);
    check('ack by the holder → printed', ok(good) && good.data?.state === 'printed' && good.data?.already === false, good);
    const twice = await ack(kotId);
    check('acking again is one success, no second print row', ok(twice) && twice.data?.already === true && (await getDoc(`printJobs/${kotId}`))?.prints?.length === 1, twice);
  }

  // ── KT-S10 for real: two overlapping claims, exactly one wins ───────────
  {
    await call('cart-addItemToCart', { restaurantId: RID, tableId: 'table_kt_1', sessionId: sitting, addedBy, menuItemId: ITEM, quantity: 1 });
    const c2 = await call('cart-checkoutCart', { restaurantId: RID, tableId: 'table_kt_1', sessionId: sitting, addedBy });
    const job2 = (await listCol('printJobs')).find(j => j.orderId === orderId && j.state === 'queued' && j.kind === 'kot');
    check('KT-S2 the second round is its own job, ticket <orderNumber>-2, on the same order', ok(c2) && job2 && job2.ticketNo === `${orderNumber}-2`, job2);
    const [ra, rb] = await Promise.all([claim(job2.id, A), claim(job2.id, B)]);
    const wins = [ra, rb].filter(ok).length;
    check('KT-S10 two overlapping claims → exactly one wins, the other is "taken"', wins === 1 && [ra, rb].some(r => errData(r).why === 'taken'), { ra: ra.status, rb: rb.status, why: [errData(ra).why, errData(rb).why] });
    const holder = ok(ra) ? A : B;
    const f = await call('print-fail', { ...holder, jobId: job2.id, reason: 'connect timeout' });
    check('KT-S7 the holder fails it with "connect timeout" → queued again, failures 1', ok(f) && f.data?.failures === 1 && (await getDoc(`printJobs/${job2.id}`))?.state === 'queued', f);
    const s = await status();
    check('KT-S7 print-status shows KITCHEN waiting 1 with the last error', ok(s) && s.data?.stations?.kitchen?.waiting >= 1 && s.data?.stations?.kitchen?.lastError === 'connect timeout', s.data);
  }

  // ── KT-S5: reprint a round ──────────────────────────────────────────────
  {
    const r = await call('print-reprint', { restaurantId: RID, sessionId: manager, cartId });
    check('KT-S5 print-reprint {cartId} → reprint:<cartId>:kitchen:2, queued', ok(r) && r.data?.jobIds?.[0] === `reprint:${cartId}:kitchen:2` && (await getDoc(`printJobs/reprint:${cartId}:kitchen:2`))?.state === 'queued', r);
    const asServer = await call('print-reprint', { restaurantId: RID, sessionId: server, cartId });
    check('KT-S5 a SERVER is refused permission-denied on reprint', codeOf(asServer) === 'permission-denied', asServer);
    const bytes = bytesOf(await claim(`reprint:${cartId}:kitchen:2`));
    check('KT-S5 the reprint\'s bytes carry "REPRINT 2"', bytes.toString('latin1').includes('REPRINT 2'), bytes.toString('latin1').slice(0, 160));
  }

  // ── KT-S11: cancelling the round ────────────────────────────────────────
  {
    const c = await call('cart-updateCartStatus', { restaurantId: RID, orderId, cartIndex: 0, newStatus: 'CANCELLED', sessionId: manager });   // cartIndex is 0-based: round 1
    const cancels = (await listCol('printJobs')).filter(j => j.kind === 'cancel' && j.cartId === cartId);
    check('KT-S11 cancelling round 1 → one cancel job at the kitchen naming the voided line, queued', ok(c) && cancels.length === 1 && cancels[0].stationId === 'kitchen' && cancels[0].lineIds?.length === 1 && cancels[0].state === 'queued', { c, cancels });
    if (cancels[0]) {
      const bytes = bytesOf(await claim(cancels[0].id));
      check('KT-S11 the cancel ticket says *** CANCELLED *** and names the round', bytes.toString('latin1').includes('*** CANCELLED ***') && bytes.toString('latin1').includes(`#${orderNumber}-1`), bytes.toString('latin1').slice(0, 160));
    }
  }

  // ── KT-S6 / KT-S16: the bill and its copy ───────────────────────────────
  // The seed's tiramisu carries no tax block, so BL refuses to bill the real sitting (BL-S14). The bill path is
  // proven on a seeded, taxable line under its own draft, exactly as suites/billing.js does.
  {
    const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
    await delDoc('lines/kt_bill_line');
    await seed('lines/kt_bill_line', {
      lineId: 'kt_bill_line', cid: 'cid_kt_bill', orderId: 'order_kt_bill', cartId: 'cart_kt_bill', cartItemId: 'kt_bill_line', tableId: 'table_kt_1', sessionId: sitting,
      placedAt: Date.now(), placedBy: 'guest', menuItemId: 'mi_biryani', name: 'Chicken Biryani', qty: 1, listPrice: 45000, sent: true, v: 0, countsTowardTotal: true,
      draftId: 'draft_kt_bill', billId: null, categoryId: 'cat_x', taxSource: 'category',
      components: [{ id: 'kt_bill_line_item', kind: 'item', name: 'Chicken Biryani', unitListPrice: 45000, taxBlockId: 'food', taxCode: '9963' }],
      taxBlocks: { food: FOOD }, offer: null,
    });
    const issued = await call('billing-issue', { restaurantId: RID, sessionId: manager, cid: 'cid_kt_bill', draftId: 'draft_kt_bill', tableIds: ['table_kt_1'], expectedV: await draftVersions(RID, 'draft_kt_bill') });
    const billId = issued.data?.billId;
    const job = billId ? await getDoc(`printJobs/bill:${billId}`) : null;
    check('KT-S6 billing-issue queued bill:<billId> for the counter with the bill number as ticketNo and tableLabel KT1', ok(issued) && job && job.kind === 'bill' && job.state === 'queued' && job.ticketNo === issued.data?.number && job.tableLabel === 'KT1', { issued, job });
    if (billId) {
      const b = await claim(`bill:${billId}`);
      const text = bytesOf(b).toString('latin1');
      check('KT-S6 the bill\'s bytes carry "Tax Invoice", the number and "TOTAL"', ok(b) && b.data?.stationId === 'counter' && text.includes('Tax Invoice') && text.includes(issued.data.number) && text.includes('TOTAL'), text.slice(0, 200));
      const dup = await call('print-reprint', { restaurantId: RID, sessionId: manager, billId });
      const auditRows = (await listCol('audit')).filter(a => a.action === 'reprint' && a.cid === issued.data?.cid);
      check('KT-S16 print-reprint {billId} → duplicate:<billId>:1 and an ST audit row for reprint (P1)', ok(dup) && dup.data?.jobIds?.[0] === `duplicate:${billId}:1` && auditRows.length === 1 && auditRows[0].sev === 'P1', { dup, auditRows });
      const d = await claim(`duplicate:${billId}:1`);
      check('KT-S16 the copy\'s bytes carry DUPLICATE', bytesOf(d).toString('latin1').includes('DUPLICATE'), bytesOf(d).toString('latin1').slice(0, 120));
    }
  }

  // ── stale, force, sweep ─────────────────────────────────────────────────
  {
    const twoHoursAgo = Date.now() - 2 * 3600_000;
    await seed('printJobs/kot:cart_kt_old:kitchen', {
      jobId: 'kot:cart_kt_old:kitchen', cid: 'cid_kt_old', kind: 'kot', stationId: 'kitchen', ticketNo: '9-1', tableLabel: 'KT1', part: 1, parts: 1,
      orderId: 'order_kt_old', cartId: 'cart_kt_old', billId: null, paymentId: null, lineIds: ['x'], orderNumber: '9', cartIndex: 1, placedBy: 'guest', placedAt: twoHoursAgo,
      n: null, reason: null, by: null, state: 'queued', createdAt: twoHoursAgo, queuedAt: twoHoursAgo, claimedBy: null, claimedUntil: null, force: false, prints: [], failures: 0, lastError: null,
    });
    const p = await pending();
    check('KT-S7 a ticket queued two hours ago is NOT offered to the agent', ok(p) && !(p.data?.jobs || []).some(j => j.jobId === 'kot:cart_kt_old:kitchen'), p.data);
    const s = await status();
    check('KT-S23 print-status counts it as notAutoPrinted, not waiting', s.data?.stations?.kitchen?.notAutoPrinted >= 1, s.data);
    const forced = await call('print-reprint', { restaurantId: RID, sessionId: manager, jobId: 'kot:cart_kt_old:kitchen' });
    const p2 = await pending();
    check('Retry: print-reprint {jobId} forces it and the next pending read offers it', ok(forced) && (p2.data?.jobs || []).some(j => j.jobId === 'kot:cart_kt_old:kitchen'), { forced, p2: p2.data });
    const sw = await call('print-sweepNow', {});
    const rep = (sw.data?.reports || []).find(x => x.restaurantId === RID);
    check('KT-S23 the sweep answers a report for this restaurant with at least one overdue job', ok(sw) && rep && rep.overdue >= 1 && rep.open >= 1, sw.data);
  }

  return results;
}
