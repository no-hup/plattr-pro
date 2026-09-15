// ST · Firestore ports for app/approvals. The only place this module touches Firebase.
// Runtime note: this file runs from functions/lib/adapters/firestore/, so existing JS is three levels up.
import { Ports, Staff, Tx } from '../../app/approvals';
import { AuditRow, Line, PinState } from '../../domain/approvals';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';

/* eslint-disable @typescript-eslint/no-var-requires */
const { db } = require('../../../admin/admin');
const { validateStaffSession } = require('../../../adminApp/auth');
const { comparePassword } = require('../../../utils/passwordUtils');

const rest = (rid: string): DocumentReference => db.collection('restaurants').doc(rid);
// DEBT(TD-008): `lines/` is a staging home for the line snapshot until PO/BL write the real one.
const lines = (rid: string) => rest(rid).collection('lines');
const audit = (rid: string) => rest(rid).collection('audit');
const servers = (rid: string) => rest(rid).collection('servers');

// Same rule as login (server/server_auth.js): bcrypt hash if it looks like one, else legacy plaintext.
const looksLikeBcrypt = (v: unknown): v is string => typeof v === 'string' && ['$2a$', '$2b$', '$2y$'].some(p => v.startsWith(p));

export const ports: Ports = {
  now: () => Date.now(),
  log: line => console.log(JSON.stringify({ mod: 'approvals', ...line })),
  warn: msg => console.warn(JSON.stringify({ mod: 'approvals', warn: msg })),

  staff: {
    async bySession(rid, sid): Promise<Staff> {
      const { serverData, serverId } = await validateStaffSession(rid, sid);
      return { staffId: serverId, role: serverData.role, status: serverData.status, password: serverData.password };
    },
  },

  pin: {
    async verify(pin, stored) {
      if (typeof stored !== 'string' || stored === '') return false;
      try { return looksLikeBcrypt(stored) ? await comparePassword(pin, stored) : stored === pin; } catch { return false; }
    },
  },

  config: {
    async approvals(rid) {
      const snap = await rest(rid).collection('config').doc('settings').get();
      return snap.exists ? snap.data()?.approvals : undefined;
    },
  },

  // R7: the streak lives on the staff doc as pinWrongAt[] and pinRetryAfter. Additive fields; nothing else reads them.
  pinState: {
    async get(rid, staffId): Promise<PinState> {
      const snap = await servers(rid).doc(staffId).get();
      const d = snap.data() ?? {};
      return { wrongAt: d.pinWrongAt ?? [], ...(typeof d.pinRetryAfter === 'number' ? { retryAfter: d.pinRetryAfter } : {}) };
    },
    update(rid, staffId, fn) {
      return db.runTransaction(async (t: Transaction) => {
        const ref: DocumentReference = servers(rid).doc(staffId);
        const d = (await t.get(ref)).data() ?? {};
        const r = fn({ wrongAt: d.pinWrongAt ?? [], ...(typeof d.pinRetryAfter === 'number' ? { retryAfter: d.pinRetryAfter } : {}) });
        t.update(ref, { pinWrongAt: r.state.wrongAt, pinRetryAfter: r.state.retryAfter ?? null });
        if (r.audit) t.create(audit(rid).doc(`${staffId}_streak_${r.audit.ts}`), r.audit);
        return r.state;
      });
    },
  },

  transact(rid, fn) {
    return db.runTransaction((t: Transaction) => fn(<Tx>{
      getLine: async id => { const ref: DocumentReference = lines(rid).doc(id); const s = await t.get(ref); return s.exists ? (s.data() as Line) : null; },
      setLine: (id, line: Line) => { t.set(lines(rid).doc(id), line); },
      createAudit: (id, row: AuditRow) => { t.create(audit(rid).doc(id), row); },
    }));
  },
};
