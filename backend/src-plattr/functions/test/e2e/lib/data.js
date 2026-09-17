import config from './config.js';
import { callDev } from './api.js';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Clear all Firestore emulator data and reimport MockData5.
 */
export async function resetData() {
  // Step 1: DELETE all documents via Firestore emulator REST API
  const url = `http://${config.FIRESTORE_HOST}/emulator/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`;
  console.log('[data] Clearing Firestore emulator...');
  const resp = await fetch(url, { method: 'DELETE' });
  if (!resp.ok) {
    throw new Error(`Failed to clear emulator: ${resp.status} ${resp.statusText}`);
  }
  console.log('[data] Firestore cleared');

  // Step 2: Reimport mock data with fresh timestamps
  const importScript = resolve(__dirname, '../../../mock/importMockData5.js');
  console.log('[data] Importing MockData5 (--clean --refresh-timestamps)...');
  execSync(`node "${importScript}" --refresh-timestamps`, {
    env: {
      ...process.env,
      FUNCTIONS_EMULATOR: 'true',
      NODE_ENV: 'development',
      FIRESTORE_EMULATOR_HOST: config.FIRESTORE_HOST,
    },
    stdio: 'inherit',
    timeout: 30000,
  });
  console.log('[data] Mock data imported');
}

/**
 * Override feature flags by writing directly to Firestore.
 * The backend's FeatureFlags.loadOverrides(db) reads from
 * _system/featureFlagOverrides before each flag check.
 * @param {Object} flags - e.g. { isOtpManadatoryAtScan: false }
 */
export async function setFeatureFlags(flags) {
  const url = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents/_system/featureFlagOverrides`;

  // Convert flags to Firestore REST API format
  const fields = {};
  for (const [key, value] of Object.entries(flags)) {
    fields[key] = { booleanValue: Boolean(value) };
  }

  const resp = await fetch(url, {
    method: 'PATCH',
    // 'Bearer owner' = emulator admin bypass (rules are locked in prod)
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });

  if (!resp.ok) {
    throw new Error(`setFeatureFlags: Firestore write failed: ${resp.status} ${resp.statusText}`);
  }
  console.log(`[data] Feature flags set:`, flags);
}

/**
 * Turn the waiter-confirmation gate on or off for one restaurant.
 *
 * Unlike the FeatureFlags singleton (process-global, `_system/featureFlagOverrides`),
 * this is a per-restaurant setting in `restaurants/{id}/config/settings`, so it is
 * written with an updateMask — the same doc holds the tax blocks.
 */
export async function setWaiterConfirmation(restaurantId, enabled) {
  const url = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents`
    + `/restaurants/${restaurantId}/config/settings?updateMask.fieldPaths=ordering`;

  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({
      fields: {
        ordering: {
          mapValue: { fields: { requireWaiterConfirmation: { booleanValue: Boolean(enabled) } } },
        },
      },
    }),
  });

  if (!resp.ok) {
    throw new Error(`setWaiterConfirmation: Firestore write failed: ${resp.status} ${resp.statusText}`);
  }
  console.log(`[data] Waiter confirmation for ${restaurantId}: ${enabled ? 'ON' : 'OFF'}`);
}

/**
 * Reset feature flags by deleting the Firestore override document.
 */
export async function resetFeatureFlags() {
  const url = `http://${config.FIRESTORE_HOST}/v1/projects/${config.PROJECT_ID}/databases/(default)/documents/_system/featureFlagOverrides`;
  await fetch(url, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } }).catch(() => {});
  console.log('[data] Feature flags reset to defaults');
}

/**
 * Quick health check: is the emulator reachable?
 */
export async function checkEmulator() {
  try {
    const resp = await fetch(`${config.BASE_URL}/dev-listRestaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {} }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
