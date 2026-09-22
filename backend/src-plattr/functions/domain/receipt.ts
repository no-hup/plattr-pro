// KT · the guest's paper, pure: the bill (KT-S6, S14, S21), its DUPLICATE (KT-S16), the credit note (KT-S15).
// R10 — every figure is read from the frozen bill: lines, blocks, charges, discount, roundOff, payable. Nothing is
// summed, rounded or re-ordered here; a figure on paper BL did not compute is a bug in this file.

import { Bill, BilledLine, Block } from './billing';
import { PrintConfig, Row, Ticket, formatAmount, formatDate, formatMoney, formatTime, layout, lr } from './kot';
export type { Ticket, Row };

export interface ReceiptOptions {
  kind: 'bill' | 'duplicate';
  tzOffsetMinutes: number;
  tableLabel: string;      // what a person reads; the bill carries table ids
  title?: string;          // BL's call: "Tax Invoice" or "Invoice-cum-Bill of Supply" (KT-S14)
  at?: number;             // duplicate: when the copy was printed
}

class Sheet {
  rows: Row[] = [];
  constructor(readonly w: number) {}
  add(text: string, style: Omit<Row, 'text'> = {}, hang = 0) { for (const t of layout(text, this.w, hang)) this.rows.push({ text: t, ...style }); }
  lr(left: string, right: string, style: Omit<Row, 'text'> = {}) { this.rows.push({ text: lr(left, right, this.w), ...style }); }
  dash() { this.rows.push({ text: '-'.repeat(this.w) }); }
}

const blockOf = (l: BilledLine): string | null => l.components[0]?.taxBlockId ?? null;
const pct = (bps: number) => String(bps / 100).replace(/\.0$/, '');
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function header(sh: Sheet, bill: Bill, title: string, numberLabel: string, tableLabel: string, tz: number) {
  sh.add(bill.seller.name, { align: 'c', big: true, bold: true });
  sh.add(bill.seller.address, { align: 'c' });
  sh.add(`GSTIN ${bill.seller.taxId}`, { align: 'c' });
  sh.add(title, { align: 'c', bold: true });
  sh.lr(numberLabel, `${formatDate(bill.issuedAt, tz)} ${formatTime(bill.issuedAt, tz)}`);
  if (bill.creditNoteOf) sh.add(`Against bill ${bill.creditNoteOf.number} of ${formatDate(bill.creditNoteOf.issuedAt, tz)}`);
  sh.add(`Table ${tableLabel}`);
  if (bill.customer) { sh.add(`Bill to: ${bill.customer.name}`); sh.add(`GSTIN ${bill.customer.taxId}`); }
}

/** One block: heading, its lines (with their own offer and discount rows), its charges, then Taxable and the parts — or Total when it has none. */
function block(sh: Sheet, bill: Bill, b: Block) {
  sh.add(b.id.toUpperCase(), { bold: true });
  for (const l of bill.lines) {
    if (blockOf(l) !== b.id || l.countsTowardTotal === false) continue;
    sh.lr(`${l.qty} x ${l.name}`, formatAmount(l.listPrice));
    if (l.offer && l.offer.amount) sh.lr(`    ${(l.offer as { name?: string }).name ?? 'Offer'}`, formatAmount(-l.offer.amount));
    if (l.discount && l.discount.amount) sh.lr('    Discount', formatAmount(-l.discount.amount));
  }
  for (const c of bill.charges) if (c.taxBlockId === b.id && c.amount) sh.lr(`${cap(c.type)} charge ${pct(c.pctBps)}%`, formatAmount(c.amount));
  if (b.parts.length) {
    sh.lr('Taxable', formatAmount(b.taxable));
    for (const p of b.parts) sh.lr(`${p.label} ${pct(p.rateBps)}%`, formatAmount(p.amount));
  } else {
    sh.lr('Total', formatAmount(b.total));
  }
}

function body(sh: Sheet, bill: Bill, cfg: PrintConfig) {
  sh.dash();
  for (const b of bill.blocks) block(sh, bill, b);
  if (bill.discount && bill.discount.amount) sh.lr('Discount', formatAmount(-bill.discount.amount));
  sh.dash();
  if (bill.roundOff) sh.lr('Round-off', (bill.roundOff > 0 ? '+' : '') + formatAmount(bill.roundOff));
  sh.lr('TOTAL', formatMoney(bill.payable, cfg.currencyText), { big: true, bold: true });
  sh.dash();
  sh.add(`Place of supply: ${bill.seller.placeOfSupply}`);
  sh.add('Reverse charge: No');
  if (cfg.footer) sh.add(cfg.footer);
}

const counter = (cfg: PrintConfig) => {
  const s = cfg.stations[cfg.counterStation];
  if (!s) throw new Error(`counter station ${cfg.counterStation} is not in print.stations`);
  return s;
};

/** KT-S6 / KT-S16. The DUPLICATE is the same bill under a marker row; its body is byte-identical to the original. */
export function billTicket(bill: Bill, cfg: PrintConfig, o: ReceiptOptions): Ticket {
  const s = counter(cfg);
  const sh = new Sheet(s.charsPerLine);
  if (o.kind === 'duplicate') sh.add(`${cfg.duplicateMarker}  ${formatTime(o.at ?? bill.issuedAt, o.tzOffsetMinutes)}`, { align: 'c', big: true, bold: true });
  header(sh, bill, o.title ?? 'Tax Invoice', `Bill ${bill.number}`, o.tableLabel, o.tzOffsetMinutes);
  body(sh, bill, cfg);
  return { kind: o.kind, stationId: cfg.counterStation, charsPerLine: s.charsPerLine, copies: cfg.billCopies, rows: sh.rows, cut: cfg.cutAfterTicket, drawer: false };
}

/** KT-S15. A credit note is a bill document with `creditNoteOf`; every figure on it is already negative. */
export function creditNoteTicket(note: Bill, cfg: PrintConfig, o: Omit<ReceiptOptions, 'kind'>): Ticket {
  if (!note.creditNoteOf) throw new Error(`${note.number} is not a credit note`);
  const s = counter(cfg);
  const sh = new Sheet(s.charsPerLine);
  header(sh, note, 'Credit Note', note.number, o.tableLabel, o.tzOffsetMinutes);
  body(sh, note, cfg);
  return { kind: 'creditNote', stationId: cfg.counterStation, charsPerLine: s.charsPerLine, copies: cfg.billCopies, rows: sh.rows, cut: cfg.cutAfterTicket, drawer: false };
}
