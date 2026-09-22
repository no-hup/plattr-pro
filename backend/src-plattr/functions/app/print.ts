// KT · use-cases: what the agent calls (pending, claim, ack, fail), what the till calls (status, reprint), and the
// sweep. Domain does every decision; ports do the I/O. Sheet: moonshot/SPEC_KT_print_path.md v4.
//
// R3 — the server renders AND encodes: claim() answers bytes, and the job stores none of them.
// R13 — every call is a staff-session call; `kind` is checked against print.agents; `agentId` becomes claimedBy.

import { Bill } from '../domain/billing';
import { Line } from '../domain/line';
import { PrintConfig, Round, Ticket, kotTickets } from '../domain/kot';
import { billTicket, creditNoteTicket } from '../domain/receipt';
import {
  Job, Refusal, ack as ackJob, claim as claimJob, claimable, fail as failJob, drop, ids, isWaiting, newJob, overdue, statusOf, titleFor, PrintStatus,
} from '../domain/print';
import { ApprovalError, Staff, ApplyRequest, ApplyResult } from './approvals';
export { ApprovalError };

export interface Tx {
  getJob(jobId: string): Promise<Job | null>;
  createJob(job: Job): void;                 // must fail if the id exists
  updateJob(jobId: string, patch: Partial<Job>): void;
  linesOfCart(cartId: string): Promise<Line[]>;
  getBill(billId: string): Promise<Bill | null>;
  staffName(tag: string | null): Promise<string>;     // 'staff:<id>' → the name on the servers doc; anything else → 'guest'
}

export interface Ports {
  now(): number;
  log(line: object): void;
  staff: { bySession(restaurantId: string, sessionId: string): Promise<Staff> };
  config: { print(restaurantId: string): Promise<{ print: PrintConfig; tzOffsetMinutes: number }> };
  jobs: {
    open(restaurantId: string): Promise<Job[]>;                        // held, queued, claimed
    ofCart(restaurantId: string, cartId: string): Promise<Job[]>;
    ofBill(restaurantId: string, billId: string): Promise<Job[]>;
  };
  tableLabel(restaurantId: string, tableIds: string[]): Promise<string>;
  encode(ticket: Ticket, cfg: { codePage: number; drawerPulseMs: number }): Uint8Array;
  approve(req: ApplyRequest): Promise<ApplyResult>;                   // ST's door for the DUPLICATE audit row (KT-S16)
  transact<T>(restaurantId: string, fn: (t: Tx) => Promise<T>): Promise<T>;
  restaurantIds(): Promise<string[]>;
}

const fail = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new ApprovalError(code, message, details); };
const REFUSAL: Record<Refusal, string> = {
  held: 'this round is waiting for the waiter', done: 'this job is already printed or dropped', taken: 'another agent holds this job',
  stale: 'this ticket is older than print.staleAfterMinutes; Reprint prints it', drop: 'a drawer kick this old is dropped', notHolder: 'you do not hold this job',
};

async function actor(ports: Ports, restaurantId: string, sessionId: string): Promise<Staff> {
  const staff = await ports.staff.bySession(restaurantId, sessionId);
  if (staff.status !== 'active') fail('permission-denied', 'this login is not active');
  return staff;
}
const MANAGERS = ['MANAGER', 'ADMIN'];

export interface AgentRequest { restaurantId: string; sessionId: string; kind: string; agentId: string }
function agentOf(req: AgentRequest, cfg: PrintConfig): string {
  if (typeof req.agentId !== 'string' || !req.agentId) fail('invalid-argument', 'agentId required');
  if (!cfg.agents.includes(req.kind)) fail('permission-denied', `agent kind ${req.kind} may not claim print jobs here`, { agents: cfg.agents });
  return req.agentId;
}

// ── The agent's four calls ─────────────────────────────────────────────────

export interface PendingJob { jobId: string; kind: Job['kind']; stationId: string; ticketNo: string; queuedAt: number | null }

/** What this agent may take now, oldest first. Stale KOTs are left out (counted on the till); a stale drawer is dropped here. */
export async function pending(ports: Ports, req: AgentRequest): Promise<{ jobs: PendingJob[] }> {
  await actor(ports, req.restaurantId, req.sessionId);
  const { print: cfg } = await ports.config.print(req.restaurantId);
  const agentId = agentOf(req, cfg);
  const now = ports.now();
  const out: PendingJob[] = [];
  for (const j of await ports.jobs.open(req.restaurantId)) {
    const v = claimable(j, agentId, now, cfg);
    if (v.ok) { out.push({ jobId: j.jobId, kind: j.kind, stationId: j.stationId ?? cfg.counterStation, ticketNo: j.ticketNo, queuedAt: j.queuedAt }); continue; }
    if (v.why === 'drop') {
      await ports.transact(req.restaurantId, async t => { const cur = await t.getJob(j.jobId); if (cur && isWaiting(cur, now)) t.updateJob(j.jobId, { state: 'dropped', claimedBy: null, claimedUntil: null }); });
      ports.log({ mod: 'print', cid: j.cid, jobId: j.jobId, from: j.state, to: 'dropped', why: 'drawer stale' });
    }
  }
  out.sort((a, b) => (a.queuedAt ?? 0) - (b.queuedAt ?? 0));
  return { jobs: out };
}

/** Claim: the lease, then the render, then the bytes. Same agent asking again inside its lease gets the same bytes. */
export async function claim(ports: Ports, req: AgentRequest & { jobId: string }): Promise<{ jobId: string; ticketNo: string; stationId: string; bytes: string; copies: number }> {
  await actor(ports, req.restaurantId, req.sessionId);
  const { print: cfg, tzOffsetMinutes } = await ports.config.print(req.restaurantId);
  const agentId = agentOf(req, cfg);
  const now = ports.now();
  const r = await ports.transact(req.restaurantId, async t => {
    const j = await t.getJob(req.jobId);
    if (!j) throw new ApprovalError('not-found', 'no such print job');
    const c = claimJob(j, agentId, now, cfg);
    if (!c.ok) throw new ApprovalError(c.why === 'taken' ? 'failed-precondition' : 'failed-precondition', REFUSAL[c.why], { why: c.why, claimedUntil: j.claimedUntil });
    const ticket = await render(t, ports, j, cfg, tzOffsetMinutes, now);   // reads, before the write below
    const bytes = ports.encode(ticket, { codePage: cfg.codePage, drawerPulseMs: cfg.drawerPulseMs });
    t.updateJob(j.jobId, { state: 'claimed', claimedBy: agentId, claimedUntil: c.job.claimedUntil, force: false });
    return { jobId: j.jobId, ticketNo: j.ticketNo, stationId: ticket.stationId, bytes: Buffer.from(bytes).toString('base64'), copies: ticket.copies, from: j.state, cid: j.cid };
  });
  ports.log({ mod: 'print', cid: r.cid, jobId: r.jobId, from: r.from, to: 'claimed', by: agentId, station: r.stationId });
  const { from: _f, cid: _c, ...out } = r;
  return out;
}

export async function ack(ports: Ports, req: AgentRequest & { jobId: string }): Promise<{ jobId: string; state: 'printed'; already: boolean }> {
  await actor(ports, req.restaurantId, req.sessionId);
  const { print: cfg } = await ports.config.print(req.restaurantId);
  const agentId = agentOf(req, cfg);
  const now = ports.now();
  const r = await ports.transact(req.restaurantId, async t => {
    const j = await t.getJob(req.jobId);
    if (!j) throw new ApprovalError('not-found', 'no such print job');
    const a = ackJob(j, agentId, now);
    if (!a.ok) throw new ApprovalError('permission-denied', REFUSAL[a.why], { why: a.why });
    if (!a.already) t.updateJob(j.jobId, { state: 'printed', claimedUntil: null, prints: a.job.prints, lastError: null });
    return { cid: j.cid, already: a.already, printed: a.job.prints.length };
  });
  if (!r.already) ports.log({ mod: 'print', cid: r.cid, jobId: req.jobId, from: 'claimed', to: 'printed', by: agentId, prints: r.printed });
  return { jobId: req.jobId, state: 'printed', already: r.already };
}

export async function failed(ports: Ports, req: AgentRequest & { jobId: string; reason: string }): Promise<{ jobId: string; state: 'queued'; failures: number }> {
  await actor(ports, req.restaurantId, req.sessionId);
  const { print: cfg } = await ports.config.print(req.restaurantId);
  const agentId = agentOf(req, cfg);
  const reason = typeof req.reason === 'string' ? req.reason.slice(0, 200) : 'unknown';
  const r = await ports.transact(req.restaurantId, async t => {
    const j = await t.getJob(req.jobId);
    if (!j) throw new ApprovalError('not-found', 'no such print job');
    const f = failJob(j, agentId, reason);
    if (!f.ok) throw new ApprovalError('permission-denied', REFUSAL[f.why], { why: f.why });
    t.updateJob(j.jobId, { state: 'queued', claimedBy: null, claimedUntil: null, failures: f.job.failures, lastError: reason });
    return { cid: j.cid, failures: f.job.failures };
  });
  ports.log({ mod: 'print', cid: r.cid, jobId: req.jobId, from: 'claimed', to: 'queued', by: agentId, reason, failures: r.failures });
  return { jobId: req.jobId, state: 'queued', failures: r.failures };
}

// ── Rendering at claim time (R3): the job carries identity, the lines and the bill carry content ─────────

async function render(t: Tx, ports: Ports, j: Job, cfg: PrintConfig, tz: number, now: number): Promise<Ticket> {
  const counter = cfg.stations[cfg.counterStation];
  if (j.kind === 'drawer') {
    if (!counter) throw new ApprovalError('failed-precondition', `counter station ${cfg.counterStation} is not configured`);
    return { kind: 'drawer', stationId: cfg.counterStation, charsPerLine: counter.charsPerLine, copies: 1, rows: [], cut: false, drawer: true };
  }
  if (j.kind === 'bill' || j.kind === 'duplicate' || j.kind === 'credit') {
    const bill = j.billId ? await t.getBill(j.billId) : null;
    if (!bill) throw new ApprovalError('failed-precondition', `bill ${j.billId} not found for job ${j.jobId}`);
    const o = { tzOffsetMinutes: tz, tableLabel: j.tableLabel };
    return j.kind === 'credit' ? creditNoteTicket(bill, cfg, o) : billTicket(bill, cfg, { ...o, kind: j.kind, title: titleFor(bill.blocks), at: now });
  }
  // kot / reprint / cancel: the frozen lines of the round, the ones this job names
  if (!j.cartId || !j.stationId) throw new ApprovalError('failed-precondition', `job ${j.jobId} names no round`);
  const all = await t.linesOfCart(j.cartId);
  const lines = all.filter(l => j.lineIds.includes(l.lineId));
  if (!lines.length) throw new ApprovalError('failed-precondition', `no lines found for job ${j.jobId}`);
  const round: Round = {
    orderNumber: j.orderNumber ?? j.ticketNo.split('-')[0], cartIndex: j.cartIndex ?? (Number(j.ticketNo.split('-')[1]) || 1),
    tableLabel: j.tableLabel, placedBy: await t.staffName(j.placedBy), placedAt: j.placedAt ?? j.createdAt, lines,
  };
  const opts = j.kind === 'cancel'
    ? { kind: 'cancel' as const, at: j.createdAt, tzOffsetMinutes: tz, reason: j.reason ?? '', by: await t.staffName(j.by) }
    : j.kind === 'reprint' ? { kind: 'reprint' as const, at: j.createdAt, tzOffsetMinutes: tz, n: j.n ?? 2 }
    : { kind: 'kot' as const, at: j.createdAt, tzOffsetMinutes: tz };
  // A voided line is still what a cancel ticket is about; kotTickets keeps voided lines only for a cancel.
  const ticket = kotTickets(round, cfg, opts).find(x => x.stationId === j.stationId);
  if (!ticket) throw new ApprovalError('failed-precondition', `the lines of job ${j.jobId} no longer route to ${j.stationId}`);
  return ticket;
}

// ── The till's calls ───────────────────────────────────────────────────────

export interface StaffRequest { restaurantId: string; sessionId: string }

export async function status(ports: Ports, req: StaffRequest): Promise<PrintStatus & { at: number }> {
  await actor(ports, req.restaurantId, req.sessionId);
  const { print: cfg } = await ports.config.print(req.restaurantId);
  const now = ports.now();
  return { ...statusOf(await ports.jobs.open(req.restaurantId), now, cfg), at: now };
}

export interface ReprintRequest extends StaffRequest { jobId?: string; cartId?: string; billId?: string; cid?: string }

/**
 * Three things behind one button. `jobId`: a waiting ticket the agent skipped as stale is forced through once
 * (Retry). `cartId`: a fresh REPRINT n job at every station the original went to (KT-S5). `billId`: a DUPLICATE
 * job, through ST's `reprint` door so the P1 audit row is written (KT-S16).
 */
export async function reprint(ports: Ports, req: ReprintRequest): Promise<{ jobIds: string[] }> {
  const staff = await actor(ports, req.restaurantId, req.sessionId);
  if (!MANAGERS.includes(staff.role)) fail('permission-denied', 'Not allowed for your role');
  const { print: cfg } = await ports.config.print(req.restaurantId);
  const now = ports.now();

  if (req.jobId) {
    const jobId = req.jobId;
    const cid = await ports.transact(req.restaurantId, async t => {
      const j = await t.getJob(jobId);
      if (!j) throw new ApprovalError('not-found', 'no such print job');
      if (!isWaiting(j, now)) throw new ApprovalError('failed-precondition', 'only a waiting job can be forced; reprint the round instead', { state: j.state });
      t.updateJob(jobId, { force: true });
      return j.cid;
    });
    ports.log({ mod: 'print', cid, jobId, action: 'force', by: staff.staffId });
    return { jobIds: [jobId] };
  }

  if (req.cartId) {
    const kots = (await ports.jobs.ofCart(req.restaurantId, req.cartId)).filter(j => j.kind === 'kot');
    if (!kots.length) fail('not-found', 'no ticket was ever queued for this round');
    const n = Math.max(1, ...(await ports.jobs.ofCart(req.restaurantId, req.cartId)).filter(j => j.kind === 'reprint').map(j => j.n ?? 1)) + 1;   // the original was 1
    const jobs = kots.map(k => newJob({
      jobId: ids.reprint(k.cartId as string, k.stationId as string, n), cid: k.cid, kind: 'reprint', stationId: k.stationId, ticketNo: k.ticketNo,
      tableLabel: k.tableLabel, part: k.part, parts: k.parts, orderId: k.orderId, cartId: k.cartId, lineIds: k.lineIds,
      orderNumber: k.orderNumber, cartIndex: k.cartIndex, placedBy: k.placedBy, placedAt: k.placedAt, n, by: staff.staffId, now,
    }));
    await ports.transact(req.restaurantId, async t => { for (const j of jobs) t.createJob(j); });
    for (const j of jobs) ports.log({ mod: 'print', cid: j.cid, jobId: j.jobId, from: null, to: 'queued', kind: 'reprint', n, by: staff.staffId });
    return { jobIds: jobs.map(j => j.jobId) };
  }

  if (req.billId) {
    const billId = req.billId;
    const bill = await ports.transact(req.restaurantId, t => t.getBill(billId));
    if (!bill) fail('not-found', 'bill not found');
    const b = bill as Bill;
    const n = (await ports.jobs.ofBill(req.restaurantId, billId)).filter(j => j.kind === 'duplicate').length + 1;
    await ports.approve({ restaurantId: req.restaurantId, sessionId: req.sessionId, action: 'reprint', cid: b.cid, note: `bill ${b.number} copy ${n}` });
    const job = newJob({
      jobId: ids.duplicate(billId, n), cid: b.cid, kind: 'duplicate', ticketNo: b.number,
      tableLabel: await ports.tableLabel(req.restaurantId, b.tableIds), billId, n, by: staff.staffId, now,
    });
    await ports.transact(req.restaurantId, async t => t.createJob(job));
    ports.log({ mod: 'print', cid: b.cid, jobId: job.jobId, from: null, to: 'queued', kind: 'duplicate', n, by: staff.staffId });
    return { jobIds: [job.jobId] };
  }
  return fail('invalid-argument', 'jobId, cartId or billId required');
}

// ── The sweep (KT-4, KT-S23) ───────────────────────────────────────────────

export interface SweepReport { restaurantId: string; open: number; overdue: number; silentSeconds: number | null }

/** Every minute: name each waiting job older than `unclaimedAfterSeconds`, with its age. Prints nothing. */
export async function sweep(ports: Ports, restaurantId: string): Promise<SweepReport> {
  const { print: cfg } = await ports.config.print(restaurantId);
  const now = ports.now();
  const jobs = await ports.jobs.open(restaurantId);
  const late = overdue(jobs, now, cfg);
  for (const j of late) ports.log({ mod: 'print', evt: 'job.overdue', cid: j.cid, jobId: j.jobId, station: j.stationId ?? cfg.counterStation, ageSeconds: Math.floor((now - (j.queuedAt ?? j.createdAt)) / 1000), state: j.state });
  const s = statusOf(jobs, now, cfg);
  const report = { restaurantId, open: jobs.length, overdue: late.length, silentSeconds: s.silentSeconds };
  ports.log({ mod: 'print', evt: 'sweep', ...report });
  return report;
}

export async function sweepEverywhere(ports: Ports): Promise<SweepReport[]> {
  const out: SweepReport[] = [];
  for (const rid of await ports.restaurantIds()) {
    try { out.push(await sweep(ports, rid)); }
    catch (e) { ports.log({ mod: 'print', evt: 'sweep.failed', restaurantId: rid, error: String((e as Error)?.message ?? e) }); }
  }
  return out;
}

/** The kitchen app's config read: stations and the agent numbers, never the PIN policy (KT-0 row 13). */
export async function agentConfig(ports: Ports, req: StaffRequest): Promise<Pick<PrintConfig, 'stations' | 'agents' | 'pollSeconds' | 'retryCount' | 'retryDelayMs' | 'connectTimeoutMs' | 'writeTimeoutMs' | 'claimLeaseSeconds' | 'counterStation'>> {
  await actor(ports, req.restaurantId, req.sessionId);
  const { print: c } = await ports.config.print(req.restaurantId);
  return { stations: c.stations, agents: c.agents, pollSeconds: c.pollSeconds, retryCount: c.retryCount, retryDelayMs: c.retryDelayMs, connectTimeoutMs: c.connectTimeoutMs, writeTimeoutMs: c.writeTimeoutMs, claimLeaseSeconds: c.claimLeaseSeconds, counterStation: c.counterStation };
}
