/* eslint-disable global-require */

// A26 (admin screen run 2026-09-25), Shaurya 2026-09-26: an offer date means midnight to midnight in the
// restaurant's clock. The editor stored "2026-09-26T00:00:00.000" with no zone and the functions read it in UTC,
// so "from 26 Sep" began at 05:30 IST and "until 30 Sep" ended at 05:30 IST on the 30th, losing its last lunch
// and dinner. Times below are IST (+05:30), written as the UTC instant the clock would hold.

jest.mock('../../../admin/admin', () => ({ db: {}, admin: {} }));
const { offerWindow } = require('../../../adminApp/offers_admin');
const { validateOfferApplication } = require('../../../offers/offerEngine');

const IST = 330;
const cart = { items: [{ menuItemId: 'a', cartItemId: 1, quantity: 1, status: 'PENDING', priceInfo: { finalPrice: 500 } }], priceInfo: { basePrice: 500 } };
const offer = validity => ({ id: 'off_navratri', isActive: true, type: 'PERCENTAGE', scope: 'ORDER', benefit: { value: 10 }, validity });
const at = (utc, validity) => { jest.setSystemTime(new Date(utc)); return validateOfferApplication(offer(validity), cart, {}); };

describe('offer dates are whole days in the restaurant clock', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  it('"26 Sep to 30 Sep" is stored as 00:00 IST on the 26th to the last millisecond of the 30th, zone written in', () => {
    expect(offerWindow('2026-09-26', '2026-09-30', IST)).toEqual({
      startDate: '2026-09-26T00:00:00.000+05:30',
      endDate: '2026-09-30T23:59:59.999+05:30',
    });
  });

  const window = offerWindow('2026-09-26', '2026-09-30', IST);
  it('applies at 00:10 IST on 26 Sep (the first minutes of the first day)', () => {
    expect(at('2026-09-25T18:40:00Z', window).isValid).toBe(true);
  });
  it('applies at 23:50 IST on 30 Sep (last dinner of the last day)', () => {
    expect(at('2026-09-30T18:20:00Z', window).isValid).toBe(true);
  });
  it('does not apply at 00:10 IST on 1 Oct', () => {
    expect(at('2026-09-30T18:40:00Z', window)).toMatchObject({ isValid: false, reason: 'Offer has expired' });
  });
  it('does not apply at 23:50 IST on 25 Sep', () => {
    expect(at('2026-09-25T18:20:00Z', window)).toMatchObject({ isValid: false, reason: 'Offer not yet active' });
  });

  it('a one-day offer (Sunday brunch, 27 Sep to 27 Sep) is a whole day, not refused as end-before-start', () => {
    const sunday = offerWindow('2026-09-27', '2026-09-27', IST);
    expect(at('2026-09-26T18:31:00Z', sunday).isValid).toBe(true);    // 00:01 IST 27 Sep
    expect(at('2026-09-27T18:29:00Z', sunday).isValid).toBe(true);    // 23:59 IST 27 Sep
  });

  it('refuses an end day before the start day, a non-date and an impossible date', () => {
    expect(() => offerWindow('2026-09-30', '2026-09-26', IST)).toThrow(/end date is before the start date/);
    expect(() => offerWindow('26/09/2026', '2026-09-30', IST)).toThrow(/YYYY-MM-DD/);
    expect(() => offerWindow('2026-09-26T00:00:00.000', '2026-09-30', IST)).toThrow(/YYYY-MM-DD/);
    expect(() => offerWindow('2026-02-30', '2026-03-02', IST)).toThrow(/YYYY-MM-DD/);
  });

  it('refuses a restaurant clock that is not a real offset (it would save an offer no reader can parse)', () => {
    expect(() => offerWindow('2026-09-26', '2026-09-30', 6000)).toThrow(/not a real offset/);
    expect(() => offerWindow('2026-09-26', '2026-09-30', 330.5)).toThrow(/not a real offset/);
  });

  it('fails closed on a date with no zone (the old editor shape): it could be read two ways, so it is not read at all', () => {
    const old = { startDate: '2026-09-26T00:00:00.000', endDate: '2026-09-30T00:00:00.000' };
    expect(at('2026-09-28T08:00:00Z', old)).toMatchObject({ isValid: false, reason: 'Offer dates are unreadable' });
  });
  it('fails closed on a missing end date', () => {
    expect(at('2026-09-28T08:00:00Z', { startDate: '2026-09-26T00:00:00.000+05:30' })).toMatchObject({ isValid: false, reason: 'Offer dates are unreadable' });
  });
});
