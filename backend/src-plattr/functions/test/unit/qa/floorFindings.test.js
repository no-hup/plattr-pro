// Guard tests for the till floor QA findings (moonshot/reviews/2026-09-25-qa-till-floor.md, QF-n).
// Fix plan: moonshot/reviews/2026-09-25-qa-fix-plan.md. `knownBug` = `test.failing` (TESTING.md): green while
// the bug is there, red the day it is fixed. Then swap it to `test`.
//
// Runs against the compiled app and domain layers (`npm run build` first). Fake ports, no emulator.
// The real-writer half of QF-1 is in test/e2e/suites/qa-findings.js. Money in minor units; Butter Naan 6000,
// its bill 6600 (6000 + 5 % service charge 300 + 5 % GST 315 = 6615 → 6600).
const { getFloor, setMerge, moveTable, floorConfigFrom } = require('../../../lib/app/floor');
const { canMove } = require('../../../lib/domain/floor');
const { ApprovalError } = require('../../../lib/app/approvals');

const knownBug = (title, fn) => test.failing(`[known bug] ${title}`, fn);

const RID = 'res_qa';
const NOW = Date.parse('2026-09-25T15:40:00Z');
const MIN = 60_000;
const line = (lineId, sessionId, tableId, extra = {}) => ({
  lineId, cid: 'o_' + sessionId, orderId: 'o_' + sessionId, cartId: 'k', cartItemId: lineId, tableId, sessionId, placedAt: 1, placedBy: 'guest',
  menuItemId: 'mi_naan', name: 'Butter Naan', qty: 1, listPrice: 6000, sent: true, v: 0, countsTowardTotal: true, draftId: sessionId, billId: null,
  components: [], taxBlocks: {}, offer: null, ...extra,
});

function fakePorts(w) {
  const writes = [];
  const tx = {
    getTable: async id => w.tables.find(t => t.tableId === id) ?? null,
    childrenOf: async id => w.tables.filter(t => t.mergedInto === id).map(t => t.tableId),
    getSitting: async tableId => w.sitting?.tableIds.includes(tableId) ? w.sitting : null,
    setSessionTable: (...a) => writes.push(['session', ...a]),
    moveCart: async (...a) => { writes.push(['cart', ...a]); },
    setOrderTable: (...a) => writes.push(['order', ...a]),
    setLineTable: (...a) => writes.push(['line', ...a]),
    setTable: (...a) => writes.push(['table', ...a]),
    endSession: (...a) => writes.push(['end', ...a]),
    ordersOfSession: async () => [],
    createAudit: (...a) => writes.push(['audit', ...a]),
    touchedAt: async () => [],
  };
  return {
    writes,
    now: () => NOW,
    log: () => {},
    staff: { bySession: async (_r, sid) => { if (sid !== 'login_till') throw new ApprovalError('unauthenticated', 'bad session'); return { staffId: 'stf_till', role: 'MANAGER', status: 'active' }; } },
    config: { floor: async () => floorConfigFrom(w.configDoc ?? {}) },
    tablesOf: async () => w.tables,
    sittingsOf: async () => w.heads ?? [],
    linesOfSessions: async (_r, ids) => (w.lines ?? []).filter(l => ids.includes(l.sessionId)),
    billsOfSessions: async (_r, ids) => (w.bills ?? []).filter(b => ids.includes(b.sittingId)),
    transact: async (_r, fn) => fn(tx),
    idleCandidates: async () => [],
    restaurantIds: async () => [RID],
    approve: async () => ({}),
  };
}
const REQ = { restaurantId: RID, staffSessionId: 'login_till' };

describe('QA till floor findings (2026-09-25)', () => {
  // QF-1 · P0. 21:10 the couple at 7 walks out on printed bill A-0001 (6600): floor-clear ends their session
  // but the bill stays issued, so their sitting is still read for its money. 21:30 a family sits at 7 and
  // orders a naan (6000). Two sittings now name table 7. R9: one tile per sitting; FL-S1 / R19: the live
  // party's money is on the floor. Today the tile shows whichever sitting was read last: when the walked-out
  // one comes second (the adapter reads live sessions first), the family's 6000 is nowhere.
  test('QF-1 TD-063 FL R9: a new party at a walked-out table has its own money on the floor, whatever order the sittings are read in', async () => {
    const walked = { sessionId: 'sit_walked', tableIds: ['t7'], openedAt: NOW - 60 * MIN };
    const family = { sessionId: 'sit_family', tableIds: ['t7'], openedAt: NOW - 10 * MIN };
    const world = heads => ({
      tables: [{ tableId: 't7', number: '7', status: 'active', hasSession: true }],
      heads,
      lines: [line('l_walked', 'sit_walked', 't7', { billId: 'bill_a0001' }), line('l_family', 'sit_family', 't7')],
      bills: [{ billId: 'bill_a0001', sittingId: 'sit_walked', status: 'issued', payable: 6600, paid: 0 }],
    });
    for (const heads of [[walked, family], [family, walked]]) {
      const { tiles } = await getFloor(fakePorts(world(heads)), REQ);
      const family7 = tiles.filter(t => t.tableIds.includes('t7') && t.onTable === 6000);
      expect(family7).toHaveLength(1);
    }
  });

  // QF-3 · P1. Parcel counters are drawn in their own strip "so a waiting parcel is never mistaken for a
  // table" (BT / OR-3, Shaurya 2026-09-23); `ordering.takeawayTableIds` names them. A counter ticket is not
  // a table a party sits at, so it can be neither merged into a table nor the destination of a move.
  const parcelWorld = () => ({
    configDoc: { ordering: { takeawayTableIds: ['tp1'] } },
    tables: [{ tableId: 't11', number: '11', status: 'active', hasSession: true }, { tableId: 'tp1', number: 'P1', status: 'vacant' }],
    sitting: { sessionId: 'sit_11', tableIds: ['t11'], openedAt: NOW - 20 * MIN, lines: [line('l11', 'sit_11', 't11')], bills: [] },
  });
  knownBug('QF-3 FL BT: a parcel counter cannot be merged into a table', async () => {
    const p = fakePorts(parcelWorld());
    await expect(setMerge(p, { ...REQ, parentTableId: 't11', childTableIds: ['tp1'], cid: 'cid_merge' })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(p.writes).toEqual([]);
  });
  knownBug('QF-3 FL BT: a dine-in party cannot be moved onto a parcel counter', async () => {
    const p = fakePorts(parcelWorld());
    await expect(moveTable(p, { ...REQ, fromTableId: 't11', toTableId: 'tp1', cid: 'cid_move' })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(p.writes).toEqual([]);
  });

  // QF-5 · P1. FL-S24 refuses a move under a printed bill (correct today) with "Cancel the bill or finish
  // tender first". On a PAID table (10, ₹66 settled) the words tell the cashier to cancel a paid bill; on a
  // part-paid one (9, ₹33 of ₹66 taken) cancelling is QB-2's trap, and finishing tender is the way out.
  const billedSitting = paid => ({
    sessionId: 'sit_9', tableIds: ['t9'], openedAt: NOW - 40 * MIN,
    lines: [line('l9', 'sit_9', 't9', { billId: 'bill_9' })],
    bills: [{ billId: 'bill_9', sittingId: 'sit_9', status: paid === 6600 ? 'paid' : 'issued', payable: 6600, paid }],
  });
  const from = { tableId: 't9', number: '9', status: 'active', hasSession: true };
  const dest = { tableId: 't3', number: '3', status: 'vacant' };
  test('FL-S24 the move under a printed bill is refused (holds today)', () => {
    expect(canMove(from, dest, billedSitting(0), 'MANAGER')).toMatchObject({ ok: false, code: 'failed-precondition' });
  });
  knownBug('QF-5 FL-S24: the refusal on a paid table does not tell the cashier to cancel the bill', () => {
    const r = canMove(from, dest, billedSitting(6600), 'MANAGER');
    expect(r.ok).toBe(false);
    expect(r.message).not.toMatch(/cancel/i);
  });
  knownBug('QF-5 FL-S24: the refusal on a part-paid table points at finishing the payment', () => {
    const r = canMove(from, dest, billedSitting(3300), 'MANAGER');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/tender|pay/i);
  });
});
