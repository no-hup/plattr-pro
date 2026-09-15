// BL · the placed line. F = frozen when the round is placed; L = live until issue, then frozen inside bill.lines[].
// ST's Line (approvals.ts) is the L half; this adds the F half. No tax name, currency or unit name lives here (R9).
import { Line as StLine } from './approvals';

export type Mode = 'inclusive' | 'exclusive';
export interface TaxPart { label: string; rateBps: number }            // 250 = 2.5 %
export interface TaxBlock { label: string; mode: Mode; collect: boolean; parts: TaxPart[] }

export interface Component {                                          // F. Prices additive: item base, variant delta, addon price
  id: string; kind: 'item' | 'variant' | 'addon'; name: string;
  unitListPrice: number;                                              // minor units
  taxBlockId: string | null;                                          // null = cannot be issued (R10)
  taxCode: string;
}

export interface Line extends StLine {
  lineId: string; cid: string; orderId: string; cartId: string; cartItemId: string; tableId: string; sessionId: string;  // F
  placedAt: number; placedBy: string;                                 // F
  menuItemId: string; name: string;                                   // F, reference may dangle
  qty: number;                                                        // F, ≥ 1
  components: Component[];                                            // F
  taxBlocks: Record<string, TaxBlock>;                                // F, every block this line touches, snapshot at placement
  draftId: string;                                                    // L
  billId: string | null;                                              // L → F at issue; cancel sets null in the same transaction
}

// ---- Placement: a cart item becomes a line snapshot. Pure; the checkout hook supplies the ids and the clock.

export interface CartComponent { id: string; name: string; basePrice: number; finalPrice?: number; taxBlockId?: string | null; taxCode?: string }
export interface CartItem {
  menuItemId: string; name: string; quantity: number; cartItemId: string;
  taxBlockId?: string | null; taxCode?: string;            // from the menu item (set in Admin)
  itemBasePrice: number; itemFinalPrice: number;            // LINE totals in minor units, the base item only
  variants: CartComponent[]; addons: CartComponent[];       // per unit, minor units
}
export interface PlaceContext {
  cid: string; orderId: string; cartId: string; tableId: string; sessionId: string; draftId: string;
  placedAt: number; placedBy: string; blocks: Record<string, TaxBlock>;
}

/** Split `amount` over `weights` by cumulative floor: shares sum exactly and none is more than one minor unit low. */
function shares(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (sum <= 0) return weights.map(() => 0);
  let run = 0, given = 0;
  return weights.map(w => { run += w; const upTo = Math.floor(amount * run / sum); const v = upTo - given; given = upTo; return v; });
}

/**
 * One line document per placed cart item. Components are additive and carry their own tax block, inherited
 * from the item when unset. `offer` is the item's own menu discount at the moment of placement, apportioned
 * across components; an order-level offer is NOT frozen here — it is re-read at preview as a bill discount,
 * so re-evaluating it in a later round cannot contradict an already-placed line.
 */
export function placeLine(item: CartItem, ctx: PlaceContext, lineId: string): Line {
  const qty = item.quantity;
  const inherit = (c: CartComponent) => (c.taxBlockId === undefined ? item.taxBlockId ?? null : c.taxBlockId);
  const components: Component[] = [
    { id: `${item.cartItemId}_item`, kind: 'item', name: item.name, unitListPrice: Math.round(item.itemBasePrice / qty), taxBlockId: item.taxBlockId ?? null, taxCode: item.taxCode ?? '' },
    ...item.variants.map((v): Component => ({ id: `${item.cartItemId}_v_${v.id}`, kind: 'variant', name: v.name, unitListPrice: v.basePrice, taxBlockId: inherit(v), taxCode: v.taxCode ?? item.taxCode ?? '' })),
    ...item.addons.map((a): Component => ({ id: `${item.cartItemId}_a_${a.id}`, kind: 'addon', name: a.name, unitListPrice: a.basePrice, taxBlockId: inherit(a), taxCode: a.taxCode ?? item.taxCode ?? '' })),
  ];
  const listPrice = qty * components.reduce((a, c) => a + c.unitListPrice, 0);
  const cut = (item.itemBasePrice - item.itemFinalPrice)
    + qty * [...item.variants, ...item.addons].reduce((a, c) => a + (c.basePrice - (c.finalPrice ?? c.basePrice)), 0);
  // Every block the line touches, snapshotted. A component whose block is unknown keeps a null id and BL refuses to bill it.
  const taxBlocks: Record<string, TaxBlock> = {};
  for (const c of components) if (c.taxBlockId && ctx.blocks[c.taxBlockId]) taxBlocks[c.taxBlockId] = ctx.blocks[c.taxBlockId];
  return {
    lineId, cid: ctx.cid, orderId: ctx.orderId, cartId: ctx.cartId, cartItemId: item.cartItemId,
    tableId: ctx.tableId, sessionId: ctx.sessionId, placedAt: ctx.placedAt, placedBy: ctx.placedBy,
    menuItemId: item.menuItemId, name: item.name, qty, components, taxBlocks,
    listPrice, sent: false, v: 0, countsTowardTotal: true, draftId: ctx.draftId, billId: null,
    offer: cut > 0 ? { id: 'menu', amount: cut } : null,
  };
}

/** How a line's own discount lands on its components: by `qty × unitListPrice` share, same rule as everywhere else. */
export function componentShares(line: Line, amount: number): number[] {
  return shares(amount, line.components.map(c => line.qty * c.unitListPrice));
}
