// FL · Firestore ports for app/floor. The only place this module touches Firebase.
// Runtime note: this file runs from functions/lib/adapters/firestore/, so existing JS is three levels up.
import { Ports, Tx, Order, SittingHead, floorConfigFrom } from '../../app/floor';
import { Staff } from '../../app/approvals';
import { Bill, Table, OrderState } from '../../domain/floor';
import { Line } from '../../domain/line';
import type { DocumentReference, Transaction, Query } from 'firebase-admin/firestore';

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

const millis = (v: unknown): number => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
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
function toTable(d: FirebaseFirestore.QueryDocumentSnapshot, parents: Set<string>): Table {
  const x = d.data();
  return {
    tableId: d.id,
    number: x.number ? String(x.number) : undefined,
    status: String(x.status ?? 'vacant').toLowerCase() as Table['status'],
    mergedInto: x.mergedInto ?? null,
    currentOTP: x.currentOTP ?? null,
    hasSession: !!x.activeSessionId || (Array.isArray(x.occupiedBy) && x.occupiedBy.length > 0),
    isParent: parents.has(d.id),
  };
}

/** FL-S32: a status word the table module spells differently must not read as vacant here. */
const toBill = (d: FirebaseFirestore.QueryDocumentSnapshot): Bill & { sessionId: string } => {
  const x = d.data();
  return {
    billId: d.id,
    status: x.status,
    payable: Number(x.payable) || 0,
    paid: Number(x.paidTotal) || 0,
    sessionId: String(x.sessionId ?? ''),
  };
};

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
  log: line => console.log(JSON.stringify(line)),

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
   * R14, R17: every session that is still active, whatever its table now says. A sitting whose
   * table was retired, or whose captain marked the order COMPLETED, still has money on it and
   * still needs a tile. A merged group is one sitting spanning several tableIds.
   */
  async sittingsOf(rid) {
    const [snap, tableSnap] = await Promise.all([
      sessions(rid).where('status', '==', 'active').get(),
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
      return {
        sessionId: d.id,
        tableIds: [parent, ...(children.get(parent) ?? [])],
        openedAt: millis(x.createdAt),
        cleared: !!x.cleared,
        settledAt: x.settledAt ? millis(x.settledAt) : null,
      };
    });
  },

  // R2: by the FROZEN sessionId. `draftId` is rewritten by a split and would read ₹0.
  linesOfSessions: (rid, ids) => byIn(lines(rid), 'sessionId', ids, d => d.data() as Line),
  billsOfSessions: (rid, ids) => byIn(bills(rid), 'sessionId', ids, toBill),

  transact(rid, fn) {
    return db.runTransaction(async (t: Transaction) => {
      // Firestore forbids a read after a write in one transaction, so cart contents are read
      // up front by moveCart and every other write is queued until the callback returns.
      const tx: Tx = {
        async getTable(id) {
          const d = await t.get(tables(rid).doc(id));
          if (!d.exists) return null;
          const x = d.data() as Record<string, unknown>;
          const kids = await t.get(tables(rid).where('mergedInto', '==', id).limit(1));
          return {
            tableId: id,
            number: x.number ? String(x.number) : undefined,
            status: String(x.status ?? 'vacant').toLowerCase() as Table['status'],
            mergedInto: (x.mergedInto as string) ?? null,
            currentOTP: (x.currentOTP as string) ?? null,
            hasSession: !!x.activeSessionId || (Array.isArray(x.occupiedBy) && x.occupiedBy.length > 0),
            isParent: !kids.empty,
          };
        },

        async childrenOf(tableId) {
          const snap = await t.get(tables(rid).where('mergedInto', '==', tableId));
          return snap.docs.map(d => d.id);
        },

        async getSitting(tableId) {
          const snap = await t.get(sessions(rid).where('tableId', '==', tableId).where('status', '==', 'active').limit(1));
          if (snap.empty) return null;
          const d = snap.docs[0];
          const x = d.data();
          const kids = await t.get(tables(rid).where('mergedInto', '==', tableId));
          const ids = [tableId, ...kids.docs.map(k => k.id)];
          const [ls, bs] = await Promise.all([
            t.get(lines(rid).where('sessionId', '==', d.id)),
            t.get(bills(rid).where('sessionId', '==', d.id)),
          ]);
          return {
            sessionId: d.id,
            tableIds: ids,
            openedAt: millis(x.createdAt),
            cleared: !!x.cleared,
            settledAt: x.settledAt ? millis(x.settledAt) : null,
            lines: ls.docs.map(l => l.data() as Line),
            bills: bs.docs.map(toBill),
          };
        },

        async ordersOfSession(sessionId) {
          const snap = await t.get(orders(rid).where('sessionId', '==', sessionId));
          return snap.docs.map((d): Order => ({ orderId: d.id, state: String(d.data().status ?? '').toUpperCase() as OrderState }));
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
        setTable(tableId, patch) {
          t.update(tables(rid).doc(tableId), { ...patch, lastUpdated: timestamp.serverTimestamp() });
        },
        createAudit(id, row) {
          t.create(audit(rid).doc(id), { ...row, createdAt: timestamp.serverTimestamp() });
        },
      };
      return fn(tx);
    });
  },
};
