// Per-restaurant config, read once per request. Defaults live with the keys in domain/approvals.
import { ApprovalsConfig, configFrom, DEFAULTS } from '../domain/approvals';

export { DEFAULTS };

export async function loadApprovalsConfig(read: (restaurantId: string) => Promise<unknown>, warn: (msg: string) => void, restaurantId: string): Promise<ApprovalsConfig> {
  const { config, warnings } = configFrom(await read(restaurantId));
  warnings.forEach(warn);
  return config;
}

import { PaymentsConfig, configFrom as paymentsConfigFrom } from '../domain/payments';

/** PY. `read` returns the settings document (or undefined for a fresh restaurant); a throw refuses the payment. */
export async function loadPaymentsConfig(read: (restaurantId: string) => Promise<unknown>, warn: (msg: string) => void, restaurantId: string): Promise<PaymentsConfig> {
  const { config, warnings } = paymentsConfigFrom(await read(restaurantId));
  warnings.forEach(warn);
  return config;
}
