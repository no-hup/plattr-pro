// KT · the kitchen ticket, pure. Sheet: moonshot/SPEC_KT_print_path.md v4.
//
// R2 — a ticket is rows of text already padded to the station's width, with style flags. No byte, no vendor
// name, no currency symbol lives here; the encoder (adapters/printers/escpos.ts) does no arithmetic.
// R9 — the station is read off the FROZEN line (categoryId, then the component's tax block), never the live menu.
// R11 — a KOT carries no money. The money formatter lives here only because the bill (receipt.ts) shares it.

import { Line } from './line';

// ── Config (every number is a key with a default) ───────────────────────────

export interface PrintStation { label: string; charsPerLine: number; enabled: boolean; copies: number; statusQuery: boolean; address: string }
export interface PrintConfig {
  stations: Record<string, PrintStation>;
  route: Record<string, string>;            // categoryId → stationId
  routeByTaxBlock: Record<string, string>;  // taxBlockId → stationId, the fallback
  defaultStation: string;
  counterStation: string;
  agents: string[];                         // agent KINDS allowed to claim (R13)
  pollSeconds: number; claimLeaseSeconds: number; retryCount: number; retryDelayMs: number;
  connectTimeoutMs: number; writeTimeoutMs: number;
  staleAfterMinutes: number; unclaimedAfterSeconds: number; drawerStaleSeconds: number;
  currencyText: string; codePage: number; kotShowsPrices: boolean; billCopies: number;
  reprintMarker: string; cancelMarker: string; duplicateMarker: string;
  footer: string; drawerPulseMs: number; cutAfterTicket: boolean;
}

const station = (label: string): PrintStation => ({ label, charsPerLine: 48, enabled: true, copies: 1, statusQuery: false, address: '' });

export const PRINT_DEFAULTS: PrintConfig = {
  stations: { kitchen: station('KITCHEN'), bar: station('BAR'), counter: station('COUNTER') },
  route: {}, routeByTaxBlock: { liquor: 'bar' }, defaultStation: 'kitchen', counterStation: 'counter',
  agents: ['kitchen'],
  pollSeconds: 5, claimLeaseSeconds: 60, retryCount: 2, retryDelayMs: 2000, connectTimeoutMs: 3000, writeTimeoutMs: 10000,
  staleAfterMinutes: 30, unclaimedAfterSeconds: 90, drawerStaleSeconds: 60,
  currencyText: 'Rs.', codePage: 0, kotShowsPrices: false, billCopies: 1,
  reprintMarker: 'REPRINT', cancelMarker: 'CANCELLED', duplicateMarker: 'DUPLICATE',
  footer: '', drawerPulseMs: 50, cutAfterTicket: true,
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const pos = (v: unknown, d: number) => (isNum(v) && v > 0 ? v : d);
const nonneg = (v: unknown, d: number) => (isNum(v) && v >= 0 ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const strMap = (v: unknown): Record<string, string> =>
  v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === 'string') as [string, string][]) : {};

/** The `print` block of the settings document, or undefined for a fresh restaurant. Bad values fall back, never crash. */
export function printConfigFrom(doc: unknown): PrintConfig {
  const p = ((doc as { print?: Record<string, unknown> } | undefined)?.print ?? {}) as Record<string, unknown>;
  const D = PRINT_DEFAULTS;
  const given = p.stations && typeof p.stations === 'object' ? (p.stations as Record<string, Record<string, unknown>>) : null;
  const stations: Record<string, PrintStation> = {};
  for (const [id, s] of Object.entries(given ?? D.stations)) {
    const x = (s ?? {}) as Record<string, unknown>;
    const d = D.stations[id] ?? station(id.toUpperCase());
    stations[id] = {
      label: str(x.label, d.label), charsPerLine: pos(x.charsPerLine, d.charsPerLine), enabled: bool(x.enabled, d.enabled),
      copies: pos(x.copies, d.copies), statusQuery: bool(x.statusQuery, d.statusQuery), address: str(x.address, d.address),
    };
  }
  const route = p.route === undefined ? { ...D.route } : strMap(p.route);
  const routeByTaxBlock = p.routeByTaxBlock === undefined ? { ...D.routeByTaxBlock } : strMap(p.routeByTaxBlock);
  return {
    stations, route, routeByTaxBlock,
    defaultStation: str(p.defaultStation, D.defaultStation), counterStation: str(p.counterStation, D.counterStation),
    agents: Array.isArray(p.agents) && p.agents.every(a => typeof a === 'string') ? [...(p.agents as string[])] : [...D.agents],
    pollSeconds: pos(p.pollSeconds, D.pollSeconds), claimLeaseSeconds: pos(p.claimLeaseSeconds, D.claimLeaseSeconds),
    retryCount: nonneg(p.retryCount, D.retryCount), retryDelayMs: pos(p.retryDelayMs, D.retryDelayMs),
    connectTimeoutMs: pos(p.connectTimeoutMs, D.connectTimeoutMs), writeTimeoutMs: pos(p.writeTimeoutMs, D.writeTimeoutMs),
    staleAfterMinutes: nonneg(p.staleAfterMinutes, D.staleAfterMinutes), unclaimedAfterSeconds: pos(p.unclaimedAfterSeconds, D.unclaimedAfterSeconds),
    drawerStaleSeconds: pos(p.drawerStaleSeconds, D.drawerStaleSeconds),
    currencyText: str(p.currencyText, D.currencyText), codePage: nonneg(p.codePage, D.codePage), kotShowsPrices: bool(p.kotShowsPrices, D.kotShowsPrices),
    billCopies: pos(p.billCopies, D.billCopies),
    reprintMarker: str(p.reprintMarker, D.reprintMarker), cancelMarker: str(p.cancelMarker, D.cancelMarker), duplicateMarker: str(p.duplicateMarker, D.duplicateMarker),
    footer: str(p.footer, D.footer), drawerPulseMs: pos(p.drawerPulseMs, D.drawerPulseMs), cutAfterTicket: bool(p.cutAfterTicket, D.cutAfterTicket),
  };
}

// ── The ticket ─────────────────────────────────────────────────────────────

export interface Row { text: string; align?: 'l' | 'c' | 'r'; bold?: boolean; big?: boolean }
export interface Ticket {
  kind: 'kot' | 'cancel' | 'reprint' | 'bill' | 'duplicate' | 'creditNote' | 'drawer';   // drawer: no rows, just the pulse (KT-S17)
  stationId: string;
  charsPerLine: number;
  copies: number;
  rows: Row[];
  cut: boolean;
  drawer: boolean;
}

/** A placed line plus the guest's note, which the cart carries and the line does not. */
export type KotLine = Line & { note?: string };

export interface Round {
  orderNumber: string;
  cartIndex: number;
  tableLabel: string;    // what a person reads: "7", "5+6"
  placedBy: string;      // the captain's name, not the staff tag
  placedAt: number;
  lines: KotLine[];
}

export interface KotOptions {
  kind: 'kot' | 'reprint' | 'cancel';
  at: number;              // when this paper is produced
  tzOffsetMinutes: number; // the restaurant's clock
  n?: number;              // reprint number (the 2 in "REPRINT 2")
  reason?: string;         // cancel
  by?: string;             // cancel: who
}

// ── Formatting shared with the bill ────────────────────────────────────────

/** Indian grouping: the last three digits, then twos. 10245000 → "1,02,450.00". No currency text. */
export function formatAmount(minor: number): string {
  const neg = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const rupees = Math.floor(abs / 100);
  const paise = String(abs % 100).padStart(2, '0');
  const s = String(rupees);
  const head = s.length > 3 ? s.slice(0, -3) : '';
  const tail = s.slice(-3);
  const grouped = head ? head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + tail : tail;
  return `${neg ? '-' : ''}${grouped}.${paise}`;
}

/** "Rs. 1,02,450.00" — the currency text is config because no standard code page has a rupee glyph (KT-D5). */
export const formatMoney = (minor: number, currencyText: string): string => `${currencyText} ${formatAmount(minor)}`;

const local = (epochMs: number, tzOffsetMinutes: number) => new Date(epochMs + tzOffsetMinutes * 60_000);
const two = (n: number) => String(n).padStart(2, '0');
export const formatTime = (epochMs: number, tzOffsetMinutes: number): string => { const d = local(epochMs, tzOffsetMinutes); return `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`; };
export const formatDate = (epochMs: number, tzOffsetMinutes: number): string => { const d = local(epochMs, tzOffsetMinutes); return `${two(d.getUTCDate())}-${two(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`; };

/** Guest text never carries a control byte onto the wire. */
export const clean = (s: string): string => s.replace(/[\x00-\x1f\x7f]/g, ' ');

/**
 * Word-wrap to `width`; continuation lines are indented by `hang` spaces. A word longer than the room it has is
 * broken hard, never dropped. Returns unpadded lines.
 */
export function wrap(text: string, width: number, hang: number): string[] {
  const out: string[] = [];
  const room = () => (out.length === 0 ? width : width - hang);
  let cur = '';
  const flush = () => { out.push(out.length === 0 ? cur : ' '.repeat(hang) + cur); cur = ''; };
  for (let word of text.split(' ')) {
    if (!word) continue;
    while (word.length > room() - (cur ? cur.length + 1 : 0)) {
      if (cur) { flush(); continue; }
      const take = room();
      out.push(out.length === 0 ? word.slice(0, take) : ' '.repeat(hang) + word.slice(0, take));
      word = word.slice(take);
    }
    cur = cur ? `${cur} ${word}` : word;
  }
  if (cur || out.length === 0) flush();
  return out;
}

const pad = (s: string, width: number) => (s.length >= width ? s.slice(0, width) : s.padEnd(width));

/**
 * Lay one piece of text out as padded rows: as-is when it fits (runs of spaces are meaningful in a header),
 * word-wrapped with a hang when it does not. A leading indent ("    ! no onion") is kept on every wrapped row.
 */
export function layout(text: string, width: number, hang: number): string[] {
  const t = clean(text);
  if (t.length <= width) return [pad(t, width)];
  const lead = t.length - t.trimStart().length;
  const inner = wrap(t.trimStart(), width - lead, Math.max(0, hang - lead));
  return inner.map(x => pad(' '.repeat(lead) + x, width));
}

/** Two columns on one row: left, spaces, right. A left too long for the right's room is cut, never overlapped. */
export function lr(left: string, right: string, width: number): string {
  const room = width - right.length - 1;
  const l = left.length > room ? left.slice(0, Math.max(0, room)) : left;
  return l + ' '.repeat(Math.max(1, width - l.length - right.length)) + right;
}

// ── Routing (R9, KT-S3, KT-S19) ────────────────────────────────────────────

/** Where a frozen line's ticket goes. Throws on a line with no categoryId (a writer bug) or a station config does not know. */
export function route(line: Pick<Line, 'categoryId' | 'components' | 'lineId'>, cfg: PrintConfig): string {
  if (line.categoryId === undefined || line.categoryId === null || line.categoryId === '') {
    throw new Error(`line ${line.lineId} has no categoryId; routing reads the frozen line, and every placed line carries one`);
  }
  const block = line.components[0]?.taxBlockId ?? null;
  const st = cfg.route[line.categoryId] ?? (block ? cfg.routeByTaxBlock[block] : undefined) ?? cfg.defaultStation;
  if (!cfg.stations[st]) throw new Error(`station ${st} is not in print.stations`);
  return st;
}

// ── The KOT (KT-S1..S5, S11..S13, S18) ─────────────────────────────────────

/** One ticket per station the round's lines route to, in print.stations order. Disabled stations get none. */
export function kotTickets(round: Round, cfg: PrintConfig, o: KotOptions): Ticket[] {
  const lines = o.kind === 'cancel' ? round.lines : round.lines.filter(l => l.countsTowardTotal !== false);
  const by = new Map<string, KotLine[]>();
  for (const l of lines) { const st = route(l, cfg); by.set(st, [...(by.get(st) ?? []), l]); }
  const stations = Object.keys(cfg.stations).filter(id => by.has(id) && cfg.stations[id].enabled);
  const parts = stations.length;

  return stations.map((stationId, i): Ticket => {
    const s = cfg.stations[stationId];
    const w = s.charsPerLine;
    const rows: Row[] = [];
    const add = (text: string, style: Omit<Row, 'text'> = {}, hang = 0) => { for (const t of layout(text, w, hang)) rows.push({ text: t, ...style }); };

    if (o.kind === 'cancel') add(`*** ${cfg.cancelMarker} ***`, { align: 'c', big: true, bold: true });
    add(`TABLE ${round.tableLabel}`, { align: 'c', big: true, bold: true });
    const head = `#${round.orderNumber}-${round.cartIndex}  ${s.label}${parts > 1 ? `  ${i + 1}/${parts}` : ''}`;
    rows.push({ text: lr(head, formatTime(o.kind === 'cancel' ? o.at : round.placedAt, o.tzOffsetMinutes), w) });
    if (o.kind === 'reprint') add(`${cfg.reprintMarker} ${o.n ?? 2}  ${formatTime(o.at, o.tzOffsetMinutes)}`, { align: 'c', bold: true });
    add('');

    for (const l of by.get(stationId) as KotLine[]) {
      add(`${l.qty} x ${l.name}`, { bold: true }, 4);
      for (const c of l.components) {
        if (c.kind === 'variant') add(`    (${c.name})`, {}, 4);
        if (c.kind === 'addon') add(`    + ${c.name}`, {}, 4);
      }
      if (l.note && l.note.trim()) add(`    ! ${l.note.trim()}`, { big: true }, 4);
    }
    add('');
    if (o.kind === 'cancel') {
      if (o.reason) add(o.reason);
      add(`by ${o.by ?? ''}`.trimEnd());
    } else {
      add(`by ${round.placedBy}`);
    }
    return { kind: o.kind, stationId, charsPerLine: w, copies: s.copies, rows, cut: cfg.cutAfterTicket, drawer: false };
  });
}
