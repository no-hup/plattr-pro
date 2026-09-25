// FL · app layer, against fake ports and a fake clock. No emulator.
// The domain tests own the arithmetic and the refusals; this file owns what the domain cannot
// see: who is asking, what one transaction must write, what the audit row says afterwards, and
// what the screen is handed when a port is down.

import {
  getFloor, openTable, moveTable, clearTable, setMerge, floorConfigFrom, releaseIdle, releaseIdleEverywhere,
  Ports, Tx, Order, SittingHead, ApprovalError,
} from './floor';
import { Bill, Table, OrderState, sittingOf } from '../domain/floor';
import { Line } from '../domain/line';
import { Staff } from './approvals';

const RID = 'r1';
const MIN = 60_000;
const T0 = 1_700_000_000_000;

function line(over: Partial<Line> & { lineId: string; listPrice: number; sessionId: string }): Line {
  return {
    cid: 'cid_fl', orderId: 'order_fl', cartId: 'cart_fl', cartItemId: 'ci_fl',
    tableId: '12', placedAt: T0 - 40 * MIN, placedBy: 'guest_1',
    menuItemId: 'mi', name: 'Item', qty: 1, components: [], taxBlocks: {},
    draftId: over.sessionId, billId: null, sent: true, v: 0, countsTowardTotal: true,
    ...over,
  } as Line;
}

interface World {
  tables: Table[];
  sittings: SittingHead[];
  lines: Line[];
  bills: Bill[];
  orders: Record<string, Order[]>;
  carts: Record<string, string[]>;
  staff: Staff;
  configDoc?: unknown;
  breakLines?: boolean;
  breakBills?: boolean;
  breakTables?: boolean;
  breakConfig?: boolean;
  touched?: Record<string, number[]>;     // sessionId → extra timestamps the database knows (R21)
  breakTouched?: string[];                // sessionIds whose read throws
}

function fake(over: Partial<World> = {}) {
  const w: World = {
    tables: [], sittings: [], lines: [], bills: [], orders: {}, carts: {},
    staff: { staffId: 'mgr_1', role: 'MANAGER', status: 'active' } as Staff,
    ...over,
  };
  const logs: object[] = [];
  const audits = new Map<string, Record<string, unknown>>();
  const writes: string[] = [];
  let now = T0;

  const tableOf = (id: string) => w.tables.find(t => t.tableId === id) ?? null;
  const headAt = (id: string) => w.sittings.find(s => s.tableIds.includes(id));
  const sittingAt = (id: string) => {
    const h = headAt(id);
    if (!h) return null;
    return sittingOf(h, w.lines, w.bills);   // the same constructor the adapter uses
  };

  const tx: Tx = {
    async getTable(id) { return tableOf(id); },
    async getSitting(id) { return sittingAt(id); },
    async childrenOf(id) { return w.tables.filter(x => x.mergedInto === id).map(x => x.tableId); },
    endSession(sid) { writes.push(`session:${sid}=ended`); w.sittings = w.sittings.filter(s => s.sessionId !== sid); },
    setSessionTable(sid, tid) { writes.push(`session:${sid}=${tid}`); const h = w.sittings.find(s => s.sessionId === sid); if (h) h.tableIds = [tid]; },
    async moveCart(from, to) { writes.push(`cart:${from}->${to}`); w.carts[to] = w.carts[from] ?? []; delete w.carts[from]; },
    setOrderTable(oid, tid) { writes.push(`order:${oid}=${tid}`); },
    setLineTable(lid, tid) { writes.push(`line:${lid}=${tid}`); const l = w.lines.find(x => x.lineId === lid); if (l) (l as Line).tableId = tid; },
    setTable(tid, patch) { writes.push(`table:${tid}`); const t = tableOf(tid); if (t) Object.assign(t, patch); },
    async ordersOfSession(sid) { return w.orders[sid] ?? []; },
    createAudit(id, row) { if (audits.has(id)) throw new Error(`audit ${id} exists`); audits.set(id, row as Record<string, unknown>); },
    async touchedAt(s) { if (w.breakTouched?.includes(s.sessionId)) throw new Error('cart unreadable'); return w.touched?.[s.sessionId] ?? []; },
    walkOutBill(billId, block) { writes.push(`bill:${billId}=walkedOut`); const b = w.bills.find(x => x.billId === billId); if (b) { b.status = 'walkedOut'; walked.set(billId, block); } },
  };
  // D1: BL, faked. A draft bills at its lines' net + 5 % GST (234000 → 245700); a walk-out issue makes that bill, unpaid.
  const walked = new Map<string, { at: number; by: string; amount: number; cid: string }>();
  const draftPayable = (draftId: string) => w.lines.filter(l => l.draftId === draftId && !l.billId && l.countsTowardTotal).reduce((a, l) => a + l.listPrice, 0) * 105 / 100;

  const ports: Ports & { world: World; logs: object[]; audits: typeof audits; writes: string[]; walked: typeof walked; tick(ms: number): void } = {
    world: w, logs, audits, writes, walked,
    billing: {
      async payable(_rid, _sid, draftId) { return draftPayable(draftId); },
      async issueForWalkOut(_rid, _sid, draftId, cid, payable) {
        if (payable !== draftPayable(draftId)) throw new ApprovalError('failed-precondition', 'the amount on this table changed, try again');
        const open = w.lines.filter(l => l.draftId === draftId && !l.billId && l.countsTowardTotal);
        const billId = `bw_${draftId}`;
        w.bills.push({ billId, sittingId: open[0].sessionId, status: 'issued', payable: draftPayable(draftId), paid: 0 });
        for (const l of open) (l as Line).billId = billId;
        writes.push(`issue:${draftId}:${cid}`);
      },
    },
    tick: ms => { now += ms; },
    now: () => now,
    log: l => logs.push(l),
    staff: {
      async bySession(_rid, sid) {
        if (sid !== 'staff_ok') throw new ApprovalError('unauthenticated', 'Invalid or expired session');
        return w.staff;
      },
    },
    config: { async floor() { if (w.breakConfig) throw new Error('settings unreadable'); return floorConfigFrom(w.configDoc); } },
    async tablesOf() { if (w.breakTables) throw new Error('tables unreadable'); return w.tables; },
    async sittingsOf() { return w.sittings; },
    async linesOfSessions(_rid, ids) { if (w.breakLines) throw new Error('lines unreadable'); return w.lines.filter(l => ids.includes(l.sessionId)); },
    async billsOfSessions(_rid, ids) { if (w.breakBills) throw new Error('bills unreadable'); return w.bills.filter(b => ids.includes(b.sittingId)); },
    async transact(_rid, fn) { return fn(tx); },
    async idleCandidates(_rid, before) { return w.sittings.filter(s => s.openedAt < before); },
    async restaurantIds() { return [RID]; },
    // ST's door, reduced to what FL relies on: a wrong or missing PIN throws, a right one writes the P0 row.
    async approve(r) {
      if (r.pin !== '4321') throw new ApprovalError('permission-denied', r.pin === undefined ? 'PIN required' : 'Wrong PIN', { requires: 'pin' });
      audits.set(`${r.cid}_releaseUnpaid`, { action: r.action, amount: r.amountMinor, reason: r.reason, sev: 'P0' });
      return {};
    },
  };
  return ports;
}

const table = (over: Partial<Table> & { tableId: string }): Table => ({ status: 'vacant', ...over });
const head = (over: Partial<SittingHead> & { sessionId: string; tableIds: string[] }): SittingHead =>
  ({ openedAt: T0 - 48 * MIN, ...over });
const bill = (over: Partial<Bill> & { billId: string; sittingId: string }): Bill =>
  ({ status: 'issued', payable: 0, paid: 0, ...over });

const REQ = { restaurantId: RID, staffSessionId: 'staff_ok' };

// ─────────────────────────────────────────────────────────────────────────────

describe('getFloor — one read that paints every tile (R1, R2, R3)', () => {
  function friday() {
    return fake({
      tables: [
        table({ tableId: '12', status: 'active' }),
        table({ tableId: '7', status: 'active' }),
        ...['19', '20', '21'].map(id => table({ tableId: id })),
      ],
      sittings: [
        head({ sessionId: 's12', tableIds: ['12'], openedAt: T0 - 48 * MIN }),
        head({ sessionId: 's7', tableIds: ['7'], openedAt: T0 - 12 * MIN }),
      ],
      lines: [
        line({ lineId: 'l1', listPrice: 234000, sessionId: 's12' }),
        line({ lineId: 'l2', listPrice: 86000, sessionId: 's7' }),
      ],
    });
  }

  it('FL-S1 table 12 = 234000p/48min, table 7 = 86000p/12min, 3 free', async () => {
    const { tiles } = await getFloor(friday(), REQ);
    const by = Object.fromEntries(tiles.map(t => [t.label, t]));
    expect(by['12'].onTable).toBe(234000);
    expect(by['12'].minutes).toBe(48);
    expect(by['7'].onTable).toBe(86000);
    expect(by['7'].minutes).toBe(12);
    expect(tiles.filter(t => t.word === 'free')).toHaveLength(3);
  });

  it('FL-S1 minutes are computed off the server clock, not sent by the client', async () => {
    const ports = friday();
    ports.tick(7 * MIN);
    const { tiles } = await getFloor(ports, REQ);
    expect(tiles.find(t => t.label === '12')!.minutes).toBe(55);
  });

  it('FL-S6 a merged 5+6 group is ONE tile for 412000p; table 6 returns no tile of its own (R9)', async () => {
    const ports = fake({
      tables: [table({ tableId: '5', status: 'active', isParent: true }), table({ tableId: '6', status: 'disabled', mergedInto: '5' })],
      sittings: [head({ sessionId: 's5', tableIds: ['5', '6'] })],
      lines: [line({ lineId: 'l', listPrice: 412000, sessionId: 's5' })],
    });
    const { tiles } = await getFloor(ports, REQ);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].label).toBe('5+6');
    expect(tiles[0].onTable).toBe(412000);
  });

  it('FL-S6 one tile whichever order the tables come back in (R9)', async () => {
    const childFirst = fake({
      tables: [table({ tableId: '6', status: 'disabled', mergedInto: '5' }), table({ tableId: '5', status: 'active', isParent: true })],
      sittings: [head({ sessionId: 's5', tableIds: ['5', '6'] })],
      lines: [line({ lineId: 'l', listPrice: 412000, sessionId: 's5' })],
    });
    const { tiles } = await getFloor(childFirst, REQ);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].label).toBe('5+6');
  });

  it('FL-S7 tables merged BEFORE anyone sits still read as one group, not as table 5 alone', async () => {
    // The scene in the sheet: the party of eight is at the door, the cashier pushes 5 and 6
    // together, and they sit afterwards. If the tile read "5" until the first order, table 6
    // would vanish from the floor and the cashier could not see what she had just done.
    const ready = fake({
      tables: [table({ tableId: '5', number: '5', status: 'vacant' }), table({ tableId: '6', number: '6', status: 'disabled', mergedInto: '5' })],
    });
    const { tiles } = await getFloor(ready, REQ);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].label).toBe('5+6');
    expect(tiles[0].tableIds).toEqual(['5', '6']);
    expect(tiles[0].word).toBe('free');
  });

  it('a merged child never gets a tile of its own, so no walk-in is seated onto a group', async () => {
    const ready = fake({
      tables: [table({ tableId: '6', number: '6', status: 'disabled', mergedInto: '5' }), table({ tableId: '5', number: '5', status: 'vacant' })],
    });
    const { tiles } = await getFloor(ready, REQ);
    expect(tiles.filter(t => t.tableIds.length === 1)).toHaveLength(0);
  });

  it('a tile is labelled by the number a person reads, not the document id', async () => {
    const ports = fake({
      tables: [table({ tableId: 'table_fl_12', number: '12', status: 'active' }), table({ tableId: 'table_fl_6', number: '6' })],
      sittings: [head({ sessionId: 's12', tableIds: ['table_fl_12'] })],
    });
    const { tiles } = await getFloor(ports, REQ);
    const seated = tiles.find(t => t.tableIds[0] === 'table_fl_12')!;
    expect(seated.label).toBe('12');
    expect(seated.tableIds).toEqual(['table_fl_12']);   // acts are still sent the id
    expect(tiles.find(t => t.tableIds[0] === 'table_fl_6')!.label).toBe('6');
  });

  it('a merged group reads "5+6" from the numbers, not from the ids', async () => {
    const ports = fake({
      tables: [table({ tableId: 'table_fl_5', number: '5', status: 'active', isParent: true }), table({ tableId: 'table_fl_6', number: '6', status: 'disabled', mergedInto: 'table_fl_5' })],
      sittings: [head({ sessionId: 's5', tableIds: ['table_fl_5', 'table_fl_6'] })],
    });
    expect((await getFloor(ports, REQ)).tiles[0].label).toBe('5+6');
  });

  it('a table with no number set falls back to its id rather than a blank tile', async () => {
    const ports = fake({ tables: [table({ tableId: 'table_fl_9' })] });
    expect((await getFloor(ports, REQ)).tiles[0].label).toBe('table_fl_9');
  });

  it('FL-S5 a table scanned at 20:02 with nothing placed is seated at 0p, not free (R14)', async () => {
    const ports = fake({ tables: [table({ tableId: '3', status: 'active' })], sittings: [head({ sessionId: 's3', tableIds: ['3'] })] });
    const { tiles } = await getFloor(ports, REQ);
    expect(tiles[0].word).toBe('seated');
    expect(tiles[0].onTable).toBe(0);
  });

  it('FL-S30 a table marked out of service at 20:50 with 234000p open still returns its tile (R17)', async () => {
    const ports = fake({
      tables: [table({ tableId: '12', status: 'disabled' })],
      sittings: [head({ sessionId: 's12', tableIds: ['12'] })],
      lines: [line({ lineId: 'l', listPrice: 234000, sessionId: 's12' })],
    });
    const { tiles } = await getFloor(ports, REQ);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].onTable).toBe(234000);
  });

  it('FL-S30 an out-of-service table with no sitting and no money returns no tile', async () => {
    const ports = fake({ tables: [table({ tableId: '12', status: 'disabled' })] });
    expect((await getFloor(ports, REQ)).tiles).toHaveLength(0);
  });

  it('FL-S30 a sitting whose table document is gone entirely still gets a door to its bill', async () => {
    const ports = fake({
      tables: [],
      sittings: [head({ sessionId: 's12', tableIds: ['12'] })],
      lines: [line({ lineId: 'l', listPrice: 234000, sessionId: 's12' })],
    });
    const { tiles } = await getFloor(ports, REQ);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].onTable).toBe(234000);
  });

  it('FL-S34 a sitting whose 4-hour session expired at 23:00 still shows 184000p at 23:05 (R17)', async () => {
    const ports = fake({
      tables: [table({ tableId: '7', status: 'active' })],
      sittings: [head({ sessionId: 's7', tableIds: ['7'], openedAt: T0 - 245 * MIN })],
      lines: [line({ lineId: 'l', listPrice: 184000, sessionId: 's7' })],
    });
    const { tiles } = await getFloor(ports, REQ);
    expect(tiles[0].onTable).toBe(184000);
    expect(tiles[0].word).toBe('ordered');
  });

  it('never reads activeOrderId: the port is not given one, and the tiles are still right (R3)', async () => {
    const ports = friday();
    expect(JSON.stringify(ports.world.tables)).not.toMatch(/activeOrderId/);
    expect((await getFloor(ports, REQ)).tiles.find(t => t.label === '12')!.onTable).toBe(234000);
  });

  it('lines are found by the frozen sessionId, never draftId: a split sitting still totals 300000p (R2)', async () => {
    const ports = fake({
      tables: [table({ tableId: '4', status: 'active' })],
      sittings: [head({ sessionId: 's4', tableIds: ['4'] })],
      lines: [
        line({ lineId: 'a', listPrice: 100000, sessionId: 's4', draftId: 'draft_a' }),
        line({ lineId: 'b', listPrice: 100000, sessionId: 's4', draftId: 'draft_b' }),
        line({ lineId: 'c', listPrice: 100000, sessionId: 's4', draftId: 'draft_c' }),
      ],
    });
    const { tiles } = await getFloor(ports, REQ);
    expect(tiles[0].onTable).toBe(300000);
    expect(tiles[0].drafts).toBe(3);
  });

  it('one call per floor, not one per table: the lines port is asked exactly once for 24 tables', async () => {
    const ports = fake({
      tables: Array.from({ length: 24 }, (_, i) => table({ tableId: String(i + 1), status: 'active' })),
      sittings: Array.from({ length: 24 }, (_, i) => head({ sessionId: `s${i}`, tableIds: [String(i + 1)] })),
    });
    const spy = jest.spyOn(ports, 'linesOfSessions');
    await getFloor(ports, REQ);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('an inactive login is refused, and an unknown staff session is unauthenticated', async () => {
    await expect(getFloor(fake(), { ...REQ, staffSessionId: 'nope' })).rejects.toMatchObject({ code: 'unauthenticated' });
    const suspended = fake({ staff: { staffId: 's', role: 'MANAGER', status: 'suspended' } as Staff });
    await expect(getFloor(suspended, REQ)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('a SERVER may read the floor; only the three acts are a manager\'s (R16)', async () => {
    const ports = friday();
    ports.world.staff = { staffId: 'srv', role: 'SERVER', status: 'active' } as Staff;
    expect((await getFloor(ports, REQ)).tiles.length).toBeGreaterThan(0);
  });
});

describe('getFloor — the two axes and the word on the tile (R11)', () => {
  const one = (lines: Line[], bills: Bill[] = []) =>
    fake({ tables: [table({ tableId: '12', status: 'active' })], sittings: [head({ sessionId: 's12', tableIds: ['12'] })], lines, bills });

  it('FL-S19 unbilled 147000p and nothing issued reads "ordered", never a money word', async () => {
    const ports = one([
      line({ lineId: 'tikka', listPrice: 32000, sessionId: 's12' }),
      line({ lineId: 'pitcher', listPrice: 125000, sessionId: 's12', offer: { id: 'hh', amount: 10000 } as Line['offer'] }),
      line({ lineId: 'biryani', listPrice: 45000, sessionId: 's12', countsTowardTotal: false }),
    ]);
    const t = (await getFloor(ports, REQ)).tiles[0];
    expect(t.onTable).toBe(147000);
    expect(t.word).toBe('ordered');
  });

  it('FL-S20 issued 200000p unpaid AND 30000p ordered after issue reads both', async () => {
    const ports = one(
      [line({ lineId: 'billed', listPrice: 200000, sessionId: 's12', billId: 'b1' }), line({ lineId: 'jamun', listPrice: 30000, sessionId: 's12' })],
      [bill({ billId: 'b1', sittingId: 's12', payable: 200000 })],
    );
    const t = (await getFloor(ports, REQ)).tiles[0];
    expect(t.unpaid).toBe(200000);
    expect(t.onTable).toBe(30000);
  });

  it('FL-S22 an issued 100000p bill with 40000p taken reads due 60000p, never "paid"', async () => {
    const ports = one([], [bill({ billId: 'b1', sittingId: 's12', payable: 100000, paid: 40000 })]);
    const t = (await getFloor(ports, REQ)).tiles[0];
    expect(t.unpaid).toBe(60000);
    expect(t.word).toBe('billed');
  });

  it('FL-S35 a bill comped to 0p and settled reads "settled", exactly as a paid one does', async () => {
    const ports = one([], [bill({ billId: 'b1', sittingId: 's12', payable: 0, paid: 0, status: 'paid' })]);
    expect((await getFloor(ports, REQ)).tiles[0].word).toBe('settled');
  });

  it('FL-S17 a cancelled 234000p bill puts the money back on the ordered axis', async () => {
    const ports = one([line({ lineId: 'l', listPrice: 234000, sessionId: 's12' })], [bill({ billId: 'b1', sittingId: 's12', payable: 234000, status: 'cancelled' })]);
    const t = (await getFloor(ports, REQ)).tiles[0];
    expect(t.onTable).toBe(234000);
    expect(t.unpaid).toBe(0);
  });

  it('FL-S17 a cancelled bill with a second issued bill still open keeps showing that second bill', async () => {
    const ports = one([], [
      bill({ billId: 'b1', sittingId: 's12', payable: 234000, status: 'cancelled' }),
      bill({ billId: 'b2', sittingId: 's12', payable: 90000 }),
    ]);
    expect((await getFloor(ports, REQ)).tiles[0].unpaid).toBe(90000);
  });

  it('another sitting\'s lines and bills never leak onto this tile', async () => {
    const ports = fake({
      tables: [table({ tableId: '12', status: 'active' }), table({ tableId: '7', status: 'active' })],
      sittings: [head({ sessionId: 's12', tableIds: ['12'] }), head({ sessionId: 's7', tableIds: ['7'] })],
      lines: [line({ lineId: 'a', listPrice: 100000, sessionId: 's12' }), line({ lineId: 'b', listPrice: 50000, sessionId: 's7' })],
      bills: [bill({ billId: 'b1', sittingId: 's7', payable: 50000 })],
    });
    const by = Object.fromEntries((await getFloor(ports, REQ)).tiles.map(t => [t.label, t]));
    expect(by['12'].onTable).toBe(100000);
    expect(by['12'].unpaid).toBe(0);
    expect(by['7'].unpaid).toBe(50000);
  });
});

describe('getFloor — what happens when a port is down (R19)', () => {
  const busy = () => fake({
    tables: [table({ tableId: '12', status: 'active' })],
    sittings: [head({ sessionId: 's12', tableIds: ['12'] })],
    lines: [line({ lineId: 'l', listPrice: 234000, sessionId: 's12' })],
  });

  it('R19 if the lines port throws, the floor fails; it never answers a tile reading 0p', async () => {
    const ports = busy();
    ports.world.breakLines = true;
    await expect(getFloor(ports, REQ)).rejects.toThrow(/lines unreadable/);
  });

  it('R19 a bills port failure fails the same way: partial money is not money', async () => {
    const ports = busy();
    ports.world.breakBills = true;
    await expect(getFloor(ports, REQ)).rejects.toThrow(/bills unreadable/);
  });

  it('a tables port failure fails the whole call; there is nothing to paint', async () => {
    const ports = busy();
    ports.world.breakTables = true;
    await expect(getFloor(ports, REQ)).rejects.toThrow(/tables unreadable/);
  });

  it('R19 a single unreadable line fails the call rather than dropping 234000p off the tile', async () => {
    const ports = busy();
    ports.world.lines.push(line({ lineId: 'l_bad', listPrice: NaN, sessionId: 's12' }));
    await expect(getFloor(ports, REQ)).rejects.toThrow(/l_bad cannot be read/);
  });

  it('an UNREADABLE settings document refuses the call; it never falls back to permissive defaults', async () => {
    // Matches loadTaxBlocks / loadRequireWaiterConfirmation: a MISSING doc is a fresh restaurant
    // and takes the defaults, but an unreadable one is a blip we cannot tell apart from that, and
    // guessing 30 minutes here would free a table with people at it.
    const ports = busy();
    ports.world.breakConfig = true;
    await expect(getFloor(ports, REQ)).rejects.toThrow(/settings unreadable/);
  });

  it('config falls back to the defaults on a fresh restaurant rather than failing the floor', async () => {
    const { config } = await getFloor(busy(), REQ);
    expect(config).toEqual({ pollSeconds: 5, staleAfterSeconds: 20, idleFreeAfterMinutes: 60, takeawayTableIds: [] });
  });

  it('config keys are read from the restaurant doc and bad values fall back, never crash', () => {
    expect(floorConfigFrom({ floor: { pollSeconds: 10, staleAfterSeconds: 45 } }))
      .toEqual({ pollSeconds: 10, staleAfterSeconds: 45, idleFreeAfterMinutes: 60, takeawayTableIds: [] });
    expect(floorConfigFrom({ floor: { pollSeconds: -1, staleAfterSeconds: 'soon', idleFreeAfterMinutes: 0 } }))
      .toEqual({ pollSeconds: 5, staleAfterSeconds: 20, idleFreeAfterMinutes: 60, takeawayTableIds: [] });
    // BT: the counter tickets come from `ordering`, not `floor`; non-strings are dropped.
    expect(floorConfigFrom({ ordering: { takeawayTableIds: ['tbl_p1', 7, 'tbl_p2'] } }).takeawayTableIds).toEqual(['tbl_p1', 'tbl_p2']);
  });
});

describe('openTable — the tap is a read of the truth, not of the poll (R1, R12)', () => {
  const nine = Array.from({ length: 9 }, (_, i) => line({ lineId: `l${i}`, listPrice: 10000, sessionId: 's12' }));

  it('FL-S2 tapping table 12 returns its one open draft with 9 lines, read fresh inside the call', async () => {
    const ports = fake({ tables: [table({ tableId: '12', status: 'active' })], sittings: [head({ sessionId: 's12', tableIds: ['12'] })], lines: nine });
    const r = await openTable(ports, { ...REQ, tableId: '12' });
    expect(r.drafts).toHaveLength(1);
    expect(r.drafts[0].lineIds).toHaveLength(9);
    expect(r.drafts[0].onTable).toBe(90000);
  });

  it('FL-S2 the answer is drafts: [...], never a single draftId + billId + state (R12)', async () => {
    const ports = fake({ tables: [table({ tableId: '12', status: 'active' })], sittings: [head({ sessionId: 's12', tableIds: ['12'] })], lines: nine });
    const r = await openTable(ports, { ...REQ, tableId: '12' });
    expect(Array.isArray(r.drafts)).toBe(true);
    expect(Array.isArray(r.bills)).toBe(true);
    expect((r as unknown as Record<string, unknown>).draftId).toBeUndefined();
  });

  it('FL-S3 tapping table 7 four minutes after issue returns the issued bill, not a second draft', async () => {
    const ports = fake({
      tables: [table({ tableId: '7', status: 'active' })],
      sittings: [head({ sessionId: 's7', tableIds: ['7'] })],
      lines: [line({ lineId: 'l', listPrice: 86000, sessionId: 's7', billId: 'b1' })],
      bills: [bill({ billId: 'b1', sittingId: 's7', payable: 86000 })],
    });
    const r = await openTable(ports, { ...REQ, tableId: '7' });
    expect(r.drafts).toHaveLength(0);
    expect(r.bills).toEqual([{ billId: 'b1', payable: 86000, paid: 0, status: 'issued' }]);
  });

  it('FL-S4 tapping empty table 19 returns nothing to open, and mints no draft', async () => {
    const ports = fake({ tables: [table({ tableId: '19' })] });
    const r = await openTable(ports, { ...REQ, tableId: '19' });
    expect(r).toEqual({ tableIds: ['19'], sessionId: null, drafts: [], bills: [] });
    expect(ports.writes).toHaveLength(0);
  });

  it('R1 a tile that says ordered but whose draft was issued 2s ago returns the bill: the poll never decides', async () => {
    const ports = fake({
      tables: [table({ tableId: '12', status: 'active' })],
      sittings: [head({ sessionId: 's12', tableIds: ['12'] })],
      lines: nine.map(l => ({ ...l, billId: 'b1' })),
      bills: [bill({ billId: 'b1', sittingId: 's12', payable: 90000 })],
    });
    const stale = (await getFloor(ports, REQ)).tiles[0];
    expect(stale.word).toBe('billed');
    const r = await openTable(ports, { ...REQ, tableId: '12' });
    expect(r.drafts).toHaveLength(0);
    expect(r.bills).toHaveLength(1);
  });

  it('FL-S21 three drafts come back as three, in a stable order, so the picker does not reshuffle', async () => {
    const ports = fake({
      tables: [table({ tableId: '4', status: 'active' })],
      sittings: [head({ sessionId: 's4', tableIds: ['4'] })],
      lines: [
        line({ lineId: 'c', listPrice: 100000, sessionId: 's4', draftId: 'draft_c' }),
        line({ lineId: 'a', listPrice: 100000, sessionId: 's4', draftId: 'draft_a' }),
        line({ lineId: 'b', listPrice: 100000, sessionId: 's4', draftId: 'draft_b' }),
      ],
    });
    const r = await openTable(ports, { ...REQ, tableId: '4' });
    expect(r.drafts.map(d => d.draftId)).toEqual(['draft_a', 'draft_b', 'draft_c']);
    expect(r.drafts.every(d => d.onTable === 100000)).toBe(true);
  });

  it('opening a child of a merged group answers for the whole sitting, not the child alone', async () => {
    const ports = fake({
      tables: [table({ tableId: '5', status: 'active', isParent: true }), table({ tableId: '6', status: 'disabled', mergedInto: '5' })],
      sittings: [head({ sessionId: 's5', tableIds: ['5', '6'] })],
      lines: [line({ lineId: 'l', listPrice: 412000, sessionId: 's5' })],
    });
    const r = await openTable(ports, { ...REQ, tableId: '6' });
    expect(r.sessionId).toBe('s5');
    expect(r.tableIds).toEqual(['5', '6']);
    expect(r.drafts[0].onTable).toBe(412000);
  });

  it('a cancelled bill is not offered for tender', async () => {
    const ports = fake({
      tables: [table({ tableId: '12', status: 'active' })],
      sittings: [head({ sessionId: 's12', tableIds: ['12'] })],
      bills: [bill({ billId: 'b1', sittingId: 's12', payable: 90000, status: 'cancelled' })],
    });
    expect((await openTable(ports, { ...REQ, tableId: '12' })).bills).toHaveLength(0);
  });
});

describe('moveTable — one transaction, four writes, no price rewritten (R5)', () => {
  const orders: Order[] = [
    { orderId: 'o_cooking', state: 'PREPARING' as OrderState },
    { orderId: 'o_served', state: 'SERVED' as OrderState },
    { orderId: 'o_done', state: 'COMPLETED' as OrderState },
  ];

  function party(over: Partial<World> = {}) {
    return fake({
      tables: [table({ tableId: '4', status: 'active', hasSession: true }), table({ tableId: '9', status: 'vacant' })],
      sittings: [head({ sessionId: 's4', tableIds: ['4'] })],
      lines: [line({ lineId: 'l_biryani', listPrice: 168000, sessionId: 's4', tableId: '4' })],
      orders: { s4: orders },
      carts: { '4': ['ci_1'] },
      ...over,
    });
  }
  const MOVE = { ...REQ, fromTableId: '4', toTableId: '9', cid: 'cid_move_1' };

  it('FL-S10 moving 4 → 9 writes the session, the cart, the open orders and every unbilled line', async () => {
    const ports = party();
    const r = await moveTable(ports, MOVE);
    // the cart read must come before every write: Firestore refuses read-after-write
    expect(ports.writes.indexOf('cart:4->9')).toBe(0);
    expect(ports.writes).toContain('session:s4=9');
    expect(ports.writes).toContain('order:o_cooking=9');
    expect(ports.writes).toContain('line:l_biryani=9');
    expect(r.lineIds).toEqual(['l_biryani']);
  });

  it('FL-S10 the source cart is deleted and the destination written; two carts never exist at once', async () => {
    const ports = party();
    await moveTable(ports, MOVE);
    expect(ports.world.carts['4']).toBeUndefined();
    expect(ports.world.carts['9']).toEqual(['ci_1']);
  });

  it('FL-S28 an open order with 168000p of biryani is re-pointed so the runner walks the right way', async () => {
    const ports = party();
    const r = await moveTable(ports, MOVE);
    expect(r.orderIds).toContain('o_cooking');
  });

  it('FL-Q2 a SERVED-but-unpaid order moves too; a COMPLETED one is left alone', async () => {
    const ports = party();
    const r = await moveTable(ports, MOVE);
    expect(r.orderIds).toEqual(['o_cooking', 'o_served']);
    expect(ports.writes).not.toContain('order:o_done=9');
  });

  it('R5 no line price is rewritten: listPrice, offer and discount are identical after the move', async () => {
    const ports = party();
    const before = JSON.stringify(ports.world.lines.map(l => [l.listPrice, l.offer ?? null, l.discount ?? null]));
    await moveTable(ports, MOVE);
    const after = JSON.stringify(ports.world.lines.map(l => [l.listPrice, l.offer ?? null, l.discount ?? null]));
    expect(after).toBe(before);
    expect(ports.writes.some(w => /price|offer|discount|draft/i.test(w))).toBe(false);
  });

  it('FL-S13 table 4 is left vacant and table 9 becomes active', async () => {
    const ports = party();
    await moveTable(ports, MOVE);
    expect(ports.world.tables.find(t => t.tableId === '4')!.status).toBe('vacant');
    expect(ports.world.tables.find(t => t.tableId === '9')!.status).toBe('active');
  });

  it('FL-S18 one audit row names the staff, both tables and the minute', async () => {
    const ports = party();
    await moveTable(ports, MOVE);
    const row = ports.audits.get('cid_move_1_move')!;
    expect(row).toMatchObject({ action: 'table.move', by: 'mgr_1', role: 'MANAGER', from: '4', to: '9', sessionId: 's4' });
    expect(row.at).toBe(T0);
  });

  it('FL-S24 a sitting with any line carrying a billId is refused, and nothing is written', async () => {
    const ports = party({ lines: [line({ lineId: 'l', listPrice: 168000, sessionId: 's4', billId: 'b1' })], bills: [bill({ billId: 'b1', sittingId: 's4', payable: 168000 })] });
    await expect(moveTable(ports, MOVE)).rejects.toThrow(/printed bill/);
    expect(ports.writes).toHaveLength(0);
    expect(ports.audits.size).toBe(0);
  });

  it('FL-S11 a destination holding a live sitting is refused before anything is written', async () => {
    const ports = party({
      tables: [table({ tableId: '4', status: 'active', hasSession: true }), table({ tableId: '9', status: 'active', hasSession: true })],
    });
    await expect(moveTable(ports, MOVE)).rejects.toThrow(/party at it/);
    expect(ports.writes).toHaveLength(0);
  });

  it('FL-S33 a destination that is disabled with mergedInto set and no session is refused (R6)', async () => {
    const ports = party({
      tables: [table({ tableId: '4', status: 'active', hasSession: true }), table({ tableId: '9', status: 'disabled', mergedInto: '10' })],
    });
    await expect(moveTable(ports, MOVE)).rejects.toThrow(/part of another group/);
  });

  it('FL-S33 a destination with an OTP in flight is refused', async () => {
    const ports = party({
      tables: [table({ tableId: '4', status: 'active', hasSession: true }), table({ tableId: '9', status: 'vacant', hasHold: true })],
    });
    await expect(moveTable(ports, MOVE)).rejects.toThrow(/signing in/);
  });

  it('FL-S12 moving a merged parent is refused, with "release the merge first"', async () => {
    const ports = party({
      tables: [table({ tableId: '4', status: 'active', hasSession: true, isParent: true }), table({ tableId: '9' })],
      sittings: [head({ sessionId: 's4', tableIds: ['4', '5'] })],
    });
    await expect(moveTable(ports, MOVE)).rejects.toThrow(/release the merge first/);
  });

  it('FL-S29 a SERVER is refused 403 and is never offered a PIN box', async () => {
    const ports = party();
    ports.world.staff = { staffId: 'srv', role: 'SERVER', status: 'active' } as Staff;
    await expect(moveTable(ports, MOVE)).rejects.toMatchObject({ code: 'permission-denied' });
    try { await moveTable(ports, MOVE); } catch (e) {
      expect((e as ApprovalError & { details?: object }).details ?? {}).not.toHaveProperty('requires');
    }
    expect(ports.writes).toHaveLength(0);
  });

  it('an expired staff session is unauthenticated, not 403', async () => {
    await expect(moveTable(party(), { ...MOVE, staffSessionId: 'nope' })).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('a refusal names the table the cashier reads, not its document id, and says why', async () => {
    // "table tbl_meg_2 is not vacant" is a refusal nobody can act on: the cashier is looking at a
    // tile that says 2, and "not vacant" does not say whether to wait, bill it or pick another.
    const ports = fake({
      tables: [
        table({ tableId: 'tbl_meg_1', number: '1', status: 'active', hasSession: true }),
        table({ tableId: 'tbl_meg_2', number: '2', status: 'pending' }),
      ],
    });
    await expect(setMerge(ports, { ...REQ, parentTableId: 'tbl_meg_1', cid: 'c', childTableIds: ['tbl_meg_2'] }))
      .rejects.toThrow('table 2 has a guest signing in');
  });

  it('a table that does not exist is not-found on either side', async () => {
    await expect(moveTable(party(), { ...MOVE, toTableId: '99' })).rejects.toMatchObject({ code: 'not-found' });
    await expect(moveTable(party(), { ...MOVE, fromTableId: '99' })).rejects.toMatchObject({ code: 'not-found' });
  });

  it('moving a table with no party is refused', async () => {
    const ports = party({ sittings: [] });
    await expect(moveTable(ports, MOVE)).rejects.toThrow(/no party to move/);
  });

  it('the log line carries the cid, both tables and the counts', async () => {
    const ports = party();
    await moveTable(ports, MOVE);
    expect(ports.logs).toContainEqual(expect.objectContaining({ evt: 'table.move', cid: 'cid_move_1', from: '4', to: '9', orders: 2, lines: 1 }));
  });
});

describe('clearTable and releaseIfSettled — freeing a settled table (FL-Q1)', () => {
  const settled = (over: Partial<World> = {}) => fake({
    tables: [table({ tableId: '7', status: 'active' })],
    sittings: [head({ sessionId: 's7', tableIds: ['7'] })],
    bills: [bill({ billId: 'b1', sittingId: 's7', payable: 100000, paid: 100000, status: 'paid' })],
    ...over,
  });
  const CLEAR = { ...REQ, tableId: '7', cid: 'cid_clear_1' };

  it('a blank table id is refused by name, never sent to Firestore (sanity run 1 got a 500 here)', async () => {
    await expect(clearTable(settled(), { ...CLEAR, tableId: '' })).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('Clear frees a settled table immediately, whatever the timer says', async () => {
    const ports = settled();
    const r = await clearTable(ports, CLEAR);
    expect(r.freed).toEqual(['7']);
    expect(ports.world.tables[0].status).toBe('vacant');
    expect(ports.audits.get('cid_clear_1_clear')).toMatchObject({ action: 'table.clear', by: 'mgr_1' });
  });

  it('Clear is refused while 30000p of dessert is unbilled, so it can never hide money', async () => {
    const ports = settled({ lines: [line({ lineId: 'jamun', listPrice: 30000, sessionId: 's7' })] });
    await expect(clearTable(ports, CLEAR)).rejects.toThrow(/still has money on it/);
    expect(ports.world.tables[0].status).toBe('active');
  });

  it('Clear is refused while one half of a split still owes 100000p', async () => {
    const ports = settled({
      bills: [
        bill({ billId: 'b1', sittingId: 's7', payable: 100000, paid: 100000, status: 'paid' }),
        bill({ billId: 'b2', sittingId: 's7', payable: 100000 }),
      ],
    });
    await expect(clearTable(ports, CLEAR)).rejects.toThrow(/still has money on it/);
  });

  it('Clear on an already-free table does nothing and does not fail', async () => {
    const ports = settled({ sittings: [] });
    expect(await clearTable(ports, CLEAR)).toEqual({ freed: [] });
  });

  it('Clear frees every table of a merged group, not just the one tapped', async () => {
    const ports = settled({
      tables: [table({ tableId: '5', status: 'active', isParent: true }), table({ tableId: '6', status: 'disabled', mergedInto: '5' })],
      sittings: [head({ sessionId: 's5', tableIds: ['5', '6'] })],
      bills: [bill({ billId: 'b1', sittingId: 's5', payable: 100000, paid: 100000, status: 'paid' })],
    });
    const r = await clearTable(ports, { ...CLEAR, tableId: '5' });
    expect(r.freed).toEqual(['5', '6']);
    expect(ports.world.tables.every(t => t.status === 'vacant' && t.mergedInto === null)).toBe(true);
  });

  it('FL-Q1 the payment path writes nothing to a table: there is no automatic release to call', () => {
    // Re-decided 2026-09-18 against the code, not the sheet. table/vacateTable.js releases every
    // merged child unaudited (:31, swallowed at :35) and ends the sitting (:41), so a release
    // fired by payment could never leave a tile reading settled — FL-S14 and FL-S35 could not
    // hold. A fully paid sitting reads settled from the data it already has, with no write.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(Object.keys(require('./floor'))).not.toContain('releaseIfSettled');
  });

  // TD-037 tail: the waiter's manual Vacant (table-updateTableStatus) runs this same rule. A merged child
  // has no session of its own, so it is judged by its group's sitting — and never ends that sitting.
  const group = (over: Partial<World> = {}) => settled({
    tables: [table({ tableId: '5', status: 'active', isParent: true }), table({ tableId: '6', status: 'disabled', mergedInto: '5' })],
    sittings: [head({ sessionId: 's5', tableIds: ['5', '6'] })],
    bills: [bill({ billId: 'b1', sittingId: 's5', payable: 100000, paid: 100000, status: 'paid' })],
    ...over,
  });
  it('TD-037 Vacant on child 6 while its group has 640000p unbilled → refused, nothing written', async () => {
    const ports = group({ lines: [line({ lineId: 'thali', listPrice: 640000, sessionId: 's5' })] });
    await expect(clearTable(ports, { ...CLEAR, tableId: '6' })).rejects.toThrow(/still has money on it/);
    expect(ports.world.sittings).toHaveLength(1);
  });
  it('TD-037 Vacant on child 6 of a group that owes nothing frees no table itself and leaves the party\'s sitting alone', async () => {
    const ports = group();
    expect(await clearTable(ports, { ...CLEAR, tableId: '6' })).toEqual({ freed: [] });
    expect(ports.world.sittings.map(s => s.sessionId)).toEqual(['s5']);
    expect(ports.world.tables.find(t => t.tableId === '5')!.status).toBe('active');
  });

  // Shaurya 2026-09-24: who may free a table. Paid → anyone. Owing → the cashier, with a PIN, on the record.
  const captain = { staffId: 'cap_1', role: 'SERVER', status: 'active' } as Staff;
  const owing = (over: Partial<World> = {}) => settled({ lines: [line({ lineId: 'thali', listPrice: 234000, sessionId: 's7' })], ...over });
  it('the captain frees a fully paid table (Vacant works without the cashier)', async () => {
    const ports = settled({ staff: captain });
    expect((await clearTable(ports, CLEAR)).freed).toEqual(['7']);
  });
  it('the captain on a table owing 234000p → permission-denied, nothing written', async () => {
    const ports = owing({ staff: captain });
    await expect(clearTable(ports, { ...CLEAR, pin: '4321', reason: 'guest left' })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(ports.world.tables[0].status).toBe('active');
    expect(ports.audits.size).toBe(0);
  });
  // D1 / QF-6: the amount is what the walk-out would write off as billed, post-tax: 234000 + 5 % = 245700, never the
  // pre-tax food added to post-tax bills.
  it('the cashier on a table owing 234000p without a PIN → the old refusal, naming the PIN and the post-tax 245700', async () => {
    const ports = owing();
    await expect(clearTable(ports, CLEAR)).rejects.toMatchObject({ code: 'failed-precondition', details: { requires: 'pin', action: 'releaseUnpaid', owed: 245700 } });
    expect(ports.world.tables[0].status).toBe('active');
  });
  it('the cashier with a wrong PIN → refused, table still owes', async () => {
    const ports = owing();
    await expect(clearTable(ports, { ...CLEAR, pin: '0000', reason: 'guest left' })).rejects.toThrow(/Wrong PIN/);
    expect(ports.world.tables[0].status).toBe('active');
  });
  // D1 / Q1-1 (Shaurya 2026-09-25): the ₹2,340 thali was never billed. Walk-out issues it (245700, no paper), marks that
  // bill walked out for 245700, ends the sitting, frees the table. One P0 approval row and one P0 clear row, same figure.
  it('D1 FL-S35 walk-out with the PIN on unbilled food: issued, marked walked out for 245700, table freed', async () => {
    const ports = owing();
    expect((await clearTable(ports, { ...CLEAR, pin: '4321', reason: 'guest left' })).freed).toEqual(['7']);
    expect(ports.world.tables[0].status).toBe('vacant');
    expect(ports.writes).toContain('issue:s7:cid_clear_1_s7');
    expect(ports.world.bills.find(b => b.billId === 'bw_s7')).toMatchObject({ status: 'walkedOut', payable: 245700 });
    expect(ports.walked.get('bw_s7')).toEqual({ at: T0, by: 'mgr_1', amount: 245700, cid: 'cid_clear_1' });
    expect(ports.audits.get('cid_clear_1_releaseUnpaid')).toMatchObject({ action: 'releaseUnpaid', amount: 245700, reason: 'guest left', sev: 'P0' });
    expect(ports.audits.get('cid_clear_1_clear')).toMatchObject({ sev: 'P0', owed: 245700 });
  });
  // Q1-4: tables split into b1 (paid 100000) and b2 (100000 unpaid). Only b2 walks out; the paid one is untouched.
  it('D1 Q1-4 walk-out on a split owing 100000p of 200000p: only the unpaid half is marked, for 100000', async () => {
    const ports = settled({ bills: [bill({ billId: 'b1', sittingId: 's7', payable: 100000, paid: 100000, status: 'paid' }), bill({ billId: 'b2', sittingId: 's7', payable: 100000 })] });
    await clearTable(ports, { ...CLEAR, pin: '4321', reason: 'guest left' });
    expect(ports.audits.get('cid_clear_1_releaseUnpaid')).toMatchObject({ amount: 100000 });
    expect(ports.world.bills.map(b => b.status)).toEqual(['paid', 'walkedOut']);
    expect([...ports.walked.keys()]).toEqual(['b2']);
  });
  // Review P1: 22:41, after the PIN for table 7's 66000 bill and before the release, the guest's friend pays 30000 at
  // the other till. The release re-reads, sees 36000 owed, not the 66000 approved: refused "try again", nothing is
  // marked walked out, the sitting is not ended, the table is not freed.
  it('D1 a payment landing between the PIN and the release is refused "try again", and nothing is walked out or freed', async () => {
    const ports = settled({ bills: [bill({ billId: 'b1', sittingId: 's7', payable: 66000 })] });
    const door = ports.approve;
    ports.approve = async r => { const out = await door(r); ports.world.bills[0].paid = 30000; return out; };
    await expect(clearTable(ports, { ...CLEAR, pin: '4321', reason: 'guest left' })).rejects.toMatchObject({ code: 'failed-precondition', message: 'the amount on this table changed, try again' });
    expect(ports.walked.size).toBe(0);
    expect(ports.world.bills[0].status).toBe('issued');
    expect(ports.world.sittings).toHaveLength(1);
    expect(ports.world.tables[0].status).toBe('active');
  });
  // D1: a ₹660 bill with ₹300 paid walks out: only the ₹360 left is written off. Its QF-6 twin: a printed 66000 bill
  // plus a 60000 naan never billed → 66000 + 63000 = 129000 approved, two walked-out bills.
  it('D1 walk-out writes off only the unpaid part: 66000 with 30000 paid → 36000; printed bill + unbilled naan → 129000', async () => {
    const part = settled({ bills: [bill({ billId: 'b1', sittingId: 's7', payable: 66000, paid: 30000 })] });
    await clearTable(part, { ...CLEAR, pin: '4321', reason: 'guest left' });
    expect(part.walked.get('b1')!.amount).toBe(36000);
    const both = settled({ bills: [bill({ billId: 'b1', sittingId: 's7', payable: 66000 })], lines: [line({ lineId: 'naan', listPrice: 60000, sessionId: 's7' })] });
    await clearTable(both, { ...CLEAR, pin: '4321', reason: 'guest left' });
    expect(both.audits.get('cid_clear_1_releaseUnpaid')).toMatchObject({ amount: 129000 });
    expect([...both.walked.entries()].map(([id, w]) => [id, w.amount])).toEqual([['b1', 66000], ['bw_s7', 63000]]);
  });

  it('Clear asks only whether money is open; it reads no timer and no stored settled time', async () => {
    const ports = settled();
    ports.tick(600 * MIN);                       // however long it has sat changes nothing
    expect((await clearTable(ports, CLEAR)).freed).toEqual(['7']);
  });


});

describe('setMerge — the race and the release (R14, R16, OR-5a, FL-S32)', () => {
  const MERGE = { ...REQ, parentTableId: '5', cid: 'cid_merge_1' };
  const world = (over: Partial<World> = {}) => fake({
    tables: [table({ tableId: '5', status: 'active', hasSession: true }), table({ tableId: '6', status: 'vacant' })],
    ...over,
  });

  it('FL-S7 merging 5 and 6 writes the child disabled and pointing at 5, with one audit row', async () => {
    const ports = world();
    const r = await setMerge(ports, { ...MERGE, childTableIds: ['6'] });
    expect(r).toEqual({ parentTableId: '5', childTableIds: ['6'], merged: true });
    const child = ports.world.tables.find(t => t.tableId === '6')!;
    expect(child.status).toBe('disabled');
    expect(child.mergedInto).toBe('5');
    expect(ports.audits.get('cid_merge_1_merge')).toMatchObject({ action: 'table.merge', by: 'mgr_1', parentTableId: '5', childTableIds: ['6'] });
  });

  it('FL-S7 one audit row names every child, not one row per child', async () => {
    const ports = world({
      tables: [table({ tableId: '5', status: 'active' }), table({ tableId: '6' }), table({ tableId: '7' })],
    });
    await setMerge(ports, { ...MERGE, childTableIds: ['6', '7'] });
    expect(ports.audits.size).toBe(1);
    expect(ports.audits.get('cid_merge_1_merge')!.childTableIds).toEqual(['6', '7']);
  });

  it('FL-S9 merging a table with its own party is refused, and nothing is written', async () => {
    const ports = world({
      tables: [table({ tableId: '5', status: 'active' }), table({ tableId: '8', status: 'active', hasSession: true })],
    });
    await expect(setMerge(ports, { ...MERGE, childTableIds: ['8'] })).rejects.toThrow(/table 8/);
    expect(ports.audits.size).toBe(0);
    expect(ports.writes).toHaveLength(0);
  });

  it('FL-S26 merging a table that is already a child of another group is refused', async () => {
    const ports = world({
      tables: [table({ tableId: '8', status: 'active' }), table({ tableId: '6', status: 'disabled', mergedInto: '5' })],
    });
    await expect(setMerge(ports, { ...MERGE, parentTableId: '8', childTableIds: ['6'] })).rejects.toThrow();
  });

  it('FL-S32 the child is read INSIDE the transaction: a guest who signs in first makes the merge lose', async () => {
    const ports = world();
    // the guest's OTP lands between the cashier tapping and the transaction running
    ports.world.tables.find(t => t.tableId === '6')!.status = 'pending';
    await expect(setMerge(ports, { ...MERGE, childTableIds: ['6'] })).rejects.toThrow(/table 6 has a guest signing in/);
    expect(ports.world.tables.find(t => t.tableId === '6')!.mergedInto).toBeUndefined();
  });

  // FL-S37 (D2): 21:50 table 5's ₹4,800 bill A-0431 is printed, unpaid. Pushing free table 6 onto it is refused, naming
  // table 5, and nothing is written. Once that bill is edited away (cancelled) the merge goes through.
  it('D2 FL-S37 merging onto a table with a printed unpaid bill is refused "table 5 has a printed bill — edit or settle it first"', async () => {
    const ports = world({
      tables: [table({ tableId: '5', number: '5', status: 'active', hasSession: true }), table({ tableId: '6', status: 'vacant' })],
      sittings: [head({ sessionId: 's5', tableIds: ['5'] })],
      bills: [bill({ billId: 'b431', sittingId: 's5', payable: 480000 })],
    });
    await expect(setMerge(ports, { ...MERGE, childTableIds: ['6'] })).rejects.toMatchObject({ code: 'failed-precondition', message: 'table 5 has a printed bill — edit or settle it first' });
    expect(ports.writes).toHaveLength(0);
    expect(ports.audits.size).toBe(0);
    ports.world.bills[0].status = 'cancelled';
    await expect(setMerge(ports, { ...MERGE, childTableIds: ['6'] })).resolves.toMatchObject({ merged: true });
  });

  it('FL-S29 a SERVER is refused 403 on merge and on unmerge', async () => {
    const ports = world();
    ports.world.staff = { staffId: 'srv', role: 'SERVER', status: 'active' } as Staff;
    await expect(setMerge(ports, { ...MERGE, childTableIds: ['6'] })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setMerge(ports, { ...MERGE, merge: false })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('FL-S27 unmerge is refused while the group holds 412000p unbilled, before anything is released', async () => {
    const ports = world({
      tables: [table({ tableId: '5', status: 'active', isParent: true }), table({ tableId: '6', status: 'disabled', mergedInto: '5' })],
      sittings: [head({ sessionId: 's5', tableIds: ['5', '6'] })],
      lines: [line({ lineId: 'l', listPrice: 412000, sessionId: 's5' })],
    });
    await expect(setMerge(ports, { ...MERGE, merge: false })).rejects.toThrow(/bill it or move it first/);
    expect(ports.world.tables.find(t => t.tableId === '6')!.mergedInto).toBe('5');
  });

  it('FL-S27 unmerge is refused while an issued bill is unpaid', async () => {
    const ports = world({
      tables: [table({ tableId: '5', status: 'active', isParent: true }), table({ tableId: '6', status: 'disabled', mergedInto: '5' })],
      sittings: [head({ sessionId: 's5', tableIds: ['5', '6'] })],
      bills: [bill({ billId: 'b1', sittingId: 's5', payable: 412000 })],
    });
    await expect(setMerge(ports, { ...MERGE, merge: false })).rejects.toThrow(/settle it or move it first/);
  });

  it('FL-S8 OR-5a: a group that owes nothing releases ALL its children at once', async () => {
    const ports = world({
      tables: [
        table({ tableId: '5', status: 'active', isParent: true }),
        table({ tableId: '6', status: 'disabled', mergedInto: '5' }),
        table({ tableId: '7', status: 'disabled', mergedInto: '5' }),
      ],
    });
    const r = await setMerge(ports, { ...MERGE, merge: false });
    expect(r.childTableIds).toEqual(['6', '7']);
    expect(ports.world.tables.filter(t => t.status === 'vacant').map(t => t.tableId)).toEqual(['6', '7']);
    expect(ports.audits.get('cid_merge_1_unmerge')).toMatchObject({ action: 'table.unmerge', childTableIds: ['6', '7'] });
  });

  it('unmerging a table with nothing merged into it does nothing and writes no audit row', async () => {
    const ports = world();
    expect(await setMerge(ports, { ...MERGE, merge: false })).toEqual({ parentTableId: '5', childTableIds: [], merged: false });
    expect(ports.audits.size).toBe(0);
  });

  it('merging with no children named is invalid-argument, and merging a table into itself is refused', async () => {
    await expect(setMerge(world(), { ...MERGE, childTableIds: [] })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(setMerge(world(), { ...MERGE, childTableIds: ['5'] })).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('a parent that is out of service, or itself merged away, is refused', async () => {
    const retired = world({ tables: [table({ tableId: '5', status: 'disabled' }), table({ tableId: '6' })] });
    await expect(setMerge(retired, { ...MERGE, childTableIds: ['6'] })).rejects.toThrow(/out of service/);
    const child = world({ tables: [table({ tableId: '5', status: 'disabled', mergedInto: '4' }), table({ tableId: '6' })] });
    await expect(setMerge(child, { ...MERGE, childTableIds: ['6'] })).rejects.toThrow(/already merged into 4/);
  });

  it('a refusal names the table the cashier reads, not its document id, and says why', async () => {
    // "table tbl_meg_2 is not vacant" is a refusal nobody can act on: the cashier is looking at a
    // tile that says 2, and "not vacant" does not say whether to wait, bill it or pick another.
    const ports = fake({
      tables: [
        table({ tableId: 'tbl_meg_1', number: '1', status: 'active', hasSession: true }),
        table({ tableId: 'tbl_meg_2', number: '2', status: 'pending' }),
      ],
    });
    await expect(setMerge(ports, { ...REQ, parentTableId: 'tbl_meg_1', cid: 'c', childTableIds: ['tbl_meg_2'] }))
      .rejects.toThrow('table 2 has a guest signing in');
  });

  it('a table that does not exist is not-found on either side', async () => {
    await expect(setMerge(world(), { ...MERGE, parentTableId: '99', childTableIds: ['6'] })).rejects.toMatchObject({ code: 'not-found' });
    await expect(setMerge(world(), { ...MERGE, childTableIds: ['99'] })).rejects.toMatchObject({ code: 'not-found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('releaseIdle — the table nobody frees (FL-S36, R21, TD-044)', () => {
  const H = 60 * MIN;
  const walked = (over: Partial<World> = {}) => fake({
    tables: [table({ tableId: '4', status: 'active' })],
    sittings: [head({ sessionId: 's4', tableIds: ['4'], openedAt: T0 - 2 * H })],
    ...over,
  });

  it('FL-S36 scanned at 21:10, nothing since, 23:10 → freed with an audit row by "system" naming the clock', async () => {
    const ports = walked();
    const r = await releaseIdle(ports, RID);
    expect(r).toMatchObject({ candidates: 1, freed: ['4'], money: [], skipped: [] });
    expect(ports.world.tables[0].status).toBe('vacant');
    expect(ports.writes).toContain('session:s4=ended');
    expect(ports.audits.get('s4_autoVacate')).toMatchObject({ action: 'table.autoVacate', by: 'system', idleMinutes: 120, why: 'idle 120m, no open money' });
    expect(ports.logs).toContainEqual(expect.objectContaining({ evt: 'table.autoVacate', cid: 's4', idleMinutes: 120 }));
  });

  it('FL-S36 a re-open 10 minutes ago (session updatedAt) keeps it: nothing written', async () => {
    const ports = walked({ touched: { s4: [T0 - 10 * MIN] } });
    const r = await releaseIdle(ports, RID);
    expect(r.freed).toEqual([]);
    expect(ports.writes).toEqual([]);
    expect(ports.world.tables[0].status).toBe('active');
  });

  it('FL-S36 unbilled food 184000p idle 2h → left on the table, one money line, no audit row', async () => {
    const ports = walked({ lines: [line({ lineId: 'l1', listPrice: 184000, sessionId: 's4', placedAt: T0 - 2 * H })] });
    const r = await releaseIdle(ports, RID);
    expect(r).toMatchObject({ freed: [], money: ['s4'] });
    expect(ports.world.tables[0].status).toBe('active');
    expect(ports.audits.size).toBe(0);
    expect(ports.logs).toContainEqual(expect.objectContaining({ evt: 'table.idle.money', cid: 's4' }));
  });

  it('FL-S36 an unpaid bill 184000p idle 2h → money, not freed', async () => {
    const ports = walked({ bills: [bill({ billId: 'b1', sittingId: 's4', payable: 184000 })], touched: { s4: [T0 - 2 * H] } });
    expect((await releaseIdle(ports, RID)).money).toEqual(['s4']);
    expect(ports.world.tables[0].status).toBe('active');
  });

  it('FL-S36 paid in full 2h ago and nobody tapped Clear → freed (the P1 half of TD-044)', async () => {
    const ports = walked({ bills: [bill({ billId: 'b1', sittingId: 's4', payable: 184000, paid: 184000, status: 'paid' })], touched: { s4: [T0 - 2 * H] } });
    expect((await releaseIdle(ports, RID)).freed).toEqual(['4']);
  });

  it('FL-S36 a merged group 5+6 walks out → both tables vacant and the child is unmerged', async () => {
    const ports = walked({
      tables: [table({ tableId: '5', status: 'active', isParent: true }), table({ tableId: '6', status: 'disabled', mergedInto: '5' })],
      sittings: [head({ sessionId: 's5', tableIds: ['5', '6'], openedAt: T0 - 2 * H })],
    });
    expect((await releaseIdle(ports, RID)).freed).toEqual(['5', '6']);
    expect(ports.world.tables.map(t => [t.status, t.mergedInto])).toEqual([['vacant', null], ['vacant', null]]);
  });

  it('FL-S36 a sitting opened 40 minutes ago is not even a candidate', async () => {
    const ports = walked({ sittings: [head({ sessionId: 's4', tableIds: ['4'], openedAt: T0 - 40 * MIN })] });
    expect(await releaseIdle(ports, RID)).toMatchObject({ candidates: 0, freed: [] });
  });

  it('FL-S36 fail closed: the cart read throws → skipped and logged, never freed; the next sitting still runs', async () => {
    const ports = walked({
      tables: [table({ tableId: '4', status: 'active' }), table({ tableId: '9', status: 'active' })],
      sittings: [head({ sessionId: 's4', tableIds: ['4'], openedAt: T0 - 2 * H }), head({ sessionId: 's9', tableIds: ['9'], openedAt: T0 - 2 * H })],
      breakTouched: ['s4'],
    });
    const r = await releaseIdle(ports, RID);
    expect(r).toMatchObject({ skipped: ['s4'], freed: ['9'] });
    expect(ports.world.tables[0].status).toBe('active');
    expect(ports.logs).toContainEqual(expect.objectContaining({ evt: 'table.idle.skipped', cid: 's4' }));
  });

  it('FL-S36 an overlapping run finds the session already ended and writes nothing twice', async () => {
    const ports = walked();
    await releaseIdle(ports, RID);
    const writes = ports.writes.length;
    const again = await releaseIdle(ports, RID);       // the fake removes an ended sitting, like the live query does
    expect(again.freed).toEqual([]);
    expect(ports.writes.length).toBe(writes);
    expect(ports.audits.size).toBe(1);
  });

  it('FL-S36 the threshold is config: floor.idleFreeAfterMinutes 30 frees a 40-minute sitting', async () => {
    const ports = walked({ sittings: [head({ sessionId: 's4', tableIds: ['4'], openedAt: T0 - 40 * MIN })], configDoc: { floor: { idleFreeAfterMinutes: 30 } } });
    expect((await releaseIdle(ports, RID)).freed).toEqual(['4']);
  });

  it('the sweep writes one heartbeat line per restaurant with counts, so a quiet run is visible', async () => {
    const ports = walked({ sittings: [] });
    await releaseIdleEverywhere(ports);
    expect(ports.logs).toContainEqual({ evt: 'floor.idleSweep', restaurantId: RID, candidates: 0, freed: 0, money: 0, skipped: 0 });
  });

  it('a restaurant whose config cannot be read is logged and skipped; the sweep itself does not throw', async () => {
    const ports = walked({ breakConfig: true });
    await expect(releaseIdleEverywhere(ports)).resolves.toEqual([]);
    expect(ports.logs).toContainEqual(expect.objectContaining({ evt: 'floor.idleSweep.failed', restaurantId: RID }));
  });
});
