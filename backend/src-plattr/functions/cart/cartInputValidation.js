const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const sessionService = require('../session/sessionService');
const errorHandler = require('../singleton/ErrorHandler');
const featureFlags = require('../singleton/FeatureFlags');

/**
 * Validates the required fields for adding an item to cart
 * @param {Object} data - The input data object
 * @throws {HttpsError} If validation fails
 */
const NOTE_MAX = 120;

function validateAddItemFields(data) {
  if (!data) {
    throw new functions.https.HttpsError('invalid-argument', 'No data provided');
  }

  const { tableId, restaurantId, menuItemId, quantity } = data;

  if (!tableId || !restaurantId || !menuItemId || !quantity) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tableId, restaurantId, menuItemId, and quantity are required."
    );
  }

  if (typeof quantity !== 'number' || quantity < 1) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Quantity must be greater than 0.'
    );
  }

  // TD-048: the guest's note ("no onion"). Optional; a string of at most NOTE_MAX characters,
  // because it is frozen on the line and printed on a 48-column ticket.
  if (data.note !== undefined && data.note !== null && (typeof data.note !== 'string' || data.note.length > NOTE_MAX)) {
    throw new functions.https.HttpsError('invalid-argument', `note must be a string of at most ${NOTE_MAX} characters.`);
  }
}

/**
 * Validates the required fields for removing an item from cart
 * @param {Object} data - The input data object
 * @throws {HttpsError} If validation fails
 */
function validateRemoveItemFields(data) {
  if (!data) {
    throw new functions.https.HttpsError('invalid-argument', 'No data provided');
  }

  const { tableId, restaurantId, menuItemId } = data;

  if (!tableId || !restaurantId || !menuItemId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tableId, restaurantId, and menuItemId are required."
    );
  }
}

/**
 * Validates session for checkout process
 * @param {string} restaurantId - Restaurant ID
 * @param {string} tableId - Table ID
 * @param {string} sessionId - Session ID to validate
 * @throws {functions.https.HttpsError} If session is invalid or missing
 * todo shaurya check for primary user, if table already auhenticated phone number and name not needed from user. only otp
 */
// TD-033: every cart write (add, remove, clear) and checkout goes through this one check: the caller
// holds the table's own live session, not merely some active session, and not none.
async function validateCheckoutSession(restaurantId, tableId, sessionId) {
  if (!sessionId) {
    errorHandler.unauthorized("Authentication required", {
      otpRequired: true,
      isUsernameMandatory: featureFlags.isEnabled('isUsernameEnabled'),
      isPhoneNumberMandatory: true,
      isMultiUserSupported: featureFlags.isEnabled('isMultiUserSupportEnabled')
    });
  }

  const session = await sessionService.validateTableSession(restaurantId, tableId, { throwError: false });
  // The caller must present the table's own active session id, not just any
  // non-empty string — otherwise knowing restaurantId+tableId (printed on the
  // QR code) is enough to check out someone else's cart.
  if (!session || session.id !== sessionId) {
    errorHandler.unauthorized("Authentication required", {
      otpRequired: true,
      isUsernameMandatory: featureFlags.isEnabled('isUsernameEnabled'),
      isPhoneNumberMandatory: true,
      isMultiUserSupported: featureFlags.isEnabled('isMultiUserSupportEnabled')
    });
  }
}

/**
 * TD-033: carts/{tableId} is keyed by the table but belongs to the sitting that filled it. Vacant, Clear,
 * the idle sweep and a session simply expiring all end a sitting without touching the cart, so a cart
 * stamped with any other session is read as empty — by add, remove, checkout, getCart and offers alike.
 * @returns {Object|null} the cart if it is this session's, else null
 */
function cartOfSession(cart, sessionId) {
  return cart && sessionId && cart.sessionId === sessionId ? cart : null;
}

/**
 * Validates the required fields for checkout cart
 * @param {Object} data - The input data object
 * @throws {HttpsError} If validation fails
 */
function validateCheckoutFields(data) {
  if (!data) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Request data is missing."
    );
  }

  const { tableId, restaurantId, sessionId } = data;
  // sessionId is validated separately in validateCheckoutSession to standardize unauthenticated errors
  if (!tableId || !restaurantId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tableId and restaurantId are required."
    );
  }
}

/**
 * Validates the required fields for getting cart
 * @param {Object} data - The input data object
 * @throws {HttpsError} If validation fails
 */
function validateGetCartFields(data) {
  if (!data) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Request data is missing."
    );
  }
  const { restaurantId, tableId } = data;
  if (!restaurantId || !tableId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "restaurantId and tableId are required."
    );
  }
}

/**
 * Validates that a session ID, if provided, corresponds to an active session
 * @param {string} restaurantId - Restaurant ID
 * @param {string} sessionId - Session ID to validate
 * @throws {HttpsError} If validation fails
 */
async function validateSessionId(restaurantId, sessionId) {
  if (!sessionId) return; // Skip validation if no sessionId provided

  try {
    const sessionRef = db
      .collection('restaurants')
      .doc(restaurantId)
      .collection('sessions')
      .doc(sessionId);

    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists || sessionDoc.data().status !== 'active') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Invalid or inactive session'
      );
    }
  } catch (error) {
    console.error('Error validating session:', error);
    if (error.code && error.details === undefined && error.httpErrorCode) { // simple check for HttpsError structure or rethrow if it has code
      // functions.https.HttpsError objects usually have code property.
      // Better yet, just rethrow if it looks like one or simply don't wrap if we threw it.
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Error validating session'
    );
  }
}

module.exports = {
  validateAddItemFields,
  validateRemoveItemFields,
  validateCheckoutFields,
  validateGetCartFields,
  validateSessionId,
  validateCheckoutSession,
  cartOfSession
}; 