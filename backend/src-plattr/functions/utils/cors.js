/**
 * CORS middleware for Firebase Functions
 * Enables cross-origin requests for local development with Flutter web
 */

const environment = require('../singleton/Environment');

/**
 * CORS configuration
 * In emulator mode, allow all origins. In production, restrict to specific domains.
 */
const corsOptions = {
    development: {
        origin: true, // Allow any origin in development
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
    },
    production: {
        origin: [
            'https://plattrpro.web.app',
            'https://plattrpro.firebaseapp.com',
            'https://rms-app-dd875.web.app',
            'https://rms-app-dd875.firebaseapp.com',
        ],
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }
};

/**
 * Set CORS headers on the response.
 *
 * Production echoes the *request* Origin when it is whitelisted (a fixed
 * origin[0] would break every other allowed host) and always sends
 * `Vary: Origin` so caches don't serve one app's header to another.
 * A request with no Origin header (Android APK, curl, server-to-server) gets
 * no Access-Control-Allow-Origin — those clients don't enforce CORS.
 *
 * @param {Object} req - Express-like request object
 * @param {Object} res - Express-like response object
 * @param {boolean} isEmulator - Whether running in emulator mode
 */
function setCorsHeaders(req, res, isEmulator = environment.isEmulator()) {
    const options = isEmulator ? corsOptions.development : corsOptions.production;

    if (options.origin === true) {
        // Development: allow any origin
        res.set('Access-Control-Allow-Origin', '*');
    } else {
        res.set('Vary', 'Origin');
        const requestOrigin = req && req.headers && req.headers.origin;
        if (requestOrigin && options.origin.includes(requestOrigin)) {
            res.set('Access-Control-Allow-Origin', requestOrigin);
        }
    }

    res.set('Access-Control-Allow-Methods', options.methods.join(', '));
    res.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));

    if (options.credentials) {
        res.set('Access-Control-Allow-Credentials', 'true');
    }
}

/**
 * Handle CORS preflight request
 * @param {Object} req - Express-like request object
 * @param {Object} res - Express-like response object
 * @returns {boolean} - True if this was a preflight request (and was handled)
 */
function handlePreflight(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.status(204).send('');
        return true;
    }
    return false;
}

/**
 * Wrap an onRequest handler with CORS support
 * @param {Function} handler - The request handler function(req, res)
 * @returns {Function} - Wrapped handler with CORS
 */
function withCors(handler) {
    return (req, res) => {
        // Set CORS headers for all responses
        setCorsHeaders(req, res);

        // Handle preflight
        if (handlePreflight(req, res)) {
            return;
        }

        // Call the actual handler
        return handler(req, res);
    };
}

module.exports = {
    setCorsHeaders,
    handlePreflight,
    withCors,
    corsOptions
};
