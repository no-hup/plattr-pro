const functions = require('firebase-functions');
const environment = require('../singleton/Environment');
const featureFlags = require('../singleton/FeatureFlags');
const { withCors } = require('../utils/cors');

/**
 * Test-only endpoint to override feature flags at runtime.
 * Guarded by emulator check — will 403 in production.
 *
 * POST { "data": { "flags": { "isOtpManadatoryAtScan": false, ... } } }
 * POST { "data": { "reset": true } }  — restores defaults
 */
const DEFAULTS = {
  isOtpManadatoryAtScan: true,
  isUsernameEnabled: true,
  isMultiUserSupportEnabled: false,
  isMultipleVariantOrAddonForMenuItemsSupported: true,
  sendServerNotifications: false,
  shouldUpdateFoodStatusAtItemLevelORAtOrderLevel: false,
  fallbackToSameCustomConfigurationForAddItem: true,
};

const setFeatureFlags = functions.https.onRequest(withCors(async (req, res) => {
  if (!environment.isEmulator()) {
    res.status(403).json({
      result: {
        status: 'error',
        message: 'setFeatureFlags is available only in emulator/development environments.',
        data: { code: 'permission-denied' }
      }
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      result: { status: 'error', message: 'Method not allowed. Use POST.', data: { code: 'invalid-argument' } }
    });
    return;
  }

  const data = req.body?.data || req.body || {};

  if (data.reset) {
    const { db } = require('../admin/admin');
    await db.collection('_system').doc('featureFlagOverrides').delete().catch(() => {});
    res.status(200).json({
      result: { status: 'success', message: 'Feature flags reset to defaults', data: { flags: { ...DEFAULTS } } }
    });
    return;
  }

  const incoming = data.flags;
  if (!incoming || typeof incoming !== 'object') {
    res.status(400).json({
      result: { status: 'error', message: 'Provide { flags: { ... } } or { reset: true }', data: { code: 'invalid-argument' } }
    });
    return;
  }

  // Write overrides to Firestore so all functions can read them.
  // Each function calls featureFlags.loadOverrides(db) to pick up changes.
  const { db } = require('../admin/admin');

  const applied = {};
  const unknown = [];
  const overrides = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (DEFAULTS.hasOwnProperty(key)) {
      overrides[key] = Boolean(value);
      applied[key] = overrides[key];
    } else {
      unknown.push(key);
    }
  }

  await db.collection('_system').doc('featureFlagOverrides').set(overrides, { merge: true });

  const current = { ...DEFAULTS, ...overrides };

  res.status(200).json({
    result: {
      status: 'success',
      message: `Feature flags updated${unknown.length ? ` (unknown flags ignored: ${unknown.join(', ')})` : ''}`,
      data: { applied, current, unknown }
    }
  });
}));

module.exports = { setFeatureFlags };
