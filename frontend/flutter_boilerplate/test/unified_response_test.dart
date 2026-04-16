import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/table_verification/models/unified_models.dart';
import 'package:flutterboilerplate/utils/UnifiedResponseParser.dart';

void main() {
  group('UnifiedResponseParser Tests', () {
    group('Success Response Parsing', () {
      test('should parse successful response with data', () {
        final json = {
          'result': {
            'status': 'success',
            'message': 'Operation completed successfully',
            'data': {
              'status': 'success',
              'tableStatus': 'active',
              'restaurant': {
                'name': 'Test Restaurant',
                'id': 'rest123',
              },
              'table': {
                'number': '5',
                'id': 'table123',
                'capacity': 4,
              },
            },
          },
        };

        final response = UnifiedResponseParser.parse<TableValidationData>(
          json,
          dataParser: TableValidationData.fromJson,
        );

        expect(response.status, 'success');
        expect(response.message, 'Operation completed successfully');
        expect(response.data, isNotNull);
        expect(response.data!.tableStatus, 'active');
        expect(response.data!.restaurant?.name, 'Test Restaurant');
        expect(response.data!.table?.number, '5');
        expect(response.isSuccess, true);
        expect(response.isError, false);
      });

      test('should parse successful response without data', () {
        final json = {
          'result': {
            'status': 'success',
            'message': 'Operation completed successfully',
            'data': null,
          },
        };

        final response = UnifiedResponseParser.parse<String>(
          json,
          dataParser: (data) => data.toString(),
        );

        expect(response.status, 'success');
        expect(response.message, 'Operation completed successfully');
        expect(response.data, isNull);
        expect(response.isSuccess, true);
        expect(response.isError, false);
      });

      test('should parse successful response with primitive data', () {
        final json = {
          'result': {
            'status': 'success',
            'message': 'Count retrieved',
            'data': 42,
          },
        };

        final response = UnifiedResponseParser.parse<int>(
          json,
          dataParser: (data) => data as int,
        );

        expect(response.status, 'success');
        expect(response.message, 'Count retrieved');
        expect(response.data, 42);
        expect(response.isSuccess, true);
      });
    });

    group('Error Response Parsing', () {
      test('should parse error response with error details', () {
        final json = {
          'result': {
            'status': 'error',
            'message': 'Validation failed',
            'error': {
              'code': 'validation_failed',
              'message': 'Invalid input parameters',
              'details': {
                'field': 'tableId',
                'reason': 'Required field is missing',
              },
            },
          },
        };

        final response = UnifiedResponseParser.parse<TableValidationData>(
          json,
          dataParser: TableValidationData.fromJson,
        );

        expect(response.status, 'error');
        expect(response.message, 'Validation failed');
        expect(response.data, isNull);
        expect(response.error, isNotNull);
        expect(response.error!.code, 'validation_failed');
        expect(response.error!.message, 'Invalid input parameters');
        expect(response.error!.details, isNotNull);
        expect(response.isSuccess, false);
        expect(response.isError, true);
      });

      test('should parse error response without error details', () {
        final json = {
          'result': {
            'status': 'error',
            'message': 'Server error occurred',
          },
        };

        final response = UnifiedResponseParser.parse<String>(
          json,
          dataParser: (data) => data.toString(),
        );

        expect(response.status, 'error');
        expect(response.message, 'Server error occurred');
        expect(response.data, isNull);
        expect(response.error, isNull);
        expect(response.isSuccess, false);
        expect(response.isError, true);
      });
    });

    group('Edge Cases', () {
      test('should handle direct response format (without result wrapper)', () {
        final json = {
          'status': 'success',
          'message': 'Direct response',
        };

        final response = UnifiedResponseParser.parse<String>(
          json,
          dataParser: (data) => data.toString(),
        );

        expect(response.status, 'success');
        expect(response.message, 'Direct response');
        expect(response.data, isNull);
        expect(response.isSuccess, true);
        expect(response.isError, false);
      });

      test('should handle missing status field', () {
        final json = {
          'result': {
            'message': 'Missing status',
          },
        };

        expect(
          () => UnifiedResponseParser.parse<String>(
            json,
            dataParser: (data) => data.toString(),
          ),
          throwsA(isA<UnifiedResponseException>()),
        );
      });

      test('should handle missing message field', () {
        final json = {
          'result': {
            'status': 'success',
          },
        };

        expect(
          () => UnifiedResponseParser.parse<String>(
            json,
            dataParser: (data) => data.toString(),
          ),
          throwsA(isA<UnifiedResponseException>()),
        );
      });

      test('should handle malformed JSON', () {
        final json = {
          'result': {
            'status': 'success',
            'message': 'Success',
            'data': 'not a map',
          },
        };

        expect(
          () => UnifiedResponseParser.parse<TableValidationData>(
            json,
            dataParser: TableValidationData.fromJson,
          ),
          throwsA(isA<UnifiedResponseException>()),
        );
      });
    });

    group('Helper Methods', () {
      test('isSuccess should return correct boolean', () {
        const successResponse = ApiResponse<String>(
          status: 'success',
          message: 'Success',
          data: 'test',
        );

        const errorResponse = ApiResponse<String>(
          status: 'error',
          message: 'Error',
        );

        expect(UnifiedResponseParser.isSuccess(successResponse), true);
        expect(UnifiedResponseParser.isSuccess(errorResponse), false);
      });

      test('isError should return correct boolean', () {
        const successResponse = ApiResponse<String>(
          status: 'success',
          message: 'Success',
          data: 'test',
        );

        const errorResponse = ApiResponse<String>(
          status: 'error',
          message: 'Error',
        );

        expect(UnifiedResponseParser.isError(successResponse), false);
        expect(UnifiedResponseParser.isError(errorResponse), true);
      });

      test('getErrorMessage should return correct message', () {
        const responseWithError = ApiResponse<String>(
          status: 'error',
          message: 'General error',
          error: ApiError(
            code: 'validation_failed',
            message: 'Validation failed',
          ),
        );

        const responseWithoutError = ApiResponse<String>(
          status: 'error',
          message: 'General error',
        );

        expect(
          UnifiedResponseParser.getErrorMessage(responseWithError),
          'Validation failed',
        );
        expect(
          UnifiedResponseParser.getErrorMessage(responseWithoutError),
          'General error',
        );
      });

      test('getErrorCode should return correct code', () {
        const responseWithError = ApiResponse<String>(
          status: 'error',
          message: 'Error',
          error: ApiError(
            code: 'validation_failed',
            message: 'Validation failed',
          ),
        );

        const responseWithoutError = ApiResponse<String>(
          status: 'error',
          message: 'Error',
        );

        expect(
          UnifiedResponseParser.getErrorCode(responseWithError),
          'validation_failed',
        );
        expect(
          UnifiedResponseParser.getErrorCode(responseWithoutError),
          isNull,
        );
      });

      test('getData should return data or throw exception', () {
        const responseWithData = ApiResponse<String>(
          status: 'success',
          message: 'Success',
          data: 'test data',
        );

        const responseWithoutData = ApiResponse<String>(
          status: 'success',
          message: 'Success',
        );

        expect(UnifiedResponseParser.getData(responseWithData), 'test data');
        expect(
          () => UnifiedResponseParser.getData(responseWithoutData),
          throwsA(isA<UnifiedResponseException>()),
        );
      });

      test('getDataOrNull should return data or null', () {
        const responseWithData = ApiResponse<String>(
          status: 'success',
          message: 'Success',
          data: 'test data',
        );

        const responseWithoutData = ApiResponse<String>(
          status: 'success',
          message: 'Success',
        );

        expect(
          UnifiedResponseParser.getDataOrNull(responseWithData),
          'test data',
        );
        expect(
          UnifiedResponseParser.getDataOrNull(responseWithoutData),
          isNull,
        );
      });
    });

    group('Extension Methods', () {
      test('ApiResponseExtensions should work correctly', () {
        const successResponse = ApiResponse<String>(
          status: 'success',
          message: 'Success',
          data: 'test data',
        );

        const errorResponse = ApiResponse<String>(
          status: 'error',
          message: 'Error',
          error: ApiError(
            code: 'validation_failed',
            message: 'Validation failed',
          ),
        );

        // Test success response
        expect(successResponse.isSuccess, true);
        expect(successResponse.isError, false);
        expect(successResponse.errorMessage, 'Success');
        expect(successResponse.errorCode, isNull);
        expect(successResponse.dataOrThrow, 'test data');
        expect(successResponse.dataOrNull, 'test data');

        // Test error response
        expect(errorResponse.isSuccess, false);
        expect(errorResponse.isError, true);
        expect(errorResponse.errorMessage, 'Validation failed');
        expect(errorResponse.errorCode, 'validation_failed');
        expect(errorResponse.dataOrNull, isNull);
        expect(
          () => errorResponse.dataOrThrow,
          throwsA(isA<UnifiedResponseException>()),
        );
      });
    });
  });

  group('Table Validation Data Tests', () {
    test('should parse table validation data correctly', () {
      final json = {
        'status': 'success',
        'tableStatus': 'active',
        'restaurant': {
          'name': 'Test Restaurant',
          'id': 'rest123',
        },
        'table': {
          'number': '5',
          'id': 'table123',
          'capacity': 4,
        },
        'session': {
          'sessionId': 'session123',
          'expiresAt': '2024-01-01T12:00:00Z',
        },
        'primaryCustomer': {
          'phoneNumber': '+1234567890',
          'name': 'John Doe',
        },
        'occupiedBy': ['+1234567890'],
        'otpRequiredForOrder': true,
        'isUsernameMandatory': true,
        'isPhoneNumberMandatory': true,
        'isMultiUserSupported': false,
        'authMessage': 'Please enter OTP to continue',
      };

      final data = TableValidationData.fromJson(json);

      expect(data.status, 'success');
      expect(data.tableStatus, 'active');
      expect(data.restaurant?.name, 'Test Restaurant');
      expect(data.restaurant?.id, 'rest123');
      expect(data.table?.number, '5');
      expect(data.table?.id, 'table123');
      expect(data.table?.capacity, 4);
      expect(data.sessionId, 'session123');
      expect(data.sessionExpiresAt, '2024-01-01T12:00:00Z');
      expect(data.primaryCustomerName, 'John Doe');
      expect(data.primaryCustomerPhone, '+1234567890');
      expect(data.occupiedBy, ['+1234567890']);
      expect(data.otpRequiredForOrder, true);
      expect(data.isUsernameMandatory, true);
      expect(data.isPhoneNumberMandatory, true);
      expect(data.isMultiUserSupported, false);
      expect(data.authMessage, 'Please enter OTP to continue');
      expect(data.isTableActive, true);
      expect(data.isTableVacant, false);
    });

    test('should handle optional fields correctly', () {
      final json = {
        'status': 'success',
        'tableStatus': 'vacant',
        'restaurant': {
          'name': 'Test Restaurant',
          'id': 'rest123',
        },
        'table': {
          'number': '5',
          'id': 'table123',
        },
      };

      final data = TableValidationData.fromJson(json);

      expect(data.status, 'success');
      expect(data.tableStatus, 'vacant');
      expect(data.restaurant?.name, 'Test Restaurant');
      expect(data.table?.number, '5');
      expect(data.sessionId, isNull);
      expect(data.primaryCustomerName, isNull);
      expect(data.occupiedBy, isNull);
      expect(data.otpRequiredForOrder, false);
      expect(data.isUsernameMandatory, false);
      expect(data.isPhoneNumberMandatory, false);
      expect(data.isMultiUserSupported, false);
      expect(data.authMessage, isNull);
      expect(data.isTableActive, false);
      expect(data.isTableVacant, true);
    });
  });

  group('OTP Validation Data Tests', () {
    test('should parse OTP validation data correctly', () {
      final json = {
        'status': 'success',
        'customToken': 'token123',
        'isPrimaryCustomer': true,
        'sessionId': 'session123',
      };

      final data = OtpValidationData.fromJson(json);

      expect(data.status, 'success');
      expect(data.customToken, 'token123');
      expect(data.isPrimaryCustomer, true);
      expect(data.sessionId, 'session123');
    });

    test('should handle secondary customer correctly', () {
      final json = {
        'status': 'success',
        'customToken': null,
        'isPrimaryCustomer': false,
        'sessionId': 'session123',
      };

      final data = OtpValidationData.fromJson(json);

      expect(data.status, 'success');
      expect(data.customToken, isNull);
      expect(data.isPrimaryCustomer, false);
      expect(data.sessionId, 'session123');
    });
  });

  group('Table Status Data Tests', () {
    test('should parse table status data correctly', () {
      final json = {
        'tableNumber': '5',
        'capacity': 4,
        'status': 'active',
        'primaryCustomer': {
          'phoneNumber': '+1234567890',
          'name': 'John Doe',
        },
        'occupiedBy': ['+1234567890'],
        'assignedServer': {
          'name': 'Server Name',
          'status': 'active',
        },
        'hasActiveOTP': true,
      };

      final data = TableStatusData.fromJson(json);

      expect(data.tableNumber, '5');
      expect(data.capacity, 4);
      expect(data.status, 'active');
      expect(data.primaryCustomer?.name, 'John Doe');
      expect(data.primaryCustomer?.phoneNumber, '+1234567890');
      expect(data.occupiedBy, ['+1234567890']);
      expect(data.assignedServer?.name, 'Server Name');
      expect(data.assignedServer?.status, 'active');
      expect(data.hasActiveOTP, true);
    });
  });

  group('Integration Tests', () {
    test('should parse complete table validation response', () {
      final json = {
        'result': {
          'status': 'success',
          'message': 'Table validation successful',
          'data': {
            'status': 'success',
            'tableStatus': 'active',
            'restaurant': {
              'name': 'Test Restaurant',
              'id': 'rest123',
            },
            'table': {
              'number': '5',
              'id': 'table123',
              'capacity': 4,
            },
            'session': {
              'sessionId': 'session123',
              'expiresAt': '2024-01-01T12:00:00Z',
            },
            'primaryCustomer': {
              'phoneNumber': '+1234567890',
              'name': 'John Doe',
            },
            'otpRequiredForOrder': true,
          },
        },
      };

      final response = UnifiedResponseParser.parse<TableValidationData>(
        json,
        dataParser: TableValidationData.fromJson,
      );

      expect(response.isSuccess, true);
      expect(response.message, 'Table validation successful');
      expect(response.data, isNotNull);
      expect(response.data!.tableStatus, 'active');
      expect(response.data!.restaurantName, 'Test Restaurant');
      expect(response.data!.tableNumber, '5');
      expect(response.data!.sessionId, 'session123');
      expect(response.data!.primaryCustomerName, 'John Doe');
      expect(response.data!.otpRequiredForOrder, true);
    });

    test('should parse error response with validation details', () {
      final json = {
        'result': {
          'status': 'error',
          'message': 'Validation failed',
          'error': {
            'code': 'validation_failed',
            'message': 'Invalid table ID',
            'details': {
              'field': 'tableId',
              'reason': 'Table ID must be a valid UUID',
            },
          },
        },
      };

      final response = UnifiedResponseParser.parse<TableValidationData>(
        json,
        dataParser: TableValidationData.fromJson,
      );

      expect(response.isError, true);
      expect(response.message, 'Validation failed');
      expect(response.data, isNull);
      expect(response.error, isNotNull);
      expect(response.error!.code, 'validation_failed');
      expect(response.error!.message, 'Invalid table ID');
      expect(response.error!.details, isNotNull);
      expect(response.error!.details['field'], 'tableId');
      expect(
        response.error!.details['reason'],
        'Table ID must be a valid UUID',
      );
    });
  });
}
