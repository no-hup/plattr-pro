# Table Scan Frontend Requirements

## Overview
This document outlines the frontend requirements for handling table scanning and OTP validation in the restaurant app. It focuses on error handling, user experience, and integration with the refactored backend API.

## Error Response Handling

All error responses from the backend will be in the standard Firebase `HttpsError` format:
```json
{
  "error": {
    "code": "<firebase_error_code>",
    "message": "<descriptive_error_message>",
    "details": {
      "httpCode": <http_status_code>,
      // Additional context fields
    }
  }
}
```

### Scan - A. Invalid Input
When the backend returns a 400 Bad Request (`invalid-argument`):
- Display field-specific validation errors from `error.details.errors`
- Highlight affected input fields in red
- Show error messages below each invalid field

### Scan - B. OTP Required
When receiving a 401 Unauthorized (`unauthenticated`) with `otpRequired: true`:
1. Extract required information from `error.details`:
   ```typescript
   interface OTPDialogConfig {
     authMessage: string;          // Who to ask for OTP
     tableStatus: 'active' | 'pending'; // First user or joining
     isUsernameMandatory: boolean; // Show name input?
     isPhoneNumberMandatory: boolean; // Show phone input?
     isMultiUserSupported: boolean; // Multi-user table?
     restaurant: {
       name: string;
       id: string;
     };
     table: {
       number: string | number;
       id: string;
       capacity: number | null;
       assignedServerId?: string;
     };
     primaryCustomer?: {
       name: string;
       phoneNumber: string;
     };
     assignedServer?: {
       name: string;
       id: string;
     };
   }
   ```
2. Display OTP dialog with:
   - Clear guidance message from `authMessage`
   - Required input fields based on flags
   - Restaurant and table context

### Scan - C. Table Disabled
When receiving a 403 Forbidden (`permission-denied`):
- Display error message: "This table is currently unavailable"
- Show table number and restaurant name from `error.details`
- Provide option to scan a different table

### Scan - D. Location Error
When receiving a 412 Precondition Failed (`failed-precondition`):
- Display user-friendly message about location requirement
- Show distance from restaurant if available in `error.details`
- Provide retry option and location settings link

## OTP Validation Requirements

### OTP Validation - A. Missing Fields
When receiving a 400 Bad Request (`invalid-argument`):
1. For missing phone number:
   ```typescript
   if (error.code === 'invalid-argument' && error.message.includes('Phone number')) {
     showError(error.details.details); // Shows specific requirement message
   }
   ```
2. For missing name:
   ```typescript
   if (error.code === 'invalid-argument' && error.message.includes('Name')) {
     showError(error.details.details); // Shows specific requirement message
   }
   ```

### OTP Validation - B. Wrong OTP for Active Table
When receiving a 401 Unauthorized (`unauthenticated`) with special guidance:
```typescript
if (error.code === 'unauthenticated' && error.details?.status === 'ask_primary_customer') {
  showGuidanceMessage(error.details.message); // Special UI for asking primary customer
  clearOTPField();
  keepOtherFields(); // Preserve name/phone if entered
}
```

### OTP Validation - C. Invalid OTP
When receiving a 401 Unauthorized (`unauthenticated`) without special guidance:
```typescript
if (error.code === 'unauthenticated' && !error.details?.status) {
  showError('Invalid OTP. Please try again.');
  clearOTPField();
  keepOtherFields();
}
```

### OTP Validation - D. No Active Session
When receiving a 412 Precondition Failed (`failed-precondition`):
- Show error message about missing session
- Provide option to scan table again
- Clear all input fields

## Feature Flag Requirements

1. `isOtpManadatoryAtScan`:
   - When true: Require OTP before showing menu
   - When false: Allow menu access, require OTP for orders

2. `isUsernameEnabled`:
   - When true: Show name field in OTP dialog
   - When false: Hide name field unless primary customer

3. `isMultiUserSupportEnabled`:
   - When true: Phone optional for secondary users
   - When false: Always require phone number

## Session Management Requirements

1. Store session data securely:
   ```typescript
   interface SessionData {
     sessionId: string;
     isPrimaryCustomer: boolean;
     customToken?: string; // If phone provided
   }
   ```

2. Handle session expiry:
   - Monitor session validity
   - Prompt re-authentication when needed
   - Preserve user context during re-auth

## UI/UX Requirements

1. Progressive Disclosure:
   - Initially show only OTP field
   - Animate additional fields when required
   - Clear visual hierarchy of inputs

2. Error States:
   - Field-level validation messages
   - Form-level error alerts
   - Clear recovery actions

3. Loading States:
   - Disable form during API calls
   - Show loading indicators
   - Prevent double-submission

4. Success States:
   - Clear success confirmation
   - Smooth transition to next screen
   - Preserve context in navigation

## Implementation Guidelines

1. Error Handling:
   ```typescript
   try {
     const response = await validateOTP(data);
     handleSuccess(response);
   } catch (error) {
     if (error.code === 'unauthenticated') {
       handleAuthError(error);
     } else if (error.code === 'invalid-argument') {
       handleValidationError(error);
     } else if (error.code === 'failed-precondition') {
       handleSessionError(error);
     } else {
       handleUnexpectedError(error);
     }
   }
   ```

2. Form Validation:
   ```typescript
   const validateForm = (values: FormValues) => {
     const errors: FormErrors = {};
     
     if (!values.otp?.match(/^\d{6}$/)) {
       errors.otp = 'Please enter a valid 6-digit OTP';
     }
     
     if (isPhoneRequired && !values.phoneNumber) {
       errors.phoneNumber = 'Phone number is required';
     }
     
     if (isNameRequired && !values.name) {
       errors.name = 'Name is required';
     }
     
     return errors;
   };
   ```

3. Success Handling:
   ```typescript
   const handleSuccess = async (response: APIResponse) => {
     if (response.customToken) {
       await firebase.auth().signInWithCustomToken(response.customToken);
     }
     
     sessionStorage.setItem('sessionId', response.sessionId);
     sessionStorage.setItem('isPrimaryCustomer', String(response.isPrimaryCustomer));
     
     navigate('/table-view');
   };
   ```

## Testing Requirements

1. Error Scenarios:
   - All error responses from backend
   - Network failures
   - Session expiry

2. Feature Flag Combinations:
   - All possible combinations
   - Flag changes during session

3. User Flows:
   - Primary customer flow
   - Secondary user flow
   - Anonymous access flow

4. Edge Cases:
   - OTP expiry during input
   - Location changes
   - Multiple device access 