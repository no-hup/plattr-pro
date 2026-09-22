// KT · the guest's paper, pure. Bill, duplicate and credit note from BL's frozen document. Every expected row is
// hand-written at 48 columns. R10: this file sums nothing — a test plants a wrong payable and the paper prints it.

import { Bill, BilledLine, Block } from './billing';
import { billTicket, creditNoteTicket, Ticket } from './receipt';
import { printConfigFrom } from './kot';

const IST = 330;
const T = (h: number, m: number) => Date.UTC(2026, 8, 22, h - 5, m - 30);
const cfg = printConfigFrom({ print: { footer: 'Thank you · FSSAI 12345678901234', stations: { counter: { label: 'COUNTER' } } } });
const texts = (t: Ticket) => t.rows.map(r => r.text);
const W = (s: string) => s.padEnd(48);
const LR = (l: string, r: string) => l + ' '.repeat(48 - l.length - r.length) + r;
const DASH = '-'.repeat(48);

const seller = { name: 'Hotel Sample', address: '12 MG Road, the city 560001', taxId: '29ABCDE1234F1Z5', stateCode: '29', placeOfSupply: 'Karnataka (29)' };

function bl(over: Partial<BilledLine> & { name: string; qty: number; listPrice: number; blockId: string; hsn?: string }): BilledLine {
  const id = over.lineId ?? over.name.toLowerCase().replace(/\W+/g, '_');
  const { blockId, hsn, ...rest } = over;
  return {
    lineId: id, cid: 'cid_42', orderId: 'order_42', cartId: 'cart_42', cartItemId: id, tableId: 'table_7', sessionId: 's7',
    placedAt: T(20, 14), placedBy: 'staff:ramesh', menuItemId: 'mi_' + id, sent: true, v: 0, countsTowardTotal: true,
    draftId: 's7', billId: 'b_0417', categoryId: 'c', taxSource: 'category',
    components: [{ id: id + '_item', kind: 'item', name: over.name, unitListPrice: Math.round(over.listPrice / over.qty), taxBlockId: blockId, taxCode: hsn ?? '' }],
    taxBlocks: {}, billDiscount: 0, tax: {}, credited: { qty: 0 },
    ...rest,
  } as BilledLine;
}

// KT-S6 hand-computed: food 450 + 60 + 500 = 1,010.00 taxable; CGST 2.5 % = 25.25, SGST 25.25 → 1,060.50;
// liquor 2 × 260 = 520.00 with no tax part; sum 1,580.50; round-off −0.50; payable 1,580.00.
const blocks: Block[] = [
  { id: 'food', label: 'GST', mode: 'exclusive', taxable: 101000, parts: [{ label: 'CGST', rateBps: 250, amount: 2525 }, { label: 'SGST', rateBps: 250, amount: 2525 }], total: 106050 },
  { id: 'liquor', label: 'Liquor', mode: 'exclusive', taxable: 52000, parts: [], total: 52000 },
];
const bill0417: Bill = {
  lines: [
    bl({ name: 'Chicken Biryani', qty: 1, listPrice: 45000, blockId: 'food', hsn: '9963' }),
    bl({ name: 'Butter Naan', qty: 1, listPrice: 6000, blockId: 'food', hsn: '9963' }),
    bl({ name: 'Margherita', qty: 1, listPrice: 50000, blockId: 'food', hsn: '9963' }),
    bl({ name: 'Kingfisher Pint', qty: 2, listPrice: 52000, blockId: 'liquor', hsn: '2203' }),
  ],
  blocks, charges: [], discount: null, subtotal: 153000, taxTotal: 5050, roundOff: -50, payable: 158000,
  billId: 'b_0417', number: 'A/0417', series: 'A', fiscalYear: '2026-27', cid: 'cid_42', tableIds: ['table_7'], sessionId: 's7', draftId: 's7',
  issuedAt: T(22, 10), issuedBy: 'staff:priya', seller, status: 'issued', creditNotes: [],
};
const BODY_0417 = [
  W('Hotel Sample'),
  W('12 MG Road, the city 560001'),
  W('GSTIN 29ABCDE1234F1Z5'),
  W('Invoice-cum-Bill of Supply'),
  LR('Bill A/0417', '22-09-2026 22:10'),
  W('Table 7'),
  DASH,
  W('GST'),
  LR('1 x Chicken Biryani  9963', '450.00'),
  LR('1 x Butter Naan  9963', '60.00'),
  LR('1 x Margherita  9963', '500.00'),
  LR('Taxable', '1,010.00'),
  LR('CGST 2.5%', '25.25'),
  LR('SGST 2.5%', '25.25'),
  W('Liquor'),
  LR('2 x Kingfisher Pint  2203', '520.00'),
  LR('Total', '520.00'),
  DASH,
  LR('Round-off', '-0.50'),
  LR('TOTAL', 'Rs. 1,580.00'),
  DASH,
  W('Place of supply: Karnataka (29)'),
  W('Reverse charge: No'),
  W('Thank you · FSSAI 12345678901234'),
];

describe('the bill at the counter (KT-S6, KT-S14, KT-S21)', () => {
  it('KT-S6 bill A/0417 at 22:10: seller, GSTIN, the title the frozen blocks imply, block headings as BL labelled them, HSN on every line, tax parts, round-off, TOTAL, place of supply, reverse charge No', () => {
    const t = billTicket(bill0417, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    expect(t).toMatchObject({ kind: 'bill', stationId: 'counter', charsPerLine: 48, copies: 1, cut: true, drawer: false });
    expect(texts(t)).toEqual(BODY_0417);
    expect(t.rows[0]).toMatchObject({ align: 'c', big: true, bold: true });
    expect(t.rows[3]).toMatchObject({ align: 'c', bold: true });
    expect(t.rows[19]).toMatchObject({ big: true, bold: true });
  });

  it('KT-S14 the title follows the frozen blocks: food + liquor → Invoice-cum-Bill of Supply; food only → Tax Invoice; liquor only → Bill of Supply; the liquor block prints no tax line', () => {
    const t = billTicket(bill0417, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    expect(texts(t)[3]).toBe(W('Invoice-cum-Bill of Supply'));
    const liquor = texts(t).slice(texts(t).indexOf(W('Liquor')), texts(t).indexOf(W('Liquor')) + 3);
    expect(liquor).toEqual([W('Liquor'), LR('2 x Kingfisher Pint  2203', '520.00'), LR('Total', '520.00')]);
    expect(liquor.join('\n')).not.toMatch(/GST/);
    expect(texts(billTicket({ ...bill0417, blocks: [blocks[0]] }, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' }))[3]).toBe(W('Tax Invoice'));
    expect(texts(billTicket({ ...bill0417, blocks: [blocks[1]] }, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' }))[3]).toBe(W('Bill of Supply'));
  });

  it('KT-S21 payable 10245000 prints "TOTAL" right-aligned with Rs. and Indian grouping, never ₹', () => {
    const t = billTicket({ ...bill0417, payable: 10245000 }, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    expect(texts(t)).toContain(LR('TOTAL', 'Rs. 1,02,450.00'));
    expect(JSON.stringify(t)).not.toMatch(/₹/);
  });

  it('R10 the paper prints what BL froze: a planted wrong payable (1,000.00 on a 1,580 bill) prints as 1,000.00, uncorrected', () => {
    const t = billTicket({ ...bill0417, payable: 100000 }, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    expect(texts(t)).toContain(LR('TOTAL', 'Rs. 1,000.00'));
    expect(texts(t)).not.toContain(LR('TOTAL', 'Rs. 1,580.00'));
  });

  it('a line-level offer and a manual discount print under the line as negatives, with their names', () => {
    const disc = { ...bill0417, lines: [bl({ name: 'Pitcher', qty: 1, listPrice: 125000, blockId: 'food', offer: { id: 'happy_hour', name: 'Happy Hour', amount: 10000 } as never, discount: { amount: 5000, pct: 0, source: { reason: 'spilt', note: '', approverId: 'm' } } })] };
    const t = billTicket(disc, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    const i = texts(t).indexOf(LR('1 x Pitcher', '1,250.00'));
    expect(texts(t).slice(i, i + 3)).toEqual([LR('1 x Pitcher', '1,250.00'), LR('    Happy Hour', '-100.00'), LR('    Discount', '-50.00')]);
  });

  it('a bill discount (order offer or comp) prints as its own row before Taxable, using the amount BL froze', () => {
    const b = { ...bill0417, discount: { amount: 10000, pct: 0, source: { reason: 'comp', note: '', approverId: 'm' } } };
    const t = billTicket(b, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    expect(texts(t)).toContain(LR('Discount', '-100.00'));
  });

  it('a service charge prints in its block with its tax parts, exactly as BL computed them', () => {
    const b: Bill = { ...bill0417, charges: [{ type: 'service', pctBps: 1000, taxBlockId: 'food', base: 101000, amount: 10100, tax: { taxable: 10100, parts: [{ label: 'CGST', rateBps: 250, amount: 252 }, { label: 'SGST', rateBps: 250, amount: 252 }] } }] };
    const t = billTicket(b, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    expect(texts(t)).toContain(LR('Service charge 10%', '101.00'));
  });

  it('a customer with a GSTIN prints a "Bill to" block under the table line', () => {
    const b: Bill = { ...bill0417, customer: { name: 'Acme Pvt Ltd', taxId: '29AAAAA0000A1Z5' } };
    const t = billTicket(b, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    const i = texts(t).indexOf(W('Table 7'));
    expect(texts(t).slice(i + 1, i + 3)).toEqual([W('Bill to: Acme Pvt Ltd'), W('GSTIN 29AAAAA0000A1Z5')]);
  });

  it('billCopies 2 → copies 2 on the ticket; an empty footer prints no footer row', () => {
    const c = printConfigFrom({ print: { billCopies: 2, stations: { counter: { label: 'COUNTER' } } } });
    const t = billTicket(bill0417, c, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    expect(t.copies).toBe(2);
    expect(texts(t).at(-1)).toBe(W('Reverse charge: No'));
  });

  it('a 32-column counter printer: every row is 32 wide and the TOTAL still right-aligns', () => {
    const c = printConfigFrom({ print: { stations: { counter: { label: 'COUNTER', charsPerLine: 32 } } } });
    const t = billTicket(bill0417, c, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    for (const r of t.rows) expect(r.text).toHaveLength(32);
    expect(texts(t)).toContain('TOTAL' + ' '.repeat(32 - 5 - 12) + 'Rs. 1,580.00');
  });
});

describe('the second copy (KT-S16)', () => {
  it('KT-S16 a DUPLICATE prints the same bill with "DUPLICATE" across the header and the reprint time; the body is byte-identical', () => {
    const orig = billTicket(bill0417, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    const dup = billTicket(bill0417, cfg, { kind: 'duplicate', tzOffsetMinutes: IST, tableLabel: '7', at: T(22, 50) });
    expect(dup.kind).toBe('duplicate');
    expect(texts(dup)[0]).toBe(W('DUPLICATE  22:50'));
    expect(dup.rows[0]).toMatchObject({ align: 'c', big: true, bold: true });
    expect(texts(dup).slice(1)).toEqual(texts(orig));
  });
  it('the duplicate marker is config', () => {
    const c = printConfigFrom({ print: { duplicateMarker: 'COPY', stations: { counter: { label: 'COUNTER' } } } });
    expect(texts(billTicket(bill0417, c, { kind: 'duplicate', tzOffsetMinutes: IST, tableLabel: '7', at: T(22, 50) }))[0]).toBe(W('COPY  22:50'));
  });
});

describe('the credit note (KT-S15)', () => {
  // BL-S11: the coke (₹80, food) was never served on paid bill A/0417. Note CN-0007 reverses it: −80.00 taxable, −2.00 CGST, −2.00 SGST.
  const note: Bill = {
    lines: [bl({ name: 'Coke', qty: -1, listPrice: -8000, blockId: 'food', tax: { coke_item: { taxable: -8000, parts: [{ label: 'CGST', rateBps: 250, amount: -200 }, { label: 'SGST', rateBps: 250, amount: -200 }] } } })],
    blocks: [{ id: 'food', label: 'GST', mode: 'exclusive', taxable: -8000, parts: [{ label: 'CGST', rateBps: 250, amount: -200 }, { label: 'SGST', rateBps: 250, amount: -200 }], total: -8400 }],
    charges: [], discount: null, subtotal: -8000, taxTotal: -400, roundOff: 0, payable: -8400,
    billId: 'cn_0007', number: 'CN-0007', series: 'CN', fiscalYear: '2026-27', cid: 'cid_42', tableIds: ['table_7'], sessionId: 's7', draftId: 's7',
    issuedAt: T(22, 40), issuedBy: 'staff:priya', seller, status: 'paid', creditNotes: [],
    creditNoteOf: { billId: 'b_0417', number: 'A/0417', issuedAt: T(22, 10) },
  };

  it('KT-S15 CN-0007 at 22:40: "Credit Note", its number, the original number and date, the reversed line negative, negative tax', () => {
    const t = creditNoteTicket(note, cfg, { tzOffsetMinutes: IST, tableLabel: '7' });
    expect(t).toMatchObject({ kind: 'creditNote', stationId: 'counter', cut: true });
    expect(texts(t)).toEqual([
      W('Hotel Sample'),
      W('12 MG Road, the city 560001'),
      W('GSTIN 29ABCDE1234F1Z5'),
      W('Credit Note'),
      LR('CN-0007', '22-09-2026 22:40'),
      W('Against bill A/0417 of 22-09-2026'),
      W('Table 7'),
      DASH,
      W('GST'),
      LR('1 x Coke', '-80.00'),
      LR('Taxable', '-80.00'),
      LR('CGST 2.5%', '-2.00'),
      LR('SGST 2.5%', '-2.00'),
      DASH,
      LR('TOTAL', 'Rs. -84.00'),
      DASH,
      W('Place of supply: Karnataka (29)'),
      W('Reverse charge: No'),
      W('Thank you · FSSAI 12345678901234'),
    ]);
  });

  it('KT-S15 a note with two lines: both negative, taxable and parts summed as BL froze them, no double minus on the qty', () => {
    const two: Bill = { ...note,
      lines: [note.lines[0], bl({ name: 'Naan', qty: -2, listPrice: -12000, blockId: 'food' })],
      blocks: [{ id: 'food', label: 'GST', mode: 'exclusive', taxable: -20000, parts: [{ label: 'CGST', rateBps: 250, amount: -500 }, { label: 'SGST', rateBps: 250, amount: -500 }], total: -21000 }],
      subtotal: -20000, taxTotal: -1000, payable: -21000 };
    const t = texts(creditNoteTicket(two, cfg, { tzOffsetMinutes: IST, tableLabel: '7' }));
    expect(t.slice(t.indexOf(W('GST')), t.indexOf(W('GST')) + 6)).toEqual([W('GST'), LR('1 x Coke', '-80.00'), LR('2 x Naan', '-120.00'), LR('Taxable', '-200.00'), LR('CGST 2.5%', '-5.00'), LR('SGST 2.5%', '-5.00')]);
    expect(t).toContain(LR('TOTAL', 'Rs. -210.00'));
  });

  it('a bill that is not a credit note is refused by creditNoteTicket: the caller chose the wrong renderer', () => {
    expect(() => creditNoteTicket(bill0417, cfg, { tzOffsetMinutes: IST, tableLabel: '7' })).toThrow(/credit note/);
  });
});

describe('what the guest never sees', () => {
  it('no line id, session id, staff tag or cid leaks onto paper', () => {
    const t = billTicket(bill0417, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' });
    expect(texts(t).join('\n')).not.toMatch(/cid_42|s7\b|staff:|b_0417|table_7/);
  });
  it('a zero round-off prints no round-off row; a positive one prints "+0.40"', () => {
    expect(texts(billTicket({ ...bill0417, roundOff: 0 }, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' })).join('\n')).not.toMatch(/Round-off/);
    expect(texts(billTicket({ ...bill0417, roundOff: 40 }, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' }))).toContain(LR('Round-off', '+0.40'));
  });
  it('a voided line on the bill (countsTowardTotal false) is not printed', () => {
    const b = { ...bill0417, lines: [...bill0417.lines, { ...bl({ name: 'Gulab Jamun', qty: 1, listPrice: 30000, blockId: 'food' }), countsTowardTotal: false } as BilledLine] };
    expect(texts(billTicket(b, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' })).join('\n')).not.toMatch(/Jamun/);
  });
  it('R10 the ticket never recomputes: Taxable prints block.taxable even when the lines do not add up to it', () => {
    const b = { ...bill0417, blocks: [{ ...blocks[0], taxable: 99900 }, blocks[1]] };
    expect(texts(billTicket(b, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' }))).toContain(LR('Taxable', '999.00'));
  });
  it('a block with lines but zero taxable prints 0.00 as frozen, never rebuilt from the lines; a rate of 125 bps prints 1.25%, 200 bps prints 2%', () => {
    const b: Bill = { ...bill0417, lines: [bl({ name: 'Dal Fry', qty: 1, listPrice: 8000, blockId: 'food' })], blocks: [{ id: 'food', label: 'GST', mode: 'exclusive', taxable: 0, parts: [{ label: 'CGST', rateBps: 125, amount: 0 }, { label: 'SGST', rateBps: 200, amount: 0 }], total: 0 }] };
    const t = texts(billTicket(b, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' }));
    expect(t.slice(t.indexOf(W('GST')), t.indexOf(W('GST')) + 5)).toEqual([W('GST'), LR('1 x Dal Fry', '80.00'), LR('Taxable', '0.00'), LR('CGST 1.25%', '0.00'), LR('SGST 2%', '0.00')]);
  });
  it('a round-off of -0 prints no row; billCopies 0 falls back to 1', () => {
    expect(texts(billTicket({ ...bill0417, roundOff: -0 }, cfg, { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' })).join('\n')).not.toMatch(/Round-off/);
    expect(billTicket(bill0417, printConfigFrom({ print: { billCopies: 0 } }), { kind: 'bill', tzOffsetMinutes: IST, tableLabel: '7' }).copies).toBe(1);
  });
});
