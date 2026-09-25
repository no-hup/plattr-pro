/**
 * Suite: offer-dates. A26 (moonshot/reviews/2026-09-25-qa-admin-app.md), Shaurya 2026-09-26: an offer date means
 * midnight to midnight in the restaurant's clock (IST, `payments.timezoneOffsetMinutes` 330). The manager sets a
 * Navratri offer "26 Sep to 30 Sep"; it must be live from 00:00 IST on the 26th through the last dinner on the 30th.
 * The engine at fixed clock times is unit-tested (test/unit/offers/offerDates.test.js); this proves what the real
 * admin writer stores. The offer is made inactive and deleted at the end, so no other suite's totals move.
 */
import { call, fsFor, ok } from '../lib/rest.mjs';
import { serverLogin } from '../lib/auth.js';
import config from '../lib/config.js';

const RID = config.RESTAURANT_ID;   // MockData5's res_e2e_all_on: no settings clock, so the 330 default
const { getDoc, delDoc } = fsFor(RID);
const need = (r, what) => { if (!ok(r)) throw new Error(`${what}: ${r?.message || JSON.stringify(r).slice(0, 200)}`); return r.data ?? r; };
const offer = validity => ({
  title: 'Navratri 10%', description: 'A26 e2e', type: 'PERCENTAGE', scope: 'ORDER', isActive: false,
  benefit: { value: 10 }, validity,
});

export default async function offerDatesSuite() {
  const results = { name: 'offer-dates', pass: 0, fail: 0, tests: [] };
  const check = (label, cond, actual) => {
    results.tests.push({ pass: Boolean(cond), message: `${label} → ${cond ? 'ok' : 'FAILED'}`, actual: cond ? undefined : actual });
    cond ? results.pass++ : results.fail++;
  };
  const made = [];
  try {
    const sessionId = await serverLogin(RID, config.ADMIN_EMAIL);
    const create = validity => call('admin-createOffer', { restaurantId: RID, sessionId, offerData: offer(validity) });

    const r = need(await create({ startDate: '2026-09-26', endDate: '2026-09-30' }), 'create');
    made.push(r.offerId);
    const stored = (await getDoc(`offers/${r.offerId}`))?.validity;
    check('D1 "26 Sep to 30 Sep" is stored 00:00 IST on the 26th to 23:59:59.999 IST on the 30th, zone written in',
      stored?.startDate === '2026-09-26T00:00:00.000+05:30' && stored?.endDate === '2026-09-30T23:59:59.999+05:30', stored);

    const one = need(await create({ startDate: '2026-09-27', endDate: '2026-09-27' }), 'one-day');
    made.push(one.offerId);
    check('D2 a one-day offer (27 Sep to 27 Sep) is accepted as the whole of the 27th',
      (await getDoc(`offers/${one.offerId}`))?.validity?.endDate === '2026-09-27T23:59:59.999+05:30');

    const upd = await call('admin-updateOffer', { restaurantId: RID, sessionId, offerId: r.offerId, offerData: { title: 'Navratri 12%' } });
    check('D3 an edit that sends no dates keeps the stored window', ok(upd) && (await getDoc(`offers/${r.offerId}`))?.validity?.startDate === '2026-09-26T00:00:00.000+05:30', upd);

    const old = await create({ startDate: '2026-09-26T00:00:00.000', endDate: '2026-09-30T00:00:00.000' });
    check('D4 the old zoneless shape is refused, naming the format', !ok(old) && /YYYY-MM-DD/.test(old.message), old);
    const back = await create({ startDate: '2026-09-30', endDate: '2026-09-26' });
    check('D5 an end day before the start day is refused', !ok(back) && /before the start/.test(back.message), back);
  } catch (e) {
    check(`setup failed — ${e.message}`, false);
  }
  for (const id of made) await delDoc(`offers/${id}`);
  return results;
}
