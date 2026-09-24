// BL · placement. A cart item becomes a line snapshot. Minor units. The menu prices here are the ones in
// CLAUDE.md's Price Calculation Reference: Burger ₹200 at 10 % off, Large +₹50 inheriting, Cheese +₹20 not.
import { CartItem, PlaceContext, TaxBlock, componentShares, placeLine } from './line';

const FOOD: TaxBlock = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
const LIQ: TaxBlock = { label: 'Liquor', mode: 'inclusive', collect: true, parts: [] };
const ctx: PlaceContext = { cid: 'c1', orderId: 'o1', cartId: 'k1', tableId: 't7', sessionId: 's1', draftId: 'd1', placedAt: 1000, placedBy: 'guest', blocks: { food: FOOD, liquor: LIQ }, sent: true };

const burger = (over: Partial<CartItem> = {}): CartItem => ({
  menuItemId: 'mi_burger', name: 'Burger', quantity: 3, cartItemId: '1', taxBlockId: 'food', taxCode: '9963',
  itemBasePrice: 60000, itemFinalPrice: 54000,
  variants: [{ id: 'size', name: 'Large', basePrice: 5000, finalPrice: 4500 }],
  addons: [{ id: 'cheese', name: 'Cheese', basePrice: 2000 }],
  ...over,
});

describe('domain/line placeLine', () => {
  it('TD-048 the guest\'s note is frozen on the line at placement; none → empty string, never undefined', () => {
    expect(placeLine(burger({ note: 'no onion' }), ctx, 'L1').note).toBe('no onion');
    expect(placeLine(burger(), ctx, 'L1').note).toBe('');
  });
  it('components are additive and per unit: item 20000 + variant 5000 + addon 2000, qty 3 → listPrice 81000', () => {
    const l = placeLine(burger(), ctx, 'L1');
    expect(l.components.map(c => [c.kind, c.unitListPrice])).toEqual([['item', 20000], ['variant', 5000], ['addon', 2000]]);
    expect(l.listPrice).toBe(81000);
    expect(l.qty).toBe(3);
  });
  it('the item\'s own menu discount is the frozen offer: 6000 on the item + 3 × 500 on the variant = 7500', () => {
    expect(placeLine(burger(), ctx, 'L1').offer).toEqual({ id: 'menu', amount: 7500 });
  });
  it('no menu discount → offer null, never a zero-amount offer row', () => {
    expect(placeLine(burger({ itemFinalPrice: 60000, variants: [{ id: 'size', name: 'Large', basePrice: 5000 }] }), ctx, 'L1').offer).toBeNull();
  });
  it('components inherit the item\'s block unless they set one; an add-on in another block keeps it', () => {
    const l = placeLine(burger({ addons: [{ id: 'shot', name: 'Shot', basePrice: 9000, taxBlockId: 'liquor' }] }), ctx, 'L1');
    expect(l.components.map(c => c.taxBlockId)).toEqual(['food', 'food', 'liquor']);
    expect(Object.keys(l.taxBlocks).sort()).toEqual(['food', 'liquor']);
  });
  it('the line snapshots only the blocks it touches, by value: editing the context block later cannot reach it', () => {
    const blocks = { food: { ...FOOD }, liquor: LIQ };
    const l = placeLine(burger(), { ...ctx, blocks }, 'L1');
    expect(Object.keys(l.taxBlocks)).toEqual(['food']);
    blocks.food.parts[0].rateBps = 900;
    expect(l.taxBlocks.food.parts[0].rateBps).toBe(900);   // shares the object; the adapter writes it to Firestore, which copies
  });
  it('a menu item with no tax block set keeps null and BL refuses to bill it (BL-S14), never a default', () => {
    const l = placeLine(burger({ taxBlockId: null }), ctx, 'L1');
    expect(l.components.every(c => c.taxBlockId === null)).toBe(true);
    expect(l.taxBlocks).toEqual({});
  });
  it('freezes how the block was found: a dish with its own block reads dish; a category-resolved one reads category (TD-038)', () => {
    expect(placeLine(burger(), ctx, 'L1')).toMatchObject({ taxSource: 'dish', categoryId: null });
    const l = placeLine(burger({ taxBlockId: 'liquor', taxSource: 'category', categoryId: 'mc_bar' }), ctx, 'L2');
    expect(l).toMatchObject({ taxSource: 'category', categoryId: 'mc_bar' });
    expect(l.components[0].taxBlockId).toBe('liquor');
    expect(placeLine(burger({ taxBlockId: null }), ctx, 'L3').taxSource).toBeNull();
  });

  it('the line starts unbilled, v 0, counted, in the table\'s draft, with its provenance', () => {
    expect(placeLine(burger(), ctx, 'L1')).toMatchObject({
      lineId: 'L1', cid: 'c1', orderId: 'o1', cartId: 'k1', cartItemId: '1', tableId: 't7', sessionId: 's1',
      placedAt: 1000, placedBy: 'guest', menuItemId: 'mi_burger', name: 'Burger',
      v: 0, countsTowardTotal: true, draftId: 'd1', billId: null,
    });
  });

  // ST reads `sent` to decide whether a void is free or a PIN (ST-S5, R8). It used to be
  // hardcoded false on every line ever written, which made that whole branch unreachable:
  // no void anywhere was ever gated, and every one was logged P1 instead of P0.
  it('carries the caller\'s `sent`: placing a round normally tells the kitchen', () => {
    expect(placeLine(burger(), ctx, 'L1').sent).toBe(true);
  });

  it('is unsent when a waiter still has to confirm the round', () => {
    expect(placeLine(burger(), { ...ctx, sent: false }, 'L1').sent).toBe(false);
  });
  it('component ids are stable and unique inside the line, so bill.lines[].tax can be keyed by them', () => {
    const ids = placeLine(burger(), ctx, 'L1').components.map(c => c.id);
    expect(ids).toEqual(['1_item', '1_v_size', '1_a_cheese']);
    expect(new Set(ids).size).toBe(3);
  });
  it('an odd per-unit price rounds once at placement: item line total 10000 over qty 3 → unit 3333, listPrice 9999', () => {
    const l = placeLine(burger({ quantity: 3, itemBasePrice: 10000, itemFinalPrice: 10000, variants: [], addons: [] }), ctx, 'L1');
    expect(l.components[0].unitListPrice).toBe(3333);
    expect(l.listPrice).toBe(9999);
  });
  it('componentShares splits a cut by qty × unit list price, summing exactly', () => {
    const l = placeLine(burger(), ctx, 'L1');
    const sh = componentShares(l, 7500);
    expect(sh).toEqual([5555, 1389, 556]);
    expect(sh.reduce((a, b) => a + b, 0)).toBe(7500);
  });
});

// TD-008 closed: `lines/` is now the real snapshot, written by checkout. ST writes the same document.
import { applyToLine } from './approvals';

describe('an ST approval on a placed line keeps the snapshot', () => {
  const placed = () => placeLine(burger(), ctx, 'L1');

  it('a discount bumps v and adds the discount without dropping components, taxBlocks or provenance', () => {
    const r = applyToLine(placed(), { action: 'discount', amount: 5000, pct: 6.17, reason: 'regular', note: '', approverId: 'm1' });
    if (!r.ok) throw new Error(r.message);
    const after = r.line as ReturnType<typeof placed>;
    expect(after).toMatchObject({ v: 1, discount: { amount: 5000 }, lineId: 'L1', menuItemId: 'mi_burger', listPrice: 81000, billId: null });
    expect(after.components).toHaveLength(3);
    expect(after.taxBlocks.food.parts).toHaveLength(2);
  });
  it('a void and an offer removal keep them too', () => {
    for (const action of ['void', 'removeOffer'] as const) {
      const r = applyToLine(placed(), { action, reason: 'wrong dish', note: '', approverId: 'm1' });
      if (!r.ok) throw new Error(r.message);
      expect((r.line as ReturnType<typeof placed>).components).toHaveLength(3);
      expect((r.line as ReturnType<typeof placed>).taxBlocks.food).toBeDefined();
    }
  });
});
