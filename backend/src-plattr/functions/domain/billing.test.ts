// BL · Billing & tax — domain tests. Every BL-S id is a test name. Expected values are the proposed golden rows
// (moonshot/reviews/2026-09-15-BL-golden-proposal.json), minor units. Food: exclusive 250 + 250 ("CGST"/"SGST" are test
// labels, the domain never reads them). Liquor: inclusive, parts [].
import { BILLING_DEFAULTS, Bill, Meta, apportion, cancel, creditNote, issue, preview, taxOn } from './billing';
import { Line, TaxBlock } from './line';

const FOOD: TaxBlock = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
const LIQ: TaxBlock = { label: 'Liquor', mode: 'inclusive', collect: true, parts: [] };
const VAT: TaxBlock = { label: 'Liquor', mode: 'inclusive', collect: true, parts: [{ label: 'VAT', rateBps: 550 }] };
const cfg = BILLING_DEFAULTS;

type Opt = Omit<Partial<Line>, 'offer' | 'discount'> & { block?: TaxBlock | null; blockId?: string; offer?: number; discount?: number };
function line(id: string, list: number, o: Opt = {}): Line {
  const blockId = o.blockId ?? (o.block === LIQ || o.block === VAT ? 'liquor' : 'food');
  const block = o.block === undefined ? FOOD : o.block;
  const qty = o.qty ?? 1;
  return {
    lineId: id, cid: 'c1', orderId: 'o1', cartId: 'k1', cartItemId: id, tableId: 't7', sessionId: 's1', placedAt: 0, placedBy: 'g',
    menuItemId: 'mi_' + id, name: id, qty, listPrice: list, sent: true, v: 0, countsTowardTotal: true, draftId: 'd1', billId: null,
    components: o.components ?? [{ id: id + '_base', kind: 'item', name: id, unitListPrice: list / qty, taxBlockId: block ? blockId : null, taxCode: '9963' }],
    taxBlocks: block ? { [blockId]: block } : {},
    offer: o.offer ? { id: 'off', amount: o.offer } : null,
    discount: o.discount ? { amount: o.discount, pct: 0, source: { reason: 'r', note: '', approverId: 'a' } } : undefined,
    ...(o.countsTowardTotal === false ? { countsTowardTotal: false } : {}),
  };
}
const bd = (amount: number) => ({ amount, pct: 0, source: { reason: 'regular', note: '', approverId: 'm1' } });
const ok = (r: ReturnType<typeof preview>) => { if (!r.ok) throw new Error(r.message); return r.value; };
const amounts = (v: ReturnType<typeof ok>, id: string) => { const b = v.blocks.find(x => x.id === id)!; return { taxable: b.taxable, parts: b.parts.map(p => p.amount), total: b.total }; };

describe('domain/billing preview(lines, billDiscount, charges, cfg)', () => {
  it('BL-S1 pizza 50000 + coke 8000 → food taxable 58000, parts [1450,1450], payable 60900, roundOff 0', () => {
    const v = ok(preview([line('pizza', 50000), line('coke', 8000)], null, [], cfg));
    expect(amounts(v, 'food')).toEqual({ taxable: 58000, parts: [1450, 1450], total: 60900 });
    expect(v).toMatchObject({ subtotal: 58000, taxTotal: 2900, roundOff: 0, payable: 60900 });
    expect(v.blocks[0].parts.map(p => p.label)).toEqual(['CGST', 'SGST']);
  });
  it('BL-S2 pizza 50000 offer 10000 → taxable 40000, parts [1000,1000], payable 42000 (never 52500 − 10000)', () => {
    const v = ok(preview([line('pizza', 50000, { offer: 10000 })], null, [], cfg));
    expect(amounts(v, 'food')).toEqual({ taxable: 40000, parts: [1000, 1000], total: 42000 });
    expect(v.payable).toBe(42000);
  });
  it('BL-S3 bill discount 20000 on 50000+70000 food and 80000 liquor → shares 5000/7000/8000; food 108000 [2700,2700]; liquor 72000; payable 185400', () => {
    const v = ok(preview([line('pizza', 50000), line('biryani', 70000), line('whisky', 80000, { block: LIQ })], bd(20000), [], cfg));
    expect(v.lines.map(l => [l.lineId, l.billDiscount])).toEqual([['biryani', 7000], ['pizza', 5000], ['whisky', 8000]]);   // sorted by lineId
    expect(amounts(v, 'food')).toEqual({ taxable: 108000, parts: [2700, 2700], total: 113400 });
    expect(amounts(v, 'liquor')).toEqual({ taxable: 72000, parts: [], total: 72000 });
    expect(v).toMatchObject({ subtotal: 180000, taxTotal: 5400, roundOff: 0, payable: 185400 });
  });
  it('BL-S3x 10000 off three lines of 10000 → shares 3333/3333/3334; per-line tax 167×3 = 501 per part (block is a sum, R5); payable 21000 roundOff −2', () => {
    const v = ok(preview([line('a', 10000), line('b', 10000), line('c', 10000)], bd(10000), [], cfg));
    expect(v.lines.map(l => l.billDiscount)).toEqual([3333, 3333, 3334]);
    expect(v.lines.map(l => l.tax['a_base']?.parts[0].amount ?? l.tax['b_base']?.parts[0].amount ?? l.tax['c_base'].parts[0].amount)).toEqual([167, 167, 167]);
    expect(amounts(v, 'food')).toEqual({ taxable: 20000, parts: [501, 501], total: 21002 });
    expect(v).toMatchObject({ roundOff: -2, payable: 21000 });
  });
  it('BL-S4a beer 49900 liquor + pizza 50000 → liquor 49900 no part; food 50000 [1250,1250]; payable 102400', () => {
    const v = ok(preview([line('beer', 49900, { block: LIQ }), line('pizza', 50000)], null, [], cfg));
    expect(amounts(v, 'liquor')).toEqual({ taxable: 49900, parts: [], total: 49900 });
    expect(amounts(v, 'food')).toEqual({ taxable: 50000, parts: [1250, 1250], total: 52500 });
    expect(v).toMatchObject({ subtotal: 99900, taxTotal: 2500, payable: 102400 });
  });
  it('BL-S4b liquor parts [VAT 550] inclusive → taxable 47298, VAT 2602, block total 49900; payable still 102400', () => {
    const v = ok(preview([line('beer', 49900, { block: VAT }), line('pizza', 50000)], null, [], cfg));
    expect(amounts(v, 'liquor')).toEqual({ taxable: 47298, parts: [2602], total: 49900 });
    expect(v.payable).toBe(102400);
  });
  it('BL-S5a 33300 independent → [833,833], taxTotal 1666, payable 35000 roundOff 34', () => {
    const v = ok(preview([line('x', 33300)], null, [], cfg));
    expect(amounts(v, 'food')).toEqual({ taxable: 33300, parts: [833, 833], total: 34966 });
    expect(v).toMatchObject({ taxTotal: 1666, roundOff: 34, payable: 35000 });
  });
  it('BL-S5b 33300 residualLast → [832,833], taxTotal 1665, payable 35000 roundOff 35', () => {
    const v = ok(preview([line('x', 33300)], null, [], { ...cfg, partRounding: 'residualLast' }));
    expect(amounts(v, 'food')).toEqual({ taxable: 33300, parts: [832, 833], total: 34965 });
    expect(v).toMatchObject({ taxTotal: 1665, roundOff: 35, payable: 35000 });
  });
  it('BL-S6a 58038 → tax 1451+1451, 60940 → payable 60900 roundOff −40', () => {
    expect(ok(preview([line('x', 58038)], null, [], cfg))).toMatchObject({ taxTotal: 2902, roundOff: -40, payable: 60900 });
  });
  it('BL-S6b 58048 → 60950 → payable 61000 roundOff +50 (half up)', () => {
    expect(ok(preview([line('x', 58048)], null, [], cfg))).toMatchObject({ roundOff: 50, payable: 61000 });
  });
  it('BL-S6c roundTo 0 → payable 60940 roundOff 0', () => {
    expect(ok(preview([line('x', 58038)], null, [], { ...cfg, roundTo: 0 }))).toMatchObject({ roundOff: 0, payable: 60940 });
  });
  it('BL-S13 qty 2 beers list 100000 offer 50000 → liquor 50000, payable 50000', () => {
    const v = ok(preview([line('beer', 100000, { qty: 2, offer: 50000, block: LIQ })], null, [], cfg));
    expect(amounts(v, 'liquor')).toEqual({ taxable: 50000, parts: [], total: 50000 });
    expect(v.payable).toBe(50000);
    expect(v.lines[0]).toMatchObject({ qty: 2, listPrice: 100000, offer: { amount: 50000 } });
  });
  it('BL-S14 a component with taxBlockId null → failed-precondition naming the dish and the line', () => {
    const r = preview([line('pizza', 50000), line('new dish', 20000, { block: null })], null, [], cfg);
    expect(r).toMatchObject({ ok: false, code: 'failed-precondition', message: 'no tax block: new dish', lineIds: ['new dish'] });
  });
  it('BL-S14 a block id the line never snapshotted is the same refusal', () => {
    const l = line('pizza', 50000); l.components[0].taxBlockId = 'ghost';
    expect(preview([l], null, [], cfg)).toMatchObject({ ok: false, code: 'failed-precondition' });
  });
  it('BL-S15 food.collect false → parts amounts 0, taxable = net, total = net; liquor untouched', () => {
    const off: TaxBlock = { ...FOOD, collect: false };
    const v = ok(preview([line('pizza', 50000, { block: off }), line('beer', 49900, { block: LIQ })], null, [], cfg));
    expect(amounts(v, 'food')).toEqual({ taxable: 50000, parts: [0, 0], total: 50000 });
    expect(v.blocks.find(b => b.id === 'food')!.parts.map(p => p.rateBps)).toEqual([0, 0]);
    expect(v.payable).toBe(99900);
  });
  it('BL-S17 voided line → in lines[], no tax, excluded from blocks; 100 % discounted line → taxable 0, parts [0,0]', () => {
    const v = ok(preview([line('biryani', 45000, { countsTowardTotal: false }), line('dessert', 20000, { discount: 20000 }), line('pizza', 50000)], null, [], cfg));
    expect(v.lines.map(l => l.lineId)).toEqual(['dessert', 'pizza', 'biryani']);
    expect(v.lines[2].tax).toEqual({});
    expect(v.lines[0].tax['dessert_base']).toEqual({ taxable: 0, parts: [{ label: 'CGST', rateBps: 250, amount: 0 }, { label: 'SGST', rateBps: 250, amount: 0 }] });
    expect(amounts(v, 'food')).toEqual({ taxable: 50000, parts: [1250, 1250], total: 52500 });
  });
  it('BL-S21 charge 1000 bps in food on 120000 food + 80000 liquor → base 120000, amount 12000, parts [300,300]; food 132000 [3300,3300]; payable 218600', () => {
    const v = ok(preview([line('pizza', 50000), line('biryani', 70000), line('whisky', 80000, { block: LIQ })], null, [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }], cfg));
    expect(v.charges[0]).toMatchObject({ base: 120000, amount: 12000, tax: { taxable: 12000, parts: [{ amount: 300 }, { amount: 300 }] } });
    expect(amounts(v, 'food')).toEqual({ taxable: 132000, parts: [3300, 3300], total: 138600 });
    expect(amounts(v, 'liquor')).toEqual({ taxable: 80000, parts: [], total: 80000 });
    expect(v).toMatchObject({ roundOff: 0, payable: 218600 });
  });
  it('BL-S21 charge base is net of the bill discount: 20000 off first, charge on 108000 → 10800', () => {
    const v = ok(preview([line('pizza', 50000), line('biryani', 70000), line('whisky', 80000, { block: LIQ })], bd(20000), [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }], cfg));
    expect(v.charges[0]).toMatchObject({ base: 108000, amount: 10800 });
  });
  it('BL-S22 bill discount 58000 = 100 % → every taxable 0, payable 0, ok:true', () => {
    const v = ok(preview([line('pizza', 50000), line('coke', 8000)], bd(58000), [], cfg));
    expect(v.lines.map(l => l.billDiscount)).toEqual([8000, 50000]);
    expect(amounts(v, 'food')).toEqual({ taxable: 0, parts: [0, 0], total: 0 });
    expect(v).toMatchObject({ roundOff: 0, payable: 0 });
  });
  it('BL-S23a list 50000 offer 10000 discount 5000, bill discount 20000 → share 20000, taxable 15000 [375,375], payable 15800 roundOff 50', () => {
    const v = ok(preview([line('pizza', 50000, { offer: 10000, discount: 5000 })], bd(20000), [], cfg));
    expect(v.lines[0].billDiscount).toBe(20000);
    expect(amounts(v, 'food')).toEqual({ taxable: 15000, parts: [375, 375], total: 15750 });
    expect(v).toMatchObject({ roundOff: 50, payable: 15800 });
  });
  it('BL-S23b bill discount 40000 > net 35000 → failed-precondition', () => {
    expect(preview([line('pizza', 50000, { offer: 10000, discount: 5000 })], bd(40000), [], cfg)).toMatchObject({ ok: false, code: 'failed-precondition' });
  });
  it('R1 inside a line, a cut is apportioned to components by qty × unitListPrice share, leftover on the last: 300 off [item 200, addon 100] → 200, 100; 100 off [item 200, addon 100] → 66, 34', () => {
    const l = line('pizza', 30000, {
      offer: 10000,
      components: [
        { id: 'base', kind: 'item', name: 'pizza', unitListPrice: 20000, taxBlockId: 'food', taxCode: '9963' },
        { id: 'cheese', kind: 'addon', name: 'cheese', unitListPrice: 10000, taxBlockId: 'food', taxCode: '9963' },
      ],
    });
    const v = ok(preview([l], null, [], cfg));
    expect(v.lines[0].tax['base'].taxable).toBe(20000 - 6666);
    expect(v.lines[0].tax['cheese'].taxable).toBe(10000 - 3334);
  });
  it('R1 an add-on in another block: item food 20000, addon liquor 10000, one line → two blocks', () => {
    const l = line('mix', 30000, {
      components: [
        { id: 'base', kind: 'item', name: 'mix', unitListPrice: 20000, taxBlockId: 'food', taxCode: '9963' },
        { id: 'shot', kind: 'addon', name: 'shot', unitListPrice: 10000, taxBlockId: 'liquor', taxCode: '' },
      ],
    });
    l.taxBlocks = { food: FOOD, liquor: LIQ };
    const v = ok(preview([l], null, [], cfg));
    expect(amounts(v, 'food')).toEqual({ taxable: 20000, parts: [500, 500], total: 21000 });
    expect(amounts(v, 'liquor')).toEqual({ taxable: 10000, parts: [], total: 10000 });
  });
  it('R2/R12 preview reads line.taxBlocks, never live config: a line snapshotted at 250 bps stays 250 (the caller has no rate to pass)', () => {
    const l = line('pizza', 50000); l.taxBlocks.food = { ...FOOD, parts: [{ label: 'CGST', rateBps: 900 }, { label: 'SGST', rateBps: 900 }] };
    expect(amounts(ok(preview([l], null, [], cfg)), 'food').parts).toEqual([4500, 4500]);
  });
  it('R8 every output is an integer (inclusive 33333 at 550: taxable 31595, tax 1738)', () => {
    const v = ok(preview([line('x', 33333, { block: VAT })], null, [], cfg));
    expect(amounts(v, 'liquor')).toEqual({ taxable: 31595, parts: [1738], total: 33333 });
    const all = [v.subtotal, v.taxTotal, v.roundOff, v.payable, ...v.blocks.flatMap(b => [b.taxable, b.total, ...b.parts.map(p => p.amount)])];
    expect(all.every(Number.isInteger)).toBe(true);
  });
  it('no lines → ok with payable 0 and no blocks', () => {
    expect(ok(preview([], null, [], cfg))).toMatchObject({ blocks: [], payable: 0, roundOff: 0 });
  });
});

describe('domain/billing preview — TD-016: a scoped offer lands on the lines it targets', () => {
  // `targets` is the offer engine's own appliedItems[], cartItemId → minor units. The test lines use
  // lineId as cartItemId, the way line() builds them. live[] is sorted by lineId, so naan comes first.

  it('TD-016a an ITEM offer of 24000 on the paneer leaves the naan alone: billDiscount 0/24000, line taxable 12000/24000 (old code split it 4800/19200)', () => {
    const d = { ...bd(24000), targets: { paneer: 24000 } };
    const v = ok(preview([line('paneer', 48000), line('naan', 12000)], d, [], cfg));
    const naan = v.lines.find(l => l.lineId === 'naan')!;
    const paneer = v.lines.find(l => l.lineId === 'paneer')!;
    expect([naan.billDiscount, paneer.billDiscount]).toEqual([0, 24000]);
    expect([naan.tax['naan_base'].taxable, paneer.tax['paneer_base'].taxable]).toEqual([12000, 24000]);
    // The bill total never moved — that is exactly why this hid: 36000 taxable, [900, 900], payable 37800.
    expect(amounts(v, 'food')).toEqual({ taxable: 36000, parts: [900, 900], total: 37800 });
    expect(v.payable).toBe(37800);
  });

  it('TD-016b with liquor beside food the leak is real money: food-only offer → liquor 18957 + VAT 1043, food 24000 [600,600], payable 45200 (old code: 45600, and CGST/SGST filed as 776 each)', () => {
    const d = { ...bd(24000), targets: { paneer: 24000 } };
    const v = ok(preview([line('paneer', 48000), line('beer', 20000, { block: VAT })], d, [], cfg));
    expect(amounts(v, 'liquor')).toEqual({ taxable: 18957, parts: [1043], total: 20000 });
    expect(amounts(v, 'food')).toEqual({ taxable: 24000, parts: [600, 600], total: 25200 });
    expect(v.payable).toBe(45200);
    expect(v.roundOff).toBe(0);
  });

  it('TD-016c an ORDER offer carries no targets and still spreads by net share: 24000 over 48000+12000 → 19200/4800', () => {
    const v = ok(preview([line('paneer', 48000), line('naan', 12000)], bd(24000), [], cfg));
    expect(v.lines.find(l => l.lineId === 'naan')!.billDiscount).toBe(4800);
    expect(v.lines.find(l => l.lineId === 'paneer')!.billDiscount).toBe(19200);
    expect(v.payable).toBe(37800);
  });

  it('TD-016d BL-S12 split: the half that holds none of the targeted lines gets no discount at all, and discount is null so the bill claims none', () => {
    const d = { ...bd(24000), targets: { paneer: 24000 } };
    const v = ok(preview([line('naan', 12000)], d, [], cfg));
    expect(v.lines[0].billDiscount).toBe(0);
    expect(v.discount).toBeNull();
    expect(v.payable).toBe(12600);
  });

  it('TD-016e split with the targets divided: only the part sitting on this bill is given (6000 of 10000), so the two halves cannot each claim the whole offer', () => {
    const d = { ...bd(10000), targets: { paneer: 6000, naan: 4000 } };
    const v = ok(preview([line('paneer', 48000)], d, [], cfg));
    expect(v.lines[0].billDiscount).toBe(6000);
    expect(v.discount!.amount).toBe(6000);
    expect(amounts(v, 'food')).toEqual({ taxable: 42000, parts: [1050, 1050], total: 44100 });
  });

  it('TD-016f an offer worth more than its own target line can absorb is refused, never spilled onto the others', () => {
    const d = { ...bd(60000), targets: { paneer: 60000 } };
    expect(preview([line('paneer', 48000), line('naan', 12000)], d, [], cfg)).toMatchObject({ ok: false, code: 'failed-precondition' });
  });

  it('TD-016g the targeted line is voided → nothing to discount, the surviving line keeps its full price', () => {
    const d = { ...bd(24000), targets: { paneer: 24000 } };
    const v = ok(preview([line('paneer', 48000, { countsTowardTotal: false }), line('naan', 12000)], d, [], cfg));
    expect(v.lines.find(l => l.lineId === 'naan')!.billDiscount).toBe(0);
    expect(v.payable).toBe(12600);
  });

  it('TD-016h a BOGO across two lines of the same dish: targets both cart items, nothing reaches the naan', () => {
    const d = { ...bd(24000), targets: { paneerA: 12000, paneerB: 12000 } };
    const v = ok(preview([line('paneerA', 24000), line('paneerB', 24000), line('naan', 12000)], d, [], cfg));
    expect(v.lines.map(l => [l.lineId, l.billDiscount])).toEqual([['naan', 0], ['paneerA', 12000], ['paneerB', 12000]]);
    expect(v.payable).toBe(37800);
  });
});

describe('domain/billing apportion / taxOn', () => {
  it('apportion 100 over [0, 0] → [0, 0]; 100 over [1, 0] → [100, 0] (leftover on the last non-zero weight)', () => {
    expect(apportion(100, [0, 0])).toEqual([0, 0]);
    expect(apportion(100, [1, 0])).toEqual([100, 0]);
    expect(apportion(100, [1, 1, 1])).toEqual([33, 33, 34]);
  });
  it('taxOn exclusive residualLast 33300 → 1665 as [832, 833]; independent → [833, 833]', () => {
    expect(taxOn(33300, FOOD, { ...cfg, partRounding: 'residualLast' }).parts.map(p => p.amount)).toEqual([832, 833]);
    expect(taxOn(33300, FOOD, cfg).parts.map(p => p.amount)).toEqual([833, 833]);
  });
  it('taxOn inclusive with two parts: 10500 at 250+250 → taxable 10000, tax 500 as [250, 250]; 10501 → taxable 10000, tax 501 as [250, 251]', () => {
    const inc: TaxBlock = { ...FOOD, mode: 'inclusive' };
    expect(taxOn(10500, inc, cfg)).toMatchObject({ taxable: 10000, parts: [{ amount: 250 }, { amount: 250 }] });
    expect(taxOn(10501, inc, cfg)).toMatchObject({ taxable: 10000, parts: [{ amount: 250 }, { amount: 251 }] });
  });
});


describe('domain/billing preview — cases from the blind lists', () => {
  it('A3 "last line" is by lineId, not insertion order: nets [10000 b, 5000 a] discount 10000 → a 3333, b 6667 either way', () => {
    const one = ok(preview([line('b', 10000), line('a', 5000)], bd(10000), [], cfg));
    const two = ok(preview([line('a', 5000), line('b', 10000)], bd(10000), [], cfg));
    expect(one.lines.map(l => [l.lineId, l.billDiscount])).toEqual([['a', 3333], ['b', 6667]]);
    expect(two).toEqual(one);
  });
  it('B5 half-up, not banker\'s: taxable 100 at 250 → 3; 300 → 8', () => {
    expect(taxOn(100, FOOD, cfg).parts.map(p => p.amount)).toEqual([3, 3]);
    expect(taxOn(300, FOOD, cfg).parts.map(p => p.amount)).toEqual([8, 8]);
  });
  it('B9 inclusive block with two parts always splits the remainder residualLast, so the block total equals the gross: 10000 at 250+250 → 9523 + [238, 239]', () => {
    const inc: TaxBlock = { ...FOOD, mode: 'inclusive' };
    const t = taxOn(10000, inc, cfg);
    expect(t).toMatchObject({ taxable: 9523, parts: [{ amount: 238 }, { amount: 239 }] });
    expect(t.taxable + 238 + 239).toBe(10000);
  });
  it('C6 charge in a block no line touches → row with base 0, amount 0, no tax, payable unchanged', () => {
    const v = ok(preview([line('beer', 49900, { block: LIQ })], null, [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }], cfg));
    expect(v.charges[0]).toMatchObject({ base: 0, amount: 0 });
    expect(v.payable).toBe(49900);
    expect(v.blocks.map(b => b.id)).toEqual(['liquor']);
  });
  it('C6b a charge is never levied without its tax definition: amount ≠ 0 ⟹ its block is on the bill', () => {
    // The definition is taken off a line, not out of config, so it LOOKS like a charge could be
    // levied untaxed. It cannot: `base` counts only components in the charge's own block. This
    // pins that coupling — widen `base` past the charge's block and this goes red.
    const bar = ok(preview([line('beer', 49900, { block: LIQ })], null, [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }], cfg));
    const kitchen = ok(preview([line('pizza', 50000)], null, [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'liquor' }], cfg));
    const unknown = ok(preview([line('pizza', 50000), line('whisky', 80000, { block: LIQ })], null, [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'wine' }], cfg));
    for (const v of [bar, kitchen, unknown]) {
      for (const c of v.charges) {
        if (c.amount !== 0) expect(v.blocks.map(b => b.id)).toContain(c.taxBlockId);
        else expect(c.tax).toEqual({ taxable: 0, parts: [] });
      }
    }
    expect([bar, kitchen, unknown].map(v => v.charges[0].amount)).toEqual([0, 0, 0]);
  });
  it('C7/C9 round-off matrix: 60999 → +1; 60901 → −1; roundTo 500 on 60940 → 61000 (+60)', () => {
    expect(ok(preview([line('x', 58095)], null, [], cfg))).toMatchObject({ payable: 61000, roundOff: 1 });   // 58095 + 1452 + 1452 = 60999
    expect(ok(preview([line('x', 58001)], null, [], cfg))).toMatchObject({ payable: 60900, roundOff: -1 });  // 58001 + 1450 + 1450 = 60901
    expect(ok(preview([line('x', 58038)], null, [], { ...cfg, roundTo: 500 }))).toMatchObject({ payable: 61000, roundOff: 60 });
  });
  it('C10 a voided line takes no share of the bill discount: pizza gets all 10000', () => {
    const v = ok(preview([line('biryani', 45000, { countsTowardTotal: false }), line('pizza', 50000)], bd(10000), [], cfg));
    expect(v.lines.map(l => [l.lineId, l.billDiscount])).toEqual([['pizza', 10000], ['biryani', 0]]);
  });
  it('C17 offer above list → failed-precondition, never a negative taxable', () => {
    expect(preview([line('pizza', 50000, { offer: 60000 })], null, [], cfg)).toMatchObject({ ok: false, code: 'failed-precondition' });
  });
  it('A5 all lines at 100 % and a bill discount on top → failed-precondition (discount exceeds bill), no NaN', () => {
    expect(preview([line('x', 20000, { discount: 20000 })], bd(100), [], cfg)).toMatchObject({ ok: false, code: 'failed-precondition' });
  });
});

const seller = { name: 'S', address: 'A', taxId: 'T', stateCode: '29', placeOfSupply: 'Karnataka (29)' };
const meta = (n: string, extra: Partial<Meta> = {}): Meta => ({ billId: 'b_' + n, number: n, series: 'A', fiscalYear: '2026-27', cid: 'c1', tableIds: ['t7'], sittingId: 's1', draftId: 'd1', issuedAt: 1000, issuedBy: 'm1', seller, ...extra });
const s1 = () => ok(preview([line('pizza', 50000), line('coke', 8000)], null, [], cfg));
const issued = (body = s1()) => { const r = issue(body, meta('0417')); if (!r.ok) throw new Error(r.message); return r.value; };
const paid = (body = s1()): Bill => ({ ...issued(body), status: 'paid' });
const cn = (bill: Bill, credits: { lineId: string; qty: number }[], n = '0007') => creditNote(bill, credits, meta(n, { series: 'CN' }));

describe('domain/billing issue / cancel / creditNote', () => {
  it('BL-S7 issue freezes a copy: status issued, number, seller; mutating the source body does not touch the bill', () => {
    const body = s1();
    const b = issued(body);
    expect(b).toMatchObject({ status: 'issued', number: '0417', series: 'A', fiscalYear: '2026-27', payable: 60900, seller: { taxId: 'T' }, creditNotes: [] });
    body.lines[0].listPrice = 1; body.payable = 1;
    expect(b.lines[0].listPrice).toBe(8000);   // coke sorts first
    expect(b.payable).toBe(60900);
  });
  it('BL-S22 / PY-S8 a bill with payable 0 is issued as paid: numbered, nothing for PY to collect', () => {
    const b = issued(ok(preview([line('pizza', 50000)], bd(50000), [], cfg)));
    expect(b).toMatchObject({ number: '0417', payable: 0, status: 'paid' });
    expect(issued().status).toBe('issued');
  });
  it('D4 issue with nothing counted (empty or all voided) → failed-precondition', () => {
    expect(issue(ok(preview([], null, [], cfg)), meta('0417'))).toMatchObject({ ok: false, code: 'failed-precondition' });
    expect(issue(ok(preview([line('x', 100, { countsTowardTotal: false })], null, [], cfg)), meta('0417'))).toMatchObject({ ok: false });
  });
  it('BL-S9 cancel an issued bill → cancelled {at, by, reason}, number kept, lines and charges kept', () => {
    const b = issued(ok(preview([line('pizza', 50000)], null, [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }], cfg)));
    const r = cancel(b, 2000, 'm1', 'service charge removed');
    expect(r).toMatchObject({ ok: true, value: { status: 'cancelled', number: '0417', cancelled: { at: 2000, by: 'm1', reason: 'service charge removed' }, charges: [{ amount: 5000 }] } });
    expect((r as { value: Bill }).value.lines).toEqual(b.lines);
  });
  it('BL-S9 cancel on a paid or already cancelled bill → failed-precondition, first cancel not overwritten', () => {
    expect(cancel(paid(), 1, 'm', 'r')).toMatchObject({ ok: false, code: 'failed-precondition' });
    const c = (cancel(issued(), 2000, 'm1', 'r') as { value: Bill }).value;
    expect(cancel(c, 3000, 'm2', 'again')).toMatchObject({ ok: false });
    expect(c.cancelled).toEqual({ at: 2000, by: 'm1', reason: 'r' });
  });
  // D3: the BL-S1 bill A-0417 is ₹609.00; one friend pays ₹500 cash (PY stamps paidTotal 50000). Edit and Cancel both
  // come through here, so both are refused, the refusal names the bill and the money, and a voided take (paidTotal 0) frees it.
  it('D3 BL-S9 a bill with ₹500 paid on it cannot be cancelled or edited: "₹500 already paid on A-0417 — take the rest first"', () => {
    const r = cancel({ ...issued(), paidTotal: 50000 }, 2000, 'm1', 'edited');
    expect(r).toMatchObject({ ok: false, code: 'failed-precondition', message: '₹500 already paid on A-0417 — take the rest first' });
    expect(cancel({ ...issued(), paidTotal: 3350 }, 2000, 'm1', 'edited')).toMatchObject({ ok: false, message: '₹33.50 already paid on A-0417 — take the rest first' });
    expect(cancel({ ...issued(), paidTotal: 0 }, 2000, 'm1', 'edited')).toMatchObject({ ok: true });
  });
  it('BL-S11a credit the coke of the BL-S1 bill → qty −1, taxable −8000, parts [−200,−200], total −8400; original stays paid and gains creditNotes[]', () => {
    const r = cn(paid(), [{ lineId: 'coke', qty: 1 }]);
    if (!r.ok) throw new Error(r.message);
    const { note, original } = r.value;
    expect(note.lines).toHaveLength(1);
    expect(note.lines[0]).toMatchObject({ lineId: 'coke', qty: -1, listPrice: -8000, billDiscount: 0, tax: { coke_base: { taxable: -8000, parts: [{ amount: -200 }, { amount: -200 }] } } });
    expect(note).toMatchObject({ status: 'issued', series: 'CN', number: '0007', subtotal: -8000, taxTotal: -400, roundOff: 0, payable: -8400, creditNoteOf: { billId: 'b_0417', number: '0417', issuedAt: 1000 }, charges: [] });
    expect(amounts(note, 'food')).toEqual({ taxable: -8000, parts: [-200, -200], total: -8400 });
    expect(original).toMatchObject({ status: 'paid', payable: 60900, creditNotes: [{ billId: 'b_0007', number: '0007', at: 1000 }] });
    expect(original.lines.find(l => l.lineId === 'coke')!.credited).toEqual({ qty: 1 });
  });
  it('BL-S11b one of three beers (line 150000 qty 3, liquor) → −50000, remaining creditable 2', () => {
    const r = cn(paid(ok(preview([line('beer', 150000, { qty: 3, block: LIQ })], null, [], cfg))), [{ lineId: 'beer', qty: 1 }]);
    if (!r.ok) throw new Error(r.message);
    expect(r.value.note).toMatchObject({ payable: -50000, taxTotal: 0 });
    expect(r.value.original.lines[0].credited).toEqual({ qty: 1 });
  });
  it('BL-S11c credit the pizza of the BL-S3 bill → billDiscount −5000, taxable −45000, parts [−1125,−1125], total −47250', () => {
    const bill = paid(ok(preview([line('pizza', 50000), line('biryani', 70000), line('whisky', 80000, { block: LIQ })], bd(20000), [], cfg)));
    const r = cn(bill, [{ lineId: 'pizza', qty: 1 }]);
    if (!r.ok) throw new Error(r.message);
    expect(r.value.note.lines[0]).toMatchObject({ billDiscount: -5000, tax: { pizza_base: { taxable: -45000, parts: [{ amount: -1125 }, { amount: -1125 }] } } });
    expect(r.value.note.payable).toBe(-47250);
  });
  it('F3 partial notes telescope: 3 beers taxable 140000 CGST 3500 after a bill discount, credited 1+1+1 → −46666, −46667, −46667 and −1166, −1167, −1167 (cumulative floor); Σ = charged', () => {
    const food3: TaxBlock = { ...FOOD, parts: [{ label: 'CGST', rateBps: 250 }] };
    const bill = paid(ok(preview([line('beer', 150000, { qty: 3, block: food3, blockId: 'food' })], bd(10000), [], cfg)));
    expect(bill.lines[0].tax['beer_base']).toMatchObject({ taxable: 140000, parts: [{ amount: 3500 }] });
    let cur = bill; const taxables: number[] = []; const taxes: number[] = [];
    for (const n of ['0001', '0002', '0003']) {
      const r = cn(cur, [{ lineId: 'beer', qty: 1 }], n); if (!r.ok) throw new Error(r.message);
      taxables.push(r.value.note.lines[0].tax['beer_base'].taxable); taxes.push(r.value.note.lines[0].tax['beer_base'].parts[0].amount); cur = r.value.original;
    }
    expect(taxables).toEqual([-46666, -46667, -46667]);
    expect(taxes).toEqual([-1166, -1167, -1167]);
    expect(cur.creditNotes).toHaveLength(3);
    expect(cn(cur, [{ lineId: 'beer', qty: 1 }])).toMatchObject({ ok: false, code: 'failed-precondition' });
  });
  it('F5/F6 over-credit, qty 0, negative, unknown line, voided line → refused', () => {
    const b = paid();
    expect(cn(b, [{ lineId: 'coke', qty: 2 }])).toMatchObject({ ok: false });
    expect(cn(b, [{ lineId: 'coke', qty: 0 }])).toMatchObject({ ok: false });
    expect(cn(b, [{ lineId: 'coke', qty: -1 }])).toMatchObject({ ok: false });
    expect(cn(b, [{ lineId: 'ghost', qty: 1 }])).toMatchObject({ ok: false });
    expect(cn(b, [])).toMatchObject({ ok: false, code: 'invalid-argument' });
    const v = paid(ok(preview([line('a', 100, { countsTowardTotal: false }), line('pizza', 50000)], null, [], cfg)));
    expect(cn(v, [{ lineId: 'a', qty: 1 }])).toMatchObject({ ok: false });
  });
  it('F7 credit note on an issued-unpaid or cancelled bill → failed-precondition; cancel on a credit note → refused', () => {
    expect(cn(issued(), [{ lineId: 'coke', qty: 1 }])).toMatchObject({ ok: false, code: 'failed-precondition' });
    const c = (cancel(issued(), 1, 'm', 'r') as { value: Bill }).value;
    expect(cn(c, [{ lineId: 'coke', qty: 1 }])).toMatchObject({ ok: false });
    const note = (cn(paid(), [{ lineId: 'coke', qty: 1 }]) as { value: { note: Bill } }).value.note;
    expect(cancel(note, 1, 'm', 'r')).toMatchObject({ ok: false });
  });
  it('PY-S26 a credit note starts with refundedTotal 0; PY stamps it inside the refund transaction', () => {
    const r = cn(paid(), [{ lineId: 'coke', qty: 1 }]); if (!r.ok) throw new Error(r.message);
    expect(r.value.note.refundedTotal).toBe(0);
    expect(r.value.original.refundedTotal).toBeUndefined();
  });
  it('PY-S25 a credit note needs status paid, which PY sets only when outstanding is 0: issued (even half-paid) is refused', () => {
    expect(cn(issued(), [{ lineId: 'coke', qty: 1 }])).toMatchObject({ ok: false, code: 'failed-precondition', message: expect.stringContaining('paid') });
  });
  it('F8 nothing re-priced: the note reads the bill, so a config change between issue and note cannot reach it (no cfg argument exists)', () => {
    expect(creditNote.length).toBe(3);
  });
});

describe('domain/billing — cases from Grok\'s list', () => {
  it('T22/T23 tiny bills: 1 paisa → tax 0, roundOff −1, payable 0; 20 paise independent → [1,1], 22 → payable 0 roundOff −22', () => {
    expect(ok(preview([line('x', 1)], null, [], cfg))).toMatchObject({ taxTotal: 0, roundOff: -1, payable: 0 });
    expect(ok(preview([line('x', 20)], null, [], cfg))).toMatchObject({ taxTotal: 2, roundOff: -22, payable: 0 });
  });
  it('T32 an offer on a line spanning two blocks splits by component list share: 20000 off [food 50000, liquor 49900] → 10010 / 9990', () => {
    const l = line('mix', 99900, { offer: 20000, components: [
      { id: 'base', kind: 'item', name: 'mix', unitListPrice: 50000, taxBlockId: 'food', taxCode: '9963' },
      { id: 'shot', kind: 'addon', name: 'shot', unitListPrice: 49900, taxBlockId: 'liquor', taxCode: '' } ] });
    l.taxBlocks = { food: FOOD, liquor: LIQ };
    const v = ok(preview([l], null, [], cfg));
    expect(amounts(v, 'food')).toEqual({ taxable: 39990, parts: [1000, 1000], total: 41990 });
    expect(amounts(v, 'liquor')).toEqual({ taxable: 39910, parts: [], total: 39910 });
    expect(v).toMatchObject({ payable: 81900, roundOff: 0 });
  });
  it('T41 a charge in an inclusive block with no parts: 10 % on liquor 80000 → amount 8000, block total 88000, tax 0', () => {
    const v = ok(preview([line('whisky', 80000, { block: LIQ })], null, [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'liquor' }], cfg));
    expect(v.charges[0]).toMatchObject({ base: 80000, amount: 8000, tax: { taxable: 8000, parts: [] } });
    expect(amounts(v, 'liquor')).toEqual({ taxable: 88000, parts: [], total: 88000 });
  });
  it('T42 a negative component price or qty 0 is refused (invalid-argument), never apportioned', () => {
    const l = line('pizza', 40000, { components: [
      { id: 'base', kind: 'item', name: 'pizza', unitListPrice: 50000, taxBlockId: 'food', taxCode: '9963' },
      { id: 'small', kind: 'variant', name: 'small', unitListPrice: -10000, taxBlockId: 'food', taxCode: '9963' } ] });
    expect(preview([l], null, [], cfg)).toMatchObject({ ok: false, code: 'invalid-argument' });
    const z = line('pizza', 0); z.qty = 0;
    expect(preview([z], null, [], cfg)).toMatchObject({ ok: false, code: 'invalid-argument' });
  });
  it('T55/donor-5 a note that credits the last unit of every line refunds what was paid: bill 61000 (raw 60950, roundOff +50) → note payable −61000 with roundOff −50; the original keeps its +50', () => {
    const bill = paid(ok(preview([line('x', 58048)], null, [], cfg)));
    expect(bill).toMatchObject({ payable: 61000, roundOff: 50 });
    const r = cn(bill, [{ lineId: 'x', qty: 1 }]); if (!r.ok) throw new Error(r.message);
    expect(r.value.note).toMatchObject({ payable: -61000, roundOff: -50, subtotal: -58048, taxTotal: -2902 });
    expect(r.value.original).toMatchObject({ payable: 61000, roundOff: 50 });
  });
  it('donor-5 the other direction: bill 60900 (raw 60940, roundOff −40) fully credited → note payable −60900, roundOff +40', () => {
    const bill = paid(ok(preview([line('x', 58038)], null, [], cfg)));
    expect(bill).toMatchObject({ payable: 60900, roundOff: -40 });
    const r = cn(bill, [{ lineId: 'x', qty: 1 }]); if (!r.ok) throw new Error(r.message);
    expect(r.value.note).toMatchObject({ payable: -60900, roundOff: 40 });
  });
  it('donor-5 a partial note never touches the round-off: one of two lines credited → roundOff 0', () => {
    const bill = paid(ok(preview([line('x', 58048), line('y', 10000)], null, [], cfg)));
    const r = cn(bill, [{ lineId: 'x', qty: 1 }]); if (!r.ok) throw new Error(r.message);
    expect(r.value.note.roundOff).toBe(0);
  });
  it('donor-1 error-diffused apportion: 100 over 30 equal lines → every share 3 or 4, sum exactly 100, none more than one minor unit under its true share', () => {
    const lines = Array.from({ length: 30 }, (_, i) => line('l' + String(i).padStart(2, '0'), 10000));
    const v = ok(preview(lines, bd(100), [], cfg));
    const shares = v.lines.map(l => l.billDiscount);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
    for (const sh of shares) expect(Math.abs(sh - 100 / 30)).toBeLessThan(1);
  });
  it('donor-2 "₹200 off" is 200 off the taxable value, so the payable falls by 210 on a food bill, not 200 (s.15(3)(a))', () => {
    const before = ok(preview([line('pizza', 50000), line('coke', 8000)], null, [], cfg));
    const after = ok(preview([line('pizza', 50000), line('coke', 8000)], bd(20000), [], cfg));
    expect(before.payable - after.payable).toBe(21000);
  });
  it('I invariants on every success path: subtotal = Σ taxable, taxTotal = Σ parts = Σ line parts, payable = Σ totals + roundOff, |roundOff| < roundTo', () => {
    const cases = [
      preview([line('pizza', 50000), line('coke', 8000)], null, [], cfg),
      preview([line('pizza', 50000), line('biryani', 70000), line('whisky', 80000, { block: LIQ })], bd(20000), [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }], cfg),
      preview([line('beer', 49900, { block: VAT }), line('x', 33300)], bd(1234), [], { ...cfg, partRounding: 'residualLast' }),
      preview([line('a', 10000), line('b', 10000), line('c', 10000)], bd(10000), [], { ...cfg, roundTo: 500 }),
    ];
    for (const r of cases) {
      const v = ok(r);
      const sumParts = v.blocks.reduce((a, b) => a + b.parts.reduce((s, p) => s + p.amount, 0), 0);
      const lineParts = v.lines.filter(l => l.countsTowardTotal).reduce((a, l) => a + Object.values(l.tax).reduce((s, t) => s + t.parts.reduce((q, p) => q + p.amount, 0), 0), 0)
        + v.charges.reduce((a, c) => a + c.tax.parts.reduce((s, p) => s + p.amount, 0), 0);
      expect(v.subtotal).toBe(v.blocks.reduce((a, b) => a + b.taxable, 0));
      expect(v.taxTotal).toBe(sumParts);
      expect(lineParts).toBe(sumParts);
      expect(v.payable).toBe(v.blocks.reduce((a, b) => a + b.total, 0) + v.roundOff);
      expect(Math.abs(v.roundOff)).toBeLessThan(Math.max(1, cfg.roundTo === 0 ? 1 : 500));
      for (const b of v.blocks) if (b.mode === 'inclusive') expect(b.total).toBe(b.taxable + b.parts.reduce((s, p) => s + p.amount, 0));
    }
  });
});

// The hand-computed golden bills. Kept in their own file because mock/goldenExpectedValues.json is generated
// wholesale by buildMockData7.js on every build, so rows hand-added there would vanish on the next rebuild.
/* eslint-disable @typescript-eslint/no-var-requires */
// Path is from the COMPILED test (lib/domain/) back to functions/mock/.
const golden = require('../../mock/goldenBills.json') as { scenarios: unknown[] };

type GoldenLine = { id: string; block: string; list: number; qty?: number; offer?: number; discount?: number };
type GoldenRow = {
  scenarioId: string; kind: string; description: string;
  input: { lines?: GoldenLine[]; billDiscount?: number; charges?: { type: string; pctBps: number; taxBlockId: string }[]; cfgOverride?: Record<string, never> };
  expected: Record<string, never>;
};

describe('domain/billing against mock/goldenBills.json', () => {
  const rows = (golden.scenarios as unknown as GoldenRow[]).filter(r => r.kind === 'bill');
  it('every bill row in the file is covered here', () => { expect(rows.length).toBeGreaterThanOrEqual(15); });

  for (const row of rows) {
    it(`${row.scenarioId} ${row.description}`, () => {
      const o = (row.input.cfgOverride ?? {}) as { partRounding?: 'independent' | 'residualLast'; roundTo?: number; liquor?: { parts: { label: string; rateBps: number }[] } };
      const c = { ...cfg, ...(o.partRounding ? { partRounding: o.partRounding } : {}), ...(o.roundTo !== undefined ? { roundTo: o.roundTo } : {}) };
      const liquor: TaxBlock = o.liquor ? { ...LIQ, parts: o.liquor.parts } : LIQ;
      const lines = (row.input.lines ?? []).map(l => line(l.id, l.list, { block: l.block === 'liquor' ? liquor : FOOD, blockId: l.block, qty: l.qty, offer: l.offer, discount: l.discount }));
      const r = preview(lines, row.input.billDiscount ? bd(row.input.billDiscount) : null, row.input.charges ?? [], c);
      const e = row.expected as { error?: string; blocks?: Record<string, { taxable: number; parts: number[]; total: number }>; lineBillDiscount?: Record<string, number>; charges?: { base: number; amount: number }[]; payable?: number; roundOff?: number; taxTotal?: number; subtotal?: number };
      if (e.error) { expect(r).toMatchObject({ ok: false, code: e.error }); return; }
      const v = ok(r);
      for (const [id, exp] of Object.entries(e.blocks ?? {})) expect({ block: id, ...amounts(v, id) }).toEqual({ block: id, ...exp });
      for (const [id, exp] of Object.entries(e.lineBillDiscount ?? {})) expect({ id, share: v.lines.find(l => l.lineId === id)!.billDiscount }).toEqual({ id, share: exp });
      (e.charges ?? []).forEach((ch, i) => expect(v.charges[i]).toMatchObject({ base: ch.base, amount: ch.amount }));
      for (const k of ['payable', 'roundOff', 'taxTotal', 'subtotal'] as const) if (e[k] !== undefined) expect({ [k]: v[k] }).toEqual({ [k]: e[k] });
    });
  }
});

describe('domain/billing — BT parcel: a flat charge (packing) beside the percentage ones', () => {
  // Pizza 50000 in the food block. Packing is ₹20.00 flat, taxed in the food block like a service charge.
  it('BT-P1 packing 2000 flat on a 50000 pizza: base 50000, amount 2000, tax 50 + 50; food taxable 52000, payable 54600', () => {
    const v = ok(preview([line('pizza', 50000)], null, [{ type: 'PACKING', pctBps: 0, flat: 2000, taxBlockId: 'food' }], cfg));
    expect(v.charges[0]).toMatchObject({ base: 50000, amount: 2000, tax: { taxable: 2000, parts: [{ amount: 50 }, { amount: 50 }] } });
    expect(amounts(v, 'food')).toEqual({ taxable: 52000, parts: [1300, 1300], total: 54600 });
    expect(v.payable).toBe(54600);
  });
  it('BT-P2 a row may carry both: 10 % + 2000 flat on 50000 → 5000 + 2000 = 7000; no flat key means 0', () => {
    expect(ok(preview([line('pizza', 50000)], null, [{ type: 'X', pctBps: 1000, flat: 2000, taxBlockId: 'food' }], cfg)).charges[0].amount).toBe(7000);
    expect(ok(preview([line('pizza', 50000)], null, [{ type: 'X', pctBps: 1000, taxBlockId: 'food' }], cfg)).charges[0].amount).toBe(5000);
  });
  it('BT-P3 a flat charge in a block no counted line touches is refused, naming the charge (C6b: nothing is ever levied untaxed)', () => {
    const r = preview([line('beer', 49900, { block: LIQ })], null, [{ type: 'PACKING', pctBps: 0, flat: 2000, taxBlockId: 'food' }], cfg);
    expect(r).toMatchObject({ ok: false, code: 'failed-precondition' });
    expect((r as { message: string }).message).toMatch(/PACKING/);
  });
});

