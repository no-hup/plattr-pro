// DC · Day close — app tests. Fake ports and a fake clock, no emulator, no network.
// These are about ORDERING and PARTIAL FAILURE: what lands together, what rolls back, what a
// second caller sees. The arithmetic is domain/dayClose.test.ts.
// The running day is 2026-09-16: float 200000, cash 1245000 (Priya 720000 + Ravi 525000),
// cash refunds 8400, vendor out 120000, card 3120000, upi 890000. Expected cash 1316600.
import { close, get, move, voidMove, DayCloseError, Ports, Tx, CloseDoc, StoredMovement, DayView } from './dayClose';
import { Floor, LedgerRow } from '../domain/dayClose';
import { AuditRow, PinState } from '../domain/approvals';
import { Staff } from './approvals';

const RID = 'r1';
const DAY = '2026-09-16';
const ist = (y: number, m: number, d: number, hh: number, mm: number) => Date.UTC(y, m - 1, d, hh, mm) - 330 * 60_000;
const T0 = ist(2026, 9, 16, 23, 30);          // 23:30 on the 16th; close hour 04:00 ⇒ businessDate 2026-09-16
const EXPECTED = 1316600;

type Snap = LedgerRow['tender'];
const cash: Snap = { label: 'Cash', kind: 'cash' };
const card: Snap = { label: 'Card', kind: 'external' };
const upi: Snap = { label: 'UPI', kind: 'external' };
const row = (kind: 'take' | 'refund', amount: number, tender: Snap = cash, by = 'priya', extra: Partial<LedgerRow> = {}): LedgerRow =>
  ({ kind, amount, tenderId: tender.label.split(' ')[0].toLowerCase(), tender, by, void: null, ...extra });

const DAY_ROWS: LedgerRow[] = [
  row('take', 720000, cash, 'priya'), row('take', 525000, cash, 'ravi'), row('refund', 8400, cash, 'priya'),
  row('take', 3120000, card, 'priya'), row('take', 890000, upi, 'ravi'),
];
const mv = (kind: StoredMovement['kind'], amount: number, o: Partial<StoredMovement> = {}): StoredMovement =>
  ({ movementId: `m_${kind}`, businessDate: DAY, kind, amount, reason: kind === 'float' ? 'opening float' : 'vendor payment', note: '', at: T0 - 1, by: 'priya', void: null, ...o });
const DAY_MOVES: StoredMovement[] = [mv('float', 200000), mv('out', 120000)];
const CLEAR: Floor = { issued: [], unbilled: [] };

interface Opts {
  staff?: Partial<Staff>; config?: unknown; rows?: LedgerRow[]; movements?: StoredMovement[]; floor?: Floor;
  closes?: Record<string, CloseDoc>; readFails?: 'close' | 'rows' | 'floor'; now?: number;
  onTransact?: (n: number, p: Fake) => void | Promise<void>;
}
type Fake = Ports & {
  closes: Map<string, CloseDoc>; movements: Map<string, StoredMovement>; audits: Map<string, AuditRow>;
  rowsOf: LedgerRow[]; floorOf: Floor; logs: object[]; warnings: string[]; calls: string[];
  tick(ms: number): void;
};

function fakePorts(opts: Opts = {}): Fake {
  let now = opts.now ?? T0;
  let n = 0;
  const closes = new Map<string, CloseDoc>(Object.entries(opts.closes ?? {}));
  const movements = new Map<string, StoredMovement>((opts.movements ?? DAY_MOVES).map(m => [m.movementId, m]));
  const audits = new Map<string, AuditRow>();
  const pins = new Map<string, PinState>();
  const logs: object[] = []; const warnings: string[] = []; const calls: string[] = [];
  const staff: Staff = { staffId: 'priya', role: 'MANAGER', status: 'active', pinHash: 'hash(1234)', ...opts.staff };

  const p: Fake = {
    closes, movements, audits, logs, warnings, calls,
    rowsOf: opts.rows ?? DAY_ROWS,
    floorOf: opts.floor ?? CLEAR,
    tick: ms => { now += ms; },
    now: () => now,
    log: l => logs.push(l),
    warn: w => warnings.push(w),
    staff: { bySession: async () => staff },
    pin: { verify: async (pin, stored) => stored === `hash(${pin})` },
    pinState: {
      get: async (_r, id) => pins.get(id) ?? { wrongAt: [] },
      update: async (_r, id, fn) => { const out = fn(pins.get(id) ?? { wrongAt: [] }); pins.set(id, out.state); return out.state; },
    },
    config: { settings: async () => (opts.config === undefined ? {} : opts.config) },
    read: {
      close: async (_r, bd) => { calls.push(`read.close:${bd}`); if (opts.readFails === 'close') throw new Error('firestore'); return closes.get(bd) ?? null; },
      rows: async () => { calls.push('read.rows'); if (opts.readFails === 'rows') throw new Error('firestore'); return p.rowsOf; },
      movements: async (_r, bd) => { calls.push('read.movements'); return [...movements.values()].filter(m => m.businessDate === bd); },
      floor: async () => { calls.push('read.floor'); if (opts.readFails === 'floor') throw new Error('firestore'); return p.floorOf; },
    },
    async transact(_rid, fn) {
      n += 1;
      await opts.onTransact?.(n, p);
      // Staged writes, applied only if the body resolves: a transaction lands whole or not at all.
      const pc = new Map<string, CloseDoc>(); const pm = new Map<string, StoredMovement>();
      const pv = new Map<string, NonNullable<StoredMovement['void']>>(); const pa = new Map<string, AuditRow>();
      const t: Tx = {
        readClose: async bd => { calls.push('tx.readClose'); return closes.get(bd) ?? null; },
        createClose: (bd, doc) => { if (closes.has(bd) || pc.has(bd)) throw new Error('already exists'); pc.set(bd, doc); },
        rowsForDay: async () => { calls.push('tx.rowsForDay'); return p.rowsOf; },
        movementsForDay: async bd => { calls.push('tx.movementsForDay'); return [...movements.values()].filter(m => m.businessDate === bd); },
        floorOn: async () => { calls.push('tx.floorOn'); return p.floorOf; },
        movementById: async id => movements.get(id) ?? null,
        createMovement: (id, m) => { if (movements.has(id) || pm.has(id)) throw new Error('already exists'); pm.set(id, m); },
        setMovementVoid: (id, v) => { pv.set(id, v); },
        createAudit: (id, r) => { if (audits.has(id) || pa.has(id)) throw new Error('already exists'); pa.set(id, r); },
      };
      const out = await fn(t);
      pc.forEach((v, k) => closes.set(k, v));
      pm.forEach((v, k) => movements.set(k, v));
      pv.forEach((v, k) => { const m = movements.get(k); if (m) movements.set(k, { ...m, void: v }); });
      pa.forEach((v, k) => audits.set(k, v));
      return out;
    },
  };
  return p;
}

const fails = async (pr: Promise<unknown>): Promise<DayCloseError> => {
  try { await pr; } catch (e) { return e as DayCloseError; }
  throw new Error('expected a refusal, got a success');
};
const req = (o: Record<string, unknown> = {}) => ({ restaurantId: RID, sessionId: 's1', businessDate: DAY, countedCash: EXPECTED, ...o }) as never;
const moveReq = (o: Record<string, unknown> = {}) => ({ restaurantId: RID, sessionId: 's1', movementId: 'm_new', kind: 'out', amount: 120000, reason: 'vendor payment', pin: '1234', ...o }) as never;

describe('close', () => {
  it('DC-S1 writes one dayClose document and NO audit row when the count is exact', async () => {
    const p = fakePorts();
    const { doc } = await close(p, req());
    expect(doc).toMatchObject({ businessDate: DAY, closed: true, closedAt: T0, closedBy: 'priya', openingFloat: 200000, expectedCash: EXPECTED, countedCash: EXPECTED, difference: 0 });
    expect(p.closes.size).toBe(1);
    // R16: a clean close is already recorded by its own document; a P1 row every quiet night buries the noisy ones.
    expect(p.audits.size).toBe(0);
  });

  it('DC-S1 freezes byTender, byStaff, movements and the threshold onto the document', async () => {
    const { doc } = await close(fakePorts(), req());
    expect(doc.byTender.find(t => t.tenderId === 'cash')).toMatchObject({ taken: 1245000, refunded: 8400, net: 1236600, count: 3 });
    expect(doc.byTender.find(t => t.tenderId === 'card')).toMatchObject({ taken: 3120000, net: 3120000 });
    expect(doc.byStaff.map(s => s.staffId).sort()).toEqual(['priya', 'ravi']);
    expect(doc.movements).toHaveLength(2);
    expect(doc.thresholds).toEqual({ overShortP0Above: 10000 });
  });

  it('DC-S1 stamps closedAt and closedBy from the clock and the session, never from the body', async () => {
    const { doc } = await close(fakePorts(), req({ closedAt: 1, closedBy: 'someone else', closed: false }));
    expect(doc.closedAt).toBe(T0);
    expect(doc.closedBy).toBe('priya');
    expect(doc.closed).toBe(true);
  });

  it('DC-S2 a short drawer is written, with the difference and a P1 audit row', async () => {
    const p = fakePorts();
    const { doc } = await close(p, req({ countedCash: EXPECTED - 5000 }));
    expect(doc.difference).toBe(-5000);
    expect(p.audits.get(`${DAY}_dayClose`)).toMatchObject({ sev: 'P1', action: 'dayClose', amount: 5000, reason: 'drawer short', staffId: 'priya' });
  });

  it('DC-S3 an over drawer reads over, not short', async () => {
    const p = fakePorts();
    expect((await close(p, req({ countedCash: EXPECTED + 5000 }))).doc.difference).toBe(5000);
    expect(p.audits.get(`${DAY}_dayClose`)?.reason).toBe('drawer over');
  });

  it('DC-S23 a difference over the threshold writes a P0 audit row', async () => {
    const p = fakePorts();
    await close(p, req({ countedCash: EXPECTED - 90000, pin: '1234' }));
    expect(p.audits.get(`${DAY}_dayClose`)?.sev).toBe('P0');
  });

  it('DC-S29 a difference over the threshold needs a PIN, and is still RECORDED once given', async () => {
    const p = fakePorts();
    const e = await fails(close(p, req({ countedCash: 13166000 })));   // the extra zero
    expect(e.code).toBe('permission-denied');
    expect(e.details.requires).toBe('pin');
    expect(p.closes.size).toBe(0);
    const { doc } = await close(p, req({ countedCash: 13166000, pin: '1234' }));
    expect(doc.difference).toBe(13166000 - EXPECTED);   // R4 does not bend
  });

  it('DC-S29 a wrong PIN refuses and writes nothing', async () => {
    const p = fakePorts();
    const e = await fails(close(p, req({ countedCash: EXPECTED - 90000, pin: '9999' })));
    expect(e.details.wrong).toBe(true);
    expect(p.closes.size).toBe(0);
  });

  it('a difference INSIDE the threshold needs no PIN', async () => {
    const p = fakePorts();
    expect((await close(p, req({ countedCash: EXPECTED - 10000 }))).doc.difference).toBe(-10000);
  });

  it('DC-S7 a second close of the same date with a different count is refused and names who closed it', async () => {
    const p = fakePorts();
    await close(p, req());
    const e = await fails(close(p, req({ countedCash: 1, sessionId: 's2' })));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toMatch(/already closed/);
    expect(e.details.countedCash).toBe(EXPECTED);
    expect(p.closes.size).toBe(1);
  });

  it('DC-S7 a close that races another transaction into the same date loses on create, never two documents', async () => {
    // The other till commits its close between this one's decision and its write.
    const p = fakePorts({ onTransact: async (n, f) => { if (n === 1) f.closes.set(DAY, { ...(await close(fakePorts(), req())).doc, closedBy: 'ravi', countedCash: 1 }); } });
    const e = await fails(close(p, req()));
    expect(e.code).toBe('failed-precondition');
    expect(p.closes.get(DAY)?.closedBy).toBe('ravi');
  });

  it('DC-S27 a retry with the SAME count returns the frozen document as a success', async () => {
    const p = fakePorts();
    const first = await close(p, req());
    const again = await close(p, req());
    expect(again.retry).toBe(true);
    expect(again.doc).toEqual(first.doc);
    expect(p.closes.size).toBe(1);
  });

  it('DC-S13 a ledger that throws answers unavailable and writes nothing at all', async () => {
    const p = fakePorts({ readFails: 'rows' });
    const e = await fails(close(p, req()));
    expect(e.code).toBe('unavailable');
    expect(p.closes.size).toBe(0);
  });

  it('DC-S13 a day whose close document cannot be read is unknown, and unknown refuses', async () => {
    const p = fakePorts({ readFails: 'close' });
    expect((await fails(close(p, req()))).code).toBe('failed-precondition');
    expect(p.closes.size).toBe(0);
  });

  it('DC-S5 an issued bill on the date refuses and writes nothing', async () => {
    const p = fakePorts({ floor: { issued: [{ billId: 'b1', number: '0431', businessDate: DAY, tableLabel: 'Table 12' }], unbilled: [] } });
    const e = await fails(close(p, req()));
    expect(e.message).toMatch(/0431/);
    expect(p.closes.size).toBe(0);
  });

  it('DC-S25 food on a table with no bill yet refuses the close', async () => {
    const p = fakePorts({ floor: { issued: [], unbilled: [{ lineId: 'l1', name: 'Mutton Biryani', businessDate: DAY, tableId: 'Table 4' }] } });
    const e = await fails(close(p, req()));
    expect(e.message).toMatch(/not on a bill yet/);
    expect(p.closes.size).toBe(0);
  });

  it('DC-S26 the frozen numbers are read INSIDE the transaction, so a late payment is not lost', async () => {
    // Ravi takes ₹500 cash on the other tablet between Priya's count and her write.
    const p = fakePorts({ onTransact: (n, f) => { if (n === 1) f.rowsOf = [...DAY_ROWS, row('take', 50000, cash, 'ravi')]; } });
    const { doc } = await close(p, req({ countedCash: EXPECTED + 50000, pin: '1234' }));
    expect(doc.expectedCash).toBe(EXPECTED + 50000);
    expect(doc.difference).toBe(0);
    expect(p.calls).toContain('tx.rowsForDay');
  });

  it('DC-S26 a late payment that pushes the difference over the threshold refuses rather than freezing a PIN-less close', async () => {
    const p = fakePorts({ onTransact: (n, f) => { if (n === 1) f.rowsOf = [...DAY_ROWS, row('take', 90000, cash, 'ravi')]; } });
    const e = await fails(close(p, req()));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toMatch(/moved while you were counting/);
    expect(p.closes.size).toBe(0);
  });

  it('DC-S19 a day with no rows and no movements closes with expected 0 and counted 0', async () => {
    const p = fakePorts({ rows: [], movements: [] });
    const { doc } = await close(p, req({ countedCash: 0 }));
    expect(doc).toMatchObject({ expectedCash: 0, countedCash: 0, difference: 0, openingFloat: 0 });
  });

  it('a voided movement is frozen onto the document but is not in expectedCash', async () => {
    const p = fakePorts({ movements: [mv('float', 200000), mv('out', 120000, { void: { at: T0, by: 'priya', reason: 'wrong amount' } })] });
    const { doc } = await close(p, req({ countedCash: EXPECTED + 120000 }));
    expect(doc.expectedCash).toBe(EXPECTED + 120000);
    expect(doc.movements).toHaveLength(2);           // DC-S10: three things happened, three rows show
    expect(doc.difference).toBe(0);
  });

  it('DC-S31 leftInDrawer is recorded, and more than was counted is refused', async () => {
    expect((await close(fakePorts(), req({ leftInDrawer: 216600 }))).doc.leftInDrawer).toBe(216600);
    expect((await fails(close(fakePorts(), req({ leftInDrawer: EXPECTED + 1 })))).code).toBe('invalid-argument');
    expect((await close(fakePorts(), req())).doc.leftInDrawer).toBeNull();
  });

  it('countedByTender lands on the tender row with its own difference, and a typo is refused', async () => {
    const { doc } = await close(fakePorts(), req({ countedByTender: { card: 3075000 } }));
    expect(doc.byTender.find(t => t.tenderId === 'card')).toMatchObject({ counted: 3075000, difference: -45000 });
    expect(doc.byTender.find(t => t.tenderId === 'cash')?.counted).toBeUndefined();
    expect((await fails(close(fakePorts(), req({ countedByTender: { crad: 1 } })))).code).toBe('invalid-argument');
    expect((await fails(close(fakePorts(), req({ countedByTender: { card: -1 } })))).code).toBe('invalid-argument');
  });

  it('DC-S20 a SERVER is refused and writes nothing', async () => {
    const p = fakePorts({ staff: { role: 'SERVER' } });
    expect((await fails(close(p, req()))).code).toBe('permission-denied');
    expect(p.closes.size).toBe(0);
  });

  it('DC-S22 a business date that has not happened yet is refused', async () => {
    expect((await fails(close(fakePorts(), req({ businessDate: '2026-09-17' })))).code).toBe('invalid-argument');
  });

  it('logs one line with the business date, the count and the difference', async () => {
    const p = fakePorts();
    await close(p, req({ countedCash: EXPECTED - 5000 }));
    expect(p.logs.at(-1)).toMatchObject({ mod: 'dayClose', cid: `day_${DAY}`, action: 'close', amount: EXPECTED - 5000, difference: -5000, outcome: 'applied' });
  });
});

describe('get', () => {
  it('DC-S30 while the day is open and blindCount is true, no cash figure leaves the server', async () => {
    const v = await get(fakePorts(), { restaurantId: RID, sessionId: 's1', businessDate: DAY });
    expect(v.closed).toBe(false);
    expect(v.expectedCash).toBeUndefined();
    expect(v.openingFloat).toBeUndefined();
    expect(v.byStaff).toBeUndefined();
    expect(v.movements).toBeUndefined();
    expect(v.byTender.map(t => t.tenderId).sort()).toEqual(['card', 'upi']);   // nothing cash-kind
    expect(JSON.stringify(v)).not.toContain('1316600');
    expect(JSON.stringify(v)).not.toContain('1245000');
  });

  it('DC-S4 with blindCount false the cash figures are all present', async () => {
    const v = await get(fakePorts({ config: { dayClose: { blindCount: false } } }), { restaurantId: RID, sessionId: 's1', businessDate: DAY });
    expect(v.expectedCash).toBe(EXPECTED);
    expect(v.openingFloat).toBe(200000);
    expect(v.byTender.map(t => t.tenderId)).toContain('cash');
    expect(v.movements).toHaveLength(2);
  });

  it('once the day is closed everything reads back frozen, whatever blindCount says', async () => {
    const p = fakePorts();
    const { doc } = await close(p, req({ countedCash: EXPECTED - 5000 }));
    const v = await get(p, { restaurantId: RID, sessionId: 's1', businessDate: DAY });
    expect(v).toMatchObject({ closed: true, expectedCash: doc.expectedCash, countedCash: doc.countedCash, difference: -5000, closedBy: 'priya' });
    expect(v.byTender).toEqual(doc.byTender);
  });

  it('DC-S24 a closed day is read from the frozen copy, not recomputed from live rows', async () => {
    const p = fakePorts();
    await close(p, req());
    p.rowsOf = [];                                   // the world moves on
    expect((await get(p, { restaurantId: RID, sessionId: 's1', businessDate: DAY })).expectedCash).toBe(EXPECTED);
  });

  it('DC-S32 a previous day that was never closed reads previousDayClosed false, and does not refuse', async () => {
    const v = await get(fakePorts(), { restaurantId: RID, sessionId: 's1', businessDate: DAY });
    expect(v.previousDayClosed).toBe(false);
    expect(v.previousClose).toBeNull();
  });

  it('DC-S31 yesterday`s close hands the morning what was left in the drawer', async () => {
    const p = fakePorts();
    await close(p, req({ leftInDrawer: 216600 }));
    p.tick(24 * 3600_000);
    const v = await get(p, { restaurantId: RID, sessionId: 's1', businessDate: '2026-09-17' });
    expect(v.previousClose).toEqual({ businessDate: DAY, countedCash: EXPECTED, leftInDrawer: 216600 });
    expect(v.previousDayClosed).toBe(true);
  });

  it('a day nobody has traded reads open and never throws', async () => {
    const v = await get(fakePorts({ rows: [], movements: [] }), { restaurantId: RID, sessionId: 's1', businessDate: '2026-09-14' });
    expect(v.closed).toBe(false);
    expect(v.byTender).toEqual([]);
  });

  it('DC-S18 with the cash figures on, byStaff splits two cashiers on one drawer', async () => {
    const v = await get(fakePorts({ config: { dayClose: { blindCount: false } } }), { restaurantId: RID, sessionId: 's1', businessDate: DAY });
    expect(v.byStaff?.find(s => s.staffId === 'priya')).toMatchObject({ taken: 3840000, refunded: 8400 });
    expect(v.byStaff?.find(s => s.staffId === 'ravi')).toMatchObject({ taken: 1415000 });
  });

  it('a SERVER may read the day', async () => {
    const v = await get(fakePorts({ staff: { role: 'SERVER' } }), { restaurantId: RID, sessionId: 's1', businessDate: DAY });
    expect(v.businessDate).toBe(DAY);
  });

  it('with no businessDate it answers for the current one, taken from the server clock', async () => {
    expect((await get(fakePorts(), { restaurantId: RID, sessionId: 's1' })).businessDate).toBe(DAY);
  });

  it('reports what is still on the floor so the screen can say why the close will refuse', async () => {
    const p = fakePorts({ floor: { issued: [{ billId: 'b1', number: '0431', businessDate: DAY }], unbilled: [{ lineId: 'l1', name: 'x', businessDate: DAY }] } });
    expect((await get(p, { restaurantId: RID, sessionId: 's1', businessDate: DAY })).floor).toEqual({ issuedBills: 1, unbilledItems: 1 });
  });
});

describe('move', () => {
  it('DC-S8 writes one movement and one P0 audit row, with the business date from the server clock', async () => {
    const p = fakePorts();
    const { movement } = await move(p, moveReq());
    expect(movement).toMatchObject({ movementId: 'm_new', businessDate: DAY, kind: 'out', amount: 120000, reason: 'vendor payment', at: T0, by: 'priya', void: null });
    expect(p.audits.get('m_new_drawer')).toMatchObject({ sev: 'P0', action: 'drawer', amount: 120000 });
  });

  it('DC-S8 a movement needs a PIN — recording a cash-out IS ST`s open-the-drawer-with-no-sale', async () => {
    const p = fakePorts();
    const e = await fails(move(p, moveReq({ pin: undefined })));
    expect(e.code).toBe('permission-denied');
    expect(e.details.requires).toBe('pin');
    expect(p.movements.has('m_new')).toBe(false);
    expect((await fails(move(p, moveReq({ pin: '9999' })))).details.wrong).toBe(true);
    expect(p.movements.has('m_new')).toBe(false);
  });

  it('DC-S9 a float at 11:00 lands on the same business date', async () => {
    const p = fakePorts({ now: ist(2026, 9, 16, 11, 0) });
    expect((await move(p, moveReq({ movementId: 'm_f', kind: 'float', amount: 200000, reason: 'opening float' }))).movement.businessDate).toBe(DAY);
  });

  it('a movement at 01:30 with close hour 04:00 lands on the PREVIOUS business date', async () => {
    const p = fakePorts({ now: ist(2026, 9, 17, 1, 30) });
    expect((await move(p, moveReq())).movement.businessDate).toBe(DAY);
  });

  it('DC-S12 a retry with the same movementId is one row and a success, with no second audit row', async () => {
    const p = fakePorts();
    await move(p, moveReq());
    const again = await move(p, moveReq());
    expect(again.retry).toBe(true);
    expect([...p.movements.values()].filter(m => m.movementId === 'm_new')).toHaveLength(1);
    expect(p.audits.size).toBe(1);
  });

  it('the same movementId with a different amount is refused, never a silent overwrite', async () => {
    const p = fakePorts();
    await move(p, moveReq());
    expect((await fails(move(p, moveReq({ amount: 999 })))).code).toBe('failed-precondition');
    expect(p.movements.get('m_new')?.amount).toBe(120000);
  });

  it('DC-S11 a movement on a closed day refuses and writes nothing', async () => {
    const p = fakePorts();
    await close(p, req());
    const e = await fails(move(p, moveReq()));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toMatch(/closed/);
    expect(p.movements.has('m_new')).toBe(false);
  });

  it('DC-S20 a SERVER is refused and is never asked for a PIN', async () => {
    const p = fakePorts({ staff: { role: 'SERVER' } });
    const e = await fails(move(p, moveReq()));
    expect(e.code).toBe('permission-denied');
    expect(e.details.requires).toBeUndefined();
  });

  it('a reason outside the configured list is refused before any PIN is asked for', async () => {
    const p = fakePorts();
    const e = await fails(move(p, moveReq({ reason: 'because' })));
    expect(e.code).toBe('invalid-argument');
  });
});

describe('voidMove', () => {
  it('DC-S10 asks for a PIN, writes the void and a P0 audit row, and the amount leaves expectedCash', async () => {
    const p = fakePorts();
    await move(p, moveReq({ movementId: 'm_typo', amount: 1200000 }));
    expect((await fails(voidMove(p, { restaurantId: RID, sessionId: 's1', movementId: 'm_typo', reason: 'correction' } as never))).details.requires).toBe('pin');
    const { movement } = await voidMove(p, { restaurantId: RID, sessionId: 's1', movementId: 'm_typo', reason: 'correction', pin: '1234' } as never);
    expect(movement.void).toMatchObject({ by: 'priya', reason: 'correction', at: T0 });
    expect(p.audits.get('m_typo_drawerVoid')).toMatchObject({ sev: 'P0', action: 'voidDrawerMove', amount: 1200000 });
    // and the next close does not see it
    expect((await close(p, req())).doc.expectedCash).toBe(EXPECTED);
  });

  it('a retry of the same void by the same staff with the same reason is idempotent', async () => {
    const p = fakePorts();
    await move(p, moveReq({ movementId: 'm_typo' }));
    const args = { restaurantId: RID, sessionId: 's1', movementId: 'm_typo', reason: 'correction', pin: '1234' } as never;
    await voidMove(p, args);
    expect((await voidMove(p, args)).retry).toBe(true);
    expect(p.audits.size).toBe(2);   // one for the move, one for the void; never a third
  });

  it('DC-S11 a movement on a closed day cannot be voided', async () => {
    const p = fakePorts();
    await close(p, req());
    expect((await fails(voidMove(p, { restaurantId: RID, sessionId: 's1', movementId: 'm_out', reason: 'correction', pin: '1234' } as never))).code).toBe('failed-precondition');
    expect(p.movements.get('m_out')?.void).toBeNull();
  });

  it('a movement that does not exist is refused and is never asked for a PIN', async () => {
    const e = await fails(voidMove(fakePorts(), { restaurantId: RID, sessionId: 's1', movementId: 'nope', reason: 'correction' } as never));
    expect(e.code).toBe('failed-precondition');
    expect(e.details.requires).toBeUndefined();
  });

  it('DC-S20 a SERVER is refused', async () => {
    const p = fakePorts({ staff: { role: 'SERVER' } });
    expect((await fails(voidMove(p, { restaurantId: RID, sessionId: 's1', movementId: 'm_out', reason: 'correction' } as never))).code).toBe('permission-denied');
  });
});
