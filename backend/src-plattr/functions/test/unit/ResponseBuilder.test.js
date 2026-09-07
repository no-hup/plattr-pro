const ResponseBuilder = require('../../utils/ResponseBuilder');

describe('ResponseBuilder', () => {
  describe('success', () => {
    test('should create success response with data and message', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';
      
      const response = ResponseBuilder.success(data, message);
      
      expect(response).toEqual({
        status: 'success',
        message: 'Operation successful',
        data: { id: 1, name: 'Test' }
      });
    });

    test('should create success response with default message', () => {
      const data = { id: 1, name: 'Test' };
      
      const response = ResponseBuilder.success(data);
      
      expect(response).toEqual({
        status: 'success',
        message: 'Success',
        data: { id: 1, name: 'Test' }
      });
    });

    test('should create success response with null data', () => {
      const response = ResponseBuilder.success(null, 'No data available');
      
      expect(response).toEqual({
        status: 'success',
        message: 'No data available',
        data: null
      });
    });
  });

  describe('error', () => {
    test('should create error response with code, message, and details', () => {
      const code = 'validation_failed';
      const message = 'Invalid input';
      const details = { field: 'email', reason: 'Invalid format' };
      
      const response = ResponseBuilder.error(code, message, details);
      
      expect(response).toEqual({
        status: 'error',
        message: 'Invalid input',
        error: {
          code: 'validation_failed',
          message: 'Invalid input',
          details: { field: 'email', reason: 'Invalid format' }
        }
      });
    });

    test('should create error response without details', () => {
      const code = 'not_found';
      const message = 'Resource not found';
      
      const response = ResponseBuilder.error(code, message);
      
      expect(response).toEqual({
        status: 'error',
        message: 'Resource not found',
        error: {
          code: 'not_found',
          message: 'Resource not found'
        }
      });
    });
  });

  describe('validationError', () => {
    test('should create validation error response', () => {
      const message = 'Validation failed';
      const details = { field: 'password', reason: 'Too short' };
      
      const response = ResponseBuilder.validationError(message, details);
      
      expect(response).toEqual({
        status: 'error',
        message: 'Validation failed',
        error: {
          code: 'validation_failed',
          message: 'Validation failed',
          details: { field: 'password', reason: 'Too short' }
        }
      });
    });

    test('should create validation error without details', () => {
      const message = 'Validation failed';
      
      const response = ResponseBuilder.validationError(message);
      
      expect(response).toEqual({
        status: 'error',
        message: 'Validation failed',
        error: {
          code: 'validation_failed',
          message: 'Validation failed'
        }
      });
    });
  });

  describe('notFound', () => {
    test('should create not found error response', () => {
      const message = 'User not found';
      const details = { userId: '123' };
      
      const response = ResponseBuilder.notFound(message, details);
      
      expect(response).toEqual({
        status: 'error',
        message: 'User not found',
        error: {
          code: 'not_found',
          message: 'User not found',
          details: { userId: '123' }
        }
      });
    });
  });

  describe('unauthorized', () => {
    test('should create unauthorized error response', () => {
      const message = 'Authentication required';
      const details = { reason: 'Token expired' };
      
      const response = ResponseBuilder.unauthorized(message, details);
      
      expect(response).toEqual({
        status: 'error',
        message: 'Authentication required',
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
          details: { reason: 'Token expired' }
        }
      });
    });
  });

  describe('internalError', () => {
    test('should create internal error response', () => {
      const message = 'Internal server error';
      const details = { error: 'Database connection failed' };
      
      const response = ResponseBuilder.internalError(message, details);
      
      expect(response).toEqual({
        status: 'error',
        message: 'Internal server error',
        error: {
          code: 'internal_error',
          message: 'Internal server error',
          details: { error: 'Database connection failed' }
        }
      });
    });
  });

  describe('_getErrorStatus', () => {
    test('should return correct HTTP status codes', () => {
      expect(ResponseBuilder._getErrorStatus('validation_failed')).toBe(400);
      expect(ResponseBuilder._getErrorStatus('invalid_argument')).toBe(400);
      expect(ResponseBuilder._getErrorStatus('not_found')).toBe(404);
      expect(ResponseBuilder._getErrorStatus('unauthorized')).toBe(401);
      expect(ResponseBuilder._getErrorStatus('forbidden')).toBe(403);
      expect(ResponseBuilder._getErrorStatus('precondition_failed')).toBe(412);
      expect(ResponseBuilder._getErrorStatus('internal_error')).toBe(500);
      expect(ResponseBuilder._getErrorStatus('service_unavailable')).toBe(503);
    });

    test('should return 500 for unknown error codes', () => {
      expect(ResponseBuilder._getErrorStatus('unknown_error')).toBe(500);
      expect(ResponseBuilder._getErrorStatus('custom_error')).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string message', () => {
      const response = ResponseBuilder.success({}, '');
      
      expect(response.message).toBe('');
    });

    test('should handle null message', () => {
      const response = ResponseBuilder.success({}, null);
      
      expect(response.message).toBe(null);
    });

    test('should handle undefined details', () => {
      const response = ResponseBuilder.error('test', 'message', undefined);
      
      expect(response.error.details).toBeUndefined();
    });

    test('should handle complex nested data', () => {
      const complexData = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };
      
      const response = ResponseBuilder.success(complexData, 'Complex data retrieved');
      
      expect(response.data).toEqual(complexData);
    });
  });

  describe('Response Structure Validation', () => {
    test('success response should have correct structure', () => {
      const response = ResponseBuilder.success({ test: 'data' }, 'Test message');
      
      expect(response).toHaveProperty('status', 'success');
      expect(response).toHaveProperty('message', 'Test message');
      expect(response).toHaveProperty('data');
      expect(response).not.toHaveProperty('error');
    });

    test('error response should have correct structure', () => {
      const response = ResponseBuilder.error('test_error', 'Test error message');
      
      expect(response).toHaveProperty('status', 'error');
      expect(response).toHaveProperty('message', 'Test error message');
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code', 'test_error');
      expect(response.error).toHaveProperty('message', 'Test error message');
      expect(response).not.toHaveProperty('data');
    });

    test('all responses should be serializable to JSON', () => {
      const successResponse = ResponseBuilder.success({ id: 1 }, 'Success');
      const errorResponse = ResponseBuilder.error('test', 'Error', { details: 'test' });
      
      expect(() => JSON.stringify(successResponse)).not.toThrow();
      expect(() => JSON.stringify(errorResponse)).not.toThrow();
      
      const successJson = JSON.stringify(successResponse);
      const errorJson = JSON.stringify(errorResponse);
      
      expect(JSON.parse(successJson)).toEqual(successResponse);
      expect(JSON.parse(errorJson)).toEqual(errorResponse);
    });
  });
});
