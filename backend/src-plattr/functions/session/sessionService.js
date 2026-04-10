const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
const { safeArrayUnion, applyArrayOperation } = require('../utils/arrayOperations');

// Session status constants
const SESSION_STATUS = {
  ACTIVE: 'active',
  ENDED: 'ended',
  EXPIRED: 'expired'
};

/**
 * Creates or retrieves a table-level session
 * @param {string} restaurantId - Restaurant ID
 * @param {string} tableId - Table ID
 * @param {string} primaryUserId - ID of the primary user who authenticated with OTP
 * @returns {Promise<Object>} Table session data
 */
async function createOrGetTableSession(restaurantId, tableId, primaryUserId) {
  try {
    console.log(`poopoo createOrGetTableSession: Creating or getting session for table ${tableId} with primary user ${primaryUserId}`);
    
    // First check if restaurant exists
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
      console.error(`Restaurant ${restaurantId} not found`);
      throw new functions.https.HttpsError('not-found', 'Restaurant not found');
    }
    
    // Check if table already has an active session
    console.log(`poopoo createOrGetTableSession: Checking for existing active sessions for table ${tableId}`);
    const existingSessionQuery = await restaurantRef
      .collection('sessions')
      .where('tableId', '==', tableId)
      .where('status', '==', SESSION_STATUS.ACTIVE)
      .limit(1)
      .get();
    
    // If session already exists, return it
    if (!existingSessionQuery.empty) {
      const existingSession = existingSessionQuery.docs[0];
      console.log(`poopoo createOrGetTableSession: Existing table session ${existingSession.id} found for table ${tableId}`);
      
      // Add this user to the users array if not already present
      const sessionData = existingSession.data();
      if (!Array.isArray(sessionData.users)) sessionData.users = [];
      if (!sessionData.users.includes(primaryUserId)) {
        console.log(`poopoo createOrGetTableSession: Adding primary user ${primaryUserId} to existing session ${existingSession.id}`);
        try {
          const updateData = {
            updatedAt: timestamp.serverTimestamp()
          };
          
          // Use safe array union
          const arrayOp = safeArrayUnion(primaryUserId);
          applyArrayOperation(updateData, 'users', sessionData.users, arrayOp);
          
          await existingSession.ref.update(updateData);
          console.log(`poopoo createOrGetTableSession: Successfully added primary user to existing session`);
        } catch (updateError) {
          console.error(`Error updating session users: ${updateError.message}`);
          // Continue with existing session data
        }
      }
      
      return {
        id: existingSession.id,
        ...existingSession.data(),
        users: [...(sessionData.users || []), primaryUserId]
      };
    }
    
    // Create new table session document with random ID
    console.log(`poopoo createOrGetTableSession: No existing session found, creating new session for table ${tableId}`);
    const sessionRef = restaurantRef.collection('sessions').doc();
    
    // 4 hour expiry from now
    const expiryDate = new Date(Date.now() + (4 * 60 * 60 * 1000));
    console.log(`poopoo createOrGetTableSession: Setting session expiry to ${expiryDate.toISOString()}`);
      
    const session = {
      tableId,
      primaryUserId,
      users: [primaryUserId],
      status: SESSION_STATUS.ACTIVE,
      createdAt: timestamp.serverTimestamp(),
      updatedAt: timestamp.serverTimestamp(),
      // 4 hour expiry
      expiresAt: timestamp.fromDate(expiryDate)
    };
    
    try {
      await sessionRef.set(session);
      console.log(`poopoo createOrGetTableSession: New table session ${sessionRef.id} created for table ${tableId}`);
    } catch (setError) {
      console.error(`Error creating session: ${setError.message}`);
      throw new functions.https.HttpsError('internal', `Failed to create table session: ${setError.message}`);
    }
    
    return {
      id: sessionRef.id,
      ...session,
      expiresAt: expiryDate // Ensure a valid Date object is returned
    };
  } catch (error) {
    console.error(`Error creating table session: ${error.message}`, { restaurantId, tableId, primaryUserId });
    throw new functions.https.HttpsError('internal', `Failed to create table session: ${error.message}`);
  }
}

/**
 * Adds a user to an existing table session
 * @param {string} restaurantId - Restaurant ID
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID to add to the session
 * @returns {Promise<Object>} Updated session data
 */
async function addUserToTableSession(restaurantId, sessionId, userId) {
  try {
    console.log(`poopoo addUserToTableSession: Adding user ${userId} to session ${sessionId} in restaurant ${restaurantId}`);
    
    // First check if restaurant exists
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
      console.error(`Restaurant ${restaurantId} not found`);
      throw new functions.https.HttpsError('not-found', 'Restaurant not found');
    }
    
    const sessionRef = restaurantRef.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      console.error(`Session ${sessionId} not found in restaurant ${restaurantId}`);
      throw new functions.https.HttpsError('not-found', 'Session not found');
    }
    
    const sessionData = sessionDoc.data();
    console.log(`poopoo addUserToTableSession: Found session ${sessionId}, checking expiry`);
    
    // Check if session is expired using the timestamp utility
    const expiryDate = timestamp.safeToDate(sessionData.expiresAt);
    console.log(`poopoo addUserToTableSession: Session expiresAt=${JSON.stringify(sessionData.expiresAt)}, parsed as ${expiryDate}`);
    
    if (!expiryDate || expiryDate < new Date()) {
      console.log(`poopoo Session expired: expiresAt=${JSON.stringify(sessionData.expiresAt)}, converted to ${expiryDate}`);
      try {
        await sessionRef.update({
          status: SESSION_STATUS.EXPIRED,
          updatedAt: timestamp.serverTimestamp()
        });
        console.log(`poopoo addUserToTableSession: Marked session ${sessionId} as expired`);
      } catch (updateError) {
        console.error(`Error updating expired session: ${updateError.message}`);
        // Continue and throw the original error
      }
      throw new functions.https.HttpsError('failed-precondition', 'Session has expired');
    }
    
    // Add user to the session if not already present
    if (!Array.isArray(sessionData.users)) sessionData.users = [];
    if (!sessionData.users.includes(userId)) {
      console.log(`poopoo addUserToTableSession: Adding user ${userId} to users array`);
      try {
        const updateData = {
          updatedAt: timestamp.serverTimestamp()
        };
        
        // Use safe array union
        const arrayOp = safeArrayUnion(userId);
        applyArrayOperation(updateData, 'users', sessionData.users, arrayOp);
        
        await sessionRef.update(updateData);
        console.log(`poopoo addUserToTableSession: Successfully added user ${userId} to session ${sessionId}`);
      } catch (updateError) {
        console.error(`Error updating session users: ${updateError.message}`);
        throw new functions.https.HttpsError('internal', 'Failed to add user to session');
      }
    } else {
      console.log(`poopoo addUserToTableSession: User ${userId} already in session ${sessionId}`);
    }
    
    return {
      id: sessionId,
      ...sessionData,
      users: [...(sessionData.users || []), userId]
    };
  } catch (error) {
    console.error(`Error adding user to table session: ${error.message}`, { restaurantId, sessionId, userId });
    throw new functions.https.HttpsError('internal', `Failed to add user to session: ${error.message}`);
  }
}

/**
 * Validates table session and optionally manages user access
 * @param {string} restaurantId - Restaurant ID
 * @param {string} tableId - Table ID
 * @param {Object} [options] - Optional parameters
 * @param {Object} [options.context] - Firebase context for user management
 * @param {boolean} [options.throwError=false] - Whether to throw errors or return null
 * @returns {Promise<Object|null>} Session object if valid, null if invalid (when throwError is false)
 */
async function validateTableSession(restaurantId, tableId, options = {}) {
  try {
    console.log(`poopoo validateTableSession: Checking session for restaurant ${restaurantId}, table ${tableId}`);
    
    // First check if restaurant exists
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
      console.error(`Restaurant ${restaurantId} not found`);
      if (options.throwError) {
        throw new functions.https.HttpsError('not-found', 'Restaurant not found');
      }
      return null;
    }

    // If context is provided, check authentication
    if (options.context) {
      if (!options.context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }
    }
    
    console.log(`poopoo validateTableSession: Querying active sessions for table ${tableId}`);
    const sessionQuery = await restaurantRef
      .collection('sessions')
      .where('tableId', '==', tableId)
      .where('status', '==', SESSION_STATUS.ACTIVE)
      .limit(1)
      .get();
      
    if (sessionQuery.empty) {
      console.log(`poopoo validateTableSession: No active session found for table ${tableId}`);
      if (options.throwError) {
        throw new functions.https.HttpsError('failed-precondition', 'No active session found');
      }
      return null;
    }
    
    const session = sessionQuery.docs[0];
    const sessionData = session.data();
    console.log(`poopoo validateTableSession: Found session ${session.id} for table ${tableId}`);
    
    // Check if session is expired using the timestamp utility
    console.log(`poopoo validateTableSession: Checking if session is expired. expiresAt=${JSON.stringify(sessionData.expiresAt)}`);
    const expiryDate = timestamp.safeToDate(sessionData.expiresAt);
    
    // If we couldn't parse the expiry date or it's in the past
    if (!expiryDate || expiryDate < new Date()) {
      console.log(`poopoo Session expired: expiresAt=${JSON.stringify(sessionData.expiresAt)} converted to ${expiryDate}`);
      try {
        await session.ref.update({
          status: SESSION_STATUS.EXPIRED,
          updatedAt: timestamp.serverTimestamp()
        });
        console.log(`poopoo validateTableSession: Marked session ${session.id} as expired`);
      } catch (updateError) {
        console.error(`Error updating expired session: ${updateError.message}`);
        // Continue even if update fails
      }
      
      if (options.throwError) {
        throw new functions.https.HttpsError('failed-precondition', 'Session has expired');
      }
      return null;
    }

    // If context is provided, manage user access
    if (!Array.isArray(sessionData.users)) sessionData.users = [];
    if (options.context?.auth && !sessionData.users.includes(options.context.auth.uid)) {
      try {
        await addUserToTableSession(restaurantId, session.id, options.context.auth.uid);
        sessionData.users.push(options.context.auth.uid);
        console.log(`poopoo validateTableSession: Added user ${options.context.auth.uid} to session ${session.id}`);
      } catch (addUserError) {
        console.error(`Error adding user to session: ${addUserError.message}`);
        // Continue even if adding user fails
      }
    }
    
    console.log(`poopoo validateTableSession: Session ${session.id} is valid`);
    return {
      id: session.id,
      ...sessionData
    };
  } catch (error) {
    console.error(`Error validating table session: ${error.message}`, { restaurantId, tableId });
    if (options.throwError) {
      throw error;
    }
    return null;
  }
}

/**
 * Ends the active session for a table
 * @param {string} restaurantId - Restaurant ID
 * @param {string} tableId - Table ID 
 */
async function endTableSessions(restaurantId, tableId) {
  try {
    console.log(`poopoo endTableSessions: Ending sessions for table ${tableId} in restaurant ${restaurantId}`);
    
    // First check if restaurant exists
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
      console.error(`Restaurant ${restaurantId} not found`);
      return; // Silently return as there's no session to end
    }
    
    // Get the active session for this table
    console.log(`poopoo endTableSessions: Finding active sessions for table ${tableId}`);
    const sessionQuery = await restaurantRef
      .collection('sessions')
      .where('tableId', '==', tableId)
      .where('status', '==', SESSION_STATUS.ACTIVE)
      .limit(1) // We only expect one active session per table
      .get();
      
    if (sessionQuery.empty) {
      console.log(`poopoo endTableSessions: No active session found for table ${tableId}`);
      return;
    }
    
    // Update the single active session
    const sessionDoc = sessionQuery.docs[0];
    console.log(`poopoo endTableSessions: Found active session ${sessionDoc.id} for table ${tableId}`);
    
    try {
      await sessionDoc.ref.update({
        status: SESSION_STATUS.ENDED,
        updatedAt: timestamp.serverTimestamp()
      });
      console.log(`poopoo endTableSessions: Successfully ended session ${sessionDoc.id} for table ${tableId}`);
    } catch (updateError) {
      console.error(`Error updating session status: ${updateError.message}`);
      throw new functions.https.HttpsError('internal', `Failed to end table session: ${updateError.message}`);
    }
  } catch (error) {
    console.error(`Error ending table session: ${error.message}`, { restaurantId, tableId });
    throw new functions.https.HttpsError('internal', `Failed to end table session: ${error.message}`);
  }
}

module.exports = {
  endTableSessions,
  SESSION_STATUS,
  createOrGetTableSession,
  addUserToTableSession,
  validateTableSession
}; 