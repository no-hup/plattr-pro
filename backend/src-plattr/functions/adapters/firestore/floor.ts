// FL · Firestore ports for app/floor. The only place this module touches Firebase.
// Runtime note: this file runs from functions/lib/adapters/firestore/, so existing JS is three levels up.
import { apply as approve } from '../../app/approvals';
import { ports as approvalPorts } from './approvals';
import { ports as billingPorts } from './billing';
import { preview as previewBill, walkOutDraft } from '../../app/billing';
import { Ports, Tx, Order, SittingHead, floorConfigFrom } from '../../app/floor';
import { Staff } from '../../app/approvals';
import { Bill, Table, OrderState, sittingOf, roundRefusal, guestRefusal } from '../../domain/floor';
import { Line } from '../../domain/line';
import type { DocumentReference, Transaction, Query } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';

/* eslint-disable @typescript-eslint/no-var-requires */
const { db } = require('../../../admin/admin');
const { validateStaffSession } = require('../../../adminApp/auth');
const timestamp = require('../../../utils/timestamp');

const rest = (rid: string): DocumentReference => db.collection('restaurants').doc(rid);
const tables = (rid: string) => rest(rid).collection('tables');
const sessions = (rid: string) => rest(rid).collection('sessions');
const lines = (rid: string) => rest(rid).collection('lines');
const bills = (rid: string) => rest(rid).collection('bills');
const carts = (rid: string) => rest(rid).collection('carts');
const orders = (rid: string) => rest(rid).collection('orders');
const audit = (rid: string) => rest(rid).collection('audit');
const payments = (rid: string) => rest(rid).collection('payments');

const millis = (v: unknown): number => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = Date.parse(v); return Number.isFinite(n) ? n : 0; }   // the cart writes ISO strings
  if (v instanceof Date) return v.getTime();
  const t = v as { toMillis?: () => number; _seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t._seconds === 'number') return t._seconds * 1000;
  return 0;
};

/**
 * A live table document as the floor reads it. `isParent` is derived here rather than stored:
 * one query for the whole floor answers it for every table at once, and a stored flag is one
 * more thing that can drift out of step with `mergedInto`.
 */
/**
 * Is a scan still holding this table? `currentOTP.expiresAt` is the claim a scan put on the
 * table, NOT the life of the code — the code does not expire (session/otpService.js). Derived
 * here rather than stored, so it lapses without anything having to run.
 */
function holdActive(otp: unknown): boolean {
  const at = (otp as { expiresAt?: unknown } | null | undefined)?.expiresAt;
  if (!at) return false;
  const ms = at instanceof Date ? at.getTime()
    : typeof (at as { toMillis?: () => number }).toMillis === 'function' ? (at as { toMillis: () => number }).toMillis()
    : typeof at === 'number' ? at
    : Date.parse(String(at));
  return Number.isFinite(ms) && ms > Date.now();
}

function toTable(d: FirebaseFirestore.QueryDocumentSnapshot, parents: Set<string>): Table {
  const x = d.data();
  return {
    tableId: d.id,
    number: x.number ? String(x.number) : undefined,
    status: String(x.status ?? 'vacant').toLowerCase() as Table['status'],
    mergedInto: x.mergedInto ?? null,
    hasHold: holdActive(x.currentOTP),
    hasSession: !!x.activeSessionId || (Array.isArray(x.occupiedBy) && x.occupiedBy.length > 0),
    isParent: parents.has(d.id),
  };
}

/** FL-S32: a status word the table module spells differently must not read as vacant here. */
const toBill = (d: FirebaseFirestore.QueryDocumentSnapshot): Bill => {
  const x = d.data();
  return {
    billId: d.id,
    sittingId: String(x.sittingId ?? ''),
    note: !!x.creditNoteOf,
    status: x.status,
    payable: Number(x.payable) || 0,
    paid: Number(x.paidTotal) || 0,
    replaced: Array.isArray(x.replacedBy) && x.replacedBy.length > 0,
    series: x.series ? String(x.series) : undefined,
    number: x.number ? String(x.number) : undefined,
  };
};

/**
 * D2 / D3: the round check for the JS order path, read inside the CALLER's transaction so a payment landing in the
 * same second makes one of the two retry instead of both winning. Bills only: reading the sitting's lines here would
 * make every checkout contend with the kitchen's line writes.
 */
export async function roundRefusalIn(t: Transaction, rid: string, sessionId: string, label: string): Promise<string | null> {
  const bs = await t.get(bills(rid).where('sittingId', '==', sessionId));
  return roundRefusal(bs.docs.map(toBill), label);
}

/** D2 / D3 for the paths outside a transaction: a new phone joining (`kind: 'guest'`) and the waiter opening the table to add dishes (`'round'`). */
export async function sittingRefusal(rid: string, sessionId: string, label: string, kind: 'guest' | 'round'): Promise<string | null> {
  const bs = (await bills(rid).where('sittingId', '==', sessionId).get()).docs.map(toBill);
  return kind === 'guest' ? guestRefusal(bs, label) : roundRefusal(bs, label);
}

/** Staff logins share the `sessions` collection (entity 'server', no table). They are never a sitting. */
const isStaff = (x: FirebaseFirestore.DocumentData | undefined) => x?.entity === 'server';

const chunk = <T>(xs: T[], n: number): T[][] =>
  xs.length ? Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n)) : [];

/** Firestore `in` takes at most 30 values, and a busy floor has more sittings than that. */
async function byIn<T>(q: Query, field: string, ids: string[], map: (d: FirebaseFirestore.QueryDocumentSnapshot) => T): Promise<T[]> {
  const out: T[] = [];
  for (const part of chunk(ids, 30)) {
    const snap = await q.where(field, 'in', part).get();
    for (const d of snap.docs) out.push(map(d));
  }
  return out;
}

export const ports: Ports = {
  now: () => Date.now(),
  approve: req => approve(approvalPorts, req as never),
  log: line => console.log(JSON.stringify(line)),
  // D1: BL's own use-cases, as the cashier (their session), so the walk-out bill is priced and numbered exactly as any other.
  billing: {
    async payable(rid, sid, draftId) { return (await previewBill(billingPorts, { restaurantId: rid, sessionId: sid, draftId })).payable; },
    async issueForWalkOut(rid, sid, draftId, cid, payable) { await walkOutDraft(billingPorts, { restaurantId: rid, sessionId: sid, draftId, cid, payable }); },
  },

  staff: {
    async bySession(rid, sid): Promise<Staff> {
      const { serverData, serverId } = await validateStaffSession(rid, sid);
      return { staffId: serverId, role: serverData.role, status: serverData.status };
    },
  },

  config: {
    // R19: a thrown read refuses the call. A missing doc means a fresh restaurant: defaults.
    async floor(rid) {
      const snap = await rest(rid).collection('config').doc('settings').get();
      return floorConfigFrom(snap.exists ? snap.data() : undefined);
    },
  },

  async tablesOf(rid) {
    const snap = await tables(rid).get();
    const parents = new Set<string>();
    for (const d of snap.docs) { const p = d.data().mergedInto; if (p) parents.add(String(p)); }
    return snap.docs.map(d => toTable(d, parents));
  },

  /**
   * R14, R17: **money outranks the session.** The floor finds a sitting two ways — the session is
   * still active, OR open money names it — and takes the union.
   *
   * The second half is not belt and braces. `orders/updateOrderStatus.js:181` vacates the table on
   * COMPLETED, which runs `endTableSessions` and flips the session to `ended`. A captain who marks
   * the food out at 20:44 with ₹2,340 never billed therefore ends the sitting, and reading only
   * active sessions would drop that ₹2,340 off the floor entirely — the exact thing FL-S16 and R14
   * exist to prevent. Open money is what the floor is a picture of, so open money is what it looks
   * for; the query is bounded by real unbilled lines and real unpaid bills, not by time.
   */
  async sittingsOf(rid) {
    const [live, openLines, openBills, tableSnap] = await Promise.all([
      sessions(rid).where('status', '==', 'active').get(),
      lines(rid).where('billId', '==', null).get(),
      bills(rid).where('status', '==', 'issued').get(),
      tables(rid).get(),
    ]);

    const needed = new Set<string>(live.docs.filter(d => !isStaff(d.data())).map(d => d.id));
    for (const d of openLines.docs) {
      const x = d.data();
      if (x.countsTowardTotal !== false && x.sessionId) needed.add(String(x.sessionId));
    }
    for (const d of openBills.docs) {
      const x = d.data();
      if (x.sittingId && (Number(x.paidTotal) || 0) < (Number(x.payable) || 0)) needed.add(String(x.sittingId));
    }

    const known = new Map(live.docs.filter(d => !isStaff(d.data())).map(d => [d.id, d.data()]));
    const missing = [...needed].filter(id => !known.has(id));
    for (const part of chunk(missing, 30)) {
      const snap = await sessions(rid).where('__name__', 'in', part.map(id => sessions(rid).doc(id))).get();
      for (const d of snap.docs) if (!isStaff(d.data())) known.set(d.id, d.data());
    }

    const children = new Map<string, string[]>();
    for (const d of tableSnap.docs) {
      const p = d.data().mergedInto;
      if (p) children.set(String(p), [...(children.get(String(p)) ?? []), d.id]);
    }

    return [...known.entries()].map(([sessionId, x]): SittingHead => {
      const parent = String(x.tableId ?? '');
      return {
        sessionId,
        tableIds: [parent, ...(children.get(parent) ?? [])],
        openedAt: millis(x.createdAt),
      };
    });
  },

  // R2: by the FROZEN sessionId. `draftId` is rewritten by a split and would read ₹0.
  linesOfSessions: (rid, ids) => byIn(lines(rid), 'sessionId', ids, d => d.data() as Line),
  billsOfSessions: (rid, ids) => byIn(bills(rid), 'sittingId', ids, toBill),

  async restaurantIds() {
    const snap = await db.collection('restaurants').get();
    return snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.id);
  },

  /**
   * FL-S36. Only a live session opened before the cutoff can be idle, so only those are read
   * further (composite index on sessions: status, createdAt). A session with no `createdAt` never
   * matches the range and is therefore never freed — fail closed by the query itself.
   */
  async idleCandidates(rid, openedBefore) {
    const [snap, tableSnap] = await Promise.all([
      sessions(rid).where('status', '==', 'active').where('createdAt', '<', Timestamp.fromMillis(openedBefore)).get(),
      tables(rid).get(),
    ]);
    const children = new Map<string, string[]>();
    for (const d of tableSnap.docs) {
      const p = d.data().mergedInto;
      if (p) children.set(String(p), [...(children.get(String(p)) ?? []), d.id]);
    }
    return snap.docs.map((d): SittingHead => {
      const x = d.data();
      const parent = String(x.tableId ?? '');
      return { sessionId: d.id, tableIds: [parent, ...(children.get(parent) ?? [])], openedAt: millis(x.createdAt) };
    });
  },

  transact(rid, fn) {
    return db.runTransaction(async (t: Transaction) => {
      // Firestore forbids a read after a write in one transaction, so cart contents are read
      // up front by moveCart and every other write is queued until the callback returns.
      const tx: Tx = {
        async getTable(id) {
          const d = await t.get(tables(rid).doc(id));
          if (!d.exists) return null;
          const x = d.data() as Record<string, unknown>;
          // FL-S33: whether a party is at this table is answered by the SESSIONS collection, not
          // by a flag on the table. `activeSessionId` and `occupiedBy` are written by the older
          // table module and drift; the session is the thing the guest's cart actually hangs off.
          const [kids, live] = await Promise.all([
            t.get(tables(rid).where('mergedInto', '==', id).limit(1)),
            t.get(sessions(rid).where('tableId', '==', id).where('status', '==', 'active').limit(1)),
          ]);
          return {
            tableId: id,
            number: x.number ? String(x.number) : undefined,
            status: String(x.status ?? 'vacant').toLowerCase() as Table['status'],
            mergedInto: (x.mergedInto as string) ?? null,
            hasHold: holdActive(x.currentOTP),
            hasSession: !live.empty,
            isParent: !kids.empty,
          };
        },

        async childrenOf(tableId) {
          const snap = await t.get(tables(rid).where('mergedInto', '==', tableId));
          return snap.docs.map(d => d.id);
        },

        async getSitting(tableId) {
          // Clear acts on what is at the table now, so it asks for the live session. A sitting
          // the captain already ended is not Clear's to free; its money shows on the floor until
          // it is billed, and it leaves the floor when the money does.
          const snap = await t.get(sessions(rid).where('tableId', '==', tableId).where('status', '==', 'active').limit(1));
          if (snap.empty) return null;
          const d = snap.docs[0];
          const x = d.data();
          const kids = await t.get(tables(rid).where('mergedInto', '==', tableId));
          const ids = [tableId, ...kids.docs.map(k => k.id)];
          const [ls, bs] = await Promise.all([
            t.get(lines(rid).where('sessionId', '==', d.id)),
            t.get(bills(rid).where('sittingId', '==', d.id)),
          ]);
          return sittingOf({ sessionId: d.id, tableIds: ids, openedAt: millis(x.createdAt) }, ls.docs.map(l => l.data() as Line), bs.docs.map(toBill));
        },

        async ordersOfSession(sessionId) {
          const snap = await t.get(orders(rid).where('sessionId', '==', sessionId));
          return snap.docs.map((d): Order => ({ orderId: d.id, state: String(d.data().status ?? '').toUpperCase() as OrderState }));
        },

        // R21. Reads only — it runs before endSitting's writes in the same transaction.
        async touchedAt(s) {
          const [sess, cartDocs, tableDocs, billSnap] = await Promise.all([
            t.get(sessions(rid).doc(s.sessionId)),
            Promise.all(s.tableIds.map(id => t.get(carts(rid).doc(id)))),
            Promise.all(s.tableIds.map(id => t.get(tables(rid).doc(id)))),
            t.get(bills(rid).where('sittingId', '==', s.sessionId)),
          ]);
          const out: number[] = [millis(sess.data()?.updatedAt)];
          for (const c of cartDocs) out.push(millis(c.data()?.lastUpdated), millis(c.data()?.updatedAt));
          for (const d of tableDocs) out.push(millis(d.data()?.lastActivity));
          const billIds: string[] = [];
          for (const b of billSnap.docs) { billIds.push(b.id); out.push(millis(b.data().issuedAt), millis(b.data().paidAt)); }
          for (const part of chunk(billIds, 30)) {
            const pay = await t.get(payments(rid).where('billId', 'in', part));
            for (const p of pay.docs) out.push(millis(p.data().at));
          }
          return out;
        },

        setSessionTable(sessionId, tableId) {
          t.update(sessions(rid).doc(sessionId), { tableId, updatedAt: timestamp.serverTimestamp() });
        },

        /**
         * The cart is keyed by table, not by session, so a move rewrites the document id. Read
         * first — a transaction refuses a read after any write, and this is the last one.
         */
        async moveCart(from, to) {
          const src = await t.get(carts(rid).doc(from));
          if (!src.exists) return;
          t.set(carts(rid).doc(to), { ...src.data(), tableId: to, updatedAt: timestamp.serverTimestamp() });
          t.delete(carts(rid).doc(from));
        },

        setOrderTable(orderId, tableId) {
          t.update(orders(rid).doc(orderId), { tableId, updatedAt: timestamp.serverTimestamp() });
        },
        setLineTable(lineId, tableId) {
          t.update(lines(rid).doc(lineId), { tableId });
        },
        endSession(sessionId) {
          t.update(sessions(rid).doc(sessionId), { status: 'ended', endedAt: timestamp.serverTimestamp(), updatedAt: timestamp.serverTimestamp() });
        },
        setTable(tableId, patch) {
          t.update(tables(rid).doc(tableId), { ...patch, lastUpdated: timestamp.serverTimestamp() });
        },
        createAudit(id, row) {
          t.create(audit(rid).doc(id), { ...row, createdAt: timestamp.serverTimestamp() });
        },
        walkOutBill(billId, block) {
          t.update(bills(rid).doc(billId), { status: 'walkedOut', walkedOut: block });
        },
      };
      return fn(tx);
    });
  },
};
