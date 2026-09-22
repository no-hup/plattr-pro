// KT · the print job, pure: ids, states, the lease, the stale rule, the status line. Sheet v4, R4, R5, R13.
// Everything here is arithmetic on ports.now(); nothing sleeps and nothing touches a socket.

import { PrintConfig, route } from './kot';
import { Line } from './line';

export type JobKind = 'kot' | 'cancel' | 'reprint' | 'bill' | 'credit' | 'duplicate' | 'drawer';
export type JobState = 'held' | 'queued' | 'claimed' | 'printed' | 'dropped';

export interface Job {
  jobId: string;
  cid: string;                 // the order's or bill's correlation id
  kind: JobKind;
  stationId: string | null;    // null = the counter station, resolved when claimed (bills, notes, duplicates, drawer)
  ticketNo: string;            // "42-1" for a round, the bill number for paper with money
  tableLabel: string;
  part: number; parts: number;
  orderId: string | null; cartId: string | null; billId: string | null; paymentId: string | null;
  lineIds: string[];           // kot: what the ticket carried; cancel: what was voided
  orderNumber: string | null; cartIndex: number | null; placedBy: string | null; placedAt: number | null;
  n: number | null;            // reprint / duplicate number
  reason: string | null; by: string | null;   // cancel
  state: JobState;
  createdAt: number;
  queuedAt: number | null;     // when it became claimable — the stale clock starts here (R4)
  claimedBy: string | null; claimedUntil: number | null;
  force: boolean;              // one-shot: the next claim skips the stale check (Retry / Reprint)
  prints: { at: number; by: string }[];
  failures: number; lastError: string | null;
}

/** Deterministic ids that carry their kind, so a cancel can never overwrite the printed KOT it follows (R4). */
export const ids = {
  kot: (cartId: string, st: string) => `kot:${cartId}:${st}`,
  cancel: (cartId: string, st: string, v: string | number) => `cancel:${cartId}:${st}:${v}`,
  reprint: (cartId: string, st: string, n: number) => `reprint:${cartId}:${st}:${n}`,
  bill: (billId: string) => `bill:${billId}`,
  credit: (noteId: string) => `credit:${noteId}`,
  duplicate: (billId: string, n: number) => `duplicate:${billId}:${n}`,
  drawer: (paymentId: string) => `drawer:${paymentId}`,
};

type Seed = Pick<Job, 'jobId' | 'cid' | 'kind' | 'ticketNo' | 'tableLabel'> & Partial<Job> & { now: number; held?: boolean };

/** A job as it is born: `queued` with `queuedAt = now`, or `held` behind the waiter gate with no clock running (R5). */
export function newJob(s: Seed): Job {
  const { now, held, ...rest } = s;
  return {
    stationId: null, part: 1, parts: 1, orderId: null, cartId: null, billId: null, paymentId: null, lineIds: [],
    orderNumber: null, cartIndex: null, placedBy: null, placedAt: null, n: null, reason: null, by: null,
    state: held ? 'held' : 'queued', createdAt: now, queuedAt: held ? null : now,
    claimedBy: null, claimedUntil: null, force: false, prints: [], failures: 0, lastError: null,
    ...rest,
  };
}

/** One KOT job per station a round's lines route to, in print.stations order, parts x/y. Throws where route() does (R1: the round fails). */
export function jobsForRound(lines: Line[], cfg: PrintConfig, head: { cid: string; orderId: string; cartId: string; orderNumber: string; cartIndex: number; tableLabel: string; placedBy: string; placedAt: number; now: number; held: boolean }): Job[] {
  const by = new Map<string, string[]>();
  for (const l of lines) { if (l.countsTowardTotal === false) continue; const st = route(l, cfg); by.set(st, [...(by.get(st) ?? []), l.lineId]); }
  const stations = Object.keys(cfg.stations).filter(id => by.has(id) && cfg.stations[id].enabled);
  return stations.map((st, i) => newJob({
    jobId: ids.kot(head.cartId, st), cid: head.cid, kind: 'kot', stationId: st, ticketNo: `${head.orderNumber}-${head.cartIndex}`,
    tableLabel: head.tableLabel, part: i + 1, parts: stations.length, orderId: head.orderId, cartId: head.cartId,
    lineIds: by.get(st) as string[], orderNumber: head.orderNumber, cartIndex: head.cartIndex, placedBy: head.placedBy, placedAt: head.placedAt,
    now: head.now, held: head.held,
  }));
}

/** A cancel ticket at each station the original went to, for the lines that were voided there (KT-S11, S12). */
export function cancelJobsFor(kotJobs: Job[], voidedLineIds: string[], c: { v: string | number; reason: string; by: string; now: number }): Job[] {
  const out: Job[] = [];
  for (const k of kotJobs) {
    if (k.kind !== 'kot' || !k.cartId || !k.stationId) continue;
    const lineIds = k.lineIds.filter(id => voidedLineIds.includes(id));
    if (!lineIds.length) continue;
    out.push(newJob({
      jobId: ids.cancel(k.cartId, k.stationId, c.v), cid: k.cid, kind: 'cancel', stationId: k.stationId, ticketNo: k.ticketNo, tableLabel: k.tableLabel,
      orderId: k.orderId, cartId: k.cartId, lineIds, orderNumber: k.orderNumber, cartIndex: k.cartIndex, placedBy: k.placedBy, placedAt: k.placedAt,
      reason: c.reason, by: c.by, now: c.now,
    }));
  }
  return out;
}

// ── The lease ──────────────────────────────────────────────────────────────

const MIN = 60_000;
export const isWaiting = (j: Job, now: number): boolean => j.state === 'queued' || (j.state === 'claimed' && (j.claimedUntil ?? 0) <= now);
export const isPaper = (j: Job): boolean => j.kind === 'kot' || j.kind === 'cancel' || j.kind === 'reprint';

export type Refusal = 'held' | 'done' | 'taken' | 'stale' | 'drop' | 'notHolder';
export type Verdict = { ok: true } | { ok: false; why: Refusal };

/**
 * May this agent take the job now? The holder inside its lease may (a lost answer is recovered by asking again);
 * anyone else waits for the lease. A KOT past `staleAfterMinutes` is not auto-printed unless `force` (KT-D4 amended);
 * a drawer past `drawerStaleSeconds` is dropped, never kicked late (KT-S17). Bills ignore age: a guest is waiting.
 */
export function claimable(j: Job, agentId: string, now: number, cfg: PrintConfig): Verdict {
  if (j.state === 'held') return { ok: false, why: 'held' };
  if (j.state === 'printed' || j.state === 'dropped') return { ok: false, why: 'done' };
  if (j.state === 'claimed' && (j.claimedUntil ?? 0) > now && j.claimedBy !== agentId) return { ok: false, why: 'taken' };
  const age = now - (j.queuedAt ?? j.createdAt);
  if (j.kind === 'drawer' && age > cfg.drawerStaleSeconds * 1000) return { ok: false, why: 'drop' };
  if (isPaper(j) && !j.force && cfg.staleAfterMinutes > 0 && age > cfg.staleAfterMinutes * MIN) return { ok: false, why: 'stale' };
  return { ok: true };
}

export function claim(j: Job, agentId: string, now: number, cfg: PrintConfig): { ok: true; job: Job } | { ok: false; why: Refusal } {
  const v = claimable(j, agentId, now, cfg);
  if (!v.ok) return v;
  return { ok: true, job: { ...j, state: 'claimed', claimedBy: agentId, claimedUntil: now + cfg.claimLeaseSeconds * 1000, force: false } };
}

/** Ack is idempotent for the holder: acking a printed job again is one success. A non-holder is refused (R4). */
export function ack(j: Job, agentId: string, now: number): { ok: true; job: Job; already: boolean } | { ok: false; why: Refusal } {
  if (j.state === 'printed') return j.prints.some(p => p.by === agentId) ? { ok: true, job: j, already: true } : { ok: false, why: 'notHolder' };
  if (j.state !== 'claimed' || j.claimedBy !== agentId) return { ok: false, why: 'notHolder' };
  return { ok: true, already: false, job: { ...j, state: 'printed', claimedUntil: null, prints: [...j.prints, { at: now, by: agentId }], lastError: null } };
}

/** The holder gives the job back: queued again, the failure counted. A non-holder is refused (a buggy client must not double KT-S10). */
export function fail(j: Job, agentId: string, reason: string): { ok: true; job: Job } | { ok: false; why: Refusal } {
  if (j.state !== 'claimed' || j.claimedBy !== agentId) return { ok: false, why: 'notHolder' };
  return { ok: true, job: { ...j, state: 'queued', claimedBy: null, claimedUntil: null, failures: j.failures + 1, lastError: reason } };
}

/** R5: the waiter confirmed — the clock starts now. */
export const release = (j: Job, now: number): Job => (j.state === 'held' ? { ...j, state: 'queued', queuedAt: now } : j);
export const drop = (j: Job): Job => ({ ...j, state: 'dropped', claimedBy: null, claimedUntil: null });

// ── What the till and the sweep read ───────────────────────────────────────

export interface StationStatus { waiting: number; oldestWaitingSeconds: number; notAutoPrinted: number; lastError: string | null }
export interface PrintStatus {
  stations: Record<string, StationStatus>;
  waiting: number;
  notAutoPrinted: number;
  lastClaimAt: number | null;      // the newest lease anyone took
  silentSeconds: number | null;    // how long jobs have waited with no agent claiming anything (KT-S23)
}

const stationOf = (j: Job, cfg: PrintConfig) => j.stationId ?? cfg.counterStation;

export function statusOf(jobs: Job[], now: number, cfg: PrintConfig): PrintStatus {
  const stations: Record<string, StationStatus> = {};
  const at = (st: string) => (stations[st] ??= { waiting: 0, oldestWaitingSeconds: 0, notAutoPrinted: 0, lastError: null });
  let lastClaimAt: number | null = null;
  let oldestWaiting: number | null = null;
  for (const j of jobs) {
    for (const p of j.prints) lastClaimAt = Math.max(lastClaimAt ?? 0, p.at);
    if (j.state === 'claimed' && j.claimedUntil) lastClaimAt = Math.max(lastClaimAt ?? 0, j.claimedUntil - cfg.claimLeaseSeconds * 1000);
    if (!isWaiting(j, now)) continue;
    const s = at(stationOf(j, cfg));
    const v = claimable(j, '', now, cfg);
    if (!v.ok && v.why === 'stale') { s.notAutoPrinted++; continue; }
    if (!v.ok && v.why === 'drop') continue;
    s.waiting++;
    const age = Math.floor((now - (j.queuedAt ?? j.createdAt)) / 1000);
    s.oldestWaitingSeconds = Math.max(s.oldestWaitingSeconds, age);
    oldestWaiting = Math.max(oldestWaiting ?? 0, age);
    if (j.lastError) s.lastError = j.lastError;
  }
  const waiting = Object.values(stations).reduce((a, s) => a + s.waiting, 0);
  const notAutoPrinted = Object.values(stations).reduce((a, s) => a + s.notAutoPrinted, 0);
  const silentSeconds = waiting && oldestWaiting !== null ? (lastClaimAt === null ? oldestWaiting : Math.max(0, Math.floor((now - lastClaimAt) / 1000))) : null;
  return { stations, waiting, notAutoPrinted, lastClaimAt, silentSeconds };
}

/** The sweep's finding: every waiting job older than `unclaimedAfterSeconds` (KT-S23). Prints nothing itself. */
export const overdue = (jobs: Job[], now: number, cfg: PrintConfig): Job[] =>
  jobs.filter(j => isWaiting(j, now) && now - (j.queuedAt ?? j.createdAt) > cfg.unclaimedAfterSeconds * 1000);

export { titleFor } from './receipt';
