// BL · Firestore ports for app/billing. The only place this module touches Firebase.
// Runtime note: this file runs from functions/lib/adapters/firestore/, so existing JS is three levels up.
import { Ports, Tx, settingsFrom } from '../../app/billing';
import { Staff } from '../../app/approvals';
import { Bill } from '../../domain/billing';
import { Line } from '../../domain/line';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';

/* eslint-disable @typescript-eslint/no-var-requires */
const { db } = require('../../../admin/admin');
const { validateStaffSession } = require('../../../adminApp/auth');

const rest = (rid: string): DocumentReference => db.collection('restaurants').doc(rid);
const lines = (rid: string) => rest(rid).collection('lines');
const bills = (rid: string) => rest(rid).collection('bills');
const counters = (rid: string) => rest(rid).collection('counters');
const audit = (rid: string) => rest(rid).collection('audit');
const minor = (rupees: unknown) => Math.round((Number(rupees) || 0) * 100);

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
    // R12: a thrown read propagates and refuses the call. A missing doc means a fresh restaurant: defaults.
    async billing(rid) {
      const [settings, info] = await Promise.all([rest(rid).collection('config').doc('settings').get(), rest(rid).get()]);
      return settingsFrom(settings.exists ? settings.data() : undefined, info.exists ? (info.data()?.info ?? info.data()) : undefined);
    },
  },
  async linesOfDraft(rid, draftId) {
    const snap = await lines(rid).where('draftId', '==', draftId).get();
    return snap.docs.map(d => d.data() as Line);
  },
  // BL-S24: the offer as Offers V2 evaluated it when the round was placed. Old money is float rupees.
  async orderOffer(rid, orderId) {
    const snap = await rest(rid).collection('orders').doc(orderId).get();
    const o = snap.exists ? snap.data()?.appliedOffer : null;
    return o && typeof o === 'object' ? { id: String(o.id ?? ''), name: String(o.title ?? o.name ?? 'Offer'), amount: minor(o.discountAmount) } : null;
  },
  async getBill(rid, id) { const s = await bills(rid).doc(id).get(); return s.exists ? (s.data() as Bill) : null; },
  transact(rid, fn) {
    return db.runTransaction((t: Transaction) => fn(<Tx>{
      getLines: async ids => { if (!ids.length) return []; const snaps = await t.getAll(...ids.map(i => lines(rid).doc(i))); return snaps.filter(s => s.exists).map(s => s.data() as Line); },
      setLine: (id, patch) => { t.update(lines(rid).doc(id), patch); },
      getBill: async id => { const s = await t.get(bills(rid).doc(id)); return s.exists ? (s.data() as Bill) : null; },
      setBill: (id, bill: Bill) => { t.create(bills(rid).doc(id), bill); },
      updateBill: (id, patch) => { t.update(bills(rid).doc(id), patch); },
      getCounter: async key => { const s = await t.get(counters(rid).doc(key)); return s.exists ? { next: Number(s.data()?.next ?? 1) } : null; },
      setCounter: (key, c) => { t.set(counters(rid).doc(key), c); },
      createAudit: (id, row) => { t.create(audit(rid).doc(id), row); },
      newBillId: () => bills(rid).doc().id,
    }));
  },
};
