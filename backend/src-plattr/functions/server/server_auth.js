const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const ServerInputValidation = require('./serverInputValidation');
const errorHandler = require('../singleton/ErrorHandler');
const timestamp = require('../utils/timestamp');
const { SERVER_STATUS } = require('./serverEnums');
const { comparePassword, hashPassword } = require('../utils/passwordUtils');

// Inline bcrypt prefix detection — kept deliberately narrow (three common
// bcrypt variants). No dedicated helper to keep the surface area small.
const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2y$'];
function looksLikeBcryptHash(value) {
  if (typeof value !== 'string') return false;
  return BCRYPT_PREFIXES.some(p => value.startsWith(p));
}

function createAuthError(message, details = {}) {
  const error = new Error(message);
  error.httpStatus = 401;
  error.code = 'unauthenticated';
  error.details = details;
  return error;
}



/**
 * Server login function
 * Accepts either:
 * - restaurantId, username, password (for credential-based login)
 * - restaurantId, sessionId (for token-based login)
 * 
 * Returns a session token and server info on success
 */
const { withCors } = require('../utils/cors');

/**
 * Server login function
 * Accepts either:
 * - restaurantId, username, password (for credential-based login)
 * - restaurantId, sessionId (for token-based login)
 * 
 * Returns a session token and server info on success
 */
exports.serverLogin = functions.https.onRequest(withCors(async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        message: 'Method not allowed',
        details: { code: 'invalid-argument' }
      }
    });
    return;
  }

  // Extract data from the "data" field (mimicking onCall format) or body directly
  // Dio client sends { data: { ... } } so we look for req.body.data
  const data = req.body.data || req.body;

  let stage = 'init';
  const setStage = s => (stage = s);

  try {
    // Get restaurantId which is always required
    setStage('parse-request');
    const { restaurantId, sessionId, username, password } = data;
    if (!restaurantId) {
      res.status(400).json({
        error: {
          message: 'Restaurant ID is required',
          details: { code: 'invalid-argument' }
        }
      });
      return;
    }

    // Get restaurant document first as it's needed in both login paths
    setStage('fetch-restaurant');
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      res.status(404).json({
        error: {
          message: 'Restaurant not found',
          details: { code: 'not-found', restaurantId }
        }
      });
      return;
    }

    const restaurantData = restaurantDoc.data();
    const restaurantName = restaurantData.name || 'Unknown Restaurant';

    // Login path based on provided parameters
    let serverDoc, serverData, session;
    let isNewSession = false;

    // Path 1: Login with existing sessionId
    if (sessionId) {
      setStage('session-auth');
      console.log(`Server login with sessionId: ${sessionId}`);
      const sessionResult = await validateServerSession(restaurantId, sessionId);
      serverDoc = sessionResult.serverDoc;
      serverData = sessionResult.serverData;
      session = { sessionId };
    }
    // Path 2: Login with username and password
    else if (username && password) {
      setStage('credential-auth');
      console.log(`Server login with credentials: ${username}`);

      // Find server by email or phoneNumber in the correct restaurant
      setStage('find-server');
      let serverSnap = await db.collection('restaurants').doc(restaurantId).collection('servers').where('email', '==', username).limit(1).get();
      if (serverSnap.empty) {
        serverSnap = await db.collection('restaurants').doc(restaurantId).collection('servers').where('phoneNumber', '==', username).limit(1).get();
      }
      if (serverSnap.empty) {
        res.status(401).json({
          error: {
            message: 'Invalid credentials',
            details: { code: 'unauthenticated', restaurantId, username }
          }
        });
        return;
      }
      serverDoc = serverSnap.docs[0];
      serverData = serverDoc.data();

      // Check status
      setStage('validate-server-status');
      if (serverData.status !== SERVER_STATUS.ACTIVE) {
        res.status(401).json({
          error: {
            message: 'Server is not active',
            details: { code: 'unauthenticated', serverId: serverDoc.id, status: serverData.status }
          }
        });
        return;
      }

      // Compare password. Stored value is either a bcrypt hash (new staff,
      // or legacy records that have been lazily upgraded) or legacy plaintext.
      setStage('validate-password');
      const storedPassword = serverData.password;
      if (!storedPassword || typeof storedPassword !== 'string') {
        res.status(401).json({
          error: {
            message: 'Invalid credentials',
            details: { code: 'unauthenticated', restaurantId, username }
          }
        });
        return;
      }

      let passwordMatches = false;
      let wasPlaintextMatch = false;
      try {
        if (looksLikeBcryptHash(storedPassword)) {
          passwordMatches = await comparePassword(password, storedPassword);
        } else {
          passwordMatches = storedPassword === password;
          wasPlaintextMatch = passwordMatches;
        }
      } catch (compareErr) {
        // Malformed stored hash or bcrypt runtime error — treat as invalid
        // credentials, never as a 500. We do not want bad stored values to
        // leak as "internal server error" to the client.
        console.error(`[serverLogin] password compare failed for ${username}:`, compareErr);
        passwordMatches = false;
      }

      if (!passwordMatches) {
        res.status(401).json({
          error: {
            message: 'Invalid credentials',
            details: { code: 'unauthenticated', restaurantId, username }
          }
        });
        return;
      }

      // Lazy upgrade: rewrite legacy plaintext as a bcrypt hash after a
      // successful login. Skipped in the Firebase emulator so mock-imported
      // plaintext passwords stay inspectable across test runs.
      //
      // Failure policy: the user has already presented valid credentials;
      // if the background upgrade write fails we log and still let them in.
      // Production will retry the upgrade on their next login.
      if (wasPlaintextMatch && process.env.FUNCTIONS_EMULATOR !== 'true') {
        setStage('lazy-upgrade-password');
        try {
          const upgraded = await hashPassword(password);
          await serverDoc.ref.update({
            password: upgraded,
            updatedAt: timestamp.serverTimestamp(),
          });
        } catch (upgradeErr) {
          console.error(
            `[serverLogin] lazy password upgrade failed for ${serverDoc.id}; login will still succeed:`,
            upgradeErr
          );
        }
      }

      // Create or update session using helper
      setStage('create-session');
      const sessionResult = await createOrUpdateServerSession(restaurantId, serverDoc.id);
      session = { sessionId: sessionResult.sessionId };
      isNewSession = sessionResult.isNew;
    }
    // No valid auth mechanism provided
    else {
      res.status(400).json({
        error: {
          message: 'Either sessionId or both username and password are required',
          details: { code: 'invalid-argument' }
        }
      });
      return;
    }

    // Return session token with standardized response format
    // Mimic the "result" wrapper if needed or just return data directly.
    // Since we're moving away from onCall, let's return a clean JSON structure.
    // BUT the frontend expects { result: { data: ... } } because of ResponseParser logic for "callable-like" responses?
    // Let's verify ResponseParser again.
    // ResponseParser: if (result is Map ... && result.containsKey('data')) return result['data'];
    // So if we return { result: { data: { ... } } }, it works with existing parser *if* it treats it as callable.
    // But LoginApiService uses `response.data`.
    // If we return { result: { ... } }, Dio response.data will have { result: ... }.
    // LoginApiService parses it.

    // Let's send a standard { data: ... } format and ensure frontend can handle it.
    // Or better, wrap in "result" to be safe with existing parser logic which seems to handle both.

    setStage('prepare-response');
    res.status(200).json({
      result: {
        success: true,
        message: sessionId
          ? 'Server login successful with existing session'
          : (isNewSession
            ? 'Server login successful with new session'
            : 'Server login successful with existing session'),
        data: {
          sessionId: session.sessionId,
          serverId: serverDoc.id,
          name: serverData.name,
          entity: 'server',
          role: serverData.role,
          restaurantId,
          restaurantName,
          profileImageUrl: serverData.profileImageUrl || ''
        }
      }
    });

  } catch (error) {
    console.error(`[serverLogin][stage=${stage}]`, error, {
      sessionId: data?.sessionId,
      username: data?.username,
      restaurantId: data?.restaurantId
    });

    if (error?.httpStatus) {
      res.status(error.httpStatus).json({
        error: {
          message: error.message || 'Authentication failed',
          details: {
            code: error.code || 'unauthenticated',
            ...error.details
          }
        }
      });
      return;
    }

    // Standard error response
    res.status(500).json({
      error: {
        message: error.message || 'An internal error occurred',
        details: {
          code: 'internal',
          stage,
          sessionId: data?.sessionId,
          username: data?.username,
          restaurantId: data?.restaurantId
        }
      }
    });
  }
}));

/**
 * Helper to create or update a server session
 * Returns { sessionId, isNew }
 */
async function createOrUpdateServerSession(restaurantId, serverId) {
  const sessionsRef = db.collection('restaurants').doc(restaurantId).collection('sessions');
  const existingSessionSnap = await sessionsRef
    .where('entity', '==', 'server')
    .where('serverId', '==', serverId)
    .limit(1)
    .get();

  const now = new Date();
  const expiresAt = timestamp.fromDate(new Date(now.getTime() + 12 * 60 * 60 * 1000)); // 12 hours from now
  if (!existingSessionSnap.empty) {
    const sessionDoc = existingSessionSnap.docs[0];
    const sessionData = sessionDoc.data();
    // If session has not expired, return as is
    if (sessionData.expiresAt && timestamp.safeToDate(sessionData.expiresAt) > now) {
      return { sessionId: sessionDoc.id, isNew: false };
    } else {
      // Session expired, update it
      await sessionDoc.ref.update({
        status: SERVER_STATUS.ACTIVE,
        updatedAt: timestamp.serverTimestamp(),
        expiresAt
      });
      return { sessionId: sessionDoc.id, isNew: false };
    }
  } else {
    // Create new session
    const sessionData = {
      entity: 'server',
      serverId,
      status: SERVER_STATUS.ACTIVE,
      createdAt: timestamp.serverTimestamp(),
      updatedAt: timestamp.serverTimestamp(),
      expiresAt
    };
    const sessionRef = await sessionsRef.add(sessionData);
    return { sessionId: sessionRef.id, isNew: true };
  }
}

/**
 * Validate a server session by sessionId
 * Returns server data if session is valid
 * @throws Error if session is invalid or expired (handled by caller)
 */
async function validateServerSession(restaurantId, sessionId) {
  // 1. Get the session document
  const sessionRef = db.collection('restaurants').doc(restaurantId).collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  // 2. Verify session exists
  if (!sessionDoc.exists) {
    throw createAuthError('Invalid session', { restaurantId, sessionId });
  }

  const sessionData = sessionDoc.data();

  // 3. Verify this is a server session
  if (sessionData.entity !== 'server') {
    throw createAuthError('Invalid server session', { restaurantId, sessionId });
  }

  // 4. Verify session is active
  if (sessionData.status !== SERVER_STATUS.ACTIVE) {
    throw createAuthError('Session is not active', { restaurantId, sessionId, status: sessionData.status });
  }

  // 5. Verify session is not expired
  const now = new Date();
  if (sessionData.expiresAt && timestamp.safeToDate(sessionData.expiresAt) < now) {
    throw createAuthError('Session has expired', { restaurantId, sessionId });
  }

  // 6. Get the server document
  const serverId = sessionData.serverId;
  const serverRef = db.collection('restaurants').doc(restaurantId).collection('servers').doc(serverId);
  const serverDoc = await serverRef.get();

  // 7. Verify server exists
  if (!serverDoc.exists) {
    throw createAuthError('Server not found', { restaurantId, serverId });
  }

  const serverData = serverDoc.data();

  // 8. Verify server is active
  if (serverData.status !== SERVER_STATUS.ACTIVE) {
    throw createAuthError('Server is not active', { serverId, status: serverData.status });
  }

  // 9. Update session timestamps - extend expiry by 12 hours and refresh updatedAt
  const expiresAt = timestamp.fromDate(new Date(now.getTime() + 12 * 60 * 60 * 1000)); // 12 hours from now
  await sessionRef.update({
    updatedAt: timestamp.serverTimestamp(),
    expiresAt: expiresAt
  });

  return {
    serverDoc,
    serverData
  };
}
