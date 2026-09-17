// DC · Firestore ports for app/dayClose. The only place this module touches Firebase.
// Runtime note: this file runs from functions/lib/adapters/firestore/, so existing JS is three levels up.
import { CloseDoc, Ports, StoredMovement, Tx } from '../../app/dayClose';
import { Floor, IssuedBill, LedgerRow, UnbilledLine, VoidBlock, businessDateFor } from '../../domain/dayClose';
import { PaymentsConfig, businessDayWindow, configFrom as paymentsConfigFrom } from '../../domain/payments';
import { AuditRow } from '../../domain/approvals';
import { ports as st } from './approvals';   // ST's real ports: the session door and the PIN streak (one door)
import type { CollectionReference, DocumentReference, Query, Transaction } from 'firebase-admin/firestore';

/* eslint-disable @typescript-eslint/no-var-requires */
const { db } = require('../../../admin/admin');

const rest = (rid: string): DocumentReference => db.collection('restaurants').doc(rid);
const dayClose = (rid: string): CollectionReference => rest(rid).collection('dayClose');
const drawer = (rid: string): CollectionReference => rest(rid).collection('drawerMovements');
const payments = (rid: string): CollectionReference => rest(rid).collection('payments');
const bills = (rid: string): CollectionReference => rest(rid).collection('bills');
const lines = (rid: string): CollectionReference => rest(rid).collection('lines');
const audit = (rid: string): CollectionReference => rest(rid).collection('audit');

const settingsOf = async (rid: string): Promise<unknown> => {
  const s = await rest(rid).collection('config').doc('settings').get();
  return s.exists ? s.data() : undefined;
};
/** R8: the close hour is PY's key, read here and never duplicated as a dayClose one. */
const payConfig = async (rid: string): Promise<PaymentsConfig> => paymentsConfigFrom(await settingsOf(rid)).config;

const asClose = (d: FirebaseFirestore.DocumentData): CloseDoc => d as CloseDoc;
const asMovement = (id: string, d: FirebaseFirestore.DocumentData): StoredMovement => ({ ...(d as StoredMovement), movementId: id });
const asRow = (d: FirebaseFirestore.DocumentData): LedgerRow => d as LedgerRow;

const rowsQuery = (rid: string, businessDate: string): Query => payments(rid).where('businessDate', '==', businessDate);
const movesQuery = (rid: string, businessDate: string): Query => drawer(rid).where('businessDate', '==', businessDate);
// R5: BL writes no draft bill document, so a table still eating shows up only as lines with no billId.
// Neither collection carries a business date, so both are bounded by the `at` window that PY's
// businessDateFor maps to that date. These used to be unbounded scans of two whole collections —
// read inside the close transaction, filtered by date in memory. Nothing deletes a line, so that
// grew forever against the one operation that cannot wait. See domain/payments.businessDayWindow.
const issuedQuery = (rid: string, businessDate: string, cfg: PaymentsConfig): Query => {
  const { start, end } = businessDayWindow(businessDate, cfg);
  return bills(rid).where('status', '==', 'issued').where('issuedAt', '>=', start).where('issuedAt', '<', end);
};
const unbilledQuery = (rid: string, businessDate: string, cfg: PaymentsConfig): Query => {
  const { start, end } = businessDayWindow(businessDate, cfg);
  return lines(rid).where('billId', '==', null).where('placedAt', '>=', start).where('placedAt', '<', end);
};

function toFloor(cfg: PaymentsConfig, issuedDocs: FirebaseFirestore.QueryDocumentSnapshot[], lineDocs: FirebaseFirestore.QueryDocumentSnapshot[]): Floor {
  const issued: IssuedBill[] = issuedDocs.map(d => {
    const b = d.data();
    return {
      billId: d.id,
      number: typeof b.number === 'string' ? b.number : null,
      businessDate: businessDateFor(Number(b.issuedAt ?? 0), cfg),
      tableLabel: Array.isArray(b.tableIds) && b.tableIds.length ? String(b.tableIds[0]) : null,
    };
  });
  const unbilled: UnbilledLine[] = lineDocs
    .map(d => ({ d, l: d.data() }))
    .filter(({ l }) => !l.void)                     // a voided line is not food anyone is waiting to pay for
    .map(({ d, l }) => ({
      lineId: d.id,
      name: typeof l.name === 'string' ? l.name : '',
      businessDate: businessDateFor(Number(l.placedAt ?? 0), cfg),
      tableId: typeof l.tableId === 'string' ? l.tableId : null,
    }));
  return { issued, unbilled };
}

function tx(rid: string, cfg: PaymentsConfig, t: Transaction): Tx {
  return {
    async readClose(bd) { const s = await t.get(dayClose(rid).doc(bd)); return s.exists ? asClose(s.data() as FirebaseFirestore.DocumentData) : null; },
    // R9: create, never set. The date is the document id, so a second close is impossible by construction.
    createClose(bd, doc: CloseDoc) { t.create(dayClose(rid).doc(bd), doc); },
    // R6a: read inside the transaction so a payment committed while the cashier counted aborts one of the two.
    async rowsForDay(bd) { const q = await t.get(rowsQuery(rid, bd)); return q.docs.map(d => asRow(d.data())); },
    async movementsForDay(bd) { const q = await t.get(movesQuery(rid, bd)); return q.docs.map(d => asMovement(d.id, d.data())); },
    async floorOn(bd) { const [b, l] = await Promise.all([t.get(issuedQuery(rid, bd, cfg)), t.get(unbilledQuery(rid, bd, cfg))]); return toFloor(cfg, b.docs, l.docs); },
    async movementById(id) { const s = await t.get(drawer(rid).doc(id)); return s.exists ? asMovement(s.id, s.data() as FirebaseFirestore.DocumentData) : null; },
    createMovement(id, m: StoredMovement) { t.create(drawer(rid).doc(id), m); },
    setMovementVoid(id, v: VoidBlock) { t.update(drawer(rid).doc(id), { void: v }); },
    createAudit(id, row: AuditRow) { t.create(audit(rid).doc(id), row); },
  };
}

export const ports: Ports = {
  now: st.now,
  pin: st.pin,
  pinState: st.pinState,
  staff: st.staff,
  log: line => console.log(JSON.stringify(line)),
  warn: msg => console.warn(JSON.stringify({ mod: 'dayClose', warn: msg })),

  config: { settings: settingsOf },

  read: {
    async close(rid, bd) { const s = await dayClose(rid).doc(bd).get(); return s.exists ? asClose(s.data() as FirebaseFirestore.DocumentData) : null; },
    async rows(rid, bd) { const q = await rowsQuery(rid, bd).get(); return q.docs.map(d => asRow(d.data())); },
    async movements(rid, bd) { const q = await movesQuery(rid, bd).get(); return q.docs.map(d => asMovement(d.id, d.data())); },
    async floor(rid, bd) {
      const cfg = await payConfig(rid);   // the window depends on it, so it is read first, not in parallel
      const [b, l] = await Promise.all([issuedQuery(rid, bd, cfg).get(), unbilledQuery(rid, bd, cfg).get()]);
      return toFloor(cfg, b.docs, l.docs);
    },
  },

  async transact(rid, fn) {
    const cfg = await payConfig(rid);   // read before the transaction opens: config is not part of the write set
    return db.runTransaction((t: Transaction) => fn(tx(rid, cfg, t)));
  },
};
