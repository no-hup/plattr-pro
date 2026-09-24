// BL · invoice numbering. Hand-computed: IST is UTC+5:30, so 31 Mar 18:30 UTC is 1 Apr 00:00 IST.
import { INVOICE_DEFAULTS as cfg, fiscalYear, counterKey, nextNumber } from './invoice';

const utc = (s: string) => Date.parse(s + 'Z');

describe('domain/invoice', () => {
  it('BL-S7 counter {next: 417} → "0417", counter {next: 418}', () => {
    expect(nextNumber({ next: 417 }, cfg)).toEqual({ number: '0417', counter: { next: 418 } });
  });
  it('BL-S7 missing counter starts at "0001"', () => {
    expect(nextNumber(null, cfg)).toEqual({ number: '0001', counter: { next: 2 } });
  });
  it('BL-S7 a counter that exists but is unreadable is refused (null), never restarted at 0001', () => {
    for (const next of [undefined, null, NaN, 0, -3, 1.5, '12', Infinity]) {
      expect(nextNumber({ next } as never, cfg)).toBeNull();
    }
  });
  it('BL-S7 next 10000 at width 4 → "10000", never wraps', () => {
    expect(nextNumber({ next: 10000 }, cfg)!.number).toBe('10000');
  });
  it('BL-S12 two issues from one counter: 0417 then 0418', () => {
    const a = nextNumber({ next: 417 }, cfg);
    expect(nextNumber(a!.counter, cfg)!.number).toBe('0418');
  });
  it('BL-S18 31 Mar 2027 23:59 IST (18:29 UTC) → "2026-27"; 1 Apr 2027 00:00 IST (31 Mar 18:30 UTC) → "2027-28"', () => {
    expect(fiscalYear(utc('2027-03-31T18:29:00'), cfg)).toBe('2026-27');
    expect(fiscalYear(utc('2027-03-31T18:30:00'), cfg)).toBe('2027-28');
  });
  it('BL-S18 the zone decides, not UTC: 1 Apr 2027 00:00 UTC is 05:30 IST, "2027-28"; in Etc/UTC 31 Mar 18:30 is still "2026-27"', () => {
    expect(fiscalYear(utc('2027-04-01T00:00:00'), cfg)).toBe('2027-28');
    expect(fiscalYear(utc('2027-03-31T18:30:00'), { ...cfg, timezone: 'Etc/UTC' })).toBe('2026-27');
  });
  it('BL-S18 startMonth 1 → "2027"; counter key is series_fiscalYear', () => {
    expect(fiscalYear(utc('2027-03-31T18:30:00'), { ...cfg, fiscalYearStartMonth: 1 })).toBe('2027');
    expect(counterKey('CN', utc('2026-09-15T15:00:00'), cfg)).toBe('CN_2026-27');
  });
  it('BL-S18 century roll: fiscal year starting 2099 → "2099-00"', () => {
    expect(fiscalYear(utc('2099-06-01T00:00:00'), cfg)).toBe('2099-00');
  });
});
