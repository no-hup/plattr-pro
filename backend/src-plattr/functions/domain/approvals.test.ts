// ST · Staff PIN & approvals — domain tests. Every ST-S id is a test name.
// Hand-computed: limit 10 %, pitcher ₹1,250, lock after 5 wrong in 10 min for 15 min.
import {
  DEFAULTS, configFrom, decide, percentOf, validateAmount, validateReason,
  isLocked, recordWrongPin, applyToLine, auditRow, logLine, summarise, Line, AuditRow,
} from './approvals';

const cfg = DEFAULTS;
const MIN = 60_000;
const pitcher: Line = { listPrice: 1250, sent: true, v: 0, countsTowardTotal: true };

describe('domain/approvals decide(action, ctx, config)', () => {
  const d = (action: string, role: string, extra: Record<string, unknown> = {}, c = cfg) =>
    decide({ action, role, ...extra } as never, c);

  it('ST-S1 discount ₹100 on ₹1,250 = 8.00 % ≤ 10 → MANAGER: {ok, needsPin:false, sev:P1}', () => {
    expect(d('discount', 'MANAGER', { amount: 100, listPrice: 1250 })).toEqual({ ok: true, needsPin: false, sev: 'P1' });
  });
  it('ST-S1 boundary: ₹125 = 10.00 % is not above the limit → needsPin:false, sev:P1', () => {
    expect(d('discount', 'MANAGER', { amount: 125, listPrice: 1250 })).toEqual({ ok: true, needsPin: false, sev: 'P1' });
  });
  it('ST-S2 discount ₹251 on ₹1,250 = 20.08 % > 10 → MANAGER: {needsPin:true, sev:P0}', () => {
    expect(d('discount', 'MANAGER', { amount: 251, listPrice: 1250 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('ST-S2 boundary: ₹126 = 10.08 % → needsPin:true, sev:P0', () => {
    expect(d('discount', 'MANAGER', { amount: 126, listPrice: 1250 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('ST-S2 boundary: ₹125.01 = 10.0008 % → needsPin:true (compare unrounded, never round down to the limit)', () => {
    expect(d('discount', 'MANAGER', { amount: 125.01, listPrice: 1250 })).toMatchObject({ needsPin: true, sev: 'P0' });
  });
  it('gate is integer paise, no float compare: 0.1+0.2 style inputs cannot flip it', () => {
    // 10 % of ₹3 is ₹0.30; 0.1 + 0.2 = 0.30000000000000004 as a float. In paise it is 30 = 30, not above.
    expect(d('discount', 'MANAGER', { amount: 0.1 + 0.2, listPrice: 3 })).toMatchObject({ needsPin: false, sev: 'P1' });
  });
  it('limit 0 → every discount needs a PIN', () => {
    expect(d('discount', 'MANAGER', { amount: 1, listPrice: 1250 }, { ...cfg, discountPinAbovePercent: 0 })).toMatchObject({ needsPin: true, sev: 'P0' });
  });
  it('ST-S2 ADMIN over the limit is also asked for a PIN (ST-Q1 default yes)', () => {
    expect(d('discount', 'ADMIN', { amount: 251, listPrice: 1250 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('removeOffer → MANAGER: needsPin:true, sev:P0 regardless of amount', () => {
    expect(d('removeOffer', 'MANAGER', { lineSent: false })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('ST-S4 SERVER discount → {ok:false, code:permission-denied}, never needsPin', () => {
    expect(d('discount', 'SERVER', { amount: 1, listPrice: 1250 })).toEqual({ ok: false, code: 'permission-denied' });
  });
  it('ST-S4 KITCHEN discount → permission-denied', () => {
    expect(d('discount', 'KITCHEN', { amount: 1, listPrice: 1250 })).toEqual({ ok: false, code: 'permission-denied' });
  });
  it('R8 SERVER reprint / drawer / removeOffer / void of a sent line → permission-denied', () => {
    for (const a of ['reprint', 'drawer', 'removeOffer']) expect(d(a, 'SERVER')).toEqual({ ok: false, code: 'permission-denied' });
    expect(d('void', 'SERVER', { lineSent: true })).toEqual({ ok: false, code: 'permission-denied' });
  });
  it('SERVER void of a line not yet sent → {ok, needsPin:false, sev:P1}', () => {
    expect(d('void', 'SERVER', { lineSent: false })).toEqual({ ok: true, needsPin: false, sev: 'P1' });
  });
  it('ST-S5 MANAGER void of a sent line → needsPin:true, sev:P0', () => {
    expect(d('void', 'MANAGER', { lineSent: true })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('ST-S5 MANAGER void of an unsent line → needsPin:false, sev:P1', () => {
    expect(d('void', 'MANAGER', { lineSent: false })).toEqual({ ok: true, needsPin: false, sev: 'P1' });
  });
  it('ST-S5 config voidAfterKitchenNeedsPin:false → sent-line void: needsPin:false, sev stays P0', () => {
    expect(d('void', 'MANAGER', { lineSent: true }, { ...cfg, voidAfterKitchenNeedsPin: false })).toEqual({ ok: true, needsPin: false, sev: 'P0' });
  });
  it('reprint → MANAGER and ADMIN: needsPin:false, sev:P1', () => {
    expect(d('reprint', 'MANAGER')).toEqual({ ok: true, needsPin: false, sev: 'P1' });
    expect(d('reprint', 'ADMIN')).toEqual({ ok: true, needsPin: false, sev: 'P1' });
  });
  it('drawer (no sale) → MANAGER and ADMIN: needsPin:true, sev:P0', () => {
    expect(d('drawer', 'MANAGER')).toEqual({ ok: true, needsPin: true, sev: 'P0' });
    expect(d('drawer', 'ADMIN')).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('ST-S10 limit 5 → the same ₹100 (8.00 %) now needsPin:true, sev:P0', () => {
    expect(d('discount', 'MANAGER', { amount: 100, listPrice: 1250 }, { ...cfg, discountPinAbovePercent: 5 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('unknown action → {ok:false, code:invalid-argument}', () => {
    expect(d('refund', 'MANAGER')).toEqual({ ok: false, code: 'invalid-argument' });
  });
});

describe('domain/approvals configFrom(raw) — config keys with defaults', () => {
  it('config missing → defaults: limit 10, void needs PIN, lock 5 wrong / 10 min / 15 min, 7 reasons', () => {
    const { config, warnings } = configFrom(undefined);
    expect(config).toEqual({
      discountPinAbovePercent: 10, voidAfterKitchenNeedsPin: true, pinLockAfterWrong: 5, pinLockMinutes: 15,
      pinLockWindowMinutes: 10, reasons: ['placard', 'regular', 'complaint', 'birthday', 'guest left', 'staff meal', 'other'],
    });
    expect(warnings).toEqual(['approvals config missing, defaults apply']);
  });
  it('partial config {pinLockMinutes:20} → limit still 10, lock 20 min, no warning', () => {
    const { config, warnings } = configFrom({ pinLockMinutes: 20 });
    expect(config).toMatchObject({ discountPinAbovePercent: 10, pinLockMinutes: 20 });
    expect(warnings).toEqual([]);
  });
  it('malformed config discountPinAbovePercent:"ten" / -1 / null → default 10 and a warning, never PIN-free', () => {
    for (const bad of ['ten', -1, null]) {
      const { config, warnings } = configFrom({ discountPinAbovePercent: bad });
      expect(config.discountPinAbovePercent).toBe(10);
      expect(warnings).toEqual(['approvals.discountPinAbovePercent invalid, default 10 applies']);
    }
  });
  it('config reasons:[] is kept as-is (fail closed: every reason rejected)', () => {
    expect(configFrom({ reasons: [] }).config.reasons).toEqual([]);
  });
});

describe('domain/approvals percentOf / validateAmount', () => {
  it('100 / 1250 → 8; 251 / 1250 → 20.08 (2 decimals)', () => {
    expect(percentOf(100, 1250)).toBe(8);
    expect(percentOf(251, 1250)).toBe(20.08);
  });
  it('amount ≤ 0, amount > listPrice, listPrice ≤ 0 → invalid-argument (PO port: no amount, no decision)', () => {
    expect(validateAmount(0, 1250)).toBe('amount must be more than 0');
    expect(validateAmount(-1, 1250)).toBe('amount must be more than 0');
    expect(validateAmount(1251, 1250)).toBe('amount cannot exceed the list price');
    expect(validateAmount(100, 0)).toBe('line has no list price');
    expect(validateAmount(1250, 1250)).toBeNull();
  });
  it('amount NaN / string / undefined → invalid-argument, never a decision', () => {
    for (const bad of [NaN, '100', undefined]) expect(validateAmount(bad as never, 1250)).toBe('amount must be a number');
  });
});

describe('domain/approvals validateReason(reason, note, config)', () => {
  it('ST-S6 blank reason → invalid-argument', () => {
    expect(validateReason('', '', cfg)).toBe('reason required');
    expect(validateReason(undefined, '', cfg)).toBe('reason required');
  });
  it('ST-S6 whitespace-only reason → invalid-argument', () => {
    expect(validateReason('   ', '', cfg)).toBe('reason required');
  });
  it('ST-S6 reason not on the config list ("because") → invalid-argument', () => {
    expect(validateReason('because', '', cfg)).toBe('reason not on the list');
  });
  it('config reasons:[] → every reason rejected (fail closed)', () => {
    expect(validateReason('placard', '', { ...cfg, reasons: [] })).toBe('reason not on the list');
  });
  it('ST-S6 reason "placard" + note "matched ₹999 board" → ok; note optional', () => {
    expect(validateReason('placard', 'matched ₹999 board', cfg)).toBeNull();
    expect(validateReason('placard', undefined, cfg)).toBeNull();
  });
  it('note longer than 200 chars → invalid-argument', () => {
    expect(validateReason('placard', 'x'.repeat(201), cfg)).toBe('note longer than 200 characters');
    expect(validateReason('placard', 'x'.repeat(200), cfg)).toBeNull();
  });
});

describe('domain/approvals wrong-PIN lock (pure state machine)', () => {
  // State = {wrongAt:number[], lockedUntil?:number}. Window is [first, first+10min).
  const t0 = 1_000_000;
  const wrongs = (times: number[]) => times.reduce((s, t) => recordWrongPin(s, t, cfg).state, { wrongAt: [] as number[] });

  it('ST-S3 4 wrong at t0..t0+3min → not locked, attemptsLeft 1', () => {
    const s = wrongs([t0, t0 + MIN, t0 + 2 * MIN]);
    const r = recordWrongPin(s, t0 + 3 * MIN, cfg);
    expect(r).toEqual({ state: { wrongAt: [t0, t0 + MIN, t0 + 2 * MIN, t0 + 3 * MIN] }, locked: false, attemptsLeft: 1 });
    expect(isLocked(r.state, t0 + 3 * MIN)).toBe(false);
  });
  it('ST-S3 5th wrong at t0+5min → locked, lockedUntil = t0+5min+15min, attemptsLeft 0', () => {
    const s = wrongs([t0, t0 + MIN, t0 + 2 * MIN, t0 + 3 * MIN]);
    const r = recordWrongPin(s, t0 + 5 * MIN, cfg);
    expect(r.locked).toBe(true);
    expect(r.attemptsLeft).toBe(0);
    expect(r.state.lockedUntil).toBe(t0 + 20 * MIN);
    expect(isLocked(r.state, t0 + 5 * MIN)).toBe(true);
  });
  it('ST-S3 5 wrong spread over 11 min (first at t0, 5th at t0+11min) → not locked; streak restarts at the 2nd wrong', () => {
    const s = wrongs([t0, t0 + 3 * MIN, t0 + 6 * MIN, t0 + 9 * MIN]);
    const r = recordWrongPin(s, t0 + 11 * MIN, cfg);
    expect(r.locked).toBe(false);
    expect(r.state.wrongAt).toEqual([t0 + 3 * MIN, t0 + 6 * MIN, t0 + 9 * MIN, t0 + 11 * MIN]);
  });
  it('window boundary: wrong at t0,1,2,3 min then 5th at exactly t0+10min → not locked, window is [first, first+10min)', () => {
    const s = wrongs([t0, t0 + MIN, t0 + 2 * MIN, t0 + 3 * MIN]);
    expect(recordWrongPin(s, t0 + 10 * MIN, cfg).locked).toBe(false);
  });
  it('window boundary: 5th at t0+9min59.999s → locked', () => {
    const s = wrongs([t0, t0 + MIN, t0 + 2 * MIN, t0 + 3 * MIN]);
    expect(recordWrongPin(s, t0 + 10 * MIN - 1, cfg).locked).toBe(true);
  });
  it('config pinLockAfterWrong:3 → 3rd wrong locks; pinLockMinutes:30 → lockedUntil = now+30min', () => {
    const c = { ...cfg, pinLockAfterWrong: 3, pinLockMinutes: 30 };
    const s = { wrongAt: [t0, t0 + MIN] };
    const r = recordWrongPin(s, t0 + 2 * MIN, c);
    expect(r.locked).toBe(true);
    expect(r.state.lockedUntil).toBe(t0 + 32 * MIN);
  });
  it('locked account: lockedUntil-1ms → still locked; at lockedUntil → not locked', () => {
    const s = { wrongAt: [t0], lockedUntil: t0 + 15 * MIN };
    expect(isLocked(s, t0 + 15 * MIN - 1)).toBe(true);
    expect(isLocked(s, t0 + 15 * MIN)).toBe(false);
  });
  it('wrong PIN while locked → lockedUntil unchanged (not extended), wrongAt unchanged', () => {
    const s = { wrongAt: [t0, t0 + 1, t0 + 2, t0 + 3, t0 + 4], lockedUntil: t0 + 15 * MIN };
    expect(recordWrongPin(s, t0 + 5 * MIN, cfg)).toEqual({ state: s, locked: true, attemptsLeft: 0 });
  });
});

describe('domain/approvals applyToLine(line, decision) → after', () => {
  const src = { reason: 'regular', note: '', approverId: 'manager_st' };
  it('discount: after.discount = {amount:100, pct:8, source:{reason,note,approverId}}; listPrice untouched; v+1', () => {
    expect(applyToLine(pitcher, { action: 'discount', amount: 100, pct: 8, ...src })).toEqual({
      ok: true, line: { ...pitcher, v: 1, discount: { amount: 100, pct: 8, source: src } },
    });
  });
  it('second discount on a discounted line replaces it (sets, never adds): ₹100 then ₹150 → discount.amount 150', () => {
    const once = applyToLine(pitcher, { action: 'discount', amount: 100, pct: 8, ...src });
    if (!once.ok) throw new Error();
    const twice = applyToLine(once.line, { action: 'discount', amount: 150, pct: 12, ...src });
    expect(twice).toMatchObject({ ok: true, line: { v: 2, discount: { amount: 150, pct: 12 } } });
  });
  it('void: after.void = {reason,note,approverId}; countsTowardTotal=false; line kept; stock untouched (ST-S5)', () => {
    const r = applyToLine(pitcher, { action: 'void', ...src, reason: 'guest left' });
    expect(r).toEqual({ ok: true, line: { ...pitcher, v: 1, countsTowardTotal: false, void: { reason: 'guest left', note: '', approverId: 'manager_st' } } });
    expect(Object.keys((r as { line: Line }).line)).not.toContain('stock');
  });
  it('removeOffer: after.removedOffer = line.offer; after.offer = null', () => {
    const withOffer: Line = { ...pitcher, offer: { id: 'happy_hour' } };
    expect(applyToLine(withOffer, { action: 'removeOffer', ...src })).toEqual({
      ok: true, line: { ...withOffer, v: 1, offer: null, removedOffer: { id: 'happy_hour' } },
    });
  });
  it('discount on a voided line → failed-precondition', () => {
    const voided: Line = { ...pitcher, countsTowardTotal: false, void: src };
    expect(applyToLine(voided, { action: 'discount', amount: 100, pct: 8, ...src })).toEqual({ ok: false, code: 'failed-precondition', message: 'line is voided' });
  });
  it('void of an already-voided line → failed-precondition', () => {
    const voided: Line = { ...pitcher, countsTowardTotal: false, void: src };
    expect(applyToLine(voided, { action: 'void', ...src })).toEqual({ ok: false, code: 'failed-precondition', message: 'line is voided' });
  });
});

describe('domain/approvals auditRow(...) — R5 shape', () => {
  const base = { ts: 5, cid: 'c1', action: 'discount', staffId: 'manager_st', sev: 'P1' as const, reason: 'regular', note: '', lineId: 'line_pitcher', before: pitcher, after: pitcher };
  it('row keys are exactly ts,cid,action,staffId,sev,amount,pct,reason,note,lineId,before,after', () => {
    const row = auditRow({ ...base, amount: 100, pct: 8 });
    expect(Object.keys(row)).toEqual(['ts', 'cid', 'action', 'staffId', 'sev', 'amount', 'pct', 'reason', 'note', 'lineId', 'before', 'after']);
    expect(row).toMatchObject({ amount: 100, pct: 8, ts: 5, cid: 'c1' });
  });
  it('ST-S9 row has no "pin" key even when the input carried one', () => {
    const row = auditRow({ ...base, amount: 100, pct: 8, pin: '1234' } as never);
    expect(JSON.stringify(row)).not.toContain('1234');
    expect('pin' in row).toBe(false);
  });
  it('void audit amount = line list price (₹450), pct 100; reprint/drawer amount 0, pct 0, lineId null', () => {
    const biryani: Line = { listPrice: 450, sent: true, v: 0, countsTowardTotal: true };
    expect(auditRow({ ...base, action: 'void', before: biryani, after: biryani })).toMatchObject({ amount: 450, pct: 100 });
    expect(auditRow({ ...base, action: 'reprint', lineId: null, before: null, after: null })).toMatchObject({ amount: 0, pct: 0, lineId: null });
  });
  it('ST-S9 log line = {cid, action, sev, needsPin, outcome} and nothing else', () => {
    const l = logLine({ cid: 'c1', action: 'discount', sev: 'P0', needsPin: true, outcome: 'applied', pin: '1234' } as never);
    expect(l).toEqual({ cid: 'c1', action: 'discount', sev: 'P0', needsPin: true, outcome: 'applied' });
  });
});

describe('domain/approvals summarise(rows) — ST-S8', () => {
  const row = (sev: 'P0' | 'P1', amount: number, reason: string): AuditRow =>
    auditRow({ ts: 1, cid: 'c', action: 'discount', staffId: 'manager_st', sev, amount, pct: 1, reason, note: '', lineId: 'l', before: null, after: null });
  it('ST-S8 3 placard P0 + 2 regular P1 by manager_st → {manager_st:{p0:3,p1:2,rupees:953,topReasons:[placard,regular]}}', () => {
    const rows = [row('P0', 251, 'placard'), row('P0', 251, 'placard'), row('P0', 251, 'placard'), row('P1', 100, 'regular'), row('P1', 100, 'regular')];
    expect(summarise(rows)).toEqual({ manager_st: { p0: 3, p1: 2, rupees: 953, topReasons: ['placard', 'regular'] } });
  });
  it('ST-S8 empty rows → {} (report shows "audit unavailable" only when the read fails, never zeros)', () => {
    expect(summarise([])).toEqual({});
  });
});
