// KT · the kitchen ticket, pure. One it() per scenario in SPEC_KT_print_path.md v4, plus the production
// cases the sheet forgot. Every expected row is a hand-written string, already padded to the station's
// width, so a wrong implementation cannot quietly redefine what the test was for.
//
// Skeleton written blind first (KT-1), then one Grok pass on it; extras and rejections are Decisions lines.
// Money is minor units in; the KOT shows none of it (R11). Hours are IST (+330) unless a test says otherwise.

import { Line } from './line';
import {
  route, unroutedCategories, kotTickets, formatMoney, formatTime, formatDate, printConfigFrom, PRINT_DEFAULTS, wrap,
  Round, PrintConfig, Ticket,
} from './kot';

const IST = 330;
const T = (h: number, m: number) => Date.UTC(2026, 8, 22, h - 5, m - 30);   // 2026-09-22 hh:mm IST as epoch ms

const cfg: PrintConfig = printConfigFrom({
  print: {
    route: { cat_pizza: 'kitchen', cat_tandoor: 'kitchen', cat_beer: 'bar' },
    routeByTaxBlock: { liquor: 'bar' },
    stations: { kitchen: { label: 'KITCHEN' }, bar: { label: 'BAR', charsPerLine: 32 }, counter: { label: 'COUNTER' } },
  },
});

function line(over: Partial<Line> & { name: string; qty: number }): Line {
  const id = over.lineId ?? over.name.toLowerCase().replace(/\W+/g, '_');
  return {
    lineId: id, cid: 'cid_42', orderId: 'order_42', cartId: 'cart_42', cartItemId: id, tableId: 'table_7', sessionId: 's7',
    placedAt: T(20, 14), placedBy: 'staff:ramesh', menuItemId: 'mi_' + id, listPrice: 0, sent: true, v: 0,
    countsTowardTotal: true, draftId: 's7', billId: null, categoryId: 'cat_tandoor', taxSource: 'category',
    components: [{ id: id + '_item', kind: 'item', name: over.name, unitListPrice: 0, taxBlockId: 'food', taxCode: '9963' }],
    taxBlocks: {},
    ...over,
  } as Line;
}
const biryani = line({ name: 'Chicken Biryani', qty: 1, categoryId: 'cat_tandoor' });
const naan = line({ name: 'Butter Naan', qty: 1, categoryId: 'cat_tandoor' });
const pints = (qty: number) => line({ name: 'Kingfisher Pint', qty, categoryId: 'cat_beer', components: [{ id: 'kf_item', kind: 'item', name: 'Kingfisher Pint', unitListPrice: 26000, taxBlockId: 'liquor', taxCode: '2203' }] });
const pizza = line({ name: 'Margherita', qty: 1, categoryId: 'cat_pizza' });

const round = (over: Partial<Round> = {}): Round => ({
  orderNumber: '42', cartIndex: 1, tableLabel: '7', placedBy: 'Ramesh', placedAt: T(20, 14), lines: [biryani, naan], ...over,
});
const texts = (t: Ticket) => t.rows.map(r => r.text);
const W48 = (s: string) => s.padEnd(48);
const W32 = (s: string) => s.padEnd(32);
const LR = (l: string, r: string, w = 48) => l + ' '.repeat(w - l.length - r.length) + r;

// ─────────────────────────────────────────────────────────────────────────────

describe('route — the station is read off the frozen line (R9, KT-S3, KT-S19)', () => {
  it('KT-S3 a pizza (cat_pizza) goes to kitchen, a pint (cat_beer) goes to bar', () => {
    expect(route(pizza, cfg)).toBe('kitchen');
    expect(route(pints(2), cfg)).toBe('bar');
  });
  it('KT-S3 an unmapped category falls back to the tax block: liquor → bar', () => {
    expect(route(line({ name: 'Old Monk', qty: 1, categoryId: 'cat_rum', components: [{ id: 'om', kind: 'item', name: 'Old Monk', unitListPrice: 0, taxBlockId: 'liquor', taxCode: '2208' }] }), cfg)).toBe('bar');
  });
  it('KT-S19 "Mocktails" mapped nowhere and taxed as food goes to the default station, never nowhere', () => {
    expect(route(line({ name: 'Virgin Mojito', qty: 1, categoryId: 'cat_mocktails' }), cfg)).toBe('kitchen');
  });
  it('a line with NO categoryId at all still routes: by tax block (liquor → bar), else the default — R1, never nowhere', () => {
    expect(route(line({ name: 'Ghost', qty: 1, categoryId: undefined }), cfg)).toBe('kitchen');
    expect(route(line({ name: 'Ghost', qty: 1, categoryId: null, components: [{ id: 'g', kind: 'item', name: 'Ghost', unitListPrice: 0, taxBlockId: 'liquor', taxCode: '' }] }), cfg)).toBe('bar');
  });
  it('a mapped station that is not in print.stations is a config bug and throws, never a silent default', () => {
    const bad = printConfigFrom({ print: { route: { cat_pizza: 'oven' }, stations: { kitchen: {} } } });
    expect(() => route(pizza, bad)).toThrow(/oven/);
  });
});

describe('unroutedCategories — KT-S19, what the placing hook logs as line.unrouted', () => {
  const mojito = line({ name: 'Virgin Mojito', qty: 1, categoryId: 'cat_mocktails' });
  const monk = line({ name: 'Old Monk', qty: 1, categoryId: 'cat_rum', components: [{ id: 'om', kind: 'item', name: 'Old Monk', unitListPrice: 0, taxBlockId: 'liquor', taxCode: '2208' }] });
  it('KT-S19 a Mocktails lemonade, mapped nowhere and taxed as food, is named once however many lines carry it', () => {
    expect(unroutedCategories([pizza, mojito, { ...mojito, lineId: 'm2' }], cfg)).toEqual(['cat_mocktails']);
  });
  it('a mapped category, and an unmapped one the tax block routes (rum → bar), are not unrouted', () => {
    expect(unroutedCategories([pizza, pints(2), monk], cfg)).toEqual([]);
  });
  it('with print.route empty, food at the default station is the design, not a gap — nothing is named', () => {
    expect(unroutedCategories([mojito], printConfigFrom({ print: { stations: { kitchen: {} } } }))).toEqual([]);
  });
  it('a line that does not count (a voided one) and a line with no categoryId (line.noCategory\'s case) are not named here', () => {
    expect(unroutedCategories([{ ...mojito, countsTowardTotal: false }, line({ name: 'Ghost', qty: 1, categoryId: null })], cfg)).toEqual([]);
  });
});

describe('the ticket of a round (KT-S1, S2, S3)', () => {
  it('KT-S1 20:14 table 7, biryani + naan → one KITCHEN ticket, no prices, the captain named, cut', () => {
    const [t] = kotTickets(round(), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST });
    expect(t).toMatchObject({ kind: 'kot', stationId: 'kitchen', charsPerLine: 48, copies: 1, cut: true, drawer: false });
    expect(texts(t)).toEqual([
      W48('TABLE 7'),
      LR('#42-1  KITCHEN', '20:14'),
      W48(''),
      W48('1 x Chicken Biryani'),
      W48('1 x Butter Naan'),
      W48(''),
      W48('by Ramesh'),
    ]);
    expect(t.rows[0]).toMatchObject({ align: 'c', big: true, bold: true });
    expect(t.rows[3]).toMatchObject({ bold: true });
    expect(JSON.stringify(t)).not.toMatch(/Rs\.|₹|\d+\.\d\d/);   // R11: no money, in any spelling
  });

  it('KT-S2 20:41 the same table adds two pints → one BAR ticket #42-2 with only the pints, at 32 columns', () => {
    const tickets = kotTickets(round({ cartIndex: 2, lines: [pints(2)], placedAt: T(20, 41) }), cfg, { kind: 'kot', at: T(20, 41), tzOffsetMinutes: IST });
    expect(tickets).toHaveLength(1);
    expect(tickets[0].stationId).toBe('bar');
    expect(texts(tickets[0])).toEqual([
      W32('TABLE 7'),
      LR('#42-2  BAR', '20:41', 32),
      W32(''),
      W32('2 x Kingfisher Pint'),
      W32(''),
      W32('by Ramesh'),
    ]);
  });

  it('KT-S3 one Send with a pizza and two pints → two tickets, 1/2 KITCHEN and 2/2 BAR, neither listing the other', () => {
    const tickets = kotTickets(round({ cartIndex: 3, lines: [pizza, pints(2)], placedAt: T(20, 52) }), cfg, { kind: 'kot', at: T(20, 52), tzOffsetMinutes: IST });
    expect(tickets.map(t => t.stationId)).toEqual(['kitchen', 'bar']);
    expect(texts(tickets[0])[1]).toBe(LR('#42-3  KITCHEN  1/2', '20:52'));
    expect(texts(tickets[1])[1]).toBe(LR('#42-3  BAR  2/2', '20:52', 32));
    expect(texts(tickets[0])).toContain(W48('1 x Margherita'));
    expect(texts(tickets[0]).join('\n')).not.toMatch(/Kingfisher/);
    expect(texts(tickets[1]).join('\n')).not.toMatch(/Margherita/);
  });

  it('stations come out in print.stations order, so 1/2 is always the kitchen when both fire', () => {
    const tickets = kotTickets(round({ lines: [pints(1), pizza] }), cfg, { kind: 'kot', at: T(20, 52), tzOffsetMinutes: IST });
    expect(tickets.map(t => t.stationId)).toEqual(['kitchen', 'bar']);
  });

  it('a station with enabled:false gets no ticket (R8, screen-only station); the other prints alone, with no fraction', () => {
    const c = printConfigFrom({ print: { route: { cat_pizza: 'kitchen', cat_beer: 'bar' }, stations: { kitchen: { label: 'KITCHEN', enabled: false }, bar: { label: 'BAR' } } } });
    const tickets = kotTickets(round({ lines: [pizza, pints(1)] }), c, { kind: 'kot', at: T(20, 52), tzOffsetMinutes: IST });
    expect(tickets.map(t => t.stationId)).toEqual(['bar']);
    expect(texts(tickets[0])[1]).toBe(LR('#42-1  BAR', '20:14'));   // the header carries the placement time
  });

  it('copies comes from the station: kitchen copies 2 → ticket.copies 2, the encoder repeats it', () => {
    const c = printConfigFrom({ print: { stations: { kitchen: { label: 'KITCHEN', copies: 2 } } } });
    expect(kotTickets(round(), c, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST })[0].copies).toBe(2);
  });

  it('a voided line is not on a fresh KOT; a round with nothing left yields no ticket at all', () => {
    const voided = { ...biryani, countsTowardTotal: false, void: { reason: 'x', note: '', approverId: 'm' } } as Line;
    expect(texts(kotTickets(round({ lines: [voided, naan] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST })[0]).join('\n')).not.toMatch(/Biryani/);
    expect(kotTickets(round({ lines: [voided] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST })).toEqual([]);
  });

  it('the time on the ticket is the restaurant\'s clock: 20:14 IST is 14:44 UTC and prints as 20:14', () => {
    expect(formatTime(T(20, 14), IST)).toBe('20:14');
    expect(formatTime(T(20, 14), 0)).toBe('14:44');
    expect(formatTime(T(0, 5), IST)).toBe('00:05');
  });
});

describe('reprint and cancel are new tickets with honest headers (R6, KT-S5, S11, S12)', () => {
  it('KT-S5 Reprint at 21:20 → the same round with "REPRINT 2  21:20" under the header, original 20:14 kept', () => {
    const [t] = kotTickets(round(), cfg, { kind: 'reprint', n: 2, at: T(21, 20), tzOffsetMinutes: IST });
    expect(t.kind).toBe('reprint');
    expect(texts(t).slice(0, 3)).toEqual([
      W48('TABLE 7'),
      LR('#42-1  KITCHEN', '20:14'),
      W48('REPRINT 2  21:20'),
    ]);
    expect(t.rows[2]).toMatchObject({ align: 'c', bold: true });
    expect(texts(t)).toContain(W48('1 x Chicken Biryani'));
  });

  it('KT-S11 the manager cancels the round at 21:40 → "*** CANCELLED ***", the round, the reason, the name, same station', () => {
    const [t] = kotTickets(round(), cfg, { kind: 'cancel', at: T(21, 40), tzOffsetMinutes: IST, reason: 'guest left', by: 'Priya' });
    expect(t).toMatchObject({ kind: 'cancel', stationId: 'kitchen' });
    expect(texts(t)).toEqual([
      W48('*** CANCELLED ***'),
      W48('TABLE 7'),
      LR('#42-1  KITCHEN', '21:40'),
      W48(''),
      W48('1 x Chicken Biryani'),
      W48('1 x Butter Naan'),
      W48(''),
      W48('guest left'),
      W48('by Priya'),
    ]);
    expect(t.rows[0]).toMatchObject({ align: 'c', big: true, bold: true });
  });

  it('KT-S11 a cancel goes only to the stations the original went to: pints-only round → BAR only', () => {
    const tickets = kotTickets(round({ cartIndex: 2, lines: [pints(2)] }), cfg, { kind: 'cancel', at: T(21, 40), tzOffsetMinutes: IST, reason: 'guest left', by: 'Priya' });
    expect(tickets.map(t => t.stationId)).toEqual(['bar']);
  });

  it('KT-S12 two biryanis cut to one → the cancel ticket says "1 x Chicken Biryani", not two, and nothing else is on it', () => {
    // The caller hands the domain the voided quantity (today ST voids whole lines; the domain does not care).
    const [t] = kotTickets(round({ lines: [{ ...biryani, qty: 1 } as Line] }), cfg, { kind: 'cancel', at: T(21, 44), tzOffsetMinutes: IST, reason: 'cut to one', by: 'Priya' });
    expect(texts(t).filter(r => /x /.test(r))).toEqual([W48('1 x Chicken Biryani')]);
  });

  it('KT-S11 a cancel ticket back-links the original: the ticket number is the same #42-1 (donor #2)', () => {
    const [t] = kotTickets(round(), cfg, { kind: 'cancel', at: T(21, 40), tzOffsetMinutes: IST, reason: 'guest left', by: 'Priya' });
    expect(texts(t)[2]).toMatch(/^#42-1 /);
  });

  it('the markers are config: cancelMarker "ANNULE" prints "*** ANNULE ***"', () => {
    const c = printConfigFrom({ print: { cancelMarker: 'ANNULE', stations: { kitchen: { label: 'KITCHEN' } } } });
    const [t] = kotTickets(round(), c, { kind: 'cancel', at: T(21, 40), tzOffsetMinutes: IST, reason: 'x', by: 'P' });
    expect(texts(t)[0]).toBe(W48('*** ANNULE ***'));
  });
});

describe('variants, add-ons, notes and wrapping (KT-S13, KT-S18)', () => {
  const tikka = line({
    name: 'Paneer Tikka', qty: 1, categoryId: 'cat_tandoor',
    components: [
      { id: 'pt_item', kind: 'item', name: 'Paneer Tikka', unitListPrice: 32000, taxBlockId: 'food', taxCode: '9963' },
      { id: 'pt_v', kind: 'variant', name: 'Full', unitListPrice: 8000, taxBlockId: 'food', taxCode: '9963' },
      { id: 'pt_a', kind: 'addon', name: 'Extra Cheese', unitListPrice: 4000, taxBlockId: 'food', taxCode: '9963' },
    ],
  });

  it('KT-S13 "Paneer Tikka (Full) + Extra Cheese, no onion" at 48 → item, (Full), + Extra Cheese, ! no onion in double height', () => {
    const [t] = kotTickets(round({ lines: [{ ...tikka, note: 'no onion' } as Line & { note: string }] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST });
    expect(texts(t).slice(3, 7)).toEqual([
      W48('1 x Paneer Tikka'),
      W48('    (Full)'),
      W48('    + Extra Cheese'),
      W48('    ! no onion'),
    ]);
    expect(t.rows[6]).toMatchObject({ big: true });
    expect(t.rows[4].big).toBeFalsy();
  });

  it('KT-S13 a 41-character dish name at 48 wraps with a four-space hang, never truncates', () => {
    const long = line({ name: 'Hyderabadi Dum Gosht Biryani with Raita Extra', qty: 2, categoryId: 'cat_tandoor' });   // 45 chars
    const [t] = kotTickets(round({ lines: [long] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST });
    expect(texts(t).slice(3, 5)).toEqual([
      W48('2 x Hyderabadi Dum Gosht Biryani with Raita'),
      W48('    Extra'),
    ]);
  });

  it('KT-S18 the same dish at 32 columns (bar) wraps at a word boundary, twice if it must', () => {
    const long = line({ name: 'Hyderabadi Dum Gosht Biryani with Raita Extra', qty: 2, categoryId: 'cat_beer' });
    const [t] = kotTickets(round({ lines: [long] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST });
    expect(t.charsPerLine).toBe(32);
    expect(texts(t).slice(3, 6)).toEqual([
      W32('2 x Hyderabadi Dum Gosht Biryani'),
      W32('    with Raita Extra'),
      W32(''),
    ]);
    for (const r of texts(t)) expect(r).toHaveLength(32);
  });

  it('a single word longer than the line is broken hard at the width rather than dropped', () => {
    expect(wrap('Supercalifragilisticexpialidociousness-extra', 32, 4)).toEqual([
      'Supercalifragilisticexpialidocio',
      '    usness-extra',
    ]);
  });

  it('every row of every ticket is exactly charsPerLine wide (the encoder does no arithmetic)', () => {
    const tickets = kotTickets(round({ lines: [tikka, pints(2), pizza] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST });
    for (const t of tickets) for (const r of t.rows) expect(r.text).toHaveLength(t.charsPerLine);
  });

  it('a long note wraps under its own "!" — every continuation row keeps the four-space indent', () => {
    const [t] = kotTickets(round({ lines: [{ ...tikka, note: 'no onion no garlic extra spicy and please pack the raita separately' } as Line & { note: string }] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST });
    expect(texts(t).slice(6, 8)).toEqual([
      W48('    ! no onion no garlic extra spicy and please'),
      W48('    pack the raita separately'),
    ]);
  });

  it('every station disabled → no ticket at all, and no throw', () => {
    const c = printConfigFrom({ print: { stations: { kitchen: { label: 'KITCHEN', enabled: false } } } });
    expect(kotTickets(round(), c, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST })).toEqual([]);
  });

  it('qty 10 and 100 print as written; at 32 the break moves with the longer prefix', () => {
    const [t] = kotTickets(round({ lines: [{ ...biryani, qty: 100 } as Line] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST });
    expect(texts(t)[3]).toBe(W48('100 x Chicken Biryani'));
    const long = line({ name: 'Hyderabadi Dum Gosht Biryani with Raita Extra', qty: 100, categoryId: 'cat_beer' });
    expect(texts(kotTickets(round({ lines: [long] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST })[0]).slice(3, 5)).toEqual([W32('100 x Hyderabadi Dum Gosht'), W32('    Biryani with Raita Extra')]);
  });

  it('an emoji is two code units and is never split by the hard cut; an empty name still prints "1 x "', () => {
    expect(wrap('A'.repeat(30) + '🍕', 32, 4)).toEqual(['A'.repeat(30) + '🍕']);
    expect(wrap('A'.repeat(31) + '🍕', 32, 4)).toEqual(['A'.repeat(31), '    🍕']);
    expect(texts(kotTickets(round({ lines: [line({ name: '', qty: 1 })] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST })[0])[3]).toBe(W48('1 x '));
  });

  it('a tab in a note is one space; a bidi override is dropped; an emoji stays', () => {
    const at = { kind: 'kot' as const, at: T(20, 14), tzOffsetMinutes: IST };
    expect(texts(kotTickets(round({ lines: [{ ...biryani, note: 'no\tonion' } as Line & { note: string }] }), cfg, at)[0])).toContain(W48('    ! no onion'));
    expect(texts(kotTickets(round({ lines: [{ ...biryani, note: 'no\u202Eonion' } as Line & { note: string }] }), cfg, at)[0])).toContain(W48('    ! noonion'));
    expect(texts(kotTickets(round({ lines: [{ ...biryani, note: 'extra 🧅' } as Line & { note: string }] }), cfg, at)[0])).toContain(W48('    ! extra 🧅'));
  });

  it('a note with a newline or control character prints as spaces: no byte on a KOT comes from a guest', () => {
    const [t] = kotTickets(round({ lines: [{ ...tikka, note: 'no\nonion\x1bE' } as Line & { note: string }] }), cfg, { kind: 'kot', at: T(20, 14), tzOffsetMinutes: IST });
    expect(texts(t)).toContain(W48('    ! no onion E'));
  });
});

describe('money and time formatting shared with the bill (KT-S21)', () => {
  it('KT-S21 10245000 minor → "Rs. 1,02,450.00": Indian grouping, two decimals, the config currency text', () => {
    expect(formatMoney(10245000, 'Rs.')).toBe('Rs. 1,02,450.00');
  });
  it('small and edge amounts: 0 → "Rs. 0.00", 5 → "Rs. 0.05", 100000 → "Rs. 1,000.00", 99999 → "Rs. 999.99"', () => {
    expect(formatMoney(0, 'Rs.')).toBe('Rs. 0.00');
    expect(formatMoney(5, 'Rs.')).toBe('Rs. 0.05');
    expect(formatMoney(100000, 'Rs.')).toBe('Rs. 1,000.00');
    expect(formatMoney(99999, 'Rs.')).toBe('Rs. 999.99');
  });
  it('a negative amount (credit note line) prints with a leading minus: -45000 → "Rs. -450.00"', () => {
    expect(formatMoney(-45000, 'Rs.')).toBe('Rs. -450.00');
  });
  it('a crore groups as 1,00,00,000.00', () => {
    expect(formatMoney(1000000000, 'Rs.')).toBe('Rs. 1,00,00,000.00');
  });
  it('paise are never rounded to rupees: 1 → 0.01, 49 → 0.49, 50 → 0.50, -1 → -0.01; -0 is not a minus; minus and grouping together; the lakh boundary; a big safe integer', () => {
    expect([1, 49, 50, -1].map(m => formatMoney(m, 'Rs.'))).toEqual(['Rs. 0.01', 'Rs. 0.49', 'Rs. 0.50', 'Rs. -0.01']);
    expect(formatMoney(-0, 'Rs.')).toBe('Rs. 0.00');
    expect(formatMoney(-10245000, 'Rs.')).toBe('Rs. -1,02,450.00');
    expect(formatMoney(10000000, 'Rs.')).toBe('Rs. 1,00,000.00');
    expect(formatMoney(999999999999, 'Rs.')).toBe('Rs. 9,99,99,99,999.99');
  });
  it('midnight, month end and year end on a fixed +330 offset, which has no DST', () => {
    expect([formatTime(Date.UTC(2026, 8, 21, 18, 30), IST), formatDate(Date.UTC(2026, 8, 21, 18, 30), IST)]).toEqual(['00:00', '22-09-2026']);
    expect([formatTime(Date.UTC(2026, 8, 21, 18, 29), IST), formatDate(Date.UTC(2026, 8, 21, 18, 29), IST)]).toEqual(['23:59', '21-09-2026']);
    expect([formatTime(Date.UTC(2026, 8, 30, 19, 0), IST), formatDate(Date.UTC(2026, 8, 30, 19, 0), IST)]).toEqual(['00:30', '01-10-2026']);
    expect(formatDate(Date.UTC(2026, 11, 31, 18, 30), IST)).toBe('01-01-2027');
    expect([formatTime(Date.UTC(2026, 0, 15, 14, 44), IST), formatTime(Date.UTC(2026, 6, 15, 14, 44), IST)]).toEqual(['20:14', '20:14']);
  });
  it('the date on paper is dd-mm-yyyy in the restaurant\'s zone: 2026-09-22 22:10 IST', () => {
    expect(formatDate(T(22, 10), IST)).toBe('22-09-2026');
    expect(formatDate(T(1, 30), IST)).toBe('22-09-2026');    // 20:00 UTC the day before
  });
});

describe('print config — every number is a key with a default (KT-S18, the contract)', () => {
  it('a fresh restaurant gets the defaults: kitchen/bar/counter at 48, agents ["kitchen"], stale 30, statusQuery off', () => {
    const c = printConfigFrom(undefined);
    expect(c).toMatchObject({ defaultStation: 'kitchen', counterStation: 'counter', agents: ['kitchen'], staleAfterMinutes: 30, unclaimedAfterSeconds: 90, drawerStaleSeconds: 60, writeTimeoutMs: 10000, drawerPulseMs: 50, currencyText: 'Rs.' });
    expect(c.stations.kitchen).toEqual({ label: 'KITCHEN', charsPerLine: 48, enabled: true, copies: 1, statusQuery: false, address: '' });
    expect(Object.keys(c.stations)).toEqual(['kitchen', 'bar', 'counter']);
    expect(c).toEqual(PRINT_DEFAULTS);
  });
  it('a station given as {} inherits every default; charsPerLine 32 overrides one', () => {
    const c = printConfigFrom({ print: { stations: { bar: { charsPerLine: 32 } } } });
    expect(c.stations.bar).toEqual({ label: 'BAR', charsPerLine: 32, enabled: true, copies: 1, statusQuery: false, address: '' });
  });
  it('bad values fall back, never crash: charsPerLine "wide", copies 0, staleAfterMinutes -1', () => {
    const c = printConfigFrom({ print: { stations: { kitchen: { charsPerLine: 'wide', copies: 0 } }, staleAfterMinutes: -1 } });
    expect(c.stations.kitchen.charsPerLine).toBe(48);
    expect(c.stations.kitchen.copies).toBe(1);
    expect(c.staleAfterMinutes).toBe(30);
  });
  it('staleAfterMinutes 0 is a real value (print everything, always), not a fallback', () => {
    expect(printConfigFrom({ print: { staleAfterMinutes: 0 } }).staleAfterMinutes).toBe(0);
  });
});
