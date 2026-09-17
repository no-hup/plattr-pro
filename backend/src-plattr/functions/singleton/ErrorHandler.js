const functions = require('firebase-functions');
const httpStatusCodes = require('./HttpStatusCodes');
const errorMessages = require('./ErrorMessages');

/**
 * ErrorHandler - Singleton class for standardized error handling
 * This provides a consistent way to throw errors with proper HTTP status codes
 * and standardized error formats across the application
 */
class ErrorHandler {
  constructor() {
    if (ErrorHandler.instance) {
      return ErrorHandler.instance;
    }

    ErrorHandler.instance = this;
  }

  /**
   * Throws a Firebase HttpsError with the appropriate status code and format
   * @param {string} code - Firebase error code
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   * @throws {functions.https.HttpsError} Firebase HttpsError
   */
  throwError(code, message, details = null) {
    console.log(`ErrorHandler.throwError - Code: ${code}, Message: ${message}`);

    const errorResponse = {
      status: "error",
      message: message,
      data: {
        code: code,
        httpCode: httpStatusCodes.getHttpCode(code)
      }
    };

    if (details) {
      // Add any additional details to the data object
      Object.assign(errorResponse.data, details);
      console.log(`ErrorHandler.throwError - Details: ${JSON.stringify(details)}`);
    }

    console.log(`ErrorHandler.throwError - Throwing error with code: ${code}`);
    throw new functions.https.HttpsError(code, message, errorResponse);
  }

  /**
   * Throws a 400 Bad Request error
   * @param {string} [message] - Error message, defaults to a standard message
   * @param {Object} [details] - Additional error details
   * @throws {functions.https.HttpsError} Firebase HttpsError with invalid-argument code
   */
  badRequest(message = errorMessages.get('INVALID_INPUT'), details = null) {
    console.log(`ErrorHandler.badRequest - Message: ${message}`);
    this.throwError('invalid-argument', message, details);
  }

  /**
   * Throws a 401 Unauthorized error
   * @param {string} [message] - Error message, defaults to a standard message
   * @param {Object} [details] - Additional error details
   * @throws {functions.https.HttpsError} Firebase HttpsError with unauthenticated code
   */
  unauthorized(message = 'Authentication required', details = null) {
    console.log(`ErrorHandler.unauthorized - Message: ${message}`);
    this.throwError('unauthenticated', message, details);
  }

  /**
   * Throws a 403 Forbidden error
   * @param {string} [message] - Error message, defaults to a standard message
   * @param {Object} [details] - Additional error details
   * @throws {functions.https.HttpsError} Firebase HttpsError with permission-denied code
   */
  forbidden(message = 'Access denied', details = null) {
    console.log(`ErrorHandler.forbidden - Message: ${message}`);
    this.throwError('permission-denied', message, details);
  }

  /**
   * Throws a 404 Not Found error
   * @param {string} [message] - Error message, defaults to a standard message
   * @param {Object} [details] - Additional error details
   * @throws {functions.https.HttpsError} Firebase HttpsError with not-found code
   */
  notFound(message = 'Resource not found', details = null) {
    console.log(`ErrorHandler.notFound - Message: ${message}`);
    this.throwError('not-found', message, details);
  }

  /**
   * Throws a 412 Precondition Failed error
   * @param {string} [message] - Error message, defaults to a standard message
   * @param {Object} [details] - Additional error details
   * @throws {functions.https.HttpsError} Firebase HttpsError with failed-precondition code
   */
  preconditionFailed(message = 'Precondition failed', details = null) {
    console.log(`ErrorHandler.preconditionFailed - Message: ${message}`);
    this.throwError('failed-precondition', message, details);
  }

  /**
   * Throws a 409 Conflict error
   * @param {string} [message] - Error message, defaults to a standard message
   * @param {Object} [details] - Additional error details
   * @throws {functions.https.HttpsError} Firebase HttpsError with already-exists code
   */
  conflict(message = 'Resource already exists', details = null) {
    this.throwError('already-exists', message, details);
  }

  /**
   * Throws a 500 Internal Server Error
   * @param {string} [message] - Error message, defaults to a standard message
   * @param {Object} [details] - Additional error details
   * @throws {functions.https.HttpsError} Firebase HttpsError with internal code
   */
  internalError(message = errorMessages.get('UNEXPECTED_ERROR'), details = null) {
    console.log(`ErrorHandler.internalError - Message: ${message}`);
    this.throwError('internal', message, details);
  }

  /**
   * Handles errors in a standardized way for Cloud Functions
   * @param {Error} error - The error to handle
   * @param {string} functionName - The name of the function where the error occurred
   * @param {Object} [context] - Additional context about the error
   * @throws {functions.https.HttpsError} Firebase HttpsError with appropriate code
   */
  handleError(error, functionName, context = {}) {
    console.error(`Error in ${functionName}:`, error);
    console.error(`Stack trace: ${error.stack || 'No stack trace available'}`);

    // If already a Firebase HttpsError, ensure it follows the standardized format
    if (error instanceof functions.https.HttpsError) {
      console.log(`ErrorHandler.handleError - Handling Firebase HttpsError with code: ${error.code}`);

      // Check if the error details are already in the standardized format
      if (error.details && error.details.status === 'error' && error.details.data) {
        // Already standardized, just add context if provided
        if (Object.keys(context).length > 0) {
          Object.assign(error.details.data, context);
        }
        throw error;
      }

      // Otherwise, reformat to standardized structure
      const errorResponse = {
        status: 'error',
        message: error.message,
        data: {
          code: error.code,
          httpCode: httpStatusCodes.getHttpCode(error.code),
          ...context
        }
      };

      // If there were original details, merge them into the data
      if (error.details) {
        Object.assign(errorResponse.data,
          typeof error.details === 'object' ? error.details : { originalDetails: error.details }
        );
      }

      throw new functions.https.HttpsError(error.code, error.message, errorResponse);
    }

    // Handle specific error types with standardized structure
    if (error.name === 'ValidationError') {
      console.log(`ErrorHandler.handleError - Handling ValidationError: ${error.message}`);
      this.badRequest(error.message, context);
    } else if (error.name === 'AuthenticationError') {
      console.log(`ErrorHandler.handleError - Handling AuthenticationError: ${error.message}`);
      this.unauthorized(error.message, context);
    } else if (error.name === 'NotFoundError') {
      console.log(`ErrorHandler.handleError - Handling NotFoundError: ${error.message}`);
      this.notFound(error.message, context);
    } else if (error.name === 'PreconditionFailedError') {
      console.log(`ErrorHandler.handleError - Handling PreconditionFailedError: ${error.message}`);
      this.preconditionFailed(error.message, context);
    } else if (error.name === 'ForbiddenError') {
      console.log(`ErrorHandler.handleError - Handling ForbiddenError: ${error.message}`);
      this.forbidden(error.message, context);
    } else {
      // Default to internal server error
      console.log(`ErrorHandler.handleError - Handling unknown error type: ${error.name || 'Unnamed'}`);
      this.internalError('An unexpected error occurred', {
        originalError: error.message,
        ...context
      });
    }
  }
}

// Export a singleton instance
const errorHandler = new ErrorHandler();
Object.freeze(errorHandler);

module.exports = errorHandler; 