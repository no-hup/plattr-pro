// `businessDayWindow` must be the exact inverse of `businessDateFor`, because day close
// swaps a full-collection scan for a range query on that window. If the window is off by
// even a millisecond at an edge, a bill drops off the close it belongs to — or joins one
// it does not.

import { DEFAULTS, PaymentsConfig, businessDateFor, businessDayWindow } from './payments';

const cfgs: Array<[string, PaymentsConfig]> = [
  ['defaults (IST, 04:00 close)', DEFAULTS],
  ['UTC, midnight close', { ...DEFAULTS, timezoneOffsetMinutes: 0, dayCloseHour: 0, dayCloseMinute: 0 }],
  ['negative offset', { ...DEFAULTS, timezoneOffsetMinutes: -300, dayCloseHour: 3, dayCloseMinute: 30 }],
  ['late close', { ...DEFAULTS, dayCloseHour: 6, dayCloseMinute: 45 }],
];

describe.each(cfgs)('businessDayWindow — %s', (_name, cfg) => {
  const date = '2026-09-17';

  it('every instant inside the window maps back to the date', () => {
    const { start, end } = businessDayWindow(date, cfg);
    expect(businessDateFor(start, cfg)).toBe(date);
    expect(businessDateFor(start + 1, cfg)).toBe(date);
    expect(businessDateFor(Math.floor((start + end) / 2), cfg)).toBe(date);
    expect(businessDateFor(end - 1, cfg)).toBe(date);
  });

  it('the boundaries are half-open — end belongs to the next day, start-1 to the previous', () => {
    const { start, end } = businessDayWindow(date, cfg);
    expect(businessDateFor(end, cfg)).toBe('2026-09-18');
    expect(businessDateFor(start - 1, cfg)).toBe('2026-09-16');
  });

  it('the window is exactly 24 hours and abuts the next one', () => {
    const { start, end } = businessDayWindow(date, cfg);
    expect(end - start).toBe(86_400_000);
    expect(businessDayWindow('2026-09-18', cfg).start).toBe(end);
  });

  it('round-trips for a run of consecutive dates, including a month end', () => {
    for (const d of ['2026-09-29', '2026-09-30', '2026-10-01', '2026-02-28', '2026-03-01']) {
      const { start, end } = businessDayWindow(d, cfg);
      expect(businessDateFor(start, cfg)).toBe(d);
      expect(businessDateFor(end - 1, cfg)).toBe(d);
    }
  });
});
