// KT · app layer on fake ports and a fake clock. The domain owns the lease arithmetic; this file owns what the
// domain cannot see: who is asking, what one transaction reads before it writes, what the agent is handed.

import { ack, agentConfig, claim, failed, pending, reprint, status, sweep, sweepEverywhere, Ports, Tx, ApprovalError } from './print';
import { Job, newJob } from '../domain/print';
import { printConfigFrom, Ticket } from '../domain/kot';
import { Line } from '../domain/line';
import { Bill } from '../domain/billing';
import { Staff, ApplyRequest } from './approvals';

const RID = 'r1';
const T0 = Date.UTC(2026, 8, 22, 14, 44);   // 20:14 IST
const MIN = 60_000;

const line = (lineId: string, name: string, categoryId = 'cat_pizza'): Line =>
  ({ lineId, cid: 'o1', orderId: 'o1', cartId: 'c1', cartItemId: lineId, tableId: 't7', sessionId: 's7', placedAt: T0, placedBy: 'staff:ramesh', menuItemId: 'm', name, qty: 1,
    listPrice: 0, sent: true, v: 0, countsTowardTotal: true, draftId: 's7', billId: null, categoryId, components: [{ id: lineId, kind: 'item', name, unitListPrice: 0, taxBlockId: 'food', taxCode: '' }], taxBlocks: {} } as Line);

interface World { jobs: Record<string, Job>; lines: Line[]; bills: Record<string, Bill>; staff: Staff; configDoc?: unknown; names: Record<string, string> }

function fake(over: Partial<World> = {}) {
  const w: World = { jobs: {}, lines: [line('pz', 'Margherita')], bills: {}, staff: { staffId: 'k1', role: 'KITCHEN', status: 'active' } as Staff, names: { k1: 'Kitchen', m1: 'Priya', ramesh: 'Ramesh' }, ...over };
  w.jobs = Object.fromEntries(Object.values(w.jobs).map(j => [j.jobId, j]));   // keyed by jobId, whatever the test called them
  const logs: object[] = [];
  const approvals: ApplyRequest[] = [];
  let now = T0;
  const tx: Tx = {
    async getJob(id) { return w.jobs[id] ? { ...w.jobs[id] } : null; },
    createJob(j) { if (w.jobs[j.jobId]) throw new Error(`exists ${j.jobId}`); w.jobs[j.jobId] = j; },
    updateJob(id, patch) { w.jobs[id] = { ...w.jobs[id], ...patch }; },
    async linesOfCart(cartId) { return w.lines.filter(l => l.cartId === cartId); },
    async getBill(id) { return w.bills[id] ?? null; },
    async staffName(tag) { return tag && tag.startsWith('staff:') ? (w.names[tag.slice(6)] ?? tag.slice(6)) : 'guest'; },
  };
  const ports: Ports & { world: World; logs: object[]; approvals: ApplyRequest[]; tick(ms: number): void } = {
    world: w, logs, approvals, tick: ms => { now += ms; },
    now: () => now,
    log: l => logs.push(l),
    staff: { async bySession(_r, sid) { if (sid !== 'ok') throw new ApprovalError('unauthenticated', 'bad session'); return w.staff; } },
    config: { async print() { return { print: printConfigFrom(w.configDoc ?? { print: { route: { cat_pizza: 'kitchen', cat_beer: 'bar' } } }), tzOffsetMinutes: 330 }; } },
    jobs: {
      async open() { return Object.values(w.jobs).filter(j => ['held', 'queued', 'claimed'].includes(j.state)); },
      async ofCart(_r, cartId) { return Object.values(w.jobs).filter(j => j.cartId === cartId); },
      async ofBill(_r, billId) { return Object.values(w.jobs).filter(j => j.billId === billId); },
    },
    async tableLabel(_r, ids) { return ids.map(i => i.replace('table_', '')).join('+'); },
    encode: (t: Ticket) => Uint8Array.from(Buffer.from(`<${t.kind}:${t.stationId}:${t.rows.map(r => r.text.trim()).join('|')}${t.drawer ? ':DRAWER' : ''}>`)),
    async approve(req) { approvals.push(req); return { auditId: `${req.cid}_reprint_1` }; },
    async transact(_r, fn) { return fn(tx); },
    async restaurantIds() { return [RID]; },
  };
  return ports;
}
const kot = (over: Partial<Job> = {}): Job => newJob({ jobId: 'kot:c1:kitchen', cid: 'o1', kind: 'kot', stationId: 'kitchen', ticketNo: '42-1', tableLabel: '7', orderId: 'o1', cartId: 'c1', lineIds: ['pz'], orderNumber: '42', cartIndex: 1, placedBy: 'staff:ramesh', placedAt: T0, now: T0, ...over });
const A = { restaurantId: RID, sessionId: 'ok', kind: 'kitchen', agentId: 'tab_A' };
const B = { ...A, agentId: 'tab_B' };
const decoded = (b64: string) => Buffer.from(b64, 'base64').toString();

describe('pending — what an agent may take (R13, KT-S4, S7)', () => {
  it('a queued KOT is offered, oldest first, with its station and ticket number', async () => {
    const ports = fake({ jobs: { a: kot({ jobId: 'a', queuedAt: T0 + 1000 }), b: kot({ jobId: 'b', queuedAt: T0 }) } });
    expect((await pending(ports, A)).jobs.map(j => j.jobId)).toEqual(['b', 'a']);
    expect((await pending(ports, A)).jobs[0]).toMatchObject({ kind: 'kot', stationId: 'kitchen', ticketNo: '42-1' });
  });
  it('R13 an agent kind not in print.agents is refused permission-denied, whatever its session', async () => {
    const ports = fake({ jobs: { a: kot() } });
    await expect(pending(ports, { ...A, kind: 'bridge' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(pending(ports, { ...A, agentId: '' })).rejects.toMatchObject({ code: 'invalid-argument' });
  });
  it('an unknown staff session is unauthenticated before anything is read', async () => {
    await expect(pending(fake(), { ...A, sessionId: 'nope' })).rejects.toMatchObject({ code: 'unauthenticated' });
  });
  it('KT-S4 a held job is not offered; after release it is', async () => {
    const ports = fake({ jobs: { a: kot({ state: 'held', queuedAt: null }) } });
    expect((await pending(ports, A)).jobs).toEqual([]);
    ports.world.jobs.a = { ...ports.world.jobs.a, state: 'queued', queuedAt: T0 };
    expect((await pending(ports, A)).jobs).toHaveLength(1);
  });
  it('KT-S7 a KOT older than 30 minutes is not offered (the till counts it); a bill of that age is', async () => {
    const ports = fake({ jobs: { a: kot(), b: newJob({ jobId: 'bill:b1', cid: 'b1', kind: 'bill', ticketNo: 'A/1', tableLabel: '7', billId: 'b1', now: T0 }) } });
    ports.tick(31 * MIN);
    expect((await pending(ports, A)).jobs.map(j => j.jobId)).toEqual(['bill:b1']);
  });
  it('KT-S17 a stale drawer kick is dropped by the pending read, with a log line, never offered', async () => {
    const ports = fake({ jobs: { d: newJob({ jobId: 'drawer:p1', cid: 'b1', kind: 'drawer', ticketNo: 'A/1', tableLabel: '7', paymentId: 'p1', now: T0 }) } });
    ports.tick(61_000);
    expect((await pending(ports, A)).jobs).toEqual([]);
    expect(ports.world.jobs['drawer:p1'].state).toBe('dropped');
    expect(ports.logs).toContainEqual(expect.objectContaining({ jobId: 'drawer:p1', to: 'dropped' }));
  });
  it('a job the other tablet holds inside its lease is not offered to this one; once the lease passes it is', async () => {
    const ports = fake({ jobs: { a: kot({ jobId: 'a' }) } });
    await claim(ports, { ...B, jobId: 'a' });
    expect((await pending(ports, A)).jobs).toEqual([]);
    ports.tick(60_000);
    expect((await pending(ports, A)).jobs.map(j => j.jobId)).toEqual(['a']);
  });
});

describe('claim — lease, render, bytes (R3, KT-S10, S20)', () => {
  it('KT-S1 the agent is handed base64 bytes of a KITCHEN ticket for table 7 with the captain\'s name, and the job is claimed', async () => {
    const ports = fake({ jobs: { 'kot:c1:kitchen': kot() }, names: { ramesh: 'Ramesh' } });
    const r = await claim(ports, { ...A, jobId: 'kot:c1:kitchen' });
    expect(r).toMatchObject({ jobId: 'kot:c1:kitchen', ticketNo: '42-1', stationId: 'kitchen', copies: 1 });
    expect(decoded(r.bytes)).toBe('<kot:kitchen:TABLE 7|#42-1  KITCHEN                             20:14||1 x Margherita||by Ramesh>');
    expect(ports.world.jobs['kot:c1:kitchen']).toMatchObject({ state: 'claimed', claimedBy: 'tab_A', claimedUntil: T0 + 60_000 });
    expect(ports.logs).toContainEqual(expect.objectContaining({ cid: 'o1', jobId: 'kot:c1:kitchen', to: 'claimed', by: 'tab_A' }));
  });
  it('KT-S10 the second tablet is refused failed-precondition "taken"; the same tablet gets the same bytes again', async () => {
    const ports = fake({ jobs: { 'kot:c1:kitchen': kot() } });
    const first = await claim(ports, { ...A, jobId: 'kot:c1:kitchen' });
    await expect(claim(ports, { ...B, jobId: 'kot:c1:kitchen' })).rejects.toMatchObject({ code: 'failed-precondition', details: { why: 'taken' } });
    ports.tick(10_000);
    expect((await claim(ports, { ...A, jobId: 'kot:c1:kitchen' })).bytes).toBe(first.bytes);
  });
  it('KT-S20 after the lease the other tablet claims it', async () => {
    const ports = fake({ jobs: { 'kot:c1:kitchen': kot() } });
    await claim(ports, { ...A, jobId: 'kot:c1:kitchen' });
    ports.tick(60_000);
    expect((await claim(ports, { ...B, jobId: 'kot:c1:kitchen' })).stationId).toBe('kitchen');
  });
  it('a stale KOT is refused with why "stale"; forced, it goes through and force clears', async () => {
    const ports = fake({ jobs: { 'kot:c1:kitchen': kot() } });
    ports.tick(31 * MIN);
    await expect(claim(ports, { ...A, jobId: 'kot:c1:kitchen' })).rejects.toMatchObject({ details: { why: 'stale' } });
    ports.world.jobs['kot:c1:kitchen'].force = true;
    await claim(ports, { ...A, jobId: 'kot:c1:kitchen' });
    expect(ports.world.jobs['kot:c1:kitchen'].force).toBe(false);
  });
  it('KT-S11 a cancel job renders *** CANCELLED *** with the voided line and the manager\'s name', async () => {
    const ports = fake({ jobs: { c: kot({ jobId: 'c', kind: 'cancel', reason: 'guest left', by: 'staff:m1', createdAt: T0 + 5 * MIN }) }, names: { ramesh: 'Ramesh', m1: 'Priya' } });
    expect(decoded((await claim(ports, { ...A, jobId: 'c' })).bytes)).toMatch(/^<cancel:kitchen:\*\*\* CANCELLED \*\*\*\|TABLE 7\|#42-1  KITCHEN\s+20:19\|\|1 x Margherita\|\|guest left\|by Priya>$/);
  });
  it('KT-S5 a reprint job renders REPRINT n from the lines as they are now', async () => {
    const ports = fake({ jobs: { r: kot({ jobId: 'r', kind: 'reprint', n: 2, createdAt: T0 + 66 * MIN }) } });
    expect(decoded((await claim(ports, { ...A, jobId: 'r' })).bytes)).toMatch(/REPRINT 2  21:20/);
  });
  it('KT-S6 a bill job renders the bill at the counter with the title BL\'s blocks imply; the drawer job just pulses', async () => {
    const bill = { billId: 'b1', number: 'A/0417', cid: 'b1', tableIds: ['table_7'], issuedAt: T0, lines: [], blocks: [{ id: 'food', label: 'GST', mode: 'exclusive', taxable: 0, parts: [{ label: 'CGST', rateBps: 250, amount: 0 }], total: 0 }], charges: [], discount: null, subtotal: 0, taxTotal: 0, roundOff: 0, payable: 0,
      seller: { name: 'Hotel S', address: 'x', taxId: 'g', stateCode: '29', placeOfSupply: 'KA' }, status: 'issued', creditNotes: [] } as unknown as Bill;
    const ports = fake({ bills: { b1: bill }, jobs: {
      b: newJob({ jobId: 'bill:b1', cid: 'b1', kind: 'bill', ticketNo: 'A/0417', tableLabel: '7', billId: 'b1', now: T0 }),
      d: newJob({ jobId: 'drawer:p1', cid: 'b1', kind: 'drawer', ticketNo: 'A/0417', tableLabel: '7', paymentId: 'p1', now: T0 }),
    } });
    const b = await claim(ports, { ...A, jobId: 'bill:b1' });
    expect(b.stationId).toBe('counter');
    expect(decoded(b.bytes)).toMatch(/^<bill:counter:Hotel S\|x\|GSTIN g\|Tax Invoice\|Bill A\/0417/);
    expect(decoded((await claim(ports, { ...A, jobId: 'drawer:p1' })).bytes)).toBe('<drawer:counter::DRAWER>');
  });
  it('a bill job whose bill is gone is refused inside the transaction and nothing is claimed', async () => {
    const ports = fake({ jobs: { b: newJob({ jobId: 'bill:b9', cid: 'b9', kind: 'bill', ticketNo: 'A/9', tableLabel: '7', billId: 'b9', now: T0 }) } });
    await expect(claim(ports, { ...A, jobId: 'bill:b9' })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(ports.world.jobs['bill:b9'].state).toBe('queued');
  });
  it('an unknown job is not-found', async () => {
    await expect(claim(fake(), { ...A, jobId: 'nope' })).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('ack and fail (R4, KT-S7)', () => {
  it('the holder acks → printed, one log line; acking again is a no-op success with no second log line', async () => {
    const ports = fake({ jobs: { 'kot:c1:kitchen': kot() } });
    await claim(ports, { ...A, jobId: 'kot:c1:kitchen' });
    expect(await ack(ports, { ...A, jobId: 'kot:c1:kitchen' })).toEqual({ jobId: 'kot:c1:kitchen', state: 'printed', already: false });
    const n = ports.logs.length;
    expect(await ack(ports, { ...A, jobId: 'kot:c1:kitchen' })).toMatchObject({ already: true });
    expect(ports.logs).toHaveLength(n);
    expect(ports.world.jobs['kot:c1:kitchen'].prints).toHaveLength(1);
  });
  it('a non-holder acking or failing is refused permission-denied and nothing changes', async () => {
    const ports = fake({ jobs: { 'kot:c1:kitchen': kot() } });
    await claim(ports, { ...A, jobId: 'kot:c1:kitchen' });
    await expect(ack(ports, { ...B, jobId: 'kot:c1:kitchen' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(failed(ports, { ...B, jobId: 'kot:c1:kitchen', reason: 'x' })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(ports.world.jobs['kot:c1:kitchen'].state).toBe('claimed');
  });
  it('KT-S7 the holder fails with "connect timeout" → queued again, failures 1, the reason kept for the status line', async () => {
    const ports = fake({ jobs: { 'kot:c1:kitchen': kot() } });
    await claim(ports, { ...A, jobId: 'kot:c1:kitchen' });
    expect(await failed(ports, { ...A, jobId: 'kot:c1:kitchen', reason: 'connect timeout' })).toEqual({ jobId: 'kot:c1:kitchen', state: 'queued', failures: 1 });
    expect(ports.world.jobs['kot:c1:kitchen']).toMatchObject({ state: 'queued', claimedBy: null, lastError: 'connect timeout' });
  });
});

describe('the till: status and reprint (KT-S5, S16, S23)', () => {
  const asManager = (ports: ReturnType<typeof fake>) => { ports.world.staff = { staffId: 'm1', role: 'MANAGER', status: 'active' } as Staff; return ports; };
  it('KT-S23 status reads the same facts the sweep logs: 2 waiting, silent 100 s', async () => {
    const ports = fake({ jobs: { a: kot({ jobId: 'a' }), b: kot({ jobId: 'b', queuedAt: T0 + 50_000 }) } });
    ports.tick(100_000);
    const s = await status(ports, { restaurantId: RID, sessionId: 'ok' });
    expect(s).toMatchObject({ waiting: 2, silentSeconds: 100, stations: { kitchen: { waiting: 2, oldestWaitingSeconds: 100 } } });
  });
  it('Retry: forcing a waiting stale job needs a manager; a captain is refused 403', async () => {
    const ports = fake({ jobs: { 'kot:c1:kitchen': kot() } });
    await expect(reprint(ports, { restaurantId: RID, sessionId: 'ok', jobId: 'kot:c1:kitchen' })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(await reprint(asManager(ports), { restaurantId: RID, sessionId: 'ok', jobId: 'kot:c1:kitchen' })).toEqual({ jobIds: ['kot:c1:kitchen'] });
    expect(ports.world.jobs['kot:c1:kitchen'].force).toBe(true);
  });
  it('forcing a printed job is refused: reprint the round instead', async () => {
    const ports = asManager(fake({ jobs: { 'kot:c1:kitchen': kot({ state: 'printed' }) } }));
    await expect(reprint(ports, { restaurantId: RID, sessionId: 'ok', jobId: 'kot:c1:kitchen' })).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('KT-S5 reprinting a round → a REPRINT 2 job at every station the original went to, then REPRINT 3', async () => {
    const ports = asManager(fake({ jobs: { 'kot:c1:kitchen': kot({ state: 'printed' }), 'kot:c1:bar': kot({ jobId: 'kot:c1:bar', stationId: 'bar', state: 'printed', lineIds: ['kf'] }) } }));
    expect((await reprint(ports, { restaurantId: RID, sessionId: 'ok', cartId: 'c1' })).jobIds).toEqual(['reprint:c1:kitchen:2', 'reprint:c1:bar:2']);
    expect(ports.world.jobs['reprint:c1:bar:2']).toMatchObject({ kind: 'reprint', n: 2, lineIds: ['kf'], state: 'queued', by: 'm1' });
    expect((await reprint(ports, { restaurantId: RID, sessionId: 'ok', cartId: 'c1' })).jobIds[0]).toBe('reprint:c1:kitchen:3');
  });
  it('reprinting a round nothing was ever queued for is not-found', async () => {
    await expect(reprint(asManager(fake()), { restaurantId: RID, sessionId: 'ok', cartId: 'zzz' })).rejects.toMatchObject({ code: 'not-found' });
  });
  it('KT-S16 a DUPLICATE goes through ST\'s reprint door (the P1 audit row) and queues duplicate:b1:1, then :2', async () => {
    const bill = { billId: 'b1', number: 'A/0417', cid: 'cid_b1', tableIds: ['table_7'], blocks: [], lines: [], status: 'paid' } as unknown as Bill;
    const ports = asManager(fake({ bills: { b1: bill } }));
    expect((await reprint(ports, { restaurantId: RID, sessionId: 'ok', billId: 'b1' })).jobIds).toEqual(['duplicate:b1:1']);
    expect(ports.approvals[0]).toMatchObject({ action: 'reprint', cid: 'cid_b1', note: 'bill A/0417 copy 1' });
    expect(ports.world.jobs['duplicate:b1:1']).toMatchObject({ kind: 'duplicate', ticketNo: 'A/0417', tableLabel: '7', n: 1 });
    expect((await reprint(ports, { restaurantId: RID, sessionId: 'ok', billId: 'b1' })).jobIds).toEqual(['duplicate:b1:2']);
  });
  it('the kitchen app\'s config read carries stations and the agent numbers, never a PIN key', async () => {
    const c = await agentConfig(fake(), { restaurantId: RID, sessionId: 'ok' });
    expect(Object.keys(c).sort()).toEqual(['agents', 'claimLeaseSeconds', 'connectTimeoutMs', 'counterStation', 'pollSeconds', 'retryCount', 'retryDelayMs', 'stations', 'writeTimeoutMs']);
  });
});

describe('the sweep (KT-4, KT-S23)', () => {
  it('names each waiting job older than 90 s with cid, station and age; writes one sweep line per restaurant', async () => {
    const ports = fake({ jobs: { a: kot({ jobId: 'a' }), b: kot({ jobId: 'b', queuedAt: T0 + 60_000 }) } });
    ports.tick(100_000);
    expect(await sweep(ports, RID)).toEqual({ restaurantId: RID, open: 2, overdue: 1, silentSeconds: 100 });
    expect(ports.logs).toContainEqual(expect.objectContaining({ evt: 'job.overdue', cid: 'o1', jobId: 'a', station: 'kitchen', ageSeconds: 100 }));
    expect(ports.logs).toContainEqual(expect.objectContaining({ evt: 'sweep', restaurantId: RID, overdue: 1 }));
  });
  it('a quiet minute is one sweep line with zeros, so it is distinguishable from a minute that did not run', async () => {
    const ports = fake();
    await sweepEverywhere(ports);
    expect(ports.logs).toEqual([{ mod: 'print', evt: 'sweep', restaurantId: RID, open: 0, overdue: 0, silentSeconds: null }]);
  });
  it('a restaurant whose config read throws is logged and skipped', async () => {
    const ports = fake();
    ports.config.print = async () => { throw new Error('settings unreadable'); };
    expect(await sweepEverywhere(ports)).toEqual([]);
    expect(ports.logs).toContainEqual(expect.objectContaining({ evt: 'sweep.failed', restaurantId: RID }));
  });
});
