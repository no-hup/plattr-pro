// ST · Staff PIN & approvals — domain tests. Every ST-S id is a test name.
// Hand-computed: limit 10 %, pitcher ₹1,250 (125000 paise), slowdown from the 5th wrong in 10 min: 1, 2, 4 … s capped at 120.
import {
  DEFAULTS, configFrom, decide, percentOf, validateAmount, validateReason,
  tooSoon, recordWrongPin, applyToLine, auditRow, logLine, summarise, net, Line, AuditRow,
} from './approvals';

const cfg = DEFAULTS;
const MIN = 60_000;
const pitcher: Line = { listPrice: 125000, sent: true, v: 0, countsTowardTotal: true };
const tikka: Line = { listPrice: 32000, sent: true, v: 0, countsTowardTotal: true, offer: { id: 'happy_hour', amount: 6400 } };

describe('domain/approvals decide(action, ctx, config)', () => {
  const d = (action: string, role: string, extra: Record<string, unknown> = {}, c = cfg) =>
    decide({ action, role, ...extra } as never, c);

  it('ST-S1 discount ₹100 on ₹1,250 = 8.00 % ≤ 10 → MANAGER: {ok, needsPin:false, sev:P1}', () => {
    expect(d('discount', 'MANAGER', { amount: 10000, listPrice: 125000 })).toEqual({ ok: true, needsPin: false, sev: 'P1' });
  });
  it('ST-S1 boundary: ₹125 = 10.00 % is not above the limit → needsPin:false, sev:P1', () => {
    expect(d('discount', 'MANAGER', { amount: 12500, listPrice: 125000 })).toEqual({ ok: true, needsPin: false, sev: 'P1' });
  });
  it('ST-S2 discount ₹251 on ₹1,250 = 20.08 % > 10 → MANAGER: {needsPin:true, sev:P0}', () => {
    expect(d('discount', 'MANAGER', { amount: 25100, listPrice: 125000 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('ST-S2 boundary: ₹126 = 10.08 % → needsPin:true, sev:P0', () => {
    expect(d('discount', 'MANAGER', { amount: 12600, listPrice: 125000 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('ST-S2 boundary: ₹125.01 = 10.0008 % → needsPin:true (compare unrounded, never round down to the limit)', () => {
    expect(d('discount', 'MANAGER', { amount: 12501, listPrice: 125000 })).toMatchObject({ needsPin: true, sev: 'P0' });
  });
  it('gate is integer paise, no float compare: 30 paise on 300 paise is exactly 10 %, not above', () => {
    expect(d('discount', 'MANAGER', { amount: 30, listPrice: 300 })).toMatchObject({ needsPin: false, sev: 'P1' });
  });
  it('ST-S11 gate reads discount / listPrice, never / (listPrice − offer): ₹40 on ₹320 tikka with ₹64 offer = 12.50 % → PIN', () => {
    expect(d('discount', 'MANAGER', { amount: 4000, listPrice: 32000 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('limit 0 → every discount needs a PIN', () => {
    expect(d('discount', 'MANAGER', { amount: 1, listPrice: 125000 }, { ...cfg, discountPinAbovePercent: 0 })).toMatchObject({ needsPin: true, sev: 'P0' });
  });
  it('ST-S2 ADMIN over the limit is also asked for a PIN (ST-Q1 default yes)', () => {
    expect(d('discount', 'ADMIN', { amount: 25100, listPrice: 125000 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('removeOffer → MANAGER: needsPin:true, sev:P0 regardless of amount', () => {
    expect(d('removeOffer', 'MANAGER', { lineSent: false })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('ST-S4 SERVER discount → {ok:false, code:permission-denied}, never needsPin', () => {
    expect(d('discount', 'SERVER', { amount: 1, listPrice: 125000 })).toEqual({ ok: false, code: 'permission-denied' });
  });
  it('ST-S4 KITCHEN discount → permission-denied', () => {
    expect(d('discount', 'KITCHEN', { amount: 1, listPrice: 125000 })).toEqual({ ok: false, code: 'permission-denied' });
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
    expect(d('discount', 'MANAGER', { amount: 10000, listPrice: 125000 }, { ...cfg, discountPinAbovePercent: 5 })).toEqual({ ok: true, needsPin: true, sev: 'P0' });
  });
  it('unknown action → {ok:false, code:invalid-argument}', () => {
    expect(d('refund', 'MANAGER')).toEqual({ ok: false, code: 'invalid-argument' });
  });
});

describe('domain/approvals configFrom(raw) — config keys with defaults', () => {
  it('config missing → defaults: limit 10, void needs PIN, slow from 5 wrong / 10 min / max 120 s, 7 reasons', () => {
    const { config, warnings } = configFrom(undefined);
    expect(config).toEqual({
      discountPinAbovePercent: 10, voidAfterKitchenNeedsPin: true, pinSlowAfterWrong: 5, pinSlowWindowMinutes: 10,
      pinSlowMaxSeconds: 120, reasons: ['placard', 'regular', 'complaint', 'birthday', 'guest left', 'staff meal', 'other'],
    });
    expect(warnings).toEqual(['approvals config missing, defaults apply']);
  });
  it('partial config {pinSlowMaxSeconds:30} → limit still 10, cap 30 s, no warning', () => {
    const { config, warnings } = configFrom({ pinSlowMaxSeconds: 30 });
    expect(config).toMatchObject({ discountPinAbovePercent: 10, pinSlowMaxSeconds: 30 });
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
  it('10000 / 125000 → 8; 25100 / 125000 → 20.08 (2 decimals)', () => {
    expect(percentOf(10000, 125000)).toBe(8);
    expect(percentOf(25100, 125000)).toBe(20.08);
  });
  it('amount ≤ 0, listPrice ≤ 0 → invalid-argument (PO port: no amount, no decision); over the price is applyToLine\'s call', () => {
    expect(validateAmount(0, 125000)).toBe('amount must be more than 0');
    expect(validateAmount(-1, 125000)).toBe('amount must be more than 0');
    expect(validateAmount(10000, 0)).toBe('line has no list price');
    expect(validateAmount(125000, 125000)).toBeNull();
    expect(validateAmount(125100, 125000)).toBeNull();
  });
  it('amount NaN / Infinity / string / undefined → invalid-argument, never a decision', () => {
    for (const bad of [NaN, Infinity, '100', undefined]) expect(validateAmount(bad as never, 125000)).toBe('amount must be a number');
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

describe('domain/approvals wrong-PIN slowdown (pure state machine, R7 / ST-S3)', () => {
  // State = {wrongAt:number[], retryAfter?:number}. Window is [first, first+10min). Never locks.
  const t0 = 1_000_000;
  const wrongs = (times: number[]) => times.reduce((s, t) => recordWrongPin(s, t, cfg).state, { wrongAt: [] as number[] });

  it('ST-S3 4 wrong at t0..t0+3min → no retryAfter, attemptsLeft 1, no audit', () => {
    const s = wrongs([t0, t0 + MIN, t0 + 2 * MIN]);
    const r = recordWrongPin(s, t0 + 3 * MIN, cfg);
    expect(r).toEqual({ state: { wrongAt: [t0, t0 + MIN, t0 + 2 * MIN, t0 + 3 * MIN] }, attemptsLeft: 1, penaltySeconds: 0, audit: false });
    expect(tooSoon(r.state, t0 + 3 * MIN)).toBe(false);
  });
  it('ST-S3 5th wrong at t0+4min → retryAfter = now + 1 s, audit:true (the P0 row for the owner), attemptsLeft 0', () => {
    const s = wrongs([t0, t0 + MIN, t0 + 2 * MIN, t0 + 3 * MIN]);
    const r = recordWrongPin(s, t0 + 4 * MIN, cfg);
    expect(r).toMatchObject({ attemptsLeft: 0, penaltySeconds: 1, audit: true });
    expect(r.state.retryAfter).toBe(t0 + 4 * MIN + 1000);
    expect(tooSoon(r.state, t0 + 4 * MIN + 999)).toBe(true);
    expect(tooSoon(r.state, t0 + 4 * MIN + 1000)).toBe(false);
  });
  it('ST-S3 6th, 7th, 8th wrong → 2, 4, 8 s; audit only on the 5th', () => {
    let s = wrongs([t0, t0 + 1, t0 + 2, t0 + 3, t0 + 4]);
    const penalties: number[] = []; const audits: boolean[] = [];
    for (let i = 5; i < 8; i++) { const r = recordWrongPin(s, t0 + 10_000 * i, cfg); penalties.push(r.penaltySeconds); audits.push(r.audit); s = r.state; }
    expect(penalties).toEqual([2, 4, 8]);
    expect(audits).toEqual([false, false, false]);
  });
  it('ST-S3 cap: 12th wrong would be 128 s → 120 s (pinSlowMaxSeconds)', () => {
    let s = { wrongAt: [] as number[] };
    let last = recordWrongPin(s, t0, cfg);
    for (let i = 1; i < 12; i++) { last = recordWrongPin(last.state, t0 + i * 1000, cfg); }
    expect(last.penaltySeconds).toBe(120);
  });
  it('ST-S3 5 wrong spread over 11 min (first at t0, 5th at t0+11min) → no slowdown; streak restarts at the 2nd wrong', () => {
    const s = wrongs([t0, t0 + 3 * MIN, t0 + 6 * MIN, t0 + 9 * MIN]);
    const r = recordWrongPin(s, t0 + 11 * MIN, cfg);
    expect(r.penaltySeconds).toBe(0);
    expect(r.state.wrongAt).toEqual([t0 + 3 * MIN, t0 + 6 * MIN, t0 + 9 * MIN, t0 + 11 * MIN]);
  });
  it('window boundary: wrong at t0,1,2,3 min then 5th at exactly t0+10min → no slowdown, window is [first, first+10min)', () => {
    const s = wrongs([t0, t0 + MIN, t0 + 2 * MIN, t0 + 3 * MIN]);
    expect(recordWrongPin(s, t0 + 10 * MIN, cfg).penaltySeconds).toBe(0);
  });
  it('window boundary: 5th at t0+9min59.999s → slowed', () => {
    const s = wrongs([t0, t0 + MIN, t0 + 2 * MIN, t0 + 3 * MIN]);
    expect(recordWrongPin(s, t0 + 10 * MIN - 1, cfg).penaltySeconds).toBe(1);
  });
  it('config pinSlowAfterWrong:3, pinSlowMaxSeconds:1 → 3rd wrong slows 1 s, 4th still 1 s', () => {
    const c = { ...cfg, pinSlowAfterWrong: 3, pinSlowMaxSeconds: 1 };
    const a = recordWrongPin({ wrongAt: [t0, t0 + 1] }, t0 + 2, c);
    expect(a).toMatchObject({ penaltySeconds: 1, audit: true });
    expect(recordWrongPin(a.state, t0 + 5000, c)).toMatchObject({ penaltySeconds: 1, audit: false });
  });
  it('tooSoon: before retryAfter true, at retryAfter false, no retryAfter false', () => {
    expect(tooSoon({ wrongAt: [t0], retryAfter: t0 + 1000 }, t0 + 999)).toBe(true);
    expect(tooSoon({ wrongAt: [t0], retryAfter: t0 + 1000 }, t0 + 1000)).toBe(false);
    expect(tooSoon({ wrongAt: [t0] }, t0)).toBe(false);
  });
});

describe('domain/approvals applyToLine(line, decision) → after', () => {
  const src = { reason: 'regular', note: '', approverId: 'manager_st' };
  it('discount: after.discount = {amount:10000, pct:8, source:{reason,note,approverId}}; listPrice untouched; v+1; net 115000', () => {
    const r = applyToLine(pitcher, { action: 'discount', amount: 10000, pct: 8, ...src });
    expect(r).toEqual({ ok: true, line: { ...pitcher, v: 1, discount: { amount: 10000, pct: 8, source: src } } });
    expect(net((r as { line: Line }).line)).toBe(115000);
  });
  it('ST-S12 second discount replaces the first (sets, never adds): ₹100 then ₹251 → discount.amount 25100, net 99900', () => {
    const once = applyToLine(pitcher, { action: 'discount', amount: 10000, pct: 8, ...src });
    if (!once.ok) throw new Error();
    const twice = applyToLine(once.line, { action: 'discount', amount: 25100, pct: 20.08, ...src });
    expect(twice).toMatchObject({ ok: true, line: { v: 2, discount: { amount: 25100, pct: 20.08 } } });
    expect(net((twice as { line: Line }).line)).toBe(99900);
  });
  it('ST-S11 ₹40 on the ₹320 tikka with a ₹64 offer → both cuts off the menu price: net 21600 (₹216)', () => {
    const r = applyToLine(tikka, { action: 'discount', amount: 4000, pct: 12.5, ...src });
    expect(r).toMatchObject({ ok: true, line: { offer: { amount: 6400 }, discount: { amount: 4000 } } });
    expect(net((r as { line: Line }).line)).toBe(21600);
  });
  it('ST-S13 ₹400 on the ₹320 tikka with ₹64 offer → failed-precondition, line cannot go below zero; ₹256 exactly → net 0 ok', () => {
    expect(applyToLine(tikka, { action: 'discount', amount: 40000, pct: 125, ...src })).toEqual({ ok: false, code: 'failed-precondition', message: 'line cannot go below zero' });
    expect(applyToLine(tikka, { action: 'discount', amount: 25600, pct: 80, ...src })).toMatchObject({ ok: true });
  });
  it('removeOffer then the same discount: net rises by the offer (32000 − 4000 = 28000)', () => {
    const noOffer = applyToLine(tikka, { action: 'removeOffer', ...src });
    if (!noOffer.ok) throw new Error();
    const r = applyToLine(noOffer.line, { action: 'discount', amount: 4000, pct: 12.5, ...src });
    expect(net((r as { line: Line }).line)).toBe(28000);
  });
  it('void: after.void = {reason,note,approverId}; countsTowardTotal=false; line kept; stock untouched (ST-S5)', () => {
    const r = applyToLine(pitcher, { action: 'void', ...src, reason: 'guest left' });
    expect(r).toEqual({ ok: true, line: { ...pitcher, v: 1, countsTowardTotal: false, void: { reason: 'guest left', note: '', approverId: 'manager_st' } } });
    expect(Object.keys((r as { line: Line }).line)).not.toContain('stock');
  });
  it('removeOffer: after.removedOffer = line.offer; after.offer = null', () => {
    const withOffer: Line = { ...pitcher, offer: { id: 'happy_hour', amount: 12500 } };
    expect(applyToLine(withOffer, { action: 'removeOffer', ...src })).toEqual({
      ok: true, line: { ...withOffer, v: 1, offer: null, removedOffer: { id: 'happy_hour', amount: 12500 } },
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
    const row = auditRow({ ...base, amount: 10000, pct: 8 });
    expect(Object.keys(row)).toEqual(['ts', 'cid', 'action', 'staffId', 'sev', 'amount', 'pct', 'reason', 'note', 'lineId', 'before', 'after']);
    expect(row).toMatchObject({ amount: 10000, pct: 8, ts: 5, cid: 'c1' });
  });
  it('ST-S9 row has no "pin" key even when the input carried one', () => {
    const row = auditRow({ ...base, amount: 10000, pct: 8, pin: '1234' } as never);
    expect(JSON.stringify(row)).not.toContain('1234');
    expect('pin' in row).toBe(false);
  });
  it('void audit amount = line list price (₹450 = 45000 paise), pct 100; reprint/drawer amount 0, pct 0, lineId null', () => {
    const biryani: Line = { listPrice: 45000, sent: true, v: 0, countsTowardTotal: true };
    expect(auditRow({ ...base, action: 'void', before: biryani, after: biryani })).toMatchObject({ amount: 45000, pct: 100 });
    expect(auditRow({ ...base, action: 'reprint', lineId: null, before: null, after: null })).toMatchObject({ amount: 0, pct: 0, lineId: null });
  });
  it('ST-S9 log line = {cid, action, sev, needsPin, outcome} and nothing else', () => {
    const l = logLine({ cid: 'c1', action: 'discount', sev: 'P0', needsPin: true, outcome: 'applied', pin: '1234' } as never);
    expect(l).toEqual({ cid: 'c1', action: 'discount', sev: 'P0', needsPin: true, outcome: 'applied' });
  });
});

describe('domain/approvals summarise(rows, lines) — ST-S8 / R10', () => {
  const row = (sev: 'P0' | 'P1', amount: number, reason: string, staffId = 'manager_st'): AuditRow =>
    auditRow({ ts: 1, cid: 'c', action: 'discount', staffId, sev, amount, pct: 1, reason, note: '', lineId: 'l', before: null, after: null });
  const lineBy = (amount: number, approverId = 'manager_st'): Line => ({ ...pitcher, v: 1, discount: { amount, pct: 1, source: { reason: 'x', note: '', approverId } } });

  it('ST-S8 3 placard P0 + 2 regular P1 by manager_st, lines worth ₹251×3 + ₹100×2 → {p0:3,p1:2,rupees:953,topReasons:[placard,regular]}', () => {
    const rows = [row('P0', 25100, 'placard'), row('P0', 25100, 'placard'), row('P0', 25100, 'placard'), row('P1', 10000, 'regular'), row('P1', 10000, 'regular')];
    const lines = [lineBy(25100), lineBy(25100), lineBy(25100), lineBy(10000), lineBy(10000)];
    expect(summarise(rows, lines)).toEqual({ manager_st: { p0: 3, p1: 2, rupees: 953, topReasons: ['placard', 'regular'] } });
  });
  it('ST-S12 / R10 rupees come from the line, not the rows: ₹100 then ₹251 on one line → two rows, rupees 251 not 351', () => {
    const rows = [row('P1', 10000, 'regular'), row('P0', 25100, 'placard')];
    expect(summarise(rows, [lineBy(25100)])).toEqual({ manager_st: { p0: 1, p1: 1, rupees: 251, topReasons: ['regular', 'placard'] } });
  });
  it('rupees are per approver: manager_b\'s line does not count for manager_a', () => {
    expect(summarise([row('P1', 10000, 'regular', 'manager_a')], [lineBy(10000, 'manager_b')])).toEqual({
      manager_a: { p0: 0, p1: 1, rupees: 0, topReasons: ['regular'] }, manager_b: { p0: 0, p1: 0, rupees: 100, topReasons: [] },
    });
  });
  it('ST-S8 empty → {} (report shows "audit unavailable" only when the read fails, never zeros)', () => {
    expect(summarise([], [])).toEqual({});
  });
});
