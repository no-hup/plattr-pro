/**
 * Centralized Response Builder for Unified API Response Structure
 * 
 * This utility standardizes API responses across all updated endpoints.
 * It provides a consistent response format: { result: { status, message, data } }
 * 
 * Usage:
 * - ResponseBuilder.success(data, message) for successful responses
 * - ResponseBuilder.error(code, message, details) for error responses
 * 
 * @author Plattr Development Team
 * @version 1.0.0
 */

class ResponseBuilder {
    /**
     * Creates a successful response with the unified structure
     * 
     * @param {*} data - The response data
     * @param {string} message - Success message (default: 'Success')
     * @returns {Object} Unified response object
     */
    static success(data, message = 'Success') {
        return {
            status: 'success',
            message: message,
            data: data
        };
    }

    /**
     * Creates an error response with the unified structure
     * 
     * @param {string} code - Error code (e.g., 'validation_failed', 'not_found')
     * @param {string} message - Error message
     * @param {*} details - Additional error details (optional)
     * @returns {Object} Unified error response object
     */
    static error(code, message, details = null) {
        const response = {
            status: 'error',
            message: message,
            error: {
                code: code,
                message: message
            }
        };

        if (details !== null) {
            response.error.details = details;
        }

        return response;
    }

    /**
     * Maps error codes to appropriate HTTP status codes
     * 
     * @param {string} code - Error code
     * @returns {number} HTTP status code
     */
    static _getErrorStatus(code) {
        const statusMap = {
            'validation_failed': 400,
            'invalid_argument': 400,
            'not_found': 404,
            'unauthorized': 401,
            'forbidden': 403,
            'precondition_failed': 412,
            'internal_error': 500,
            'service_unavailable': 503
        };

        return statusMap[code] || 500;
    }

    /**
     * Creates a validation error response
     * 
     * @param {string} message - Validation error message
     * @param {*} details - Validation details
     * @returns {Object} Unified validation error response
     */
    static validationError(message, details = null) {
        return this.error('validation_failed', message, details);
    }

    /**
     * Creates a not found error response
     * 
     * @param {string} message - Not found error message
     * @param {*} details - Additional details
     * @returns {Object} Unified not found error response
     */
    static notFound(message, details = null) {
        return this.error('not_found', message, details);
    }

    /**
     * Creates an unauthorized error response
     * 
     * @param {string} message - Unauthorized error message
     * @param {*} details - Additional details
     * @returns {Object} Unified unauthorized error response
     */
    static unauthorized(message, details = null) {
        return this.error('unauthorized', message, details);
    }

    /**
     * Creates an internal server error response
     * 
     * @param {string} message - Internal error message
     * @param {*} details - Additional details
     * @returns {Object} Unified internal error response
     */
    static internalError(message, details = null) {
        return this.error('internal_error', message, details);
    }
}

module.exports = ResponseBuilder;
