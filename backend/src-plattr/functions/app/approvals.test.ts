// ST app layer: apply() with fake adapters and a fake clock. No emulator.
import { apply, ApprovalError, Ports, Tx, Staff } from './approvals';
import { Line, LockState, AuditRow, DEFAULTS } from '../domain/approvals';

const RID = 'r1';
const MIN = 60_000;

function fakePorts(opts: { staff?: Partial<Staff>; config?: unknown; failAudit?: boolean } = {}) {
  const lines = new Map<string, Line>([['line_pitcher', { listPrice: 1250, sent: true, v: 0, countsTowardTotal: true }]]);
  const audits = new Map<string, AuditRow>();
  const locks = new Map<string, LockState>();
  const logs: object[] = [];
  const warnings: string[] = [];
  let now = 1_000_000;
  const staff: Staff = { staffId: 'manager_st', role: 'MANAGER', status: 'active', password: 'hash(1234)', ...opts.staff };
  const ports: Ports & { lines: typeof lines; audits: typeof audits; locks: typeof locks; logs: typeof logs; warnings: typeof warnings; tick(ms: number): void; sessions: Set<string> } = {
    lines, audits, locks, logs, warnings, sessions: new Set([`${RID}/s1`]),
    tick: (ms: number) => { now += ms; },
    now: () => now,
    log: l => logs.push(l),
    warn: w => warnings.push(w),
    staff: { bySession: async (rid, sid) => { if (!ports.sessions.has(`${rid}/${sid}`)) throw new ApprovalError('unauthenticated', 'Invalid or expired session'); return staff; } },
    pin: { verify: async (pin, stored) => stored === `hash(${pin})` },
    config: { approvals: async () => opts.config },
    lockState: { get: async (_rid, staffId) => locks.get(staffId) ?? { wrongAt: [] }, update: async (_rid, staffId, fn) => { const r = fn(locks.get(staffId) ?? { wrongAt: [] }); locks.set(staffId, r.state); if (r.audit) audits.set(`${staffId}_lock_${now}`, r.audit); return r.state; } },
    transact: async (_rid, fn) => {
      const pendingLines = new Map<string, Line>(); const pendingAudits = new Map<string, AuditRow>();
      const t: Tx = {
        getLine: async id => lines.get(id) ?? null,
        setLine: (id, line) => { pendingLines.set(id, line); },
        createAudit: (id, row) => { if (opts.failAudit) throw new Error('firestore unavailable'); if (audits.has(id)) throw new Error('already exists'); pendingAudits.set(id, row); },
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
    expect(res.line).toMatchObject({ v: 1, discount: { amount: 100, pct: 8, source: { reason: 'regular', note: '', approverId: 'manager_st' } } });
    expect(p.lines.get('line_pitcher')?.v).toBe(1);
    expect([...p.audits.values()]).toHaveLength(1);
    expect(p.audits.get('line_pitcher_v1')).toMatchObject({ sev: 'P1', amount: 100, pct: 8, staffId: 'manager_st', cid: 'c1', ts: 1_000_000 });
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
    expect(res.line).toMatchObject({ v: 1, discount: { amount: 251, pct: 20.08 } });
    expect(p.audits.get('line_pitcher_v1')).toMatchObject({ sev: 'P0', reason: 'placard', amount: 251, pct: 20.08, before: { v: 0 }, after: { v: 1 } });
    expect(p.logs.at(-1)).toEqual({ cid: 'c1', action: 'discount', sev: 'P0', needsPin: true, outcome: 'applied' });
  });
  it('ST-S3 wrong pin → permission-denied {requires:pin, wrong:true, attemptsLeft:4}; lock state written; no line/audit', async () => {
    const p = fakePorts();
    const e = await fails(apply(p, discount({ amount: 251, pin: '0000' })));
    expect(e).toMatchObject({ code: 'permission-denied', details: { requires: 'pin', wrong: true, attemptsLeft: 4 } });
    expect(p.locks.get('manager_st')).toEqual({ wrongAt: [1_000_000] });
    expect(p.lines.get('line_pitcher')?.v).toBe(0);
    expect(p.audits.size).toBe(0);
    expect(p.logs.at(-1)).toMatchObject({ outcome: 'wrong_pin' });
  });
  it('ST-S3 5th wrong in 10 min → locked; audit pinLock P0 staffId; later correct pin within 15 min → refused reason locked', async () => {
    const p = fakePorts();
    for (let i = 0; i < 4; i++) { await fails(apply(p, discount({ amount: 251, pin: '0000' }))); p.tick(MIN); }
    const fifth = await fails(apply(p, discount({ amount: 251, pin: '0000' })));
    expect(fifth).toMatchObject({ code: 'permission-denied', details: { locked: true, lockedUntil: 1_000_000 + 4 * MIN + 15 * MIN } });
    expect(fifth.details).not.toHaveProperty('requires');
    const lockRows = [...p.audits.values()].filter(a => a.action === 'pinLock');
    expect(lockRows).toEqual([expect.objectContaining({ sev: 'P0', staffId: 'manager_st', cid: 'c1', lineId: null })]);
    p.tick(14 * MIN);
    const still = await fails(apply(p, discount({ amount: 251, pin: '1234' })));
    expect(still).toMatchObject({ code: 'permission-denied', details: { locked: true } });
    expect(p.logs.at(-1)).toMatchObject({ outcome: 'locked' });
    p.tick(MIN);
    const res = await apply(p, discount({ amount: 251, reason: 'placard', pin: '1234' }));
    expect(res.line?.v).toBe(1);
    expect(p.locks.get('manager_st')).toEqual({ wrongAt: [] });
  });
  it('wrong pin → lock state IS persisted even though the business transaction never ran', async () => {
    const p = fakePorts();
    await fails(apply(p, discount({ amount: 251, pin: '0000' })));
    expect(p.locks.get('manager_st')?.wrongAt).toHaveLength(1);
  });
  it('ST-S4 SERVER → permission-denied without requires; no pin verify, no writes', async () => {
    const p = fakePorts({ staff: { role: 'SERVER' } });
    const e = await fails(apply(p, discount({ amount: 10, pin: '1234' })));
    expect(e.code).toBe('permission-denied');
    expect(e.details).not.toHaveProperty('requires');
    expect(p.audits.size).toBe(0);
    expect(p.locks.size).toBe(0);
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
    expect(p.locks.size).toBe(0);
  });
  it('pin "" is treated as missing → requires:pin, counter unchanged', async () => {
    const p = fakePorts();
    const e = await fails(apply(p, discount({ amount: 251, pin: '' })));
    expect(e.details).toMatchObject({ requires: 'pin' });
    expect(p.locks.size).toBe(0);
  });
  it('pin not a string (123456, null, {}) → invalid-argument, counter unchanged, no hash compare', async () => {
    const p = fakePorts();
    for (const bad of [123456, null, {}]) {
      const e = await fails(apply(p, discount({ amount: 251, pin: bad })));
      expect(e.code).toBe('invalid-argument');
    }
    expect(p.locks.size).toBe(0);
  });
  it('locked staff, under-limit ₹100 (no PIN needed) → still refused with locked:true; the lock blocks every approvals call', async () => {
    const p = fakePorts();
    p.locks.set('manager_st', { wrongAt: [1], lockedUntil: 1_000_000 + 10 * MIN });
    const e = await fails(apply(p, discount({ amount: 100 })));
    expect(e).toMatchObject({ code: 'permission-denied', details: { locked: true, lockedUntil: 1_000_000 + 10 * MIN } });
    expect(p.lines.get('line_pitcher')?.v).toBe(0);
  });
  it('lock is per staffId: manager_a locked, manager_b correct pin → applied', async () => {
    const p = fakePorts({ staff: { staffId: 'manager_b' } });
    p.locks.set('manager_a', { wrongAt: [1], lockedUntil: 1_000_000 + 10 * MIN });
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
  it('amount over list price → invalid-argument, no decision', async () => {
    const p = fakePorts();
    expect(await fails(apply(p, discount({ amount: 1251 })))).toMatchObject({ code: 'invalid-argument', message: 'amount cannot exceed the list price' });
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
    expect(p.audits.get('line_pitcher_v1')).toMatchObject({ sev: 'P0', amount: 1250, pct: 100 });
    const again = await fails(apply(p, discount({ action: 'void', reason: 'guest left', pin: '1234' })));
    expect(again.code).toBe('failed-precondition');
  });
});
