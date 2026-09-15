// Per-restaurant config, read once per request. Defaults live with the keys in domain/approvals.
import { ApprovalsConfig, configFrom, DEFAULTS } from '../domain/approvals';

export { DEFAULTS };

export async function loadApprovalsConfig(read: (restaurantId: string) => Promise<unknown>, warn: (msg: string) => void, restaurantId: string): Promise<ApprovalsConfig> {
  const { config, warnings } = configFrom(await read(restaurantId));
  warnings.forEach(warn);
  return config;
}
