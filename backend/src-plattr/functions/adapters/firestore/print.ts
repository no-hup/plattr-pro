// KT · Firestore ports for app/print, plus the three helpers the flat-dir hooks call INSIDE their own
// transaction (R1): enqueueRound, releaseHeld, cancelForVoid. The only place this module touches Firebase.
// Runtime note: this file runs from functions/lib/adapters/firestore/, so existing JS is three levels up.
import { Ports, Tx } from '../../app/print';
import { Staff, apply as approve } from '../../app/approvals';
import { ports as approvalPorts } from './approvals';
import { Job, cancelJobsFor, jobsForRound, release, drop } from '../../domain/print';
import { PrintConfig, printConfigFrom, unroutedCategories } from '../../domain/kot';
import { Line } from '../../domain/line';
import { Bill } from '../../domain/billing';
import { encode } from '../printers/escpos';
import type { DocumentReference, Transaction, Query } from 'firebase-admin/firestore';

/* eslint-disable @typescript-eslint/no-var-requires */
const { db } = require('../../../admin/admin');
const { validateStaffSession } = require('../../../adminApp/auth');

const rest = (rid: string): DocumentReference => db.collection('restaurants').doc(rid);
const jobs = (rid: string) => rest(rid).collection('printJobs');
const lines = (rid: string) => rest(rid).collection('lines');
const bills = (rid: string) => rest(rid).collection('bills');
const tables = (rid: string) => rest(rid).collection('tables');
const servers = (rid: string) => rest(rid).collection('servers');
const OPEN = ['held', 'queued', 'claimed'];

const asJobs = (snap: FirebaseFirestore.QuerySnapshot): Job[] => (snap?.docs ?? []).map(d => d.data() as Job);   // `?? []`: the flat-dir unit fakes answer a query with no docs
const q = async (query: Query): Promise<Job[]> => asJobs(await query.get());

/** The settings document's `print` block and the restaurant's clock (`payments.timezoneOffsetMinutes`, PY's key). */
export async function loadPrintConfig(rid: string): Promise<{ print: PrintConfig; tzOffsetMinutes: number }> {
  const snap = await rest(rid).collection('config').doc('settings').get();
  const doc = snap.exists ? snap.data() : undefined;
  const tz = (doc as { payments?: { timezoneOffsetMinutes?: unknown } } | undefined)?.payments?.timezoneOffsetMinutes;
  return { print: printConfigFrom(doc), tzOffsetMinutes: typeof tz === 'number' && Number.isFinite(tz) ? tz : 330 };
}

/** "7", or "5+6" for a merged group: what a person reads, read off the table documents' `number`. */
export async function tableLabelOf(rid: string, tableIds: string[], t?: Transaction): Promise<string> {
  const refs = tableIds.map(id => tables(rid).doc(id));
  const snaps = refs.length ? (t ? await t.getAll(...refs) : await db.getAll(...refs)) : [];
  return snaps.map((s: FirebaseFirestore.DocumentSnapshot, i: number) => (s.exists && s.data()?.number ? String(s.data()?.number) : tableIds[i])).join('+');
}

async function staffNameOf(rid: string, tag: string | null, t?: Transaction): Promise<string> {
  if (!tag || !tag.startsWith('staff:')) return 'guest';
  const ref = servers(rid).doc(tag.slice('staff:'.length));
  const s = t ? await t.get(ref) : await ref.get();
  return s.exists && s.data()?.name ? String(s.data()?.name) : tag.slice('staff:'.length);
}

export const ports: Ports = {
  now: () => Date.now(),
  log: line => console.log(JSON.stringify(line)),
  staff: {
    async bySession(rid, sid): Promise<Staff> {
      const { serverData, serverId } = await validateStaffSession(rid, sid);
      return { staffId: serverId, role: serverData.role, status: serverData.status };
    },
  },
  config: { print: loadPrintConfig },
  jobs: {
    open: rid => q(jobs(rid).where('state', 'in', OPEN)),
    ofCart: (rid, cartId) => q(jobs(rid).where('cartId', '==', cartId)),
    ofBill: (rid, billId) => q(jobs(rid).where('billId', '==', billId)),
  },
  tableLabel: (rid, tableIds) => tableLabelOf(rid, tableIds),
  encode,
  approve: req => approve(approvalPorts, req),
  async restaurantIds() { const snap = await db.collection('restaurants').get(); return snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.id); },
  transact(rid, fn) {
    return db.runTransaction((t: Transaction) => fn(<Tx>{
      getJob: async id => { const s = await t.get(jobs(rid).doc(id)); return s.exists ? (s.data() as Job) : null; },
      createJob: job => { t.create(jobs(rid).doc(job.jobId), job); },
      updateJob: (id, patch) => { t.update(jobs(rid).doc(id), patch); },
      linesOfCart: async cartId => asLines(await t.get(lines(rid).where('cartId', '==', cartId))),
      getBill: async id => { const s = await t.get(bills(rid).doc(id)); return s.exists ? (s.data() as Bill) : null; },
      staffName: tag => staffNameOf(rid, tag, t),
    }));
  },
};
const asLines = (snap: FirebaseFirestore.QuerySnapshot): Line[] => snap.docs.map(d => d.data() as Line);

// ── Hooks for the flat-dir code (called inside THEIR transaction; reads before writes is the caller's job) ──

export interface RoundHead { cid: string; orderId: string; cartId: string; orderNumber: string; cartIndex: number; tableLabel: string; placedBy: string; placedAt: number; now: number; held: boolean }

/** R1, R4: one KOT job per station, created in the placing transaction. Throws if a line cannot be routed — the round fails. */
export function enqueueRound(t: Transaction, rid: string, cfg: PrintConfig, placed: Line[], head: RoundHead): Job[] {
  const out = jobsForRound(placed, cfg, head);
  const unrouted = placed.filter(l => !l.categoryId && l.countsTowardTotal !== false).map(l => l.lineId);
  if (unrouted.length) console.log(JSON.stringify({ mod: 'print', evt: 'line.noCategory', cid: head.cid, cartId: head.cartId, lineIds: unrouted, routedTo: 'taxBlock/default' }));
  const categories = unroutedCategories(placed, cfg);   // KT-S19: logged, caught next morning; never blocks the round
  if (categories.length) console.log(JSON.stringify({ mod: 'print', evt: 'line.unrouted', cid: head.cid, cartId: head.cartId, categoryIds: categories, routedTo: cfg.defaultStation }));
  for (const j of out) t.set(jobs(rid).doc(j.jobId), j);   // set: a retried transaction lands on the same doc; cartId is unique per checkout
  return out;
}

/** The READ half of releaseHeld / cancelForVoid: call before the caller's first write. */
export const kotJobsOfCart = (t: Transaction, rid: string, cartId: string): Promise<Job[]> =>
  t.get(jobs(rid).where('cartId', '==', cartId)).then(snap => asJobs(snap).filter(j => j.kind === 'kot'));

/** R5: the waiter confirmed. Held jobs of the cart become queued now. */
export function releaseHeld(t: Transaction, rid: string, kotJobs: Job[], now: number): string[] {
  const out: string[] = [];
  for (const j of kotJobs) if (j.state === 'held') { t.update(jobs(rid).doc(j.jobId), { state: 'queued', queuedAt: now }); out.push(j.jobId); }
  return out;
}

/**
 * KT-S11 / S12 and R5's other half. A held job (the kitchen was never told) is dropped, never printed. A job the
 * kitchen may have seen gets a cancel ticket at its station for the lines voided there.
 */
export function cancelForVoid(t: Transaction, rid: string, kotJobs: Job[], voidedLineIds: string[], c: { v: string | number; reason: string; by: string; now: number }): { dropped: string[]; cancels: string[] } {
  const dropped: string[] = [];
  for (const j of kotJobs) if (j.state === 'held') { t.set(jobs(rid).doc(j.jobId), drop(j)); dropped.push(j.jobId); }
  const told = kotJobs.filter(j => j.state !== 'held');
  const cancels = cancelJobsFor(told, voidedLineIds, c);
  for (const j of cancels) t.set(jobs(rid).doc(j.jobId), j);   // set, not create: the same void retried lands on the same doc
  return { dropped, cancels: cancels.map(j => j.jobId) };
}

export { release, loadPrintConfig as printConfig };
