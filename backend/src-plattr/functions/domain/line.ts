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
