# Table Verification Module

## Overview
The Table Verification module handles the process of validating a user's access to a specific table in a restaurant. It includes table validation, user authentication, and optional OTP verification.

## Key Components

### Models
- `UserLocation`: Represents the user's geographical location
- `TableValidationResponse`: Contains the response data from the table validation API
- `TableValidationException`: Custom exception for table validation errors

### Repository
- `TableRepository`: Handles API communication for table validation
- `TableResponseParser`: Parses API responses into model objects
- `TableErrorCodes`: Defines standardized error codes for the module

### UI Components
- `TableVerificationPage`: Main page for table verification
- `TableVerificationPageState`: Manages the state and UI of the verification process

## State Management
The module uses a state-based approach with the following states:
- `loading`: Initial state while validating the table
- `error`: Shown when an error occurs during validation
- `otpRequired`: Displayed when OTP verification is needed
- `success`: Shown when table validation is successful

## Error Handling
Errors are handled consistently using:
- Standardized error codes from `TableErrorCodes`
- Comprehensive logging with `AppLogger`
- User-friendly error messages
- Retry functionality for recoverable errors

## API Integration
The module communicates with the backend using:
- Dio for HTTP requests
- Standardized request/response handling
- Proper timeout and error management
- Consistent logging of API interactions

## Usage
To use this module, navigate to the `TableVerificationPage` with the required parameters:
```dart
context.go('/table-verification/$restaurantId/$tableId');
```

Or create the page directly:
```dart
TableVerificationPage(
  restaurantId: 'restaurant-123',
  tableId: 'table-456',
  onLoginSuccess: () => print('Login successful!'),
)
``` 