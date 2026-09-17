// OF · Offline & sync — the till's four config keys with their defaults. Pure; served by approvals-config.
// Sheet: moonshot/SPEC_OF_offline_and_sync.md "Config keys".
export interface OfflineConfig { staleAfterSeconds: number; estimateMaxAgeMinutes: number; estimateText: string; reconcileBeforeClose: boolean }

export const OFFLINE_DEFAULTS: OfflineConfig = {
  staleAfterSeconds: 15,
  estimateMaxAgeMinutes: 240,
  estimateText: 'ESTIMATE, not a tax invoice. A tax invoice will be issued.',
  reconcileBeforeClose: true,
};

/** Raw `offline` block → full config. A bad or missing key takes its default, never a blank. */
export function offlineFrom(raw: unknown): OfflineConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = (k: keyof OfflineConfig) => (typeof r[k] === 'number' && Number.isFinite(r[k]) && (r[k] as number) >= 0 ? r[k] : OFFLINE_DEFAULTS[k]) as number;
  return {
    staleAfterSeconds: num('staleAfterSeconds'),
    estimateMaxAgeMinutes: num('estimateMaxAgeMinutes'),
    estimateText: typeof r.estimateText === 'string' && r.estimateText.trim() !== '' ? r.estimateText : OFFLINE_DEFAULTS.estimateText,
    reconcileBeforeClose: typeof r.reconcileBeforeClose === 'boolean' ? r.reconcileBeforeClose : OFFLINE_DEFAULTS.reconcileBeforeClose,
  };
}
