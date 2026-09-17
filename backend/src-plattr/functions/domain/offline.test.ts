import { offlineFrom, OFFLINE_DEFAULTS } from './offline';

describe('OF · domain/offline config', () => {
  it('missing block → the four defaults (15 s, 240 min, the ESTIMATE text, reconcile before close)', () => {
    expect(offlineFrom(undefined)).toEqual(OFFLINE_DEFAULTS);
    expect(OFFLINE_DEFAULTS).toEqual({ staleAfterSeconds: 15, estimateMaxAgeMinutes: 240, estimateText: 'ESTIMATE, not a tax invoice. A tax invoice will be issued.', reconcileBeforeClose: true });
  });
  it('valid keys are taken; a bad key (negative, string number, empty text) takes its default; 0 is a value, not "no limit"', () => {
    expect(offlineFrom({ staleAfterSeconds: 1, estimateMaxAgeMinutes: 0, estimateText: 'ANDAAZ, GST bill to follow', reconcileBeforeClose: false }))
      .toEqual({ staleAfterSeconds: 1, estimateMaxAgeMinutes: 0, estimateText: 'ANDAAZ, GST bill to follow', reconcileBeforeClose: false });
    expect(offlineFrom({ staleAfterSeconds: -5, estimateMaxAgeMinutes: '240', estimateText: '  ', reconcileBeforeClose: 'yes' })).toEqual(OFFLINE_DEFAULTS);
  });
});
