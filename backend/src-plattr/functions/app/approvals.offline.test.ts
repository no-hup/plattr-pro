// OF-S20 · the `estimate` action on ST's door (moonshot/SPEC_OF_offline_and_sync.md R4, OF-S20).
// Fake ports and a fake clock, the way app/approvals.test.ts does it. No emulator.
//
// Hand-computed:
//   request   {action:'estimate', cid:'est_draft_of_20260916T2045', amountMinor: 231000, note:'cash draft_of 20:45 preview 20:38'}
//   role      MANAGER → allowed, needsPin false, sev P1 (domain/approvals decide)
//   audit id  'est_draft_of_20260916T2045_estimate'   (deterministic: `${cid}_estimate`, no random suffix)
//   audit row {action:'estimate', sev:'P1', amount: 231000, pct: 0, reason:'estimate', note, lineId: null, before: null, after: null}
//   resend    same cid → same auditId, retry: true, still exactly one audit row
//   SERVER    → permission-denied, no requires, no row
//   amount    0 or negative or 12.5 → invalid-argument, no row
import { apply, ApprovalError, Ports, Tx, Staff } from './approvals';
import { AuditRow, summarise } from '../domain/approvals';

const RID = 'r1';
const CID = 'est_draft_of_20260916T2045';
const AUDIT_ID = `${CID}_estimate`;

function fakePorts(opts: { staff?: Partial<Staff>; failAudit?: boolean } = {}) {
  const audits = new Map<string, AuditRow>();
  const logs: object[] = [];
  let creates = 0;
  const staff: Staff = { staffId: 'manager_of', role: 'MANAGER', status: 'active', pinHash: 'hash(1234)', ...opts.staff };
  const ports: Ports & { audits: typeof audits; logs: typeof logs; creates(): number } = {
    audits, logs, creates: () => creates,
    now: () => 1_000_000,
    log: l => logs.push(l),
    warn: () => {},
    staff: { bySession: async () => staff },
    pin: { verify: async (pin, stored) => stored === `hash(${pin})` },
    config: { approvals: async () => undefined },
    pinState: { get: async () => ({ wrongAt: [] }), update: async (_r, _s, fn) => fn({ wrongAt: [] }).state },
    transact: async (_rid, fn) => {
      const pending = new Map<string, AuditRow>();
      const t: Tx = {
        getLine: async () => null,
        setLine: () => {},
        getAudit: async id => audits.get(id) ?? null,
        createAudit: (id, row) => { creates++; if (opts.failAudit) throw new Error('firestore unavailable'); if (audits.has(id)) throw new Error('already exists'); pending.set(id, row); },
        kotJobsOfCart: async () => [],
        createPrintJob: () => {},
      };
      const out = await fn(t);
      for (const [k, v] of pending) audits.set(k, v);
      return out;
    },
  };
  return ports;
}

const estimate = (extra: Record<string, unknown> = {}) =>
  ({ restaurantId: RID, sessionId: 's1', action: 'estimate', cid: CID, amountMinor: 231000, note: 'cash draft_of 20:45 preview 20:38', ...extra });

async function fails(p: Promise<unknown>): Promise<ApprovalError> {
  try { await p; } catch (e) { return e as ApprovalError; }
  throw new Error('expected a throw');
}

describe('OF · app/approvals estimate action (OF-S20)', () => {
  it('OF-S20 MANAGER, amountMinor 231000 → one audit row id est_draft_of_20260916T2045_estimate, sev P1, amount 231000, no PIN asked, log outcome applied', async () => {
    const ports = fakePorts();
    const out = await apply(ports, estimate());
    expect(out).toEqual({ auditId: AUDIT_ID });
    expect(ports.audits.size).toBe(1);
    const row = ports.audits.get(AUDIT_ID)!;
    expect(row).toMatchObject({ action: 'estimate', sev: 'P1', amount: 231000, pct: 0, reason: 'estimate', note: 'cash draft_of 20:45 preview 20:38', lineId: null, before: null, after: null, staffId: 'manager_of', cid: CID, ts: 1_000_000 });
    expect(ports.logs).toEqual([expect.objectContaining({ action: 'estimate', sev: 'P1', needsPin: false, outcome: 'applied' })]);
  });

  it('OF-S20 the same cid sent again → {auditId same, retry: true}, createAudit not called a second time, log outcome retry', async () => {
    const ports = fakePorts();
    await apply(ports, estimate());
    const again = await apply(ports, estimate());
    expect(again).toEqual({ auditId: AUDIT_ID, retry: true });
    expect(ports.creates()).toBe(1);
    expect(ports.audits.size).toBe(1);
    expect(ports.logs[1]).toMatchObject({ outcome: 'retry' });
  });

  it('OF-S20 the same cid with a different amount (231000 then 184000) → failed-precondition "estimate already recorded with a different amount", no second row', async () => {
    const ports = fakePorts();
    await apply(ports, estimate());
    const e = await fails(apply(ports, estimate({ amountMinor: 184000 })));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toMatch(/estimate already recorded with a different amount/);
    expect(ports.audits.size).toBe(1);
    expect(ports.audits.get(AUDIT_ID)!.amount).toBe(231000);
  });

  it('OF-S20 ADMIN is allowed the same way as MANAGER', async () => {
    const ports = fakePorts({ staff: { role: 'ADMIN' } });
    expect(await apply(ports, estimate())).toEqual({ auditId: AUDIT_ID });
  });

  it('OF-S20 SERVER → permission-denied without requires; no row', async () => {
    const ports = fakePorts({ staff: { role: 'SERVER' } });
    const e = await fails(apply(ports, estimate()));
    expect(e.code).toBe('permission-denied');
    expect(e.details.requires).toBeUndefined();
    expect(ports.audits.size).toBe(0);
  });

  it('OF-S20 amountMinor missing, 0, negative or 12.5 → invalid-argument; no row', async () => {
    for (const amountMinor of [undefined, 0, -100, 12.5, '231000']) {
      const ports = fakePorts();
      const e = await fails(apply(ports, estimate({ amountMinor })));
      expect(e.code).toBe('invalid-argument');
      expect(ports.audits.size).toBe(0);
    }
  });

  it('OF-S20 note longer than 200 chars → invalid-argument (ST R6 note rule), no row', async () => {
    const ports = fakePorts();
    const e = await fails(apply(ports, estimate({ note: 'x'.repeat(201) })));
    expect(e.code).toBe('invalid-argument');
    expect(e.message).toMatch(/note longer than 200/);
    expect(ports.audits.size).toBe(0);
  });

  it('OF-S20 audit write throws → error unavailable "try again", nothing else written (ST-S7 shape)', async () => {
    const ports = fakePorts({ failAudit: true });
    const e = await fails(apply(ports, estimate()));
    expect(e.code).toBe('unavailable');
    expect(e.message).toMatch(/try again/);
    expect(ports.audits.size).toBe(0);
  });

  it('OF-S20 estimate rows are left out of the staff P1 tally (a discount P1 next to 30 estimates still counts 1)', async () => {
    const ports = fakePorts();
    for (let i = 0; i < 30; i++) await apply(ports, estimate({ cid: `est_draft_${i}_20260916T2045` }));
    const discount: AuditRow = { ts: 1, cid: 'c1', action: 'discount', staffId: 'manager_of', sev: 'P1', amount: 5000, pct: 4, reason: 'regular', note: '', lineId: 'l1', before: null, after: null } as AuditRow;
    const s = summarise([...ports.audits.values(), discount], []);
    expect(s.manager_of).toMatchObject({ p0: 0, p1: 1, topReasons: ['regular'] });
  });

  it('OF-S20 the row never carries a PIN field even if one was sent (ST-S9)', async () => {
    const ports = fakePorts();
    await apply(ports, estimate({ pin: '1234' }));
    expect(JSON.stringify(ports.audits.get(AUDIT_ID))).not.toMatch(/1234|pin/);
  });
});
