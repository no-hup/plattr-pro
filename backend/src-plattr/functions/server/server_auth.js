const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const ServerInputValidation = require('./serverInputValidation');
const errorHandler = require('../singleton/ErrorHandler');
const timestamp = require('../utils/timestamp');
const { SERVER_STATUS } = require('./serverEnums');
// const { comparePassword } = require('../utils/passwordUtils'); // TODO: Use hash compare in future



/**
 * Server login function
 * Accepts either:
 * - restaurantId, username, password (for credential-based login)
 * - restaurantId, sessionId (for token-based login)
 * 
 * Returns a session token and server info on success
 */
exports.serverLogin = functions.https.onCall(async (request, context) => {
  const data = request.data;
  let stage = 'init';
  const setStage = s => (stage = s);

  try {
    // Get restaurantId which is always required
    setStage('parse-request');
    const { restaurantId, sessionId, username, password } = data;
    if (!restaurantId) {
      throw new functions.https.HttpsError('invalid-argument', 'Restaurant ID is required');
    }

    // Get restaurant document first as it's needed in both login paths
    setStage('fetch-restaurant');
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      errorHandler.notFound('Restaurant not found', { restaurantId });
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
        errorHandler.unauthorized('Invalid credentials', { restaurantId, username });
      }
      serverDoc = serverSnap.docs[0];
      serverData = serverDoc.data();

      // Check status
      setStage('validate-server-status');
      if (serverData.status !== SERVER_STATUS.ACTIVE) {
        errorHandler.unauthorized('Server is not active', { serverId: serverDoc.id, status: serverData.status });
      }

      // Compare password (plain text for now)
      setStage('validate-password');
      // TODO: Use hash compare in future
      if (serverData.password !== password) {
        errorHandler.unauthorized('Invalid credentials', { restaurantId, username });
      }

      // Create or update session using helper
      setStage('create-session');
      const sessionResult = await createOrUpdateServerSession(restaurantId, serverDoc.id);
      session = { sessionId: sessionResult.sessionId };
      isNewSession = sessionResult.isNew;
    }
    // No valid auth mechanism provided
    else {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Either sessionId or both username and password are required'
      );
    }

    // Return session token with standardized response format
    setStage('prepare-response');
    return {
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
    };
  } catch (error) {
    console.error(`[serverLogin][stage=${stage}]`, error, {
      sessionId: data?.sessionId,
      username: data?.username,
      restaurantId: data?.restaurantId
    });
    errorHandler.handleError(error, `serverLogin[stage=${stage}]`, {
      sessionId: data?.sessionId,
      username: data?.username,
      restaurantId: data?.restaurantId,
      error: error.message
    });
  }
});

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
  let sessionId;
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
 * @throws HttpsError if session is invalid or expired
 */
async function validateServerSession(restaurantId, sessionId) {
  // 1. Get the session document
  const sessionRef = db.collection('restaurants').doc(restaurantId).collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  // 2. Verify session exists
  if (!sessionDoc.exists) {
    errorHandler.unauthorized('Invalid session', { restaurantId, sessionId });
  }

  const sessionData = sessionDoc.data();

  // 3. Verify this is a server session
  if (sessionData.entity !== 'server') {
    errorHandler.unauthorized('Invalid server session', { restaurantId, sessionId });
  }

  // 4. Verify session is active
  if (sessionData.status !== SERVER_STATUS.ACTIVE) {
    errorHandler.unauthorized('Session is not active', { restaurantId, sessionId });
  }

  // 5. Verify session is not expired
  const now = new Date();
  if (sessionData.expiresAt && timestamp.safeToDate(sessionData.expiresAt) < now) {
    errorHandler.unauthorized('Session has expired', { restaurantId, sessionId });
  }

  // 6. Get the server document
  const serverId = sessionData.serverId;
  const serverRef = db.collection('restaurants').doc(restaurantId).collection('servers').doc(serverId);
  const serverDoc = await serverRef.get();

  // 7. Verify server exists
  if (!serverDoc.exists) {
    errorHandler.unauthorized('Server not found', { restaurantId, serverId });
  }

  const serverData = serverDoc.data();

  // 8. Verify server is active
  if (serverData.status !== SERVER_STATUS.ACTIVE) {
    errorHandler.unauthorized('Server is not active', { serverId, status: serverData.status });
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
