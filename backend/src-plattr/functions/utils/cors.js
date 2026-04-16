/**
 * CORS middleware for Firebase Functions
 * Enables cross-origin requests for local development with Flutter web
 */

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
            'https://your-production-domain.com',
            // Add production domains here
        ],
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }
};

/**
 * Set CORS headers on the response
 * @param {Object} res - Express-like response object
 * @param {boolean} isEmulator - Whether running in emulator mode
 */
function setCorsHeaders(res, isEmulator = true) {
    const options = isEmulator ? corsOptions.development : corsOptions.production;

    // For development, allow any origin
    if (options.origin === true) {
        res.set('Access-Control-Allow-Origin', '*');
    } else if (Array.isArray(options.origin)) {
        // For production, check against whitelist
        // Note: In real production, you'd check the request origin
        res.set('Access-Control-Allow-Origin', options.origin[0]);
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
        setCorsHeaders(res, true);
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
        setCorsHeaders(res, true);

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
