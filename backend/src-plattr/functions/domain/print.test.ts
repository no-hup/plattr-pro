// KT · the job rules, pure, on a fake clock. Sheet v4 R4, R5, KT-S4, S7, S10, S17, S20, S23.

import { PRINT_DEFAULTS, printConfigFrom } from './kot';
import { Line } from './line';
import { Job, ack, cancelJobsFor, claim, claimable, fail, ids, isWaiting, jobsForRound, newJob, overdue, release, statusOf, titleFor } from './print';

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const cfg = printConfigFrom({ print: { route: { cat_pizza: 'kitchen', cat_beer: 'bar' } } });
const job = (over: Partial<Job> = {}): Job => newJob({ jobId: 'kot:c1:kitchen', cid: 'o1', kind: 'kot', stationId: 'kitchen', ticketNo: '42-1', tableLabel: '7', cartId: 'c1', lineIds: ['l1'], now: T0, ...over });

const line = (lineId: string, categoryId: string, block = 'food', counts = true): Line =>
  ({ lineId, categoryId, countsTowardTotal: counts, components: [{ id: lineId, kind: 'item', name: lineId, unitListPrice: 0, taxBlockId: block, taxCode: '' }] } as unknown as Line);

describe('ids carry their kind (R4)', () => {
  it('a kot, a cancel and a reprint of the same round at the same station are three documents', () => {
    expect(ids.kot('c1', 'kitchen')).toBe('kot:c1:kitchen');
    expect(ids.cancel('c1', 'kitchen', 'l1_v2')).toBe('cancel:c1:kitchen:l1_v2');
    expect(ids.reprint('c1', 'kitchen', 2)).toBe('reprint:c1:kitchen:2');
    expect(new Set([ids.kot('c1', 'kitchen'), ids.cancel('c1', 'kitchen', 1), ids.reprint('c1', 'kitchen', 2), ids.bill('b1'), ids.duplicate('b1', 1), ids.credit('n1'), ids.drawer('p1')]).size).toBe(7);
  });
});

describe('jobsForRound (KT-S1, S3, S4)', () => {
  const head = { cid: 'o1', orderId: 'o1', cartId: 'c1', orderNumber: '42', cartIndex: 3, tableLabel: '7', placedBy: 'staff:r', placedAt: T0, now: T0, held: false };
  it('KT-S3 pizza + pint → kitchen 1/2 and bar 2/2, each naming only its lines, queued with the clock started', () => {
    const js = jobsForRound([line('pz', 'cat_pizza'), line('kf', 'cat_beer', 'liquor')], cfg, head);
    expect(js.map(j => [j.jobId, j.part, j.parts, j.lineIds, j.state, j.queuedAt, j.ticketNo])).toEqual([
      ['kot:c1:kitchen', 1, 2, ['pz'], 'queued', T0, '42-3'],
      ['kot:c1:bar', 2, 2, ['kf'], 'queued', T0, '42-3'],
    ]);
  });
  it('KT-S4 behind the waiter gate the jobs are held with NO queuedAt: the stale clock has not started', () => {
    const [j] = jobsForRound([line('pz', 'cat_pizza')], cfg, { ...head, held: true });
    expect(j).toMatchObject({ state: 'held', queuedAt: null });
    expect(release(j, T0 + 40 * MIN)).toMatchObject({ state: 'queued', queuedAt: T0 + 40 * MIN });
  });
  it('a voided line makes no job; a round of only voided lines makes none', () => {
    expect(jobsForRound([line('pz', 'cat_pizza', 'food', false)], cfg, head)).toEqual([]);
  });
  it('a line with no categoryId still gets a job at the default station: R1, the round is never refused over routing', () => {
    expect(jobsForRound([line('x', undefined as unknown as string)], cfg, head).map(j => j.stationId)).toEqual(['kitchen']);
  });
});

describe('claim — the lease (KT-S10, S20, R4)', () => {
  it('KT-S10 the first tablet gets a 60 s lease; the second is told "taken" and prints nothing', () => {
    const a = claim(job(), 'tab_A', T0, cfg);
    expect(a.ok && a.job).toMatchObject({ state: 'claimed', claimedBy: 'tab_A', claimedUntil: T0 + 60_000 });
    const b = claim((a as { job: Job }).job, 'tab_B', T0 + 10_000, cfg);
    expect(b).toEqual({ ok: false, why: 'taken' });
  });
  it('the SAME tablet asking again inside its lease is handed the job again (a lost answer is recovered), lease renewed', () => {
    const a = (claim(job(), 'tab_A', T0, cfg) as { job: Job }).job;
    const again = claim(a, 'tab_A', T0 + 10_000, cfg);
    expect(again.ok && again.job.claimedUntil).toBe(T0 + 70_000);
  });
  it('KT-S20 the lease expires and the second tablet takes it: a ticket may print twice, never zero', () => {
    const a = (claim(job(), 'tab_A', T0, cfg) as { job: Job }).job;
    expect(claim(a, 'tab_B', T0 + 60_000, cfg).ok).toBe(true);
    expect(claim(a, 'tab_B', T0 + 59_999, cfg)).toEqual({ ok: false, why: 'taken' });
  });
  it('KT-S4 a held job cannot be claimed; a printed or dropped one is done', () => {
    expect(claimable(job({ state: 'held', queuedAt: null }), 'a', T0, cfg)).toEqual({ ok: false, why: 'held' });
    expect(claimable(job({ state: 'printed' }), 'a', T0, cfg)).toEqual({ ok: false, why: 'done' });
    expect(claimable(job({ state: 'dropped' }), 'a', T0, cfg)).toEqual({ ok: false, why: 'done' });
  });
  it('KT-S7 a KOT 30 minutes and one second old is not auto-printed ("stale"); at exactly 30 minutes it still is', () => {
    expect(claimable(job(), 'a', T0 + 30 * MIN, cfg).ok).toBe(true);
    expect(claimable(job(), 'a', T0 + 30 * MIN + 1, cfg)).toEqual({ ok: false, why: 'stale' });
  });
  it('the stale clock starts at queuedAt, not createdAt: a round held 40 minutes and confirmed now is fresh', () => {
    const j = release(job({ state: 'held', queuedAt: null }), T0 + 40 * MIN);
    expect(claimable(j, 'a', T0 + 41 * MIN, cfg).ok).toBe(true);
  });
  it('force lets a stale ticket through exactly once: the claim clears it', () => {
    const j = job({ force: true });
    const c = claim(j, 'a', T0 + 2 * 60 * MIN, cfg);
    expect(c.ok && c.job.force).toBe(false);
  });
  it('a bill ignores age: two hours later it still auto-prints, because a guest is waiting', () => {
    expect(claimable(job({ jobId: 'bill:b1', kind: 'bill', stationId: null, billId: 'b1', cartId: null }), 'a', T0 + 120 * MIN, cfg).ok).toBe(true);
  });
  it('KT-S17 a drawer kick older than 60 s is dropped, never kicked late; at 59 s it fires', () => {
    const d = job({ jobId: 'drawer:p1', kind: 'drawer', stationId: null, paymentId: 'p1', cartId: null });
    expect(claimable(d, 'a', T0 + 59_000, cfg).ok).toBe(true);
    expect(claimable(d, 'a', T0 + 61_000, cfg)).toEqual({ ok: false, why: 'drop' });
  });
  it('staleAfterMinutes 0 means print everything, always', () => {
    const c = printConfigFrom({ print: { staleAfterMinutes: 0 } });
    expect(claimable(job(), 'a', T0 + 6 * 60 * MIN, c).ok).toBe(true);
  });
});

describe('ack and fail are holder-checked and idempotent (R4)', () => {
  const held = (claim(job(), 'tab_A', T0, cfg) as { job: Job }).job;
  it('the holder acks → printed with one print row; acking again is one success, no second row', () => {
    const a = ack(held, 'tab_A', T0 + 5000);
    expect(a.ok && a.job).toMatchObject({ state: 'printed', prints: [{ at: T0 + 5000, by: 'tab_A' }], claimedUntil: null });
    const again = ack((a as { job: Job }).job, 'tab_A', T0 + 9000);
    expect(again.ok && again.already).toBe(true);
    expect((again as { job: Job }).job.prints).toHaveLength(1);
  });
  it('a non-holder acking is refused, and acking a job printed by someone else is refused too', () => {
    expect(ack(held, 'tab_B', T0)).toEqual({ ok: false, why: 'notHolder' });
    expect(ack((ack(held, 'tab_A', T0) as { job: Job }).job, 'tab_B', T0)).toEqual({ ok: false, why: 'notHolder' });
  });
  it('KT-S7 the holder fails → queued again with the reason and a failure count; a non-holder cannot fail it', () => {
    const f = fail(held, 'tab_A', 'connect timeout');
    expect(f.ok && f.job).toMatchObject({ state: 'queued', claimedBy: null, claimedUntil: null, failures: 1, lastError: 'connect timeout' });
    expect(fail(held, 'tab_B', 'x')).toEqual({ ok: false, why: 'notHolder' });
  });
  it('a stuck claim (lease passed) counts as waiting again, so the alarm and the pending read both see it', () => {
    expect(isWaiting(held, T0 + 59_000)).toBe(false);
    expect(isWaiting(held, T0 + 60_000)).toBe(true);
  });
});

describe('cancel tickets (KT-S11, S12)', () => {
  const kots = jobsForRound([line('pz', 'cat_pizza'), line('kf', 'cat_beer', 'liquor')], cfg, { cid: 'o1', orderId: 'o1', cartId: 'c1', orderNumber: '42', cartIndex: 1, tableLabel: '7', placedBy: 'staff:r', placedAt: T0, now: T0, held: false });
  it('KT-S11 voiding the whole round → one cancel job per station, each with only its lines, same ticket number', () => {
    const cs = cancelJobsFor(kots, ['pz', 'kf'], { v: 'cart_1', reason: 'guest left', by: 'staff:m', now: T0 + MIN });
    expect(cs.map(j => [j.jobId, j.lineIds, j.ticketNo, j.reason])).toEqual([
      ['cancel:c1:kitchen:cart_1', ['pz'], '42-1', 'guest left'],
      ['cancel:c1:bar:cart_1', ['kf'], '42-1', 'guest left'],
    ]);
  });
  it('KT-S12 voiding only the pint → a cancel at the bar only; the kitchen hears nothing', () => {
    expect(cancelJobsFor(kots, ['kf'], { v: 'kf_v1', reason: 'cut', by: 'm', now: T0 }).map(j => j.stationId)).toEqual(['bar']);
  });
});

describe('the status line and the sweep (KT-S7, S23)', () => {
  it('KT-S7 one failed bar ticket → BAR waiting 1 with its last error; kitchen absent', () => {
    const bar = (fail((claim(job({ jobId: 'kot:c1:bar', stationId: 'bar' }), 'a', T0, cfg) as { job: Job }).job, 'a', 'connect timeout') as { job: Job }).job;
    const s = statusOf([bar], T0 + 20_000, cfg);
    expect(s.stations).toEqual({ bar: { waiting: 1, oldestWaitingSeconds: 20, notAutoPrinted: 0, lastError: 'connect timeout' } });
    expect(s.waiting).toBe(1);
  });
  it('KT-S23 six queued jobs and nobody has ever claimed → silentSeconds is the oldest wait; a stuck claim is waiting too', () => {
    const jobs = Array.from({ length: 5 }, (_, i) => job({ jobId: `kot:c${i}:kitchen`, queuedAt: T0 + i * 1000 }));
    const stuck = (claim(job({ jobId: 'kot:c9:kitchen' }), 'a', T0, cfg) as { job: Job }).job;
    const s = statusOf([...jobs, stuck], T0 + 120_000, cfg);
    expect(s.waiting).toBe(6);
    expect(s.silentSeconds).toBe(120);
  });
  it('KT-S23 woken at 21:15: tickets past 30 minutes count as notAutoPrinted, not waiting', () => {
    const s = statusOf([job(), job({ jobId: 'kot:c2:kitchen', queuedAt: T0 + 40 * MIN })], T0 + 45 * MIN, cfg);
    expect(s.stations.kitchen).toMatchObject({ waiting: 1, notAutoPrinted: 1 });
  });
  it('a stale drawer is neither waiting nor counted', () => {
    expect(statusOf([job({ jobId: 'drawer:p', kind: 'drawer', stationId: null })], T0 + 5 * MIN, cfg).waiting).toBe(0);
  });
  it('the sweep names every waiting job older than 90 s; a held one is not waiting', () => {
    const jobs = [job({ queuedAt: T0 }), job({ jobId: 'kot:c2:kitchen', queuedAt: T0 + 60_000 }), job({ jobId: 'kot:c3:kitchen', state: 'held', queuedAt: null })];
    expect(overdue(jobs, T0 + 100_000, cfg).map(j => j.jobId)).toEqual(['kot:c1:kitchen']);
  });
  it('the defaults are the sheet\'s: lease 60, stale 30, unclaimed 90, drawer 60', () => {
    expect(PRINT_DEFAULTS).toMatchObject({ claimLeaseSeconds: 60, staleAfterMinutes: 30, unclaimedAfterSeconds: 90, drawerStaleSeconds: 60 });
  });
});

describe('the title follows the frozen blocks (KT-S14)', () => {
  it('food + liquor → Invoice-cum-Bill of Supply; food only → Tax Invoice; liquor only → Bill of Supply', () => {
    expect(titleFor([{ parts: [1] }, { parts: [] }])).toBe('Invoice-cum-Bill of Supply');
    expect(titleFor([{ parts: [1] }])).toBe('Tax Invoice');
    expect(titleFor([{ parts: [] }])).toBe('Bill of Supply');
  });
});
