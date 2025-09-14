# Plattr Table Validation Changes

This document contains the changes made to improve table validation logic and documentation.

## Changes Made

```diff
diff --git a/functions/table/allPossibleResponses.md b/functions/table/allPossibleResponses.md
index b52f29a..d96544e 100644
--- a/functions/table/allPossibleResponses.md
+++ b/functions/table/allPossibleResponses.md
@@ -255,3 +255,687 @@ These responses indicate an issue preventing access or requiring further action
 *   **Test Case 10.4 (User Not in Location):** Covered by Error Response #5.
 
 This document aims to be exhaustive based on the function's logic and the `ErrorHandler` implementation.
+
+---
+
+## Frontend OTP Dialog Implementation Guide
+
+### 1. Rendering OTP Dialog
+
+When receiving a 401 (unauthenticated) response with `otpRequired: true`, the frontend should render an OTP dialog using the following fields from the error response:
+
+```typescript
+interface OTPDialogConfig {
+    // Core display fields
+    authMessage: string;          // Direct message to show user about who to ask for OTP
+    tableStatus: 'active' | 'pending'; // Use to determine if this is first user (pending) or joining (active)
+    
+    // Input field requirements
+    isUsernameMandatory: boolean; // Whether to show and require name input
+    isPhoneNumberMandatory: boolean; // Whether to show and require phone input
+    isMultiUserSupported: boolean; // Whether this is a multi-user table
+    
+    // Context information
+    restaurant: {
+        name: string;
+        id: string;
+    };
+    table: {
+        number: string | number;
+        id: string;
+        capacity: number | null;
+        assignedServerId?: string;
+    };
+    primaryCustomer: {
+        name: string;
+        phoneNumber: string;
+    } | null;
+    assignedServer: {
+        name: string;
+        id: string;
+    } | null;
+}
+```
+
+### 2. Dialog Behavior Rules
+
+1. **Input Fields Display Logic:**
+   - Always show OTP input field
+   - Show name input if `isUsernameMandatory: true`
+   - Show phone input if `isPhoneNumberMandatory: true`
+   - If `isMultiUserSupported: false`, always show phone input regardless of `isPhoneNumberMandatory`
+
+2. **Validation Rules:**
+   - OTP: 6 digits, numeric only
+   - Phone (if shown): Valid phone number format
+   - Name (if shown): Non-empty string, minimum 2 characters
+
+3. **Submit Button State:**
+   - Enable only when all required fields are valid
+   - Show loading state during API call
+
+### 3. API Integration - validateOTP
+
+When the user submits the OTP dialog, call the `validateOTP` endpoint:
+
+```typescript
+interface ValidateOTPRequest {
+    restaurantId: string;  // From the error response
+    tableId: string;      // From the error response
+    otp: string;         // User input
+    phoneNumber?: string; // User input (if shown)
+    name?: string;       // User input (if shown)
+}
+```
+
+#### Success Response (HTTP 200)
+```json
+{
+    "status": "success",
+    "customToken": string | null,    // Firebase auth token if phone provided
+    "isPrimaryCustomer": boolean,    // Whether this user is the table owner
+    "sessionId": string             // Required for future requests
+}
+```
+
+**Handle Success:**
+1. If `customToken` present:
+   - Sign in to Firebase using the token
+   - Store user credentials
+2. Store `sessionId` for future requests
+3. If `isPrimaryCustomer: true`:
+   - Show primary customer UI features
+   - Enable order management
+4. Proceed to main table view
+
+#### Error Responses
+
+1. **Wrong OTP (HTTP 401)**
+```json
+{
+    "error": {
+        "code": "unauthenticated",
+        "message": "Invalid OTP",
+        "details": {
+            "httpCode": 401,
+            "status": "ask_primary_customer",
+            "message": "Please ask the primary customer or the server/waiter for the correct OTP."
+        }
+    }
+}
+```
+**Handle:** Show error message, clear OTP field, keep other fields
+
+2. **Missing Required Fields (HTTP 400)**
+```json
+{
+    "error": {
+        "code": "invalid-argument",
+        "message": "Name is required for primary customer or when username feature is enabled",
+        "details": {
+            "httpCode": 400
+        }
+    }
+}
+```
+**Handle:** Show field-specific error messages, highlight invalid fields
+
+3. **Session Error (HTTP 412)**
+```json
+{
+    "error": {
+        "code": "failed-precondition",
+        "message": "No active session for this table",
+        "details": {
+            "httpCode": 412
+        }
+    }
+}
+```
+**Handle:** Show error message, option to restart flow
+
+### 4. Implementation Example
+
+```typescript
+async function handleOTPSubmit(values: OTPFormValues) {
+    try {
+        setLoading(true);
+        
+        const response = await validateOTP({
+            restaurantId,
+            tableId,
+            otp: values.otp,
+            ...(values.phoneNumber && { phoneNumber: values.phoneNumber }),
+            ...(values.name && { name: values.name })
+        });
+        
+        if (response.customToken) {
+            await firebase.auth().signInWithCustomToken(response.customToken);
+        }
+        
+        sessionStorage.setItem('tableSessionId', response.sessionId);
+        
+        if (response.isPrimaryCustomer) {
+            setPrimaryCustomerFeatures(true);
+        }
+        
+        navigate('/table-view');
+        
+    } catch (error) {
+        if (error.code === 'unauthenticated') {
+            setOtpError(error.details.message);
+            clearOTPField();
+        } else if (error.code === 'invalid-argument') {
+            setFieldErrors(parseValidationErrors(error));
+        } else {
+            setGeneralError('An error occurred. Please try again.');
+        }
+    } finally {
+        setLoading(false);
+    }
+}
+```
+
+### 5. UI/UX Best Practices
+
+1. **Progressive Disclosure:**
+   - Initially show only OTP field
+   - Show additional fields (name/phone) only if required
+   - Animate field transitions for smooth UX
+
+2. **Error Handling:**
+   - Show inline field validation errors
+   - Display API errors prominently
+   - Provide clear recovery actions
+
+3. **Loading States:**
+   - Disable form during submission
+   - Show spinner on submit button
+   - Prevent multiple submissions
+
+4. **Success Feedback:**
+   - Show success animation
+   - Clear indication of successful validation
+   - Smooth transition to next screen
+
+---
+
+## validateOTP Response Documentation
+
+### Success Responses (HTTP 200 OK equivalent)
+
+These responses indicate successful OTP validation and session creation/joining.
+
+1. **Primary Customer OTP Validation Success**
+   * **Condition:** Valid OTP provided for a `vacant` or `OTP_PENDING` table, with required phone number and name.
+   * **Response Structure:**
+   ```json
+   {
+     "status": "success",
+     "customToken": "<firebase_auth_token>", // For authentication
+     "isPrimaryCustomer": true,
+     "sessionId": "<session_id>"  // For future requests
+   }
+   ```
+
+2. **Secondary Customer OTP Validation Success**
+   * **Condition:** Valid OTP provided for an `active` table, with optional phone number and name based on feature flags.
+   * **Response Structure:**
+   ```json
+   {
+     "status": "success",
+     "customToken": "<firebase_auth_token>", // Only if phone number provided
+     "isPrimaryCustomer": false,
+     "sessionId": "<session_id>"  // For future requests
+   }
+   ```
+
+### Error Responses
+
+1. **Bad Request (`invalid-argument`, HTTP 400)**
+   * **Condition 1:** Missing required phone number
+   * **Response Structure:**
+   ```json
+   {
+     "error": {
+       "code": "invalid-argument",
+       "message": "Phone number is required for this operation",
+       "details": {
+         "httpCode": 400,
+         "details": "Phone number is required for primary customers or when multi-user support is disabled"
+       }
+     }
+   }
+   ```
+
+   * **Condition 2:** Missing required name
+   * **Response Structure:**
+   ```json
+   {
+     "error": {
+       "code": "invalid-argument",
+       "message": "Name is required for this operation",
+       "details": {
+         "httpCode": 400,
+         "details": "Name is required for primary customers or when username feature is enabled"
+       }
+     }
+   }
+   ```
+
+2. **Authentication Failed (`unauthenticated`, HTTP 401)**
+   * **Condition 1:** Invalid OTP for vacant/pending table
+   * **Response Structure:**
+   ```json
+   {
+     "error": {
+       "code": "unauthenticated",
+       "message": "Invalid OTP",
+       "details": {
+         "httpCode": 401,
+         "details": "The provided OTP is incorrect",
+         "tableStatus": "pending" // or "vacant"
+       }
+     }
+   }
+   ```
+
+   * **Condition 2:** Invalid OTP for active table (special guidance case)
+   * **Response Structure:**
+   ```json
+   {
+     "error": {
+       "code": "unauthenticated",
+       "message": "Invalid OTP",
+       "details": {
+         "httpCode": 401,
+         "status": "ask_primary_customer",
+         "message": "Please ask the primary customer or the server/waiter for the correct OTP.",
+         "tableStatus": "active"
+       }
+     }
+   }
+   ```
+
+3. **Internal Server Error (`internal`, HTTP 500)**
+   * **Condition 1:** Missing OTP data in table
+   * **Response Structure:**
+   ```json
+   {
+     "error": {
+       "code": "internal",
+       "message": "OTP data missing for the table. Please try scanning again.",
+       "details": {
+         "httpCode": 500,
+         "tableStatus": "<original_status>",
+         "error": "Missing OTP data",
+         "restaurantId": "<restaurant_id>",
+         "tableId": "<table_id>"
+       }
+     }
+   }
+   ```
+
+   * **Condition 2:** Invalid table status
+   * **Response Structure:**
+   ```json
+   {
+     "error": {
+       "code": "internal",
+       "message": "Unexpected table status encountered during OTP validation",
+       "details": {
+         "httpCode": 500,
+         "tableStatus": "<unexpected_status>",
+         "error": "Invalid table status",
+         "restaurantId": "<restaurant_id>",
+         "tableId": "<table_id>"
+       }
+     }
+   }
+   ```
+
+4. **Precondition Failed (`failed-precondition`, HTTP 412)**
+   * **Condition:** No active session found for secondary user
+   * **Response Structure:**
+   ```json
+   {
+     "error": {
+       "code": "failed-precondition",
+       "message": "No active session for this table",
+       "details": {
+         "httpCode": 412,
+         "restaurantId": "<restaurant_id>",
+         "tableId": "<table_id>",
+         "error": "Missing active session"
+       }
+     }
+   }
+   ```
+
+## Frontend Implementation Guide for validateOTP
+
+### 1. State Management
+
+```typescript
+interface OTPValidationState {
+  isPrimaryCustomer: boolean;      // Determines UI/UX flow
+  isPhoneNumberRequired: boolean;  // Based on table status and feature flags
+  isNameRequired: boolean;         // Based on feature flags and primary status
+  tableStatus: 'active' | 'pending' | 'vacant';
+  validationErrors: {
+    otp?: string;
+    phone?: string;
+    name?: string;
+  };
+  isLoading: boolean;
+}
+```
+
+### 2. Form Validation Rules
+
+```typescript
+const validationRules = {
+  otp: {
+    required: true,
+    pattern: /^\d{6}$/,
+    message: 'Please enter a valid 6-digit OTP'
+  },
+  phoneNumber: {
+    required: isPhoneNumberRequired,
+    pattern: /^[+]?[\d\s-]+$/,
+    message: 'Please enter a valid phone number'
+  },
+  name: {
+    required: isNameRequired,
+    minLength: 2,
+    message: 'Please enter a valid name (minimum 2 characters)'
+  }
+};
+```
+
+### 3. Error Handling Implementation
+
+```typescript
+class OTPValidationError extends Error {
+  constructor(public code: string, public details: any) {
+    super();
+  }
+}
+
+async function handleOTPValidation(formData: OTPFormData) {
+  try {
+    setLoading(true);
+    
+    const response = await validateOTP({
+      restaurantId,
+      tableId,
+      otp: formData.otp,
+      ...(formData.phoneNumber && { phoneNumber: formData.phoneNumber }),
+      ...(formData.name && { name: formData.name })
+    });
+
+    // Handle success
+    if (response.customToken) {
+      await firebase.auth().signInWithCustomToken(response.customToken);
+    }
+    
+    sessionStorage.setItem('tableSessionId', response.sessionId);
+    sessionStorage.setItem('isPrimaryCustomer', String(response.isPrimaryCustomer));
+    
+    return response;
+
+  } catch (error) {
+    switch (error.code) {
+      case 'invalid-argument':
+        handleValidationError(error);
+        break;
+        
+      case 'unauthenticated':
+        if (error.details?.status === 'ask_primary_customer') {
+          showGuidanceMessage(error.details.message);
+        } else {
+          handleInvalidOTP(error);
+        }
+        break;
+        
+      case 'internal':
+        if (error.details?.error === 'Missing OTP data') {
+          handleMissingOTPData(error);
+        } else {
+          handleSystemError(error);
+        }
+        break;
+        
+      case 'failed-precondition':
+        handleSessionError(error);
+        break;
+        
+      default:
+        handleUnexpectedError(error);
+    }
+    throw new OTPValidationError(error.code, error.details);
+  } finally {
+    setLoading(false);
+  }
+}
+```
+
+### 4. UI Components and States
+
+```typescript
+interface OTPDialogProps {
+  tableStatus: string;
+  isPhoneNumberRequired: boolean;
+  isNameRequired: boolean;
+  onSubmit: (formData: OTPFormData) => Promise<void>;
+  onCancel: () => void;
+}
+
+function OTPValidationDialog(props: OTPDialogProps) {
+  const [formData, setFormData] = useState<OTPFormData>({
+    otp: '',
+    phoneNumber: '',
+    name: ''
+  });
+  
+  const [errors, setErrors] = useState<ValidationErrors>({});
+  const [isLoading, setIsLoading] = useState(false);
+  
+  // Progressive field display
+  const showPhoneField = props.isPhoneNumberRequired;
+  const showNameField = props.isNameRequired;
+  
+  // Validation states
+  const isFormValid = useCallback(() => {
+    const requiredFields = ['otp'];
+    if (showPhoneField) requiredFields.push('phoneNumber');
+    if (showNameField) requiredFields.push('name');
+    
+    return requiredFields.every(field => 
+      formData[field] && !errors[field]
+    );
+  }, [formData, errors, showPhoneField, showNameField]);
+  
+  // Error message display
+  const ErrorMessage = ({ field }: { field: keyof ValidationErrors }) => (
+    errors[field] ? (
+      <Typography color="error" variant="caption">
+        {errors[field]}
+      </Typography>
+    ) : null
+  );
+  
+  return (
+    <Dialog open={true} onClose={props.onCancel}>
+      <DialogTitle>
+        {props.tableStatus === 'active' ? 'Join Table' : 'Validate Table Access'}
+      </DialogTitle>
+      
+      <DialogContent>
+        <TextField
+          label="Enter OTP"
+          value={formData.otp}
+          onChange={handleOTPChange}
+          error={!!errors.otp}
+          helperText={<ErrorMessage field="otp" />}
+        />
+        
+        {showPhoneField && (
+          <TextField
+            label="Phone Number"
+            value={formData.phoneNumber}
+            onChange={handlePhoneChange}
+            error={!!errors.phoneNumber}
+            helperText={<ErrorMessage field="phoneNumber" />}
+          />
+        )}
+        
+        {showNameField && (
+          <TextField
+            label="Name"
+            value={formData.name}
+            onChange={handleNameChange}
+            error={!!errors.name}
+            helperText={<ErrorMessage field="name" />}
+          />
+        )}
+      </DialogContent>
+      
+      <DialogActions>
+        <Button onClick={props.onCancel}>Cancel</Button>
+        <LoadingButton
+          onClick={handleSubmit}
+          loading={isLoading}
+          disabled={!isFormValid()}
+        >
+          Validate
+        </LoadingButton>
+      </DialogActions>
+    </Dialog>
+  );
+}
+```
+
+### 5. Error Message Components
+
+```typescript
+interface ErrorMessageProps {
+  error: OTPValidationError;
+  onRetry?: () => void;
+  onScanAgain?: () => void;
+}
+
+function OTPErrorMessage({ error, onRetry, onScanAgain }: ErrorMessageProps) {
+  switch (error.code) {
+    case 'unauthenticated':
+      return (
+        <Alert 
+          severity="warning"
+          action={
+            <Button color="inherit" onClick={onRetry}>
+              Try Again
+            </Button>
+          }
+        >
+          {error.details?.status === 'ask_primary_customer' 
+            ? error.details.message 
+            : 'Invalid OTP. Please try again.'}
+        </Alert>
+      );
+      
+    case 'internal':
+      return (
+        <Alert 
+          severity="error"
+          action={
+            <Button color="inherit" onClick={onScanAgain}>
+              Scan Again
+            </Button>
+          }
+        >
+          {error.details?.error === 'Missing OTP data'
+            ? 'Please scan the table QR code again.'
+            : 'An unexpected error occurred. Please try again.'}
+        </Alert>
+      );
+      
+    default:
+      return (
+        <Alert severity="error">
+          {error.message || 'An error occurred. Please try again.'}
+        </Alert>
+      );
+  }
+}
+```
+
+### 6. Success Handling
+
+```typescript
+async function handleValidationSuccess(response: ValidateOTPResponse) {
+  // 1. Handle authentication if applicable
+  if (response.customToken) {
+    await firebase.auth().signInWithCustomToken(response.customToken);
+    await initializeUserProfile();
+  }
+  
+  // 2. Store session information
+  sessionStorage.setItem('tableSessionId', response.sessionId);
+  sessionStorage.setItem('isPrimaryCustomer', String(response.isPrimaryCustomer));
+  
+  // 3. Update application state
+  if (response.isPrimaryCustomer) {
+    dispatch(setPrimaryCustomerState(true));
+    dispatch(enableOrderManagement(true));
+  }
+  
+  // 4. Show success feedback
+  showSuccessNotification(
+    response.isPrimaryCustomer 
+      ? 'Table access granted! You are the primary customer.'
+      : 'Successfully joined the table!'
+  );
+  
+  // 5. Navigate to appropriate view
+  navigate('/table-view', {
+    state: { 
+      sessionId: response.sessionId,
+      isPrimaryCustomer: response.isPrimaryCustomer
+    }
+  });
+}
+```
+
+### 7. Best Practices and Tips
+
+1. **Progressive Enhancement:**
+   - Start with minimal required fields (OTP)
+   - Smoothly animate additional fields when needed
+   - Clear visual indication of required vs optional fields
+
+2. **Error Recovery:**
+   - Preserve user input on recoverable errors
+   - Clear only the OTP field on invalid OTP
+   - Provide clear action buttons for error recovery
+
+3. **Loading States:**
+   - Show loading indicators during validation
+   - Disable form submission while processing
+   - Maintain field values during loading
+
+4. **Success Feedback:**
+   - Clear success animations
+   - Informative messages about next steps
+   - Smooth transition to table view
+
+5. **Session Management:**
+   - Store session ID securely
+   - Handle session expiry gracefully
+   - Implement session refresh if needed
+
+6. **Feature Flag Handling:**
+   - Dynamically adjust UI based on feature flags
+   - Cache feature flag values appropriately
+   - Handle flag changes during session
+
+---
diff --git a/functions/table/table.js b/functions/table/table.js
index aaa3613..6316ad2 100644
--- a/functions/table/table.js
+++ b/functions/table/table.js
@@ -8,10 +8,11 @@ const featureFlags = require('../singleton/FeatureFlags');
 const errorHandler = require('../singleton/ErrorHandler');
 const httpStatusCodes = require('../singleton/HttpStatusCodes');
 const timestamp = require('../utils/timestamp');
+const { buildAuthDetails } = require('./tableHelperFunctions');
 
 // Initialize Firestore and FieldValue
 const db = admin.firestore();
-const { FieldValue, Timestamp } = admin.firestore;
+const { FieldValue } = admin.firestore;
 
 const TABLE_STATUS = {
     ACTIVE: 'active',
@@ -22,23 +23,32 @@ const TABLE_STATUS = {
 
 /**
 * Validates a table and user location, then generates an OTP for table access
-* - Checks if restaurant and table exist
-* - Verifies user is within restaurant premises
-* - Handles existing sessions
-* - Determines if OTP verification is needed based on feature flags
-* - Returns appropriate response based on table status and session validity
+* @param {Object} request - The request object containing data
+* @param {Object} context - The context object
+* @returns {Promise<Object>} Response object with table access details
+* @throws {Error} Various error types based on validation failures
 */
-exports.validateTableAndLocation = functions.https.onCall(async (dataa, context) => {
+exports.validateTableAndLocation = functions.https.onCall(async (request, context) => {
     try {
-        // Standardize input handling
-        const data = dataa.data;
+        // 1. Input Validation & Standardization
+        if (!request?.data) {
+            errorHandler.badRequest('Invalid request format - missing data', {
+                details: 'Request must include a data object'
+            });
+        }
+        const data = request.data;
+        
+        // 2. Input Validation
         TableInputValidation.validateTableAndLocationInput(data);
         const { restaurantId, tableId, userLocation, sessionId } = data;
         
-        // Fetch all required data upfront
+        // 3. Data Fetching
         const { restaurantData, tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
         
-        // Prepare common info objects that will be used throughout the function
+        // Store original status for reference throughout the function
+        const originalStatus = tableData.status;
+        
+        // 4. Prepare Response Objects
         const restaurantInfo = {
             name: restaurantData.name,
             id: restaurantId
@@ -47,50 +57,56 @@ exports.validateTableAndLocation = functions.https.onCall(async (dataa, context)
         const tableInfo = {
             number: tableData.number,
             id: tableId,
-            capacity: tableData.capacity || null
+            capacity: tableData.capacity || null,
+            ...(tableData.assignedServerId && { assignedServerId: tableData.assignedServerId })
         };
         
-        if (tableData.assignedServerId) {
-            tableInfo.assignedServerId = tableData.assignedServerId;
-        }
-        
-        // If table is disabled, return forbidden error
-        if (tableData.status === TABLE_STATUS.DISABLED) {
-            errorHandler.forbidden("This table is currently unavailable", {
-                tableStatus: TABLE_STATUS.DISABLED,
-                restaurant: restaurantInfo,
-                table: tableInfo
-            });
+        // 5. Guard Clauses - Early exits for invalid states
+        // 5a. Handle disabled table
+        if (originalStatus === TABLE_STATUS.DISABLED) {
+            errorHandler.forbidden(
+                "This table is currently unavailable",
+                {
+                    tableStatus: TABLE_STATUS.DISABLED,
+                    restaurant: restaurantInfo,
+                    table: tableInfo,
+                    error: 'Table is disabled'
+                }
+            );
         }
         
-        // Check location only if not disabled (optimization)
+        // 5b. Handle user not in restaurant premises
         if (!isWithinRadius(userLocation, restaurantData.location, 100)) {
-            errorHandler.preconditionFailed('User not in restaurant premises');
+            errorHandler.preconditionFailed(
+                'User not in restaurant premises',
+                {
+                    restaurant: restaurantInfo,
+                    table: tableInfo,
+                    userLocation,
+                    restaurantLocation: restaurantData.location,
+                    error: 'User location validation failed'
+                }
+            );
         }
         
-        // Check if provided session is valid
-        let session = null;
+        // 5c. Handle valid session - early success return
+        let validatedSession = null;
         if (sessionId) {
-            console.log("sessionId", sessionId);
-            session = await sessionService.validateTableSession(restaurantId, tableId, { throwError: false });
+            validatedSession = await sessionService.validateTableSession(restaurantId, tableId, { throwError: false });
         }
-        
-        // If session is valid, grant immediate access
-        if (session) {
-            console.log("Session is valid, granting immediate access");
-            
-            // Use timestamp utility to get expiresAt as ISO string
-            const expiresAtString = timestamp.toISOString(session.expiresAt);
+
+        if (validatedSession) {
+            const expiresAtString = timestamp.toISOString(validatedSession.expiresAt);
             
             const response = {
                 status: "success",
                 message: "Access granted",
                 data: {
-                    tableStatus: tableData.status,
+                    tableStatus: originalStatus,
                     restaurant: restaurantInfo,
                     table: tableInfo,
                     session: {
-                        sessionId: session.id,
+                        sessionId: validatedSession.id,
                         expiresAt: expiresAtString
                     }
                 }
@@ -103,104 +119,109 @@ exports.validateTableAndLocation = functions.https.onCall(async (dataa, context)
             if (tableData.occupiedBy) {
                 response.data.occupiedBy = tableData.occupiedBy;
             }
+            
             return response;
         }
         
-        // Determine if OTP check is needed
-        const isOtpRequired = featureFlags.isEnabled('isOtpManadatoryAtScan');
-        
-        // TODO shaurya -remove this later. Better to auto trigger OTP generation periodically for all tables.
-        //Waiters/servers will have a screen on their app where all tables are listed and their otps will be displayed.
-        if (tableData.status === TABLE_STATUS.VACANT) {
-            // Generate an OTP for vacant tables - will be needed when user places an order
+        // 6. OTP Generation for Vacant Tables
+        if (originalStatus === TABLE_STATUS.VACANT) {
+            console.log(`Table ${tableId} is VACANT, generating OTP and setting status to OTP_PENDING`);
             const otpObject = otpService.createOTPObject();
-            await tableRef.update({
-                currentOTP: otpObject,
-                firstScannedAt: admin.firestore.FieldValue.serverTimestamp(),
-                status: TABLE_STATUS.OTP_PENDING  // Keep it vacant until user places an order
-            });
-        }
-        if(!isOtpRequired){
             
-            return {
-                status: "success",
-                message: "Access granted",
-                data: {
-                    tableStatus: TABLE_STATUS.VACANT,
-                    restaurant: restaurantInfo,
-                    table: tableInfo
-                }
-            };
+            try {
+                await tableRef.update({
+                    currentOTP: otpObject,
+                    firstScannedAt: FieldValue.serverTimestamp(),
+                    status: TABLE_STATUS.OTP_PENDING
+                });
+                console.log(`Table ${tableId} status updated to OTP_PENDING in Firestore`);
+            } catch (updateError) {
+                console.error(`Error updating table ${tableId} to OTP_PENDING:`, updateError);
+                errorHandler.internalError(
+                    "Failed to prepare table for OTP validation",
+                    {
+                        originalStatus,
+                        tableId,
+                        restaurantId,
+                        restaurant: restaurantInfo,
+                        table: tableInfo,
+                        error: updateError.message
+                    }
+                );
+            }
         }
         
-        // Handle case where OTP is required (for both vacant and active tables)
+        // 7. Main Logic Flow - Handle OTP Requirements
+        const isOtpRequired = featureFlags.isEnabled('isOtpManadatoryAtScan');
+        
         if (isOtpRequired) {
-            // Build auth message based on available contact persons
-            let authMessage = "Please ask the restaurant staff for the OTP to join this table";
-            let assignedServerInfo = null;
+            const { authMessage, assignedServerInfo } = await buildAuthDetails(tableData, restaurantId, db);
             
-            if (tableData.primaryCustomer && tableData.primaryCustomer.name) {
-                authMessage = `Please ask ${tableData.primaryCustomer.name} for the OTP to join this table`;
-            }
+            const reportedStatusOnError = (originalStatus === TABLE_STATUS.VACANT) 
+                ? TABLE_STATUS.OTP_PENDING 
+                : TABLE_STATUS.ACTIVE;
             
-            if (tableData.assignedServerId) {
-                const serverDoc = await db
-                .collection('restaurants')
-                .doc(restaurantId)
-                .collection('servers')
-                .doc(tableData.assignedServerId)
-                .get();
-                
-                if (serverDoc.exists) {
-                    const serverName = serverDoc.data().name;
-                    assignedServerInfo = {
-                        name: serverName,
-                        id: tableData.assignedServerId
-                    };
-                    
-                    if (tableData.primaryCustomer && tableData.primaryCustomer.name) {
-                        authMessage = `Please ask ${tableData.primaryCustomer.name} or your server ${serverName} for the OTP`;
-                    } else {
-                        authMessage = `Please ask your server ${serverName} for the OTP to join this table`;
-                    }
-                }
-            }
+            const isPhoneNumberMandatory = (originalStatus === TABLE_STATUS.VACANT || originalStatus === TABLE_STATUS.OTP_PENDING) 
+                || !featureFlags.isEnabled('isMultiUserSupportEnabled');
+            const isUsernameMandatory = featureFlags.isEnabled('isUsernameEnabled');
+            const isMultiUserSupported = featureFlags.isEnabled('isMultiUserSupportEnabled');
             
-            // Return 401 Unauthorized
-            errorHandler.unauthorized("Authentication required", {
-                tableStatus: TABLE_STATUS.ACTIVE,
-                restaurant: restaurantInfo,
-                table: tableInfo,
-                primaryCustomer: tableData.primaryCustomer || null,
-                assignedServer: assignedServerInfo,
-                authMessage: authMessage,
-                isUsernameMandatory: featureFlags.isEnabled('isUsernameEnabled'),
-                isPhoneNumberMandatory: tableData.status === TABLE_STATUS.VACANT || !featureFlags.isEnabled('isMultiUserSupportEnabled'),
-                isMultiUserSupported: featureFlags.isEnabled('isMultiUserSupportEnabled'),
-                otpRequired: true
-            });
-        } else {
-            // OTP not required at scan, grant access but mark OTP needed for orders
-            const response = {
-                status: "success", 
-                message: "Access granted",
-                data: {
-                    tableStatus: TABLE_STATUS.ACTIVE,
+            errorHandler.unauthorized(
+                "Authentication required",
+                {
+                    tableStatus: reportedStatusOnError,
                     restaurant: restaurantInfo,
                     table: tableInfo,
-                    otpRequiredForOrder: true
+                    primaryCustomer: tableData.primaryCustomer || null,
+                    assignedServer: assignedServerInfo,
+                    authMessage,
+                    isUsernameMandatory,
+                    isPhoneNumberMandatory,
+                    isMultiUserSupported,
+                    otpRequired: true,
+                    error: 'OTP authentication required'
                 }
-            };
+            );
+        } else {
+            let response;
             
-            if (tableData.primaryCustomer) {
-                response.data.primaryCustomer = tableData.primaryCustomer;
+            if (originalStatus === TABLE_STATUS.VACANT || originalStatus === TABLE_STATUS.OTP_PENDING) {
+                response = {
+                    status: "success",
+                    message: "Access granted",
+                    data: {
+                        tableStatus: TABLE_STATUS.VACANT,
+                        restaurant: restaurantInfo,
+                        table: tableInfo
+                    }
+                };
+            } else {
+                response = {
+                    status: "success",
+                    message: "Access granted",
+                    data: {
+                        tableStatus: TABLE_STATUS.ACTIVE,
+                        restaurant: restaurantInfo,
+                        table: tableInfo,
+                        otpRequiredForOrder: true
+                    }
+                };
+                
+                if (tableData.primaryCustomer) {
+                    response.data.primaryCustomer = tableData.primaryCustomer;
+                }
             }
             
             return response;
         }
     } catch (error) {
         console.error('Error in validateTableAndLocation:', error);
-        errorHandler.handleError(error, 'validateTableAndLocation');
+        console.error('Error stack:', error.stack);
+        errorHandler.handleError(error, 'validateTableAndLocation', {
+            restaurantId: data?.restaurantId,
+            tableId: data?.tableId,
+            error: error.message
+        });
     }
 });
 
@@ -216,51 +237,79 @@ exports.validateTableAndLocation = functions.https.onCall(async (dataa, context)
 exports.validateOTP = functions.https.onCall(async (data, context) => {
     console.log("==== validateOTP called with data:", JSON.stringify(data));
     try {
+        // 1. Input Validation
         console.log("validateOTP - Validating input parameters");
         TableInputValidation.validateOTPInput(data);
         const { restaurantId, tableId, otp, phoneNumber, name } = data;
         
-        console.log(`validateOTP - Getting restaurant and table data`);
+        // 2. Data Fetching
         const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
         console.log(`validateOTP - Table data retrieved successfully`);
         
-        let isPrimaryCustomer = false;
+        // Store original status for reference
+        const originalStatus = tableData.status;
+        console.log(`validateOTP - Current table status: ${originalStatus}`);
         
-        // Check if phone number is required based on table status and feature flags
-        console.log(`validateOTP - Current table status: ${tableData.status}`);
-        console.log(`validateOTP - isMultiUserSupportEnabled: ${featureFlags.isEnabled('isMultiUserSupportEnabled')}`);
-        const isPhoneNumberRequired = tableData.status === TABLE_STATUS.VACANT || !featureFlags.isEnabled('isMultiUserSupportEnabled');
+        // 3. Hoisted Requirement Calculations
+        const isPhoneNumberRequired = (originalStatus === TABLE_STATUS.VACANT || originalStatus === TABLE_STATUS.OTP_PENDING) 
+            || !featureFlags.isEnabled('isMultiUserSupportEnabled');
         console.log(`validateOTP - isPhoneNumberRequired: ${isPhoneNumberRequired}, phoneNumber provided: ${!!phoneNumber}`);
         
+        // Early exit if phone number is required but missing
         if (isPhoneNumberRequired && !phoneNumber) {
             console.log("validateOTP - Error: Phone number is required but not provided");
-            errorHandler.badRequest('Phone number is required for this operation');
+            errorHandler.badRequest('Phone number is required for this operation', {
+                details: 'Phone number is required for primary customers or when multi-user support is disabled'
+            });
         }
         
-        if (tableData.status === TABLE_STATUS.OTP_PENDING || tableData.status === TABLE_STATUS.VACANT) {
-            console.log(`validateOTP - Table in ${tableData.status} state, validating OTP`);
-            console.log(`validateOTP - Expected OTP: ${tableData.currentOTP?.code}, Provided OTP: ${otp}`);
+        // Calculate potential primary status based on initial table state
+        const potentiallyPrimary = (originalStatus === TABLE_STATUS.OTP_PENDING || originalStatus === TABLE_STATUS.VACANT);
+        const isUsernameEnabled = featureFlags.isEnabled('isUsernameEnabled');
+        const isUsernameRequired = isUsernameEnabled || potentiallyPrimary;
+        console.log(`validateOTP - isUsernameRequired: ${isUsernameRequired}, name provided: ${!!name}`);
+        
+        // Early exit if username is required but missing
+        if (isUsernameRequired && !name) {
+            console.log("validateOTP - Error: Name is required but not provided");
+            errorHandler.badRequest('Name is required for this operation', {
+                details: 'Name is required for primary customers or when username feature is enabled'
+            });
+        }
+        
+        // 4. OTP Validation Logic
+        let isPrimaryCustomer = false;
+        
+        if (originalStatus === TABLE_STATUS.OTP_PENDING || originalStatus === TABLE_STATUS.VACANT) {
+            console.log(`validateOTP - Validating OTP for potential primary customer`);
             
+            // Validate OTP data exists
+            if (!tableData.currentOTP || !tableData.currentOTP.code) {
+                console.error("validateOTP - Error: currentOTP or code missing for VACANT/PENDING table");
+                errorHandler.internalError(
+                    "OTP data missing for the table. Please try scanning again.",
+                    {
+                        tableStatus: originalStatus,
+                        error: 'Missing OTP data',
+                        restaurantId: data.restaurantId,
+                        tableId: data.tableId
+                    }
+                );
+            }
+            
+            console.log(`validateOTP - Expected OTP: ${tableData.currentOTP.code}, Provided OTP: ${otp}`);
             if (tableData.currentOTP.code !== otp) {
                 console.log("validateOTP - Error: Invalid OTP provided");
-                // Return 401 Unauthorized - Invalid OTP
-                errorHandler.unauthorized('Invalid OTP');
+                errorHandler.unauthorized('Invalid OTP', {
+                    details: 'The provided OTP is incorrect',
+                    tableStatus: originalStatus
+                });
             }
             
             isPrimaryCustomer = true;
-            console.log("validateOTP - User will be primary customer");
-            
-            // Check if username is required based on feature flags or primary customer status
-            const isUsernameEnabled = featureFlags.isEnabled('isUsernameEnabled');
-            console.log(`validateOTP - isUsernameEnabled: ${isUsernameEnabled}`);
-            const isUsernameRequired = isUsernameEnabled || isPrimaryCustomer;
-            console.log(`validateOTP - isUsernameRequired: ${isUsernameRequired}, name provided: ${!!name}`);
-            
-            if (isUsernameRequired && !name) {
-                console.log("validateOTP - Error: Name is required but not provided");
-                errorHandler.badRequest('Name is required for primary customer or when username feature is enabled');
-            }
+            console.log("validateOTP - User confirmed as primary customer");
             
+            // Update table status and customer info
             console.log("validateOTP - Updating table as active with primary customer info");
             await tableRef.update({
                 status: TABLE_STATUS.ACTIVE,
@@ -269,27 +318,60 @@ exports.validateOTP = functions.https.onCall(async (data, context) => {
                 lastActivity: admin.firestore.FieldValue.serverTimestamp()
             });
             console.log("validateOTP - Table updated successfully");
-        } else if (tableData.status === TABLE_STATUS.ACTIVE) {
-            console.log("validateOTP - Table already active, checking OTP for secondary user");
-            console.log(`validateOTP - Expected OTP: ${tableData.currentOTP?.code}, Provided OTP: ${otp}`);
             
+        } else if (originalStatus === TABLE_STATUS.ACTIVE) {
+            console.log("validateOTP - Validating OTP for secondary user");
+            
+            // Validate OTP data exists for active table
+            if (!tableData.currentOTP || !tableData.currentOTP.code) {
+                console.error("validateOTP - Error: currentOTP or code missing for ACTIVE table");
+                errorHandler.internalError(
+                    "OTP data missing for the table. Please ask the primary customer or server for assistance.",
+                    {
+                        tableStatus: originalStatus,
+                        error: 'Missing OTP data',
+                        restaurantId: data.restaurantId,
+                        tableId: data.tableId
+                    }
+                );
+            }
+            
+            console.log(`validateOTP - Expected OTP: ${tableData.currentOTP.code}, Provided OTP: ${otp}`);
             if (tableData.currentOTP.code !== otp) {
-                console.log("validateOTP - Wrong OTP for active table, returning guidance");
-                return {
+                console.log("validateOTP - Wrong OTP for active table");
+                
+                // Special guidance response for client when joining active table with wrong OTP
+                // This is not an error response, but a specific flow for guiding users
+                // Client should show a different UI/message based on this status
+                errorHandler.unauthorized('Invalid OTP', {
                     status: 'ask_primary_customer',
-                    message: 'Please ask the primary customer or the server/waiter for the correct OTP.'
-                };
+                    message: 'Please ask the primary customer or the server/waiter for the correct OTP.',
+                    tableStatus: originalStatus
+                });
             }
             
-            console.log("validateOTP - Adding user to occupied list");
-            await tableRef.update({
-                occupiedBy: admin.firestore.FieldValue.arrayUnion(phoneNumber),
-                lastActivity: admin.firestore.FieldValue.serverTimestamp()
-            });
-            console.log("validateOTP - Table updated successfully with new user");
+            if (phoneNumber) {
+                console.log("validateOTP - Adding secondary user to occupied list");
+                await tableRef.update({
+                    occupiedBy: admin.firestore.FieldValue.arrayUnion(phoneNumber),
+                    lastActivity: admin.firestore.FieldValue.serverTimestamp()
+                });
+                console.log("validateOTP - Table updated with new user");
+            }
+        } else {
+            console.warn(`validateOTP - Unexpected table status: ${originalStatus}`);
+            errorHandler.internalError(
+                "Unexpected table status encountered during OTP validation",
+                {
+                    tableStatus: originalStatus,
+                    error: 'Invalid table status',
+                    restaurantId: data.restaurantId,
+                    tableId: data.tableId
+                }
+            );
         }
         
-        // Create or update customer profile only if phone and name are provided
+        // 5. Customer Profile Update
         if (phoneNumber && name) {
             console.log(`validateOTP - Creating/updating customer profile for ${phoneNumber}`);
             try {
@@ -306,6 +388,7 @@ exports.validateOTP = functions.https.onCall(async (data, context) => {
             }
         }
         
+        // 6. Session Management
         let session;
         if (isPrimaryCustomer) {
             console.log(`validateOTP - Creating new session for primary customer ${phoneNumber}`);
@@ -318,7 +401,15 @@ exports.validateOTP = functions.https.onCall(async (data, context) => {
                 console.log(`validateOTP - Session created with ID: ${session.id}`);
             } catch (sessionError) {
                 console.error("validateOTP - Error creating table session:", sessionError);
-                throw sessionError;
+                // Let the main error handler deal with specific HttpsError types
+                // Add context about the operation being performed
+                errorHandler.handleError(sessionError, 'validateOTP', {
+                    operation: 'create_primary_session',
+                    restaurantId,
+                    tableId,
+                    isPrimaryCustomer: true,
+                    error: sessionError.message
+                });
             }
         } else {
             console.log("validateOTP - Validating existing table session");
@@ -328,25 +419,45 @@ exports.validateOTP = functions.https.onCall(async (data, context) => {
                 
                 if (!tableSession) {
                     console.log("validateOTP - No active session found");
-                    // Return 412 Precondition Failed - No active session
-                    errorHandler.preconditionFailed('No active session for this table');
+                    errorHandler.preconditionFailed('No active session for this table', {
+                        restaurantId,
+                        tableId,
+                        error: 'Missing active session'
+                    });
                 }
                 
-                // For multi-user case with phoneNumber
                 if (phoneNumber) {
                     console.log(`validateOTP - Adding user ${phoneNumber} to existing session ${tableSession.id}`);
-                    session = await sessionService.addUserToTableSession(restaurantId, tableSession.id, phoneNumber);
-                    console.log(`validateOTP - User added to session, updated session: ${session.id}`);
+                    try {
+                        session = await sessionService.addUserToTableSession(restaurantId, tableSession.id, phoneNumber);
+                        console.log(`validateOTP - User added to session, updated session: ${session.id}`);
+                    } catch (addUserError) {
+                        console.error("validateOTP - Error adding user to session:", addUserError);
+                        // Add specific context for user addition errors
+                        errorHandler.handleError(addUserError, 'validateOTP', {
+                            operation: 'add_user_to_session',
+                            restaurantId,
+                            tableId,
+                            sessionId: tableSession.id,
+                            error: addUserError.message
+                        });
+                    }
                 } else {
                     session = tableSession;
                 }
             } catch (sessionError) {
                 console.error("validateOTP - Error handling session:", sessionError);
-                throw sessionError;
+                // Add context about which session operation failed
+                errorHandler.handleError(sessionError, 'validateOTP', {
+                    operation: 'validate_existing_session',
+                    restaurantId,
+                    tableId,
+                    error: sessionError.message
+                });
             }
         }
         
-        // Create custom token only if phoneNumber is provided
+        // 7. Token Generation
         let customToken = null;
         if (phoneNumber) {
             console.log(`validateOTP - Creating custom token for user ${phoneNumber}`);
@@ -356,10 +467,10 @@ exports.validateOTP = functions.https.onCall(async (data, context) => {
             } catch (tokenError) {
                 console.error("validateOTP - Error creating custom token:", tokenError);
                 // Continue execution even if token creation fails
-                customToken = null;
             }
         }
         
+        // 8. Return Success Response
         console.log(`validateOTP - Returning success response, isPrimaryCustomer: ${isPrimaryCustomer}, sessionId: ${session.id}`);
         return {
             status: 'success',
@@ -370,7 +481,11 @@ exports.validateOTP = functions.https.onCall(async (data, context) => {
     } catch (error) {
         console.error('Error in validateOTP:', error);
         console.error('Error stack:', error.stack);
-        errorHandler.handleError(error, 'validateOTP');
+        errorHandler.handleError(error, 'validateOTP', {
+            restaurantId: data?.restaurantId,
+            tableId: data?.tableId,
+            error: error.message
+        });
     }
 });
 

```
