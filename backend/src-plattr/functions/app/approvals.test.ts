// ST app layer: apply() with fake adapters and a fake clock. No emulator.
import { apply, reasons, ApprovalError, Ports, Tx, Staff } from './approvals';
import { Line, PinState, AuditRow, DEFAULTS } from '../domain/approvals';
import { OFFLINE_DEFAULTS } from '../domain/offline';

const RID = 'r1';
const MIN = 60_000;

function fakePorts(opts: { staff?: Partial<Staff>; config?: unknown; failAudit?: boolean } = {}) {
  const lines = new Map<string, Line>([
    ['line_pitcher', { listPrice: 125000, sent: true, v: 0, countsTowardTotal: true }],
    ['line_tikka', { listPrice: 32000, sent: true, v: 0, countsTowardTotal: true, offer: { id: 'happy_hour', amount: 6400 } }],
  ]);
  const audits = new Map<string, AuditRow>();
  const pins = new Map<string, PinState>();
  const logs: object[] = [];
  const warnings: string[] = [];
  let now = 1_000_000;
  const staff: Staff = { staffId: 'manager_st', role: 'MANAGER', status: 'active', pinHash: 'hash(1234)', ...opts.staff };
  const ports: Ports & { lines: typeof lines; audits: typeof audits; pins: typeof pins; logs: typeof logs; warnings: typeof warnings; tick(ms: number): void; sessions: Set<string> } = {
    lines, audits, pins, logs, warnings, sessions: new Set([`${RID}/s1`]),
    tick: (ms: number) => { now += ms; },
    now: () => now,
    log: l => logs.push(l),
    warn: w => warnings.push(w),
    staff: { bySession: async (rid, sid) => { if (!ports.sessions.has(`${rid}/${sid}`)) throw new ApprovalError('unauthenticated', 'Invalid or expired session'); return staff; } },
    pin: { verify: async (pin, stored) => stored === `hash(${pin})` },
    config: { approvals: async () => opts.config },
    pinState: { get: async (_rid, staffId) => pins.get(staffId) ?? { wrongAt: [] }, update: async (_rid, staffId, fn) => { const r = fn(pins.get(staffId) ?? { wrongAt: [] }); pins.set(staffId, r.state); if (r.audit) audits.set(`${staffId}_streak_${now}`, r.audit); return r.state; } },
    transact: async (_rid, fn) => {
      const pendingLines = new Map<string, Line>(); const pendingAudits = new Map<string, AuditRow>();
      const t: Tx = {
        getLine: async id => lines.get(id) ?? null,
        setLine: (id, line) => { pendingLines.set(id, line); },
        createAudit: (id, row) => { if (opts.failAudit) throw new Error('firestore unavailable'); if (audits.has(id)) throw new Error('already exists'); pendingAudits.set(id, row); },
        getAudit: async id => audits.get(id) ?? null,
        kotJobsOfCart: async () => [],
        createPrintJob: () => {},
      };
      const out = await fn(t);
      for (const [k, v] of pendingLines) lines.set(k, v);
      for (const [k, v] of pendingAudits) audits.set(k, v);
      return out;
    },
  };
  return ports;
}

const discount = (extra: Record<string, unknown> = {}) =>
  ({ restaurantId: RID, sessionId: 's1', action: 'discount', cid: 'c1', lineId: 'line_pitcher', reason: 'regular', ...extra });

async function fails(p: Promise<unknown>): Promise<ApprovalError> {
  try { await p; } catch (e) { return e as ApprovalError; }
  throw new Error('expected a throw');
}

describe('app/approvals apply()', () => {
  it('ST-S1 MANAGER, ₹100, reason regular → line written with discount, audit row P1, log outcome:applied, no PIN asked', async () => {
    const p = fakePorts();
    const res = await apply(p, discount({ amount: 100 }));
    expect(res.line).toMatchObject({ v: 1, discount: { amount: 10000, pct: 8, source: { reason: 'regular', note: '', approverId: 'manager_st' } } });
    expect(p.lines.get('line_pitcher')?.v).toBe(1);
    expect([...p.audits.values()]).toHaveLength(1);
    expect(p.audits.get('line_pitcher_v1')).toMatchObject({ sev: 'P1', amount: 10000, pct: 8, staffId: 'manager_st', cid: 'c1', ts: 1_000_000 });
    expect(p.logs).toEqual([{ cid: 'c1', action: 'discount', sev: 'P1', needsPin: false, outcome: 'applied' }]);
  });
  it('ST-S2 ₹251 without pin → throws permission-denied {requires:pin, action:discount, sev:P0}; nothing written', async () => {
    const p = fakePorts();
    const e = await fails(apply(p, discount({ amount: 251 })));
    expect(e).toMatchObject({ code: 'permission-denied', details: { requires: 'pin', action: 'discount', sev: 'P0' } });
    expect(p.lines.get('line_pitcher')?.v).toBe(0);
    expect(p.audits.size).toBe(0);
    expect(p.logs).toEqual([{ cid: 'c1', action: 'discount', sev: 'P0', needsPin: true, outcome: 'needs_pin' }]);
  });
  it('ST-S2 ₹251 with correct pin → line + audit P0 reason placard in ONE transaction; response is the new line', async () => {
    const p = fakePorts();
    const res = await apply(p, discount({ amount: 251, reason: 'placard', pin: '1234' }));
    expect(res.line).toMatchObject({ v: 1, discount: { amount: 25100, pct: 20.08 } });
    expect(p.audits.get('line_pitcher_v1')).toMatchObject({ sev: 'P0', reason: 'placard', amount: 25100, pct: 20.08, before: { v: 0 }, after: { v: 1 } });
    expect(p.logs.at(-1)).toEqual({ cid: 'c1', action: 'discount', sev: 'P0', needsPin: true, outcome: 'applied' });
  });
  it('ST-S3 wrong pin → permission-denied {requires:pin, wrong:true, attemptsLeft:4}; lock state written; no line/audit', async () => {
    const p = fakePorts();
    const e = await fails(apply(p, discount({ amount: 251, pin: '0000' })));
    expect(e).toMatchObject({ code: 'permission-denied', details: { requires: 'pin', wrong: true, attemptsLeft: 4 } });
    expect(e.details).not.toHaveProperty('retryAfter');
    expect(p.pins.get('manager_st')).toEqual({ wrongAt: [1_000_000] });
    expect(p.lines.get('line_pitcher')?.v).toBe(0);
    expect(p.audits.size).toBe(0);
    expect(p.logs.at(-1)).toMatchObject({ outcome: 'wrong_pin' });
  });
  it('ST-S3 5th wrong in 10 min → retryAfter now+1s, one pinStreak audit P0; correct pin too soon → refused unchecked, not counted; at retryAfter → applied', async () => {
    const p = fakePorts();
    for (let i = 0; i < 4; i++) { await fails(apply(p, discount({ amount: 251, pin: '0000' }))); p.tick(MIN); }
    const fifth = await fails(apply(p, discount({ amount: 251, pin: '0000' })));
    const t5 = 1_000_000 + 4 * MIN;
    expect(fifth).toMatchObject({ code: 'permission-denied', details: { requires: 'pin', wrong: true, attemptsLeft: 0, retryAfter: t5 + 1000 } });
    const streakRows = [...p.audits.values()].filter(a => a.action === 'pinStreak');
    expect(streakRows).toEqual([expect.objectContaining({ sev: 'P0', staffId: 'manager_st', cid: 'c1', lineId: null })]);
    p.tick(500);
    const soon = await fails(apply(p, discount({ amount: 251, reason: 'placard', pin: '1234' })));
    expect(soon).toMatchObject({ code: 'permission-denied', details: { requires: 'pin', tooSoon: true, retryAfter: t5 + 1000 } });
    expect(p.pins.get('manager_st')?.wrongAt).toHaveLength(5);      // not counted
    expect(p.logs.at(-1)).toMatchObject({ outcome: 'too_soon' });
    p.tick(500);
    const res = await apply(p, discount({ amount: 251, reason: 'placard', pin: '1234' }));
    expect(res.line?.v).toBe(1);
    expect(p.pins.get('manager_st')).toEqual({ wrongAt: [] });
  });
  it('ST-S3 6th wrong (after waiting) → retryAfter now+2s, no second pinStreak row', async () => {
    const p = fakePorts();
    for (let i = 0; i < 5; i++) { await fails(apply(p, discount({ amount: 251, pin: '0000' }))); p.tick(2000); }
    const sixth = await fails(apply(p, discount({ amount: 251, pin: '0000' })));
    expect(sixth.details).toMatchObject({ wrong: true, retryAfter: p.now() + 2000 });
    expect([...p.audits.values()].filter(a => a.action === 'pinStreak')).toHaveLength(1);
  });
  it('ST-S3 the account is never locked: after the 5th wrong an under-limit ₹100 with no PIN still applies', async () => {
    const p = fakePorts();
    for (let i = 0; i < 5; i++) await fails(apply(p, discount({ amount: 251, pin: '0000' })));
    const res = await apply(p, discount({ amount: 100 }));
    expect(res.line?.v).toBe(1);
  });
  it('wrong pin → pin state IS persisted even though the business transaction never ran', async () => {
    const p = fakePorts();
    await fails(apply(p, discount({ amount: 251, pin: '0000' })));
    expect(p.pins.get('manager_st')?.wrongAt).toHaveLength(1);
  });
  it('ST-S4 SERVER → permission-denied without requires; no pin verify, no writes', async () => {
    const p = fakePorts({ staff: { role: 'SERVER' } });
    const e = await fails(apply(p, discount({ amount: 10, pin: '1234' })));
    expect(e.code).toBe('permission-denied');
    expect(e.details).not.toHaveProperty('requires');
    expect(p.audits.size).toBe(0);
    expect(p.pins.size).toBe(0);
    expect(p.logs.at(-1)).toMatchObject({ outcome: 'forbidden', needsPin: false });
  });
  it('ST-S6 blank reason → invalid-argument before any PIN prompt', async () => {
    const p = fakePorts();
    const e = await fails(apply(p, discount({ amount: 251, reason: '' })));
    expect(e).toMatchObject({ code: 'invalid-argument', message: 'reason required' });
    expect(e.details).not.toHaveProperty('requires');
  });
  it('ST-S7 audit write throws → transaction aborts, line unchanged, error unavailable "try again"', async () => {
    const p = fakePorts({ failAudit: true });
    const e = await fails(apply(p, discount({ amount: 100 })));
    expect(e).toMatchObject({ code: 'unavailable', message: 'Could not record the approval, try again' });
    expect(p.lines.get('line_pitcher')?.v).toBe(0);
    expect(p.audits.size).toBe(0);
    expect(p.logs.at(-1)).toMatchObject({ outcome: 'try_again' });
  });
  it('line write throws → no audit row (same transaction)', async () => {
    const p = fakePorts();
    p.transact = async () => { throw new Error('write failed'); };
    await fails(apply(p, discount({ amount: 100 })));
    expect(p.audits.size).toBe(0);
  });
  it('ST-S9 pin appears in no audit row, no log line, no response, no error', async () => {
    const p = fakePorts();
    const res = await apply(p, discount({ amount: 251, reason: 'placard', pin: '1234' }));
    const e = await fails(apply(p, discount({ amount: 251, reason: 'placard', pin: '9999' })));
    const everything = JSON.stringify([res, e, e.details, [...p.audits.values()], p.logs, [...p.lines.values()]]);
    expect(everything).not.toContain('1234');
    expect(everything).not.toContain('9999');
    expect(everything).not.toContain('"pin":');   // a `pin` key; `requires:"pin"` is the challenge marker, not the secret
  });
  it('pin sent on an under-limit action → ignored, not verified, not counted', async () => {
    const p = fakePorts();
    await apply(p, discount({ amount: 100, pin: '0000' }));
    expect(p.pins.size).toBe(0);
  });
  it('pin "" is treated as missing → requires:pin, counter unchanged', async () => {
    const p = fakePorts();
    const e = await fails(apply(p, discount({ amount: 251, pin: '' })));
    expect(e.details).toMatchObject({ requires: 'pin' });
    expect(p.pins.size).toBe(0);
  });
  it('pin not a string (123456, null, {}) → invalid-argument, counter unchanged, no hash compare', async () => {
    const p = fakePorts();
    for (const bad of [123456, null, {}]) {
      const e = await fails(apply(p, discount({ amount: 251, pin: bad })));
      expect(e.code).toBe('invalid-argument');
    }
    expect(p.pins.size).toBe(0);
  });
  it('streak is per staffId: manager_a slowed, manager_b correct pin → applied', async () => {
    const p = fakePorts({ staff: { staffId: 'manager_b' } });
    p.pins.set('manager_a', { wrongAt: [1], retryAfter: 1_000_000 + 10 * MIN });
    const res = await apply(p, discount({ amount: 251, reason: 'placard', pin: '1234' }));
    expect(res.line?.v).toBe(1);
  });
  it('ST-S10 config read per request: limit 5 → ₹100 asks PIN; config missing → defaults + one warning', async () => {
    let cfg: unknown = undefined;
    const p = fakePorts();
    p.config = { approvals: async () => cfg };
    await apply(p, discount({ amount: 100 }));
    expect(p.warnings).toEqual(['approvals config missing, defaults apply']);
    cfg = { discountPinAbovePercent: 5 };
    const e = await fails(apply(p, discount({ amount: 100, cid: 'c2' })));
    expect(e.details).toMatchObject({ requires: 'pin' });
  });
  it('line not found → not-found; cid missing → invalid-argument; unknown action → invalid-argument', async () => {
    const p = fakePorts();
    expect((await fails(apply(p, discount({ amount: 100, lineId: 'nope' })))).code).toBe('not-found');
    expect((await fails(apply(p, discount({ amount: 100, cid: undefined })))).code).toBe('invalid-argument');
    expect((await fails(apply(p, discount({ amount: 100, action: 'refund' })))).code).toBe('invalid-argument');
  });
  it('ST-S13 ₹400 on the ₹320 tikka with ₹64 offer (PIN given) → failed-precondition, no audit row, line unchanged', async () => {
    const p = fakePorts();
    const e = await fails(apply(p, discount({ amount: 400, lineId: 'line_tikka', reason: 'placard', pin: '1234' })));
    expect(e).toMatchObject({ code: 'failed-precondition', message: 'line cannot go below zero' });
    expect(p.audits.size).toBe(0);
    expect(p.lines.get('line_tikka')?.v).toBe(0);
  });
  it('ST-S11 ₹40 on the tikka → PIN (12.5 % of ₹320), then discount 4000 paise beside the 6400 offer', async () => {
    const p = fakePorts();
    expect((await fails(apply(p, discount({ amount: 40, lineId: 'line_tikka' })))).details).toMatchObject({ requires: 'pin', sev: 'P0' });
    const res = await apply(p, discount({ amount: 40, lineId: 'line_tikka', pin: '1234' }));
    expect(res.line).toMatchObject({ offer: { amount: 6400 }, discount: { amount: 4000, pct: 12.5 } });
  });
  it('ST-S12 ₹100 then ₹251 (PIN) → discount 25100 not 35100, two audit rows, v 2', async () => {
    const p = fakePorts();
    await apply(p, discount({ amount: 100 }));
    const res = await apply(p, discount({ amount: 251, reason: 'placard', pin: '1234', cid: 'c2' }));
    expect(res.line).toMatchObject({ v: 2, discount: { amount: 25100 } });
    expect([...p.audits.keys()]).toEqual(['line_pitcher_v1', 'line_pitcher_v2']);
  });
  it('amount typed in rupees with paise (₹0.30 on a ₹3 line = 10.00 %) → stored 30 paise, no PIN', async () => {
    const p = fakePorts();
    p.lines.set('line_tiny', { listPrice: 300, sent: false, v: 0, countsTowardTotal: true });
    const res = await apply(p, discount({ amount: 0.1 + 0.2, lineId: 'line_tiny' }));
    expect(res.line?.discount).toMatchObject({ amount: 30, pct: 10 });
  });
  it('staff status not active → permission-denied; staff doc missing → unauthenticated (via the session door)', async () => {
    expect((await fails(apply(fakePorts({ staff: { status: 'inactive' } }), discount({ amount: 100 })))).code).toBe('permission-denied');
    expect((await fails(apply(fakePorts(), discount({ amount: 100, sessionId: 'ghost' })))).code).toBe('unauthenticated');
  });
  it('role and staffId come from the staff record; a staffId or role in the body is ignored', async () => {
    const p = fakePorts();
    const res = await apply(p, discount({ amount: 100, staffId: 'owner', role: 'ADMIN' }));
    expect(res.line?.discount?.source.approverId).toBe('manager_st');
  });
  it('donor: sessionId that exists only under another restaurantId → unauthenticated, no requires', async () => {
    const p = fakePorts();
    p.sessions.add('r2/s2');
    const e = await fails(apply(p, discount({ amount: 251, sessionId: 's2' })));
    expect(e.code).toBe('unauthenticated');
    expect(e.details).not.toHaveProperty('requires');
  });
  it('donor: reprint → no PIN, audit row sev P1, lineId null; drawer → PIN, audit P0', async () => {
    const p = fakePorts();
    await apply(p, { restaurantId: RID, sessionId: 's1', action: 'reprint', cid: 'c1' });
    expect([...p.audits.values()]).toEqual([expect.objectContaining({ action: 'reprint', sev: 'P1', lineId: null, amount: 0 })]);
    const e = await fails(apply(p, { restaurantId: RID, sessionId: 's1', action: 'drawer', cid: 'c1', reason: 'other' }));
    expect(e.details).toMatchObject({ requires: 'pin', sev: 'P0' });
    await apply(p, { restaurantId: RID, sessionId: 's1', action: 'drawer', cid: 'c1', reason: 'other', pin: '1234' });
    expect([...p.audits.values()].filter(a => a.action === 'drawer')).toEqual([expect.objectContaining({ sev: 'P0' })]);
  });
  it('ST-S5 void of a sent line with pin → void set, countsTowardTotal false, audit P0 amount 1250 pct 100', async () => {
    const p = fakePorts();
    const res = await apply(p, discount({ action: 'void', reason: 'guest left', pin: '1234' }));
    expect(res.line).toMatchObject({ countsTowardTotal: false, void: { reason: 'guest left' } });
    expect(p.audits.get('line_pitcher_v1')).toMatchObject({ sev: 'P0', amount: 125000, pct: 100 });
    const again = await fails(apply(p, discount({ action: 'void', reason: 'guest left', pin: '1234' })));
    expect(again.code).toBe('failed-precondition');
  });

  it('arch-2 (ST-S5 race): line unsent at the decision read, sent by the write transaction → permission-denied requires:pin, nothing written', async () => {
    const p = fakePorts();
    p.lines.set('line_race', { listPrice: 45000, sent: false, v: 0, countsTowardTotal: true });
    let reads = 0;
    const real = p.transact;
    p.transact = (rid, fn) => real(rid, t => fn({ ...t, getLine: async id => { const l = await t.getLine(id); if (id === 'line_race' && l && ++reads === 2) { const sent = { ...l, sent: true }; p.lines.set(id, sent); return sent; } return l; } }));
    const e = await fails(apply(p, discount({ action: 'void', lineId: 'line_race', reason: 'guest left' })));
    expect(e).toMatchObject({ code: 'permission-denied', details: { requires: 'pin', action: 'void', sev: 'P0' } });
    expect(p.lines.get('line_race')).toMatchObject({ v: 0, sent: true, countsTowardTotal: true });
    expect(p.audits.size).toBe(0);
    expect(p.logs.at(-1)).toEqual({ cid: 'c1', action: 'void', sev: 'P0', needsPin: true, outcome: 'needs_pin' });
  });
  it('arch-4: two drawer opens in the same millisecond on one cid → two audit rows, ids distinct', async () => {
    const p = fakePorts();
    const open = () => apply(p, { restaurantId: RID, sessionId: 's1', action: 'drawer', cid: 'c1', reason: 'other', pin: '1234' });
    const [a, b] = await Promise.all([open(), open()]);
    expect(a.auditId).not.toBe(b.auditId);
    expect([...p.audits.values()].filter(r => r.action === 'drawer')).toHaveLength(2);
  });

  it('reasons(): staff session → config reasons; missing config → the 7 defaults; bad session → unauthenticated; never the limit', async () => {
    const p = fakePorts({ config: { reasons: ['placard', 'other'], discountPinAbovePercent: 5 } });
    // OF: the till's offline keys ride the same read (their own defaults when the block is missing)
    expect(await reasons(p, { restaurantId: RID, sessionId: 's1' })).toEqual({ reasons: ['placard', 'other'], offline: OFFLINE_DEFAULTS });
    expect(await reasons(fakePorts(), { restaurantId: RID, sessionId: 's1' })).toEqual({ reasons: DEFAULTS.reasons, offline: OFFLINE_DEFAULTS });
    expect((await fails(reasons(p, { restaurantId: RID, sessionId: 'ghost' }))).code).toBe('unauthenticated');
  });
});

describe('BL-S8 a line on an issued bill is frozen', () => {
  it('discount on a line with billId → failed-precondition "bill already issued", nothing written', async () => {
    const p = fakePorts();
    p.lines.set('line_pitcher', { ...p.lines.get('line_pitcher')!, billId: 'bill_0417' } as Line);
    await expect(apply(p, discount({ amount: 100 }))).rejects.toMatchObject({ code: 'failed-precondition', message: 'bill already issued', details: { billId: 'bill_0417' } });
    expect(p.audits.size).toBe(0);
    expect(p.lines.get('line_pitcher')!.v).toBe(0);
  });
});
