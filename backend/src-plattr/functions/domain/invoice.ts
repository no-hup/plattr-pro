// BL · invoice numbering. Pure. A number is handed out only at issue (R3); the caller runs this inside the transaction.
export interface InvoiceConfig { series: string; creditNoteSeries: string; fiscalYearStartMonth: number; width: number; timezone: string }
export const INVOICE_DEFAULTS: InvoiceConfig = { series: 'A', creditNoteSeries: 'CN', fiscalYearStartMonth: 4, width: 4, timezone: 'Asia/Kolkata' };
export interface Counter { next: number }

/** "2026-27" for a year starting in month 4; "2027" when the year starts in January. Day boundary is the restaurant's zone (BL-S18). */
export function fiscalYear(now: number, cfg: InvoiceConfig): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, year: 'numeric', month: 'numeric' }).formatToParts(new Date(now));
  const y = Number(parts.find(p => p.type === 'year')!.value);
  const m = Number(parts.find(p => p.type === 'month')!.value);
  if (cfg.fiscalYearStartMonth === 1) return String(y);
  const start = m >= cfg.fiscalYearStartMonth ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export function counterKey(series: string, now: number, cfg: InvoiceConfig): string {
  return `${series}_${fiscalYear(now, cfg)}`;
}

/** Pads to width, never wraps: next 10000 at width 4 is "10000". A missing counter starts at 1. */
export function nextNumber(counter: Counter | null, cfg: InvoiceConfig): { number: string; counter: Counter } {
  const n = counter?.next ?? 1;
  return { number: String(n).padStart(cfg.width, '0'), counter: { next: n + 1 } };
}
