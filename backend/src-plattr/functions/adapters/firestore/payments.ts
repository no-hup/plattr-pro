// PY · Firestore ports for app/payments. The only place this module touches Firebase.
// Runtime note: this file runs from functions/lib/adapters/firestore/, so existing JS is three levels up.
import { BillRead, Mirror, Ports, StoredRow, Tx, BillStamp } from '../../app/payments';
import { Note, Row } from '../../domain/payments';
import { AuditRow } from '../../domain/approvals';
import { ports as st } from './approvals';   // ST's real ports: the session door and the PIN streak (one door)
import type { CollectionReference, DocumentReference, Transaction } from 'firebase-admin/firestore';

/* eslint-disable @typescript-eslint/no-var-requires */
const { db } = require('../../../admin/admin');

const rest = (rid: string): DocumentReference => db.collection('restaurants').doc(rid);
const payments = (rid: string): CollectionReference => rest(rid).collection('payments');
const bills = (rid: string): CollectionReference => rest(rid).collection('bills');
const orders = (rid: string): CollectionReference => rest(rid).collection('orders');
const audit = (rid: string): CollectionReference => rest(rid).collection('audit');
// DC owns restaurants/{id}/dayClose/{businessDate}. Until DC ships, no document exists, so no day is closed.
const dayClose = (rid: string): CollectionReference => rest(rid).collection('dayClose');

const asRow = (id: string, d: FirebaseFirestore.DocumentData): StoredRow => ({ ...(d as StoredRow), paymentId: id });

/** BL's bill document → the three things PY reads, plus the order to mirror. The orderId rides on every line (F field). */
function asBill(id: string, d: FirebaseFirestore.DocumentData): BillRead {
  const lines = Array.isArray(d.lines) ? (d.lines as { orderId?: string }[]) : [];
  const orderId = lines.find(l => typeof l.orderId === 'string')?.orderId ?? null;
  return {
    bill: { billId: id, payable: Number(d.payable ?? 0), status: d.status },
    cid: typeof d.cid === 'string' ? d.cid : id,
    orderId,
    paidAt: typeof d.paidAt === 'number' ? d.paidAt : null,
    paidBy: typeof d.paidBy === 'string' ? d.paidBy : null,
  };
}

/** A credit note is a bill document with `creditNoteOf` and negated amounts (BL). Its total is 0 − payable. */
function asNote(id: string, d: FirebaseFirestore.DocumentData): Note | null {
  if (!d.creditNoteOf || typeof d.creditNoteOf.billId !== 'string') return null;
  return { creditNoteId: id, billId: d.creditNoteOf.billId, total: 0 - Number(d.payable ?? 0), refundedTotal: Number(d.refundedTotal ?? 0), status: d.status };
}

function tx(rid: string, t: Transaction): Tx {
  return {
    async rowById(id) { const s = await t.get(payments(rid).doc(id)); return s.exists ? asRow(s.id, s.data() as FirebaseFirestore.DocumentData) : null; },
    async rowsForBill(billId) { const q = await t.get(payments(rid).where('billId', '==', billId)); return q.docs.map(x => asRow(x.id, x.data())); },
    async readBill(billId) { const s = await t.get(bills(rid).doc(billId)); return s.exists ? asBill(s.id, s.data() as FirebaseFirestore.DocumentData) : null; },
    async readNote(noteId) { const s = await t.get(bills(rid).doc(noteId)); return s.exists ? asNote(s.id, s.data() as FirebaseFirestore.DocumentData) : null; },
    async dayClosed(businessDate) {
      try { const s = await t.get(dayClose(rid).doc(businessDate)); return s.exists ? s.data()?.closed === true : false; }
      catch { return null; }   // unknown → R15 refuses
    },
    createRow(id, row) { t.create(payments(rid).doc(id), row); },
    setVoid(id, v) { t.update(payments(rid).doc(id), { void: v }); },
    stampBill(billId, stamp: BillStamp) { t.update(bills(rid).doc(billId), { status: stamp.status, paidTotal: stamp.paidTotal, paidAt: stamp.paidAt, paidBy: stamp.paidBy }); },
    stampNote(noteId, refundedTotal) { t.update(bills(rid).doc(noteId), { refundedTotal }); },
    mirrorOrder(orderId, status: Mirror) {
      // R4: a paid bill the floor cannot see is how a guest is asked to pay twice. No order, no take.
      if (!orderId) throw new Error('bill carries no orderId to mirror');
      // DEBT(TD-010): order.paymentStatus has two writers until updateOrderStatus.js:156 is removed with this mirror's landing.
      t.update(orders(rid).doc(orderId), { paymentStatus: status });
    },
    createAudit(id, row: AuditRow) { t.create(audit(rid).doc(id), row); },
    createPrintJob(job) { t.create(rest(rid).collection('printJobs').doc(job.jobId), job); },
  };
}

export const ports: Ports = {
  now: st.now,
  pin: st.pin,
  pinState: st.pinState,
  staff: st.staff,
  log: line => console.log(JSON.stringify(line)),
  warn: msg => console.warn(JSON.stringify({ mod: 'payments', warn: msg })),

  config: {
    async settings(rid) { const s = await rest(rid).collection('config').doc('settings').get(); return s.exists ? s.data() : undefined; },
  },

  ledger: {
    async forDay(rid, businessDate) {
      const q = await payments(rid).where('businessDate', '==', businessDate).get();
      return q.docs.map(x => asRow(x.id, x.data()));
    },
  },

  transact(rid, fn) { return db.runTransaction((t: Transaction) => fn(tx(rid, t))); },
};

export type { Row };
