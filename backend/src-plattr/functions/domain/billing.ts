// BL · Billing & tax. Pure. Sums line snapshots (R2), discount before tax (R1), tax per component summed into blocks (R5),
// inclusive decomposition in one place (R6), one round-off on the payable (R7), integers only (R8), no tax names (R9).
import { Line, TaxBlock, TaxPart } from './line';
import { DiscountSource, net } from './approvals';

export type PartRounding = 'independent' | 'residualLast';
export interface BillingConfig { partRounding: PartRounding; roundTo: number }
export const BILLING_DEFAULTS: BillingConfig = { partRounding: 'independent', roundTo: 100 };

export interface ChargeIn { type: string; pctBps: number; taxBlockId: string }
export interface Charge extends ChargeIn { base: number; amount: number; tax: ComponentTax }
export interface BillDiscount { amount: number; pct: number; source: DiscountSource }
export interface PartAmount { label: string; rateBps: number; amount: number }
export interface ComponentTax { taxable: number; parts: PartAmount[] }
export interface BilledLine extends Line { billDiscount: number; tax: Record<string, ComponentTax>; credited: { qty: number } }
export interface Block { id: string; label: string; mode: TaxBlock['mode']; taxable: number; parts: PartAmount[]; total: number }
export interface BillBody {
  lines: BilledLine[]; blocks: Block[]; charges: Charge[]; discount: BillDiscount | null;
  subtotal: number; taxTotal: number; roundOff: number; payable: number;
}
export type Fail = { ok: false; code: 'failed-precondition' | 'invalid-argument'; message: string; lineIds?: string[] };
export type Result<T> = { ok: true; value: T } | Fail;

/** R1: split `amount` over `weights` by share. Cumulative floor, so no share is more than one minor unit
 *  under its true value and the parts always sum to `amount` (the same rule credit notes use). Zero weights get zero. */
export function apportion(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (sum <= 0) return weights.map(() => 0);
  let run = 0, given = 0;
  return weights.map(w => { run += w; const upTo = Math.floor(amount * run / sum); const v = upTo - given; given = upTo; return v; });
}

const halfUp = (n: number, step: number) => (step > 0 ? Math.floor((n + step / 2) / step) * step : n);

/** R5/R6: tax on one gross amount in one block. Exclusive: taxable is the gross. Inclusive: floor(gross×10000÷(10000+rate)), remainder to tax. */
export function taxOn(gross: number, block: TaxBlock, cfg: BillingConfig): ComponentTax {
  const parts: TaxPart[] = block.collect ? block.parts : block.parts.map(p => ({ ...p, rateBps: 0 }));
  const rate = parts.reduce((a, p) => a + p.rateBps, 0);
  let taxable = gross;
  let tax = 0;
  if (block.mode === 'inclusive') {
    taxable = Math.floor(gross * 10000 / (10000 + rate));
    tax = gross - taxable;
  }
  let amounts: number[];
  if (block.mode === 'exclusive' && cfg.partRounding === 'independent') {
    amounts = parts.map(p => Math.round(taxable * p.rateBps / 10000));
  } else {
    if (block.mode === 'exclusive') tax = Math.round(taxable * rate / 10000);
    amounts = apportion(tax, parts.map(p => p.rateBps));
  }
  return { taxable, parts: parts.map((p, i) => ({ label: p.label, rateBps: p.rateBps, amount: amounts[i] })) };
}

function blockOf(line: Line, id: string): TaxBlock | undefined { return line.taxBlocks[id]; }

export function preview(lines: Line[], discount: BillDiscount | null, charges: ChargeIn[], cfg: BillingConfig): Result<BillBody> {
  const live = lines.filter(l => l.countsTowardTotal).sort((a, b) => (a.lineId < b.lineId ? -1 : a.lineId > b.lineId ? 1 : 0));   // "last line" is by lineId, never insertion order
  // R10: every component of a counted line needs a block the line snapshotted.
  const missing = live.filter(l => l.components.some(c => c.taxBlockId === null || !blockOf(l, c.taxBlockId)));
  if (missing.length) return { ok: false, code: 'failed-precondition', message: `no tax block: ${missing.map(l => l.name).join(', ')}`, lineIds: missing.map(l => l.lineId) };

  // R1: bill discount onto lines by net share, then every cut onto components by list share.
  if (live.some(l => l.qty < 1 || l.components.some(c => c.unitListPrice < 0))) return { ok: false, code: 'invalid-argument', message: 'qty below 1 or a negative component price' };
  const nets = live.map(net);
  if (nets.some(n => n < 0)) return { ok: false, code: 'failed-precondition', message: 'line below zero' };
  const shares = discount ? apportion(discount.amount, nets) : live.map(() => 0);
  if (discount && discount.amount > nets.reduce((a, n) => a + n, 0)) return { ok: false, code: 'failed-precondition', message: 'discount exceeds bill' };

  const blocks = new Map<string, Block>();
  const addTo = (id: string, def: TaxBlock, t: ComponentTax) => {
    const b = blocks.get(id) ?? { id, label: def.label, mode: def.mode, taxable: 0, parts: t.parts.map(p => ({ ...p, amount: 0 })), total: 0 };
    b.taxable += t.taxable;
    t.parts.forEach((p, i) => { b.parts[i].amount += p.amount; });
    b.total += t.taxable + t.parts.reduce((a, p) => a + p.amount, 0);
    blocks.set(id, b);
  };

  const billed: BilledLine[] = [];
  live.forEach((l, i) => {
    const weights = l.components.map(c => l.qty * c.unitListPrice);
    const cut = l.listPrice - nets[i] + shares[i];
    const cuts = apportion(cut, weights);
    const tax: Record<string, ComponentTax> = {};
    for (let k = 0; k < l.components.length; k++) {
      const c = l.components[k];
      const gross = weights[k] - cuts[k];
      if (gross < 0) return;   // checked below
      const t = taxOn(gross, blockOf(l, c.taxBlockId!)!, cfg);
      tax[c.id] = t;
      addTo(c.taxBlockId!, blockOf(l, c.taxBlockId!)!, t);
    }
    billed.push({ ...l, billDiscount: shares[i], tax, credited: { qty: 0 } });
  });
  if (billed.length !== live.length) return { ok: false, code: 'failed-precondition', message: 'discount takes a component below zero' };
  const voided = lines.filter(l => !l.countsTowardTotal).map(l => ({ ...l, billDiscount: 0, tax: {}, credited: { qty: 0 } }));

  // Charges: base is the net of the lines in the charge's own block (BL-S21), taxed in that block.
  const out: Charge[] = charges.map(ch => {
    const def = live.map(l => blockOf(l, ch.taxBlockId)).find(Boolean);
    const base = billed.reduce((a, l) => a + Object.entries(l.tax).reduce((s, [cid, t]) => s + (l.components.find(c => c.id === cid)!.taxBlockId === ch.taxBlockId ? t.taxable : 0), 0), 0);
    const amount = Math.floor(base * ch.pctBps / 10000);
    const t = def ? taxOn(amount, def, cfg) : { taxable: amount, parts: [] };
    if (def) addTo(ch.taxBlockId, def, t);
    return { ...ch, base, amount, tax: t };
  });

  const list = [...blocks.values()];
  const subtotal = list.reduce((a, b) => a + b.taxable, 0);
  const sum = list.reduce((a, b) => a + b.total, 0);
  const taxTotal = sum - subtotal;
  const roundOff = halfUp(sum, cfg.roundTo) - sum;
  return { ok: true, value: { lines: [...billed, ...voided], blocks: list, charges: out, discount, subtotal, taxTotal, roundOff, payable: sum + roundOff } };
}

// ---- issue / cancel / credit note (R3, R4). The number and counter come from domain/invoice inside the caller's transaction.

export interface Seller { name: string; address: string; taxId: string; stateCode: string; placeOfSupply: string }
export interface Meta {
  billId: string; number: string; series: string; fiscalYear: string; cid: string; tableIds: string[]; sessionId: string; draftId: string;
  issuedAt: number; issuedBy: string; seller: Seller; customer?: { name: string; taxId: string } | null;
}
export interface Bill extends BillBody, Meta {
  status: 'issued' | 'paid' | 'cancelled';
  cancelled?: { at: number; by: string; reason: string };
  creditNotes: { billId: string; number: string; at: number }[];
  creditNoteOf?: { billId: string; number: string; issuedAt: number };
}

/** BL-S7: a preview body becomes a bill. Lines are copied, never referenced. A bill with nothing to charge is refused. */
export function issue(body: BillBody, meta: Meta): Result<Bill> {
  if (!body.lines.some(l => l.countsTowardTotal)) return { ok: false, code: 'failed-precondition', message: 'nothing to bill' };
  const copy: BillBody = JSON.parse(JSON.stringify(body));
  return { ok: true, value: { ...copy, ...meta, seller: { ...meta.seller }, status: 'issued', creditNotes: [] } };
}

/** BL-S9: issued and unpaid only. Number kept, lines kept, charges kept; the caller frees the lines (billId → null). */
export function cancel(bill: Bill, at: number, by: string, reason: string): Result<Bill> {
  if (bill.status !== 'issued') return { ok: false, code: 'failed-precondition', message: `cannot cancel a ${bill.status} bill` };
  if (bill.creditNoteOf) return { ok: false, code: 'failed-precondition', message: 'a credit note is not cancelled' };
  return { ok: true, value: { ...bill, status: 'cancelled', cancelled: { at, by, reason } } };
}

/** Cumulative share so that successive notes telescope to exactly the charged amount: floor(total × k ÷ qty) at k credited units. */
const upTo = (total: number, k: number, qty: number) => Math.floor(total * k / qty);
const slice = (total: number, from: number, to: number, qty: number) => upTo(total, to, qty) - upTo(total, from, qty);

/** BL-S11: a new document reversing quantities of a paid bill's lines, amounts as charged, nothing re-priced. Charges and round-off stay on the original. */
export function creditNote(bill: Bill, credits: { lineId: string; qty: number }[], meta: Meta): Result<{ note: Bill; original: Bill }> {
  if (bill.status !== 'paid') return { ok: false, code: 'failed-precondition', message: `credit note needs a paid bill, this one is ${bill.status}` };
  if (!credits.length) return { ok: false, code: 'invalid-argument', message: 'nothing to credit' };
  const lines: BilledLine[] = [];
  const updated: BilledLine[] = bill.lines.map(l => ({ ...l, credited: { ...l.credited } }));
  for (const c of credits) {
    const l = updated.find(x => x.lineId === c.lineId);
    if (!l || !l.countsTowardTotal) return { ok: false, code: 'failed-precondition', message: `line ${c.lineId} is not creditable` };
    if (!Number.isInteger(c.qty) || c.qty < 1 || l.credited.qty + c.qty > l.qty) return { ok: false, code: 'failed-precondition', message: `only ${l.qty - l.credited.qty} of ${l.name} left to credit` };
    const from = l.credited.qty, to = from + c.qty;
    const neg = (n: number) => 0 - slice(n, from, to, l.qty);   // 0 − x, never −x: keeps +0 out of the JSON as −0
    const tax: Record<string, ComponentTax> = {};
    for (const [cid, t] of Object.entries(l.tax)) tax[cid] = { taxable: neg(t.taxable), parts: t.parts.map(p => ({ ...p, amount: neg(p.amount) })) };
    lines.push({
      ...l, qty: -c.qty, listPrice: neg(l.listPrice), billDiscount: neg(l.billDiscount), tax, credited: { qty: 0 },
      offer: l.offer ? { ...l.offer, amount: neg(l.offer.amount) } : l.offer,
      discount: l.discount ? { ...l.discount, amount: neg(l.discount.amount) } : l.discount,
    });
    l.credited = { qty: to };
  }
  const blocks = new Map<string, Block>();
  for (const l of lines) for (const c of l.components) {
    const t = l.tax[c.id]; const src = bill.blocks.find(b => b.id === c.taxBlockId)!;
    const b = blocks.get(src.id) ?? { ...src, taxable: 0, parts: src.parts.map(p => ({ ...p, amount: 0 })), total: 0 };
    b.taxable += t.taxable; t.parts.forEach((p, i) => { b.parts[i].amount += p.amount; }); b.total += t.taxable + t.parts.reduce((a, p) => a + p.amount, 0);
    blocks.set(src.id, b);
  }
  const list = [...blocks.values()];
  const subtotal = list.reduce((a, b) => a + b.taxable, 0);
  const sum = list.reduce((a, b) => a + b.total, 0);
  // A note that credits the last remaining unit of every line refunds what the guest actually paid,
  // so it carries the bill's round-off negated. A partial note never touches it.
  const whole = updated.every(l => !l.countsTowardTotal || l.credited.qty === l.qty) && !bill.charges.length;
  const roundOff = whole ? 0 - bill.roundOff : 0;
  const note: Bill = {
    ...meta, seller: { ...meta.seller }, status: 'issued', creditNotes: [], lines, blocks: list, charges: [], discount: null,
    subtotal, taxTotal: sum - subtotal, roundOff, payable: sum + roundOff,
    creditNoteOf: { billId: bill.billId, number: bill.number, issuedAt: bill.issuedAt },
  };
  const original: Bill = { ...bill, lines: updated, creditNotes: [...bill.creditNotes, { billId: meta.billId, number: meta.number, at: meta.issuedAt }] };
  return { ok: true, value: { note, original } };
}
