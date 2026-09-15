/**
 * Shared authentication and authorization helpers for Admin App
 */

const { db } = require('../admin/admin');
const errorHandler = require('../singleton/ErrorHandler');
const timestamp = require('../utils/timestamp');

/**
 * Server role constants
 */
const SERVER_ROLES = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    SERVER: 'SERVER',
    KITCHEN: 'KITCHEN',
};

/**
 * Validates that a session is active and belongs to a user with ADMIN or MANAGER role.
 * @param {string} restaurantId - The restaurant ID
 * @param {string} sessionId - The session ID to validate
 * @returns {Promise<{serverData: object, serverId: string}>} The validated server data
 * @throws Will throw an error if session is invalid or user lacks permissions
 */
async function validateAdminSession(restaurantId, sessionId) {
    if (!sessionId) {
        errorHandler.unauthorized('Session ID is required', { restaurantId });
    }

    // Look up the session
    const sessionRef = db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('sessions')
        .doc(sessionId);

    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
        errorHandler.unauthorized('Invalid or expired session', { restaurantId, sessionId });
    }

    const sessionData = sessionDoc.data();

    // Check if session is still valid. Seed/legacy sessions store expiresAt as an
    // ISO string; safeToDate handles Timestamp, Date, string and raw {_seconds}.
    const adminExpiry = timestamp.safeToDate(sessionData.expiresAt);
    if (sessionData.expiresAt && adminExpiry && adminExpiry < new Date()) {
        errorHandler.unauthorized('Session has expired', { restaurantId, sessionId });
    }

    // Get server info to check role
    if (sessionData.entity !== 'server' || !sessionData.serverId) {
        errorHandler.unauthorized('Invalid session type', { restaurantId, sessionId });
    }

    const serverRef = db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('servers')
        .doc(sessionData.serverId);
    const serverDoc = await serverRef.get();

    if (!serverDoc.exists) {
        errorHandler.unauthorized('Server not found', {
            restaurantId,
            serverId: sessionData.serverId,
        });
    }

    const serverData = serverDoc.data();

    // Check if user has admin or manager role
    if (serverData.role !== SERVER_ROLES.ADMIN && serverData.role !== SERVER_ROLES.MANAGER) {
        errorHandler.forbidden('Insufficient permissions. Admin or Manager role required.', {
            restaurantId,
            role: serverData.role,
        });
    }

    return { serverData, serverId: sessionData.serverId };
}

/**
 * Validates that a session belongs to ANY staff member (SERVER, KITCHEN,
 * MANAGER, or ADMIN). Blocks customer sessions, which live in the same
 * collection but have no `entity` field. Use for staff-facing endpoints that
 * don't need the ADMIN/MANAGER restriction of validateAdminSession.
 * @returns {Promise<{serverData: object, serverId: string}>}
 */
async function validateStaffSession(restaurantId, sessionId) {
    if (!sessionId) {
        errorHandler.unauthorized('Session ID is required', { restaurantId });
    }

    const sessionDoc = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('sessions')
        .doc(sessionId)
        .get();

    if (!sessionDoc.exists) {
        errorHandler.unauthorized('Invalid or expired session', { restaurantId, sessionId });
    }

    const sessionData = sessionDoc.data();

    if (sessionData.status !== 'active') {
        errorHandler.unauthorized('Invalid or expired session', { restaurantId, sessionId });
    }

    // safeToDate: seed/legacy sessions may store expiresAt as an ISO string
    const staffExpiry = timestamp.safeToDate(sessionData.expiresAt);
    if (sessionData.expiresAt && staffExpiry && staffExpiry < new Date()) {
        errorHandler.unauthorized('Session has expired', { restaurantId, sessionId });
    }

    if (sessionData.entity !== 'server' || !sessionData.serverId) {
        errorHandler.unauthorized('Staff session required', { restaurantId, sessionId });
    }

    const serverDoc = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('servers')
        .doc(sessionData.serverId)
        .get();

    if (!serverDoc.exists) {
        errorHandler.unauthorized('Server not found', {
            restaurantId,
            serverId: sessionData.serverId,
        });
    }

    return { serverData: serverDoc.data(), serverId: sessionData.serverId };
}

/**
 * Transforms dot-path keys into nested objects.
 * e.g., { 'theme.primaryColor': '#FF0000' } => { theme: { primaryColor: '#FF0000' } }
 * @param {Object} flatObject - Object with dot-path keys
 * @returns {Object} Nested object structure
 */
function transformDotPathsToNested(flatObject) {
    const result = {};

    for (const [key, value] of Object.entries(flatObject)) {
        const parts = key.split('.');
        let current = result;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part];
        }

        current[parts[parts.length - 1]] = value;
    }

    return result;
}

/**
 * Deep merges source into target, only updating fields that exist in source.
 * @param {Object} target - The target object
 * @param {Object} source - The source object with updates
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = deepMerge(result[key] || {}, value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

module.exports = {
    SERVER_ROLES,
    validateAdminSession,
    validateStaffSession,
    transformDotPathsToNested,
    deepMerge,
};
