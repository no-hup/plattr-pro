/**
 * HttpStatusCodes - Singleton class to manage HTTP status codes and Firebase error codes
 * This helps standardize error handling across the application and makes the
 * relationship between Firebase error codes and HTTP status codes explicit.
 */
class HttpStatusCodes {
  constructor() {
    if (HttpStatusCodes.instance) {
      return HttpStatusCodes.instance;
    }
    
    // Map of Firebase error codes to HTTP status codes
    this.firebaseToHttpMap = {
      'ok': 200,                       // HTTP 200 OK
      'cancelled': 499,                // HTTP 499 Client Closed Request
      'unknown': 500,                  // HTTP 500 Internal Server Error
      'invalid-argument': 400,         // HTTP 400 Bad Request
      'deadline-exceeded': 504,        // HTTP 504 Gateway Timeout
      'not-found': 404,                // HTTP 404 Not Found
      'already-exists': 409,           // HTTP 409 Conflict
      'permission-denied': 403,        // HTTP 403 Forbidden
      'resource-exhausted': 429,       // HTTP 429 Too Many Requests
      'failed-precondition': 412,      // HTTP 412 Precondition Failed
      'aborted': 409,                  // HTTP 409 Conflict
      'out-of-range': 400,             // HTTP 400 Bad Request
      'unimplemented': 501,            // HTTP 501 Not Implemented
      'internal': 500,                 // HTTP 500 Internal Server Error
      'unavailable': 503,              // HTTP 503 Service Unavailable
      'data-loss': 500,                // HTTP 500 Internal Server Error
      'unauthenticated': 401,          // HTTP 401 Unauthorized
    };
    
    // Common HTTP status codes for easier reference
    this.HTTP = {
      OK: 200,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      PRECONDITION_FAILED: 412,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_SERVER_ERROR: 500,
      NOT_IMPLEMENTED: 501,
      SERVICE_UNAVAILABLE: 503,
      GATEWAY_TIMEOUT: 504
    };
    
    // Map HTTP status codes to Firebase error codes for reverse lookup
    this.httpToFirebaseMap = {};
    for (const [firebaseCode, httpCode] of Object.entries(this.firebaseToHttpMap)) {
      if (!this.httpToFirebaseMap[httpCode]) {
        this.httpToFirebaseMap[httpCode] = [];
      }
      this.httpToFirebaseMap[httpCode].push(firebaseCode);
    }
    
    HttpStatusCodes.instance = this;
  }
  
  /**
   * Get HTTP status code from Firebase error code
   * @param {string} firebaseCode - Firebase error code
   * @returns {number} HTTP status code
   */
  getHttpCode(firebaseCode) {
    return this.firebaseToHttpMap[firebaseCode] || 500; // Default to 500 if not found
  }
  
  /**
   * Get Firebase error code from HTTP status code
   * @param {number} httpCode - HTTP status code
   * @returns {string} Firebase error code (first matching one if multiple)
   */
  getFirebaseCode(httpCode) {
    const codes = this.httpToFirebaseMap[httpCode];
    return codes && codes.length > 0 ? codes[0] : 'internal'; // Default to internal if not found
  }
  
  /**
   * Creates a structured error object with both Firebase and HTTP status information
   * @param {string} firebaseCode - Firebase error code
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   * @returns {Object} Structured error object
   */
  createError(firebaseCode, message, details = null) {
    return {
      status: "error",
      firebaseCode,
      httpCode: this.getHttpCode(firebaseCode),
      message,
      details: details || undefined
    };
  }
  
  /**
   * Helper method to create common errors with proper status codes
   */
  errors = {
    badRequest: (message, details) => 
      this.createError('invalid-argument', message, details),
    
    unauthorized: (message, details) => 
      this.createError('unauthenticated', message, details),
    
    forbidden: (message, details) => 
      this.createError('permission-denied', message, details),
    
    notFound: (message, details) => 
      this.createError('not-found', message, details),
    
    conflict: (message, details) => 
      this.createError('already-exists', message, details),
    
    preconditionFailed: (message, details) => 
      this.createError('failed-precondition', message, details),
    
    tooManyRequests: (message, details) => 
      this.createError('resource-exhausted', message, details),
    
    internalError: (message, details) => 
      this.createError('internal', message, details)
  };
}

// Export a singleton instance
const httpStatusCodes = new HttpStatusCodes();
Object.freeze(httpStatusCodes);

module.exports = httpStatusCodes; 