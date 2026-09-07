const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const customerFunctions = require('../customer/customer');
const sessionService = require('../session/sessionService');
const { otpService } = require('../session');
const TableInputValidation = require('./tableInputValidation');
const featureFlags = require('../singleton/FeatureFlags');
const errorHandler = require('../singleton/ErrorHandler');
const httpStatusCodes = require('../singleton/HttpStatusCodes');
const timestamp = require('../utils/timestamp');
const environment = require('../singleton/Environment');
const { validateStaffSession } = require('../adminApp/auth');
const { safeArrayUnion, applyArrayOperation } = require('../utils/arrayOperations');
const { buildAuthDetails } = require('./tableHelperFunctions');
const { vacateTable } = require('./vacateTable');
const customerService = require('../customer/customerService');
const ResponseBuilder = require('../utils/ResponseBuilder');

// Initialize Firestore

const TABLE_STATUS = {
    ACTIVE: 'active',
    VACANT: 'vacant',
    DISABLED: 'disabled',
    OTP_PENDING: 'pending'
};

/**
* Validates a table and user location, then generates an OTP for table access
* @param {Object} request - The request object containing data
* @param {Object} context - The context object
* @returns {Promise<Object>} Response object with table access details
* @throws {Error} Various error types based on validation failures
*/
exports.validateTableAndLocation = functions.https.onCall(async (request, context) => {
    // Load feature flag overrides from Firestore (for test environments)
    await featureFlags.loadOverrides(db);
    // Declare data outside try block so it's accessible in catch
    let data;
    try {
        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }
        data = request.data;

        // 2. Input Validation
        TableInputValidation.validateTableAndLocationInput(data);
        const { restaurantId, tableId, userLocation, sessionId } = data;

        // 3. Data Fetching
        const { restaurantData, tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);

        // Store original status for reference throughout the function
        const originalStatus = tableData.status;

        // 4. Prepare Response Objects
        const restaurantInfo = {
            name: restaurantData.name,
            id: restaurantId
        };

        const tableInfo = {
            number: tableData.number,
            id: tableId,
            capacity: tableData.capacity || null,
            ...(tableData.assignedServerId && { assignedServerId: tableData.assignedServerId })
        };

        // 5. Guard Clauses - Early exits for invalid states
        // 5a. Handle disabled table
        if (originalStatus === TABLE_STATUS.DISABLED) {
            errorHandler.forbidden(
                "This table is currently unavailable",
                {
                    tableStatus: TABLE_STATUS.DISABLED,
                    restaurant: restaurantInfo,
                    table: tableInfo,
                    error: 'Table is disabled'
                }
            );
        }

        // 5b. Handle user not in restaurant premises
        if (!isWithinRadius(userLocation, restaurantData.location, 100)) {
            errorHandler.preconditionFailed(
                'User not in restaurant premises',
                {
                    restaurant: restaurantInfo,
                    table: tableInfo,
                    userLocation,
                    restaurantLocation: restaurantData.location,
                    error: 'User location validation failed'
                }
            );
        }

        // 5c. Handle valid session - early success return
        let validatedSession = null;
        if (sessionId) {
            validatedSession = await sessionService.validateTableSession(restaurantId, tableId, { throwError: false });
        }

        if (validatedSession) {
            const expiresAtString = timestamp.toISOString(validatedSession.expiresAt);

            const responseData = {
                status: 'success',
                tableStatus: originalStatus,
                restaurant: restaurantInfo,
                table: tableInfo,
                session: {
                    sessionId: validatedSession.id,
                    expiresAt: expiresAtString
                }
            };

            if (tableData.primaryCustomer) {
                responseData.primaryCustomer = tableData.primaryCustomer;
            }

            if (tableData.occupiedBy) {
                responseData.occupiedBy = tableData.occupiedBy;
            }

            return ResponseBuilder.success(responseData, "Access granted");
        }

        // 6. OTP Generation for Vacant Tables
        if (originalStatus === TABLE_STATUS.VACANT ||
            (originalStatus === TABLE_STATUS.OTP_PENDING && !otpService.isOTPValid(tableData.currentOTP))) {
            console.log(`poopoo Table ${tableId} is ${originalStatus} (with expired/missing OTP), generating new OTP and setting status to OTP_PENDING`);
            const otpObject = otpService.createOTPObject();

            try {
                await tableRef.update({
                    currentOTP: otpObject,
                    firstScannedAt: timestamp.serverTimestamp(),
                    status: TABLE_STATUS.OTP_PENDING
                });
                console.log(`poopoo Table ${tableId} status updated to OTP_PENDING in Firestore`);
            } catch (updateError) {
                console.error(`Error updating table ${tableId} to OTP_PENDING:`, updateError);
                errorHandler.internalError(
                    "Failed to prepare table for OTP validation",
                    {
                        originalStatus,
                        tableId,
                        restaurantId,
                        restaurant: restaurantInfo,
                        table: tableInfo,
                        error: updateError.message
                    }
                );
            }
        }

        // 7. Main Logic Flow - Handle OTP Requirements
        const isOtpRequired = featureFlags.isEnabled('isOtpManadatoryAtScan');

        if (isOtpRequired) {
            const { authMessage, assignedServerInfo } = await buildAuthDetails(tableData, restaurantId, db);

            const reportedStatusOnError = (originalStatus === TABLE_STATUS.VACANT)
                ? TABLE_STATUS.OTP_PENDING
                : TABLE_STATUS.ACTIVE;

            const isPhoneNumberMandatory = (originalStatus === TABLE_STATUS.VACANT || originalStatus === TABLE_STATUS.OTP_PENDING)
                || featureFlags.isEnabled('isMultiUserSupportEnabled');
            const isUsernameMandatory = featureFlags.isEnabled('isUsernameEnabled');
            const isMultiUserSupported = featureFlags.isEnabled('isMultiUserSupportEnabled');
            console.log('poopoo Table scan auth details:', { originalStatus, isPhoneNumberMandatory, isUsernameMandatory, isMultiUserSupported });

            errorHandler.unauthorized(
                "Authentication required",
                {
                    tableStatus: reportedStatusOnError,
                    restaurant: restaurantInfo,
                    table: tableInfo,
                    primaryCustomer: tableData.primaryCustomer || null,
                    assignedServer: assignedServerInfo,
                    authMessage,
                    isUsernameMandatory,
                    isPhoneNumberMandatory,
                    isMultiUserSupported,
                    otpRequired: true,
                    error: 'OTP authentication required'
                }
            );
        } else {
            let responseData;

            if (originalStatus === TABLE_STATUS.VACANT || originalStatus === TABLE_STATUS.OTP_PENDING) {
                responseData = {
                    tableStatus: TABLE_STATUS.VACANT,
                    restaurant: restaurantInfo,
                    table: tableInfo
                };
            } else {
                responseData = {
                    tableStatus: TABLE_STATUS.ACTIVE,
                    restaurant: restaurantInfo,
                    table: tableInfo,
                    otpRequiredForOrder: true
                };

                if (tableData.primaryCustomer) {
                    responseData.primaryCustomer = tableData.primaryCustomer;
                }
            }

            return ResponseBuilder.success(responseData, "Access granted");
        }
    } catch (error) {
        console.error('Error in validateTableAndLocation:', error);
        console.error('Error stack:', error.stack);
        errorHandler.handleError(error, 'validateTableAndLocation', {
            restaurantId: data?.restaurantId,
            tableId: data?.tableId,
            error: error.message
        });
    }
});

/**
* Validates OTP and creates a session for the customer
* - Verifies OTP against the table's current OTP
* - Identifies primary vs. secondary customers
* - Updates table status and customer information
* - Creates or updates customer profile
* - Creates or joins table session
* - Generates authentication token
*/
exports.validateOTP = functions.https.onCall(async (request, context) => {
    // Load feature flag overrides from Firestore (for test environments)
    await featureFlags.loadOverrides(db);
    const data = request.data;
    console.log("poopoo ==== validateOTP called with data:", {
        restaurantId: data?.restaurantId,
        tableId: data?.tableId,
        otp: data?.otp,
        phoneNumber: data?.phoneNumber,
        name: data?.name
    });
    try {
        // 1. Input Validation
        console.log("poopoo validateOTP - Validating input parameters");
        TableInputValidation.validateOTPInput(data);
        const { restaurantId, tableId, otp, phoneNumber, name } = data;

        // 2. Data Fetching
        const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`poopoo validateOTP - Table data retrieved successfully`);

        // Validate table data structure
        if (!tableData) {
            console.error("poopoo validateOTP - Error: Table data is null or undefined");
            errorHandler.internalError(
                "Invalid table data structure",
                {
                    error: 'Missing table data',
                    restaurantId,
                    tableId
                }
            );
        }

        // Store original status for reference
        const originalStatus = tableData.status || TABLE_STATUS.VACANT; // Default to VACANT if status is undefined
        console.log(`poopoo validateOTP - Current table status: ${originalStatus}`);

        // 3. Hoisted Requirement Calculations
        const isPhoneNumberRequired = (originalStatus === TABLE_STATUS.VACANT || originalStatus === TABLE_STATUS.OTP_PENDING)
            || featureFlags.isEnabled('isMultiUserSupportEnabled');
        console.log(`poopoo validateOTP - isPhoneNumberRequired: ${isPhoneNumberRequired}, phoneNumber provided: ${!!phoneNumber}`);

        // Early exit if phone number is required but missing
        if (isPhoneNumberRequired && !phoneNumber) {
            console.log("poopoo validateOTP - Error: Phone number is required but not provided");
            errorHandler.badRequest('Phone number is required for this operation', {
                details: 'Phone number is required for primary customers or when multi-user support is disabled'
            });
        }

        // Calculate potential primary status based on initial table state
        const potentiallyPrimary = (originalStatus === TABLE_STATUS.OTP_PENDING || originalStatus === TABLE_STATUS.VACANT);
        const isUsernameEnabled = featureFlags.isEnabled('isUsernameEnabled');
        //todo shaurya recheck this logic
        const isUsernameRequired = isUsernameEnabled && potentiallyPrimary;
        console.log(`poopoo validateOTP - isUsernameRequired: ${isUsernameRequired}, name provided: ${!!name}`);

        // Early exit if username is required but missing
        if (isUsernameRequired && !name) {
            console.log("poopoo validateOTP - Error: Name is required but not provided");
            errorHandler.badRequest('Name is required for this operation', {
                details: 'Name is required for primary customers or when username feature is enabled'
            });
        }

        // 4. OTP Validation Logic
        let isPrimaryCustomer = false;

        if (originalStatus === TABLE_STATUS.OTP_PENDING || originalStatus === TABLE_STATUS.VACANT) {
            console.log(`poopoo validateOTP - Validating OTP for potential primary customer`);

            // Validate OTP data exists and has required structure
            if (!tableData.currentOTP || typeof tableData.currentOTP !== 'object') {
                console.error("poopoo validateOTP - Error: currentOTP missing or invalid for VACANT/PENDING table");
                errorHandler.internalError(
                    "OTP data missing for the table. Please try scanning again.",
                    {
                        tableStatus: originalStatus,
                        error: 'Missing or invalid OTP data structure',
                        restaurantId,
                        tableId
                    }
                );
            }

            if (!tableData.currentOTP.code || typeof tableData.currentOTP.code !== 'string') {
                console.error("poopoo validateOTP - Error: Invalid OTP code structure");
                errorHandler.internalError(
                    "Invalid OTP data. Please try scanning again.",
                    {
                        tableStatus: originalStatus,
                        error: 'Invalid OTP code structure',
                        restaurantId,
                        tableId
                    }
                );
            }

            // Check OTP expiry before comparing code
            if (!otpService.isOTPValid(tableData.currentOTP)) {
                console.log("poopoo validateOTP - Error: OTP has expired");
                errorHandler.preconditionFailed(
                    "OTP has expired. Please scan the QR code again to get a new OTP.",
                    {
                        tableStatus: originalStatus,
                        error: 'OTP expired',
                        restaurantId,
                        tableId
                    }
                );
            }

            console.log(`poopoo validateOTP - Expected OTP: ${tableData.currentOTP.code}, Provided OTP: ${otp}`);
            if (tableData.currentOTP.code !== otp) {
                console.log("poopoo validateOTP - Error: Invalid OTP provided");
                errorHandler.unauthorized('Invalid OTP', {
                    details: 'The provided OTP is incorrect',
                    tableStatus: originalStatus
                });
            }

            isPrimaryCustomer = true;
            console.log("poopoo validateOTP - User confirmed as primary customer");

            // Update table status and customer info with proper null checks
            console.log("poopoo validateOTP - Updating table as active with primary customer info");
            const updateData = {
                status: TABLE_STATUS.ACTIVE,
                primaryCustomer: { phoneNumber, name },
                lastActivity: timestamp.serverTimestamp()
            };

            // Handle occupiedBy field with safeArrayUnion
            if (!tableData.occupiedBy) {
                updateData.occupiedBy = [phoneNumber];
            } else {
                const arrayOp = safeArrayUnion(phoneNumber);
                applyArrayOperation(updateData, 'occupiedBy', tableData.occupiedBy, arrayOp);
            }

            await tableRef.update(updateData);
            console.log("poopoo validateOTP - Table updated successfully");

        } else if (originalStatus === TABLE_STATUS.ACTIVE) {
            console.log("poopoo validateOTP - Validating OTP for secondary user");

            // Validate OTP data exists and has required structure
            if (!tableData.currentOTP || typeof tableData.currentOTP !== 'object') {
                console.error("poopoo validateOTP - Error: currentOTP missing or invalid for ACTIVE table");
                errorHandler.internalError(
                    "OTP data missing for the table. Please ask the primary customer or server for assistance.",
                    {
                        tableStatus: originalStatus,
                        error: 'Missing or invalid OTP data structure',
                        restaurantId,
                        tableId
                    }
                );
            }

            if (!tableData.currentOTP.code || typeof tableData.currentOTP.code !== 'string') {
                console.error("poopoo validateOTP - Error: Invalid OTP code structure");
                errorHandler.internalError(
                    "Invalid OTP data. Please ask the primary customer or server for assistance.",
                    {
                        tableStatus: originalStatus,
                        error: 'Invalid OTP code structure',
                        restaurantId,
                        tableId
                    }
                );
            }

            // Skip OTP expiry check for ACTIVE tables — the primary customer already
            // authenticated, so code match alone is sufficient for secondary users.
            // Expiry is only enforced on VACANT/OTP_PENDING tables (above).

            console.log(`poopoo validateOTP - Expected OTP: ${tableData.currentOTP.code}, Provided OTP: ${otp}`);
            if (tableData.currentOTP.code !== otp) {
                console.log("poopoo validateOTP - Wrong OTP for active table");
                errorHandler.unauthorized('Invalid OTP', {
                    status: 'ask_primary_customer',
                    message: 'Please ask the primary customer or the server/waiter for the correct OTP.',
                    tableStatus: originalStatus
                });
            }

            if (phoneNumber) {
                console.log("poopoo validateOTP - Adding secondary user to occupied list");
                const updateData = {
                    lastActivity: timestamp.serverTimestamp()
                };

                // If occupiedBy doesn't exist, initialize it
                if (!tableData.occupiedBy) {
                    updateData.occupiedBy = [phoneNumber];
                } else {
                    // Use the safe array union helper
                    const arrayOp = safeArrayUnion(phoneNumber);
                    applyArrayOperation(updateData, 'occupiedBy', tableData.occupiedBy, arrayOp);
                }

                await tableRef.update(updateData);
                console.log("poopoo validateOTP - Table updated with new user");
            }
        } else {
            console.warn(`poopoo validateOTP - Unexpected table status: ${originalStatus}`);
            errorHandler.internalError(
                "Unexpected table status encountered during OTP validation",
                {
                    tableStatus: originalStatus,
                    error: 'Invalid table status',
                    restaurantId: data.restaurantId,
                    tableId: data.tableId
                }
            );
        }

        // 5. Customer Profile Update
        if (phoneNumber && name) {
            console.log(`poopoo validateOTP - Creating/updating customer profile for ${phoneNumber}`);
            try {
                await customerService.createOrUpdateCustomerProfileDirect(phoneNumber, name);
                console.log("poopoo validateOTP - Customer profile updated successfully");
            } catch (profileError) {
                console.error("poopoo validateOTP - Error updating customer profile:", profileError);
                // Continue execution even if profile update fails
            }
        }

        // 6. Session Management
        let session;
        if (isPrimaryCustomer) {
            console.log(`poopoo validateOTP - Creating new session for primary customer ${phoneNumber}`);
            try {
                session = await sessionService.createOrGetTableSession(
                    restaurantId,
                    tableId,
                    phoneNumber
                );
                console.log(`poopoo validateOTP - Session created with ID: ${session.id}`);
            } catch (sessionError) {
                console.error("poopoo validateOTP - Error creating table session:", sessionError);
                // Let the main error handler deal with specific HttpsError types
                // Add context about the operation being performed
                errorHandler.handleError(sessionError, 'validateOTP', {
                    operation: 'create_primary_session',
                    restaurantId,
                    tableId,
                    isPrimaryCustomer: true,
                    error: sessionError.message
                });
            }
        } else {
            console.log("poopoo validateOTP - Validating existing table session");
            try {
                const tableSession = await sessionService.validateTableSession(restaurantId, tableId);
                console.log(`poopoo validateOTP - Existing session validation result: ${tableSession ? tableSession.id : 'null'}`);

                if (!tableSession) {
                    console.log("poopoo validateOTP - No active session found");
                    errorHandler.preconditionFailed('No active session for this table', {
                        restaurantId,
                        tableId,
                        error: 'Missing active session'
                    });
                }

                if (phoneNumber) {
                    console.log(`poopoo validateOTP - Adding user ${phoneNumber} to existing session ${tableSession.id}`);
                    try {
                        session = await sessionService.addUserToTableSession(restaurantId, tableSession.id, phoneNumber);
                        console.log(`poopoo validateOTP - User added to session, updated session: ${session.id}`);
                    } catch (addUserError) {
                        console.error("poopoo validateOTP - Error adding user to session:", addUserError);
                        // Add specific context for user addition errors
                        errorHandler.handleError(addUserError, 'validateOTP', {
                            operation: 'add_user_to_session',
                            restaurantId,
                            tableId,
                            sessionId: tableSession.id,
                            error: addUserError.message
                        });
                    }
                } else {
                    session = tableSession;
                }
            } catch (sessionError) {
                console.error("poopoo validateOTP - Error handling session:", sessionError);
                // Add context about which session operation failed
                errorHandler.handleError(sessionError, 'validateOTP', {
                    operation: 'validate_existing_session',
                    restaurantId,
                    tableId,
                    error: sessionError.message
                });
            }
        }

        // 7. Token Generation
        let customToken = null;
        if (phoneNumber) {
            console.log(`poopoo validateOTP - Creating custom token for user ${phoneNumber}`);
            try {
                customToken = await admin.auth().createCustomToken(phoneNumber);
                console.log("poopoo validateOTP - Custom token created successfully");
            } catch (tokenError) {
                console.error("poopoo validateOTP - Error creating custom token:", tokenError);
                // Continue execution even if token creation fails
            }
        }

        // 8. Return Success Response
        console.log(`poopoo validateOTP - Returning success response, isPrimaryCustomer: ${isPrimaryCustomer}, sessionId: ${session.id}`);
        const responseData = {
            status: 'success',
            customToken: customToken,
            isPrimaryCustomer: isPrimaryCustomer,
            sessionId: session.id
        };

        const message = isPrimaryCustomer ? 'Primary customer authenticated' : 'Customer successfully joined table';
        return ResponseBuilder.success(responseData, message);
    } catch (error) {
        console.error('Error in validateOTP:', error);
        console.error('Error stack:', error.stack);
        errorHandler.handleError(error, 'validateOTP', {
            restaurantId: data?.restaurantId,
            tableId: data?.tableId,
            error: error.message
        });
    }
});

/**
* Cleans up inactive table sessions
* 
* TODO: Shaurya - Implement cleanup for tables where there hasn't been any cart or order 
* placed in the last 2 hours. Current implementation only checks for general inactivity.
* 
* This function:
* - Retrieves all restaurants
* - Finds occupied tables with no recent activity
* - Updates table status to vacant
* - Ends associated sessions
*/
exports.cleanupInactiveSessions = functions.https.onCall(async (data, context) => {
    try {
        // Unauthenticated cross-tenant mutation — emulator/dev only until it
        // becomes a scheduled function.
        if (!environment.isEmulator()) {
            errorHandler.forbidden('cleanupInactiveSessions is emulator-only', {});
        }
        console.log("poopoo cleanupInactiveSessions: Starting cleanup of inactive sessions");
        const restaurantsSnapshot = await db.collection('restaurants').get();
        console.log(`poopoo cleanupInactiveSessions: Found ${restaurantsSnapshot.size} restaurants`);

        const batch = db.batch();
        const inactivityThreshold = Date.now() - (60 * 60 * 1000); // 1 hour in milliseconds
        console.log(`poopoo cleanupInactiveSessions: Using inactivity threshold of ${new Date(inactivityThreshold).toISOString()}`);

        for (const restaurantDoc of restaurantsSnapshot.docs) {
            const restaurantId = restaurantDoc.id;
            console.log(`poopoo cleanupInactiveSessions: Checking tables in restaurant ${restaurantId}`);

            const tablesSnapshot = await restaurantDoc.ref.collection('tables')
                .where('status', 'in', [TABLE_STATUS.ACTIVE, TABLE_STATUS.OTP_PENDING])
                .get();

            console.log(`poopoo cleanupInactiveSessions: Found ${tablesSnapshot.size} active tables in restaurant ${restaurantId}`);

            for (const tableDoc of tablesSnapshot.docs) {
                const tableData = tableDoc.data();
                if (!tableData.lastActivity) {
                    // For OTP_PENDING tables with no lastActivity, fall back to firstScannedAt or OTP createdAt
                    const fallbackTime = tableData.firstScannedAt || tableData.currentOTP?.createdAt;
                    if (tableData.status === TABLE_STATUS.OTP_PENDING && fallbackTime) {
                        const scannedDate = timestamp.safeToDate(fallbackTime);
                        if (scannedDate && scannedDate.getTime() < inactivityThreshold) {
                            console.log(`poopoo cleanupInactiveSessions: OTP_PENDING table ${tableDoc.id} scanned at ${scannedDate.toISOString()} is stale, cleaning up`);
                            batch.update(tableDoc.ref, {
                                status: TABLE_STATUS.VACANT,
                                sessionToken: null,
                                lastActivity: null,
                                currentOTP: null
                            });
                        }
                    } else {
                        console.log(`poopoo cleanupInactiveSessions: Table ${tableDoc.id} has no lastActivity, skipping`);
                    }
                    continue;
                }

                // Use timestamp utility to safely convert lastActivity
                const lastActivityDate = timestamp.safeToDate(tableData.lastActivity);
                if (!lastActivityDate) {
                    console.log(`poopoo cleanupInactiveSessions: Could not parse lastActivity for table ${tableDoc.id}, skipping`);
                    continue;
                }

                console.log(`poopoo cleanupInactiveSessions: Table ${tableDoc.id} lastActivity: ${lastActivityDate.toISOString()}`);

                if (lastActivityDate.getTime() < inactivityThreshold) {
                    console.log(`poopoo cleanupInactiveSessions: Table ${tableDoc.id} is inactive, ending sessions`);
                    try {
                        await sessionService.endTableSessions(
                            restaurantId,
                            tableDoc.id
                        );

                        batch.update(tableDoc.ref, {
                            status: TABLE_STATUS.VACANT,
                            sessionToken: null,
                            lastActivity: null,
                            currentOTP: null
                        });
                        console.log(`poopoo cleanupInactiveSessions: Marked table ${tableDoc.id} as vacant`);
                    } catch (error) {
                        console.error(`Error cleaning up table ${tableDoc.id}: ${error.message}`);
                        // Continue with other tables
                    }
                }
            }
        }

        await batch.commit();
        console.log('poopoo cleanupInactiveSessions: Inactive sessions cleaned up successfully');
        return ResponseBuilder.success(null, 'Inactive sessions cleaned up successfully');
    } catch (error) {
        console.error('Error in cleanupInactiveSessions:', error);
        return ResponseBuilder.internalError('Failed to clean up inactive sessions', {
            error: error.message
        });
    }
});

/**
* Checks if a point is within a given radius of another point
* 
* TODO: Shaurya - Implement proper geolocation distance calculation
* instead of the current simplified version
* 
* @param {Object} point1 - First location point
* @param {Object} point2 - Second location point
* @param {number} radius - Radius in meters
* @returns {boolean} Whether point1 is within radius of point2
*/
function isWithinRadius(point1, point2, radius) {
    return true; // Simplified implementation
}

/**
* Retrieves table status and details
* - Gets table information including number, capacity, status
* - Retrieves primary customer and occupancy information
* - Checks if table has an assigned server
* - Verifies if table has an active OTP
*/
exports.checkTableStatus = functions.https.onCall(async (data, context) => {
    console.log("poopoo ==== checkTableStatus called with data:", JSON.stringify(data));
    try {
        console.log("poopoo checkTableStatus - Validating input parameters");
        TableInputValidation.validateTableStatusInput(data);
        const { restaurantId, tableId } = data;

        console.log(`poopoo checkTableStatus - Getting restaurant and table data`);
        const { tableData } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`poopoo checkTableStatus - Table data retrieved successfully`);

        if (!Object.values(TABLE_STATUS).includes(tableData.status)) {
            console.warn(`poopoo checkTableStatus - Invalid table status: ${tableData.status}. Defaulting to VACANT`);
            tableData.status = TABLE_STATUS.VACANT;
        }

        let serverInfo = null;
        if (tableData.assignedServerId) {
            console.log(`poopoo checkTableStatus - Fetching server info for serverId: ${tableData.assignedServerId}`);
            try {
                const serverDoc = await db
                    .collection('restaurants')
                    .doc(restaurantId)
                    .collection('servers')
                    .doc(tableData.assignedServerId)
                    .get();

                console.log(`poopoo checkTableStatus - Server document exists: ${serverDoc.exists}`);
                if (serverDoc.exists) {
                    const serverData = serverDoc.data();
                    serverInfo = {
                        name: serverData.name,
                        status: serverData.status
                    };
                    console.log(`poopoo checkTableStatus - Server info retrieved: ${JSON.stringify(serverInfo)}`);
                }
            } catch (serverError) {
                console.error("poopoo checkTableStatus - Error fetching server info:", serverError);
                // Continue execution even if server info fetch fails
            }
        }

        console.log(`poopoo checkTableStatus - Checking OTP validity for table`);
        const hasActiveOTP = otpService.isOTPValid(tableData.currentOTP);
        console.log(`poopoo checkTableStatus - OTP validity: ${hasActiveOTP}`);

        console.log("poopoo checkTableStatus - Returning table status response");
        const responseData = {
            tableNumber: tableData.number,
            capacity: tableData.capacity,
            status: tableData.status,
            primaryCustomer: tableData.primaryCustomer || null,
            occupiedBy: tableData.occupiedBy || [],
            assignedServer: serverInfo,
            hasActiveOTP: hasActiveOTP
        };

        return ResponseBuilder.success(responseData, "Table status retrieved successfully");

    } catch (error) {
        console.error('Error in checkTableStatus:', error);
        console.error('Error stack:', error.stack);

        if (error.code === 'not-found') {
            const message = error.message.includes('Restaurant') ?
                'Restaurant not found' : 'Table not found';
            console.log(`poopoo checkTableStatus - Not found error: ${message}`);
            errorHandler.notFound(message);
        } else if (error.code === 'invalid-argument') {
            console.log(`poopoo checkTableStatus - Invalid argument error`);
            errorHandler.badRequest('Invalid or missing parameters');
        } else {
            errorHandler.handleError(error, 'checkTableStatus');
        }
    }
});

/**
 * Gets all tables for a restaurant with their current status and details
 * Designed for the server app to show table list view
 * 
 * @param {Object} request - The request object containing data
 * @param {Object} context - The context object
 * @returns {Promise<Object>} Response object with all tables for the restaurant
 * @throws {Error} Various error types based on validation failures
 */
exports.getTablesForRestaurant = functions.https.onCall(async (request, context) => {
    // Declare data outside try block so it's accessible in catch
    let data;
    try {
        console.log('poopoo getTablesForRestaurant - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('poopoo getTablesForRestaurant - Request data:', { restaurantId: data.restaurantId });

        // 2. Validate restaurantId
        if (!data.restaurantId) {
            errorHandler.badRequest('Missing required parameter: restaurantId', {
                details: 'restaurantId is required'
            });
        }

        const { restaurantId } = data;
        const serverId = data.serverId; // Optional - could be used to filter assigned tables

        // 3. Check if restaurant exists
        const restaurantRef = db.collection('restaurants').doc(restaurantId);
        const restaurantDoc = await restaurantRef.get();

        if (!restaurantDoc.exists) {
            errorHandler.notFound('Restaurant not found', {
                details: `Restaurant with ID ${restaurantId} was not found`,
                restaurantId
            });
        }

        const restaurantData = restaurantDoc.data();

        // 4. Get all tables for this restaurant
        console.log(`poopoo getTablesForRestaurant - Fetching tables for restaurant ${restaurantId}`);
        const tablesSnapshot = await restaurantRef.collection('tables').get();

        if (tablesSnapshot.empty) {
            console.log(`poopoo getTablesForRestaurant - No tables found for restaurant ${restaurantId}`);
            const responseData = {
                restaurantId,
                tables: [],
                count: 0
            };
            return ResponseBuilder.success(responseData, "No tables found for this restaurant");
        }

        // 5. Process table data
        const tables = [];
        tablesSnapshot.forEach(doc => {
            const tableData = doc.data();

            // Format table data for response
            const formattedTable = {
                id: doc.id,
                number: tableData.number || doc.id,
                status: tableData.status || 'vacant',
                capacity: tableData.capacity || null
            };

            // Add optional fields if they exist
            if (tableData.assignedServerId) {
                formattedTable.assignedServerId = tableData.assignedServerId;
            }

            // Check if table is occupied (has primary customer)
            formattedTable.isOccupied = !!tableData.primaryCustomer;

            // Include primary customer info if available
            if (tableData.primaryCustomer) {
                formattedTable.primaryCustomer = {
                    phoneNumber: tableData.primaryCustomer.phoneNumber,
                    name: tableData.primaryCustomer.name
                };
            }

            // Include last activity timestamp if available
            if (tableData.lastActivityTimestamp) {
                formattedTable.lastActivity = timestamp.toISOString(tableData.lastActivityTimestamp);
            }

            // Include active order ID if available
            if (tableData.activeOrderId) {
                formattedTable.activeOrderId = tableData.activeOrderId;
            }

            // Include table OTP if available
            if (tableData.currentOTP && tableData.currentOTP.code) {
                formattedTable.tableOtp = tableData.currentOTP.code;
            }

            // If serverId is specified, filter tables by assigned server
            if (!serverId || tableData.assignedServerId === serverId) {
                tables.push(formattedTable);
            }
        });

        console.log(`poopoo getTablesForRestaurant - Successfully retrieved ${tables.length} tables`);

        // 6. Return formatted response
        const responseData = {
            restaurantId,
            tables,
            count: tables.length
        };

        return ResponseBuilder.success(responseData, "Tables retrieved successfully");

    } catch (error) {
        console.error('Error in getTablesForRestaurant:', error);
        console.error('Error stack:', error.stack);
        errorHandler.handleError(error, 'getTablesForRestaurant', {
            restaurantId: data?.restaurantId,
            serverId: data?.serverId
        });
    }
});

/**
 * Gets detailed information for a specific table
 * Designed for the server app to show table details and related information
 * 
 * @param {Object} request - The request object containing data
 * @param {Object} context - The context object
 * @returns {Promise<Object>} Response object with detailed table information
 * @throws {Error} Various error types based on validation failures
 */
exports.getTableDetails = functions.https.onCall(async (request, context) => {
    // Declare data outside try block so it's accessible in catch
    let data;
    try {
        console.log('poopoo getTableDetails - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('poopoo getTableDetails - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId
        });

        // 2. Validate required parameters
        if (!data.restaurantId || !data.tableId) {
            errorHandler.badRequest('Missing required parameters', {
                details: 'Both restaurantId and tableId are required'
            });
        }

        const { restaurantId, tableId } = data;

        // 3. Get table and restaurant data
        console.log(`poopoo getTableDetails - Getting table and restaurant data`);
        const { tableData, tableRef, restaurantData } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`poopoo getTableDetails - Table data retrieved successfully`);

        // 4. Get server information if assigned
        let serverInfo = null;
        if (tableData.assignedServerId) {
            console.log(`poopoo getTableDetails - Fetching server info for serverId: ${tableData.assignedServerId}`);
            try {
                const serverDoc = await db
                    .collection('restaurants')
                    .doc(restaurantId)
                    .collection('servers')
                    .doc(tableData.assignedServerId)
                    .get();

                console.log(`poopoo getTableDetails - Server document exists: ${serverDoc.exists}`);
                if (serverDoc.exists) {
                    const serverData = serverDoc.data();
                    serverInfo = {
                        id: tableData.assignedServerId,
                        name: serverData.name,
                        status: serverData.status,
                        profileImage: serverData.profileImage || null
                    };
                    console.log(`poopoo getTableDetails - Server info retrieved: ${JSON.stringify(serverInfo)}`);
                }
            } catch (serverError) {
                console.error("poopoo getTableDetails - Error fetching server info:", serverError);
                // Continue execution even if server info fetch fails
            }
        }

        // 5. Check OTP validity
        console.log(`poopoo getTableDetails - Checking OTP validity for table`);
        const hasActiveOTP = otpService.isOTPValid(tableData.currentOTP);
        console.log(`poopoo getTableDetails - OTP validity: ${hasActiveOTP}`);

        // 6. Get recent orders for this table (last 3)
        console.log(`poopoo getTableDetails - Fetching recent orders for table`);
        let recentOrders = [];
        try {
            const ordersSnapshot = await db
                .collection('restaurants')
                .doc(restaurantId)
                .collection('orders')
                .where('tableId', '==', tableId)
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();

            ordersSnapshot.forEach(doc => {
                const orderData = doc.data();
                recentOrders.push({
                    id: doc.id,
                    status: orderData.status,
                    createdAt: timestamp.toISOString(orderData.createdAt),
                    totalAmount: orderData.totalAmount || 0,
                    itemCount: orderData.items?.length || 0
                });
            });
            console.log(`poopoo getTableDetails - Retrieved ${recentOrders.length} recent orders`);
        } catch (ordersError) {
            console.error("poopoo getTableDetails - Error fetching recent orders:", ordersError);
            // Continue execution even if orders fetch fails
        }

        // 7. Format response data
        const responseData = {
            id: tableId,
            number: tableData.number || tableId,
            status: tableData.status || 'vacant',
            capacity: tableData.capacity || null,
            section: tableData.section || null,
            floor: tableData.floor || null,
            assignedServer: serverInfo,
            isOccupied: !!tableData.primaryCustomer,
            hasActiveOTP: hasActiveOTP,
            restaurant: {
                id: restaurantId,
                name: restaurantData.name
            },
            recentOrders: recentOrders
        };

        // Add optional fields if they exist
        if (tableData.primaryCustomer) {
            responseData.primaryCustomer = {
                phoneNumber: tableData.primaryCustomer.phoneNumber,
                name: tableData.primaryCustomer.name
            };
        }

        if (tableData.occupiedBy) {
            responseData.occupiedBy = tableData.occupiedBy;
        }

        if (tableData.lastActivityTimestamp) {
            responseData.lastActivity = timestamp.toISOString(tableData.lastActivityTimestamp);
        }

        if (tableData.activeOrderId) {
            responseData.activeOrderId = tableData.activeOrderId;
        }

        if (tableData.currentOTP && hasActiveOTP) {
            responseData.otp = tableData.currentOTP.code;
            responseData.otpGeneratedAt = timestamp.toISOString(tableData.currentOTP.createdAt);
        }

        if (tableData.reservationDetails) {
            responseData.reservationDetails = tableData.reservationDetails;
        }

        console.log("poopoo getTableDetails - Returning table details response");
        return ResponseBuilder.success(responseData, "Table details retrieved successfully");

    } catch (error) {
        console.error('Error in getTableDetails:', error);
        console.error('Error stack:', error.stack);

        if (error.code === 'not-found') {
            const message = error.message.includes('Restaurant') ?
                'Restaurant not found' : 'Table not found';
            console.log(`poopoo getTableDetails - Not found error: ${message}`);
            errorHandler.notFound(message);
        } else if (error.code === 'invalid-argument') {
            console.log(`poopoo getTableDetails - Invalid argument error`);
            errorHandler.badRequest('Invalid or missing parameters');
        } else {
            errorHandler.handleError(error, 'getTableDetails', {
                restaurantId: data?.restaurantId,
                tableId: data?.tableId
            });
        }
    }
});

/**
 * Assigns a table to a specific server
 * Designed for the server app to assign tables to waiters
 * 
 * @param {Object} request - The request object containing data
 * @param {Object} context - The context object
 * @returns {Promise<Object>} Response object with assignment status
 * @throws {Error} Various error types based on validation failures
 */
exports.assignTableToServer = functions.https.onCall(async (request, context) => {
    // Declare data outside try block so it's accessible in catch
    let data;
    try {
        console.log('poopoo assignTableToServer - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('poopoo assignTableToServer - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId,
            serverId: data.serverId
        });

        // 2. Validate required parameters
        TableInputValidation.validateAssignTableInput(data);
        const { restaurantId, tableId, serverId } = data;

        await validateStaffSession(restaurantId, data.sessionId);

        // 3. Get table and restaurant data
        console.log(`poopoo assignTableToServer - Getting table and restaurant data`);
        const { tableData, tableRef, restaurantData } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`poopoo assignTableToServer - Table data retrieved successfully`);

        // 4. Validate server exists
        console.log(`poopoo assignTableToServer - Validating server ${serverId} exists`);
        const serverRef = db.collection('restaurants').doc(restaurantId).collection('servers').doc(serverId);
        const serverDoc = await serverRef.get();

        if (!serverDoc.exists) {
            console.error(`poopoo assignTableToServer - Server ${serverId} not found in restaurant ${restaurantId}`);
            errorHandler.notFound('Server not found', {
                details: `Server with ID ${serverId} was not found in restaurant ${restaurantId}`,
                serverId,
                restaurantId
            });
        }

        const serverData = serverDoc.data();
        console.log(`poopoo assignTableToServer - Server data retrieved successfully: ${serverData.name}`);

        // 5. Check if table is already assigned to this server
        if (tableData.assignedServerId === serverId) {
            console.log(`poopoo assignTableToServer - Table ${tableId} is already assigned to server ${serverId}`);
            const responseData = {
                tableId,
                serverId,
                serverName: serverData.name,
                tableNumber: tableData.number || tableId
            };
            return ResponseBuilder.success(responseData, "Table is already assigned to this server");
        }

        // 6. Update table with new server assignment
        console.log(`poopoo assignTableToServer - Assigning table ${tableId} to server ${serverId}`);
        await tableRef.update({
            assignedServerId: serverId,
            lastUpdated: timestamp.serverTimestamp()
        });

        console.log(`poopoo assignTableToServer - Table ${tableId} successfully assigned to server ${serverId}`);

        // 7. Return success response
        const responseData = {
            tableId,
            serverId,
            serverName: serverData.name,
            tableNumber: tableData.number || tableId
        };

        return ResponseBuilder.success(responseData, "Table assigned to server successfully");

    } catch (error) {
        console.error('Error in assignTableToServer:', error);
        console.error('Error stack:', error.stack);

        if (error.code === 'not-found') {
            console.log(`poopoo assignTableToServer - Not found error: ${error.message}`);
            errorHandler.notFound(error.message);
        } else if (error.code === 'invalid-argument') {
            console.log(`poopoo assignTableToServer - Invalid argument error`);
            errorHandler.badRequest('Invalid or missing parameters');
        } else {
            errorHandler.handleError(error, 'assignTableToServer', {
                restaurantId: data?.restaurantId,
                tableId: data?.tableId,
                serverId: data?.serverId
            });
        }
    }
});

/**
 * Unassigns a table from its current server
 * Designed for the server app to unassign tables from waiters
 * 
 * @param {Object} request - The request object containing data
 * @param {Object} context - The context object
 * @returns {Promise<Object>} Response object with unassignment status
 * @throws {Error} Various error types based on validation failures
 */
exports.unassignTableFromServer = functions.https.onCall(async (request, context) => {
    // Declare data outside try block so it's accessible in catch
    let data;
    try {
        console.log('poopoo unassignTableFromServer - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('poopoo unassignTableFromServer - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId
        });

        // 2. Validate required parameters
        TableInputValidation.validateUnassignTableInput(data);
        const { restaurantId, tableId } = data;

        await validateStaffSession(restaurantId, data.sessionId);

        // 3. Get table and restaurant data
        console.log(`poopoo unassignTableFromServer - Getting table and restaurant data`);
        const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`poopoo unassignTableFromServer - Table data retrieved successfully`);

        // 4. Check if table is not assigned to any server
        if (!tableData.assignedServerId) {
            console.log(`poopoo unassignTableFromServer - Table ${tableId} is not assigned to any server`);
            const responseData = {
                tableId,
                tableNumber: tableData.number || tableId
            };
            return ResponseBuilder.success(responseData, "Table is not assigned to any server");
        }

        // Store the current server ID for the response
        const previousServerId = tableData.assignedServerId;

        // 5. Get the server name for response if server exists
        let serverName = null;
        try {
            const serverDoc = await db.collection('restaurants')
                .doc(restaurantId)
                .collection('servers')
                .doc(previousServerId)
                .get();

            if (serverDoc.exists) {
                serverName = serverDoc.data().name;
            }
        } catch (serverError) {
            console.error(`poopoo unassignTableFromServer - Error fetching server info: ${serverError.message}`);
            // Continue execution even if server info fetch fails
        }

        // 6. Update table to remove server assignment
        console.log(`poopoo unassignTableFromServer - Unassigning table ${tableId} from server ${previousServerId}`);
        await tableRef.update({
            assignedServerId: null,
            lastUpdated: timestamp.serverTimestamp()
        });

        console.log(`poopoo unassignTableFromServer - Table ${tableId} successfully unassigned from server`);

        // 7. Return success response
        const responseData = {
            tableId,
            tableNumber: tableData.number || tableId,
            previousServerId,
            previousServerName: serverName
        };

        return ResponseBuilder.success(responseData, "Table unassigned from server successfully");

    } catch (error) {
        console.error('Error in unassignTableFromServer:', error);
        console.error('Error stack:', error.stack);

        if (error.code === 'not-found') {
            console.log(`poopoo unassignTableFromServer - Not found error: ${error.message}`);
            errorHandler.notFound(error.message);
        } else if (error.code === 'invalid-argument') {
            console.log(`poopoo unassignTableFromServer - Invalid argument error`);
            errorHandler.badRequest('Invalid or missing parameters');
        } else {
            errorHandler.handleError(error, 'unassignTableFromServer', {
                restaurantId: data?.restaurantId,
                tableId: data?.tableId
            });
        }
    }
});

/**
 * Generates a new OTP for a table
 * Designed for the server app to generate/refresh table OTPs
 * 
 * @param {Object} request - The request object containing data
 * @param {Object} context - The context object
 * @returns {Promise<Object>} Response object with the new OTP
 * @throws {Error} Various error types based on validation failures
 */
exports.generateTableOTP = functions.https.onCall(async (request, context) => {
    // Declare data outside try block so it's accessible in catch
    let data;
    try {
        console.log('poopoo generateTableOTP - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('poopoo generateTableOTP - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId
        });

        // 2. Validate required parameters
        TableInputValidation.validateGenerateOTPInput(data);
        const { restaurantId, tableId } = data;

        // OTP minting is the root of the consumer auth chain — staff only.
        await validateStaffSession(restaurantId, data.sessionId);

        // 3. Get table and restaurant data
        console.log(`poopoo generateTableOTP - Getting table and restaurant data`);
        const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`poopoo generateTableOTP - Table data retrieved successfully`);

        // 4. Generate new OTP
        console.log(`poopoo generateTableOTP - Generating new OTP for table ${tableId}`);
        const otpObject = otpService.createOTPObject();

        // 5. Update table with new OTP
        await tableRef.update({
            currentOTP: otpObject,
            lastUpdated: timestamp.serverTimestamp()
        });

        console.log(`poopoo generateTableOTP - New OTP generated successfully: ${otpObject.code}`);

        // 6. Return success response
        const responseData = {
            tableId,
            tableNumber: tableData.number || tableId,
            otp: otpObject.code,
            otpGeneratedAt: timestamp.toISOString(otpObject.createdAt),
            otpExpiresAt: timestamp.toISOString(otpObject.expiresAt)
        };

        return ResponseBuilder.success(responseData, "Table OTP generated successfully");

    } catch (error) {
        console.error('Error in generateTableOTP:', error);
        console.error('Error stack:', error.stack);

        if (error.code === 'not-found') {
            console.log(`poopoo generateTableOTP - Not found error: ${error.message}`);
            errorHandler.notFound(error.message);
        } else if (error.code === 'invalid-argument') {
            console.log(`poopoo generateTableOTP - Invalid argument error`);
            errorHandler.badRequest('Invalid or missing parameters');
        } else {
            errorHandler.handleError(error, 'generateTableOTP', {
                restaurantId: data?.restaurantId,
                tableId: data?.tableId
            });
        }
    }
});

/**
 * Updates a table's status
 * Designed for the server app to change table status (active, vacant, disabled, reserved)
 * 
 * @param {Object} request - The request object containing data
 * @param {Object} context - The context object
 * @returns {Promise<Object>} Response object with the table's updated status
 * @throws {Error} Various error types based on validation failures
 */
exports.updateTableStatus = functions.https.onCall(async (request, context) => {
    // Declare data outside try block so it's accessible in catch
    let data;
    try {
        console.log('poopoo updateTableStatus - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('poopoo updateTableStatus - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId,
            status: data.status
        });

        // 2. Validate required parameters
        TableInputValidation.validateUpdateTableStatusInput(data);
        const { restaurantId, tableId, status } = data;

        await validateStaffSession(restaurantId, data.sessionId);

        // 3. Get table and restaurant data
        console.log(`poopoo updateTableStatus - Getting table and restaurant data`);
        const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`poopoo updateTableStatus - Table data retrieved successfully`);

        // 4. Check if status is already set to requested value
        if (tableData.status === status) {
            console.log(`poopoo updateTableStatus - Table ${tableId} is already in ${status} status`);
            const responseData = {
                tableId,
                tableNumber: tableData.number || tableId,
                previousStatus: status,
                currentStatus: status,
                changed: false
            };
            return ResponseBuilder.success(responseData, `Table is already in ${status} status`);
        }

        // Store previous status for response
        const previousStatus = tableData.status;

        // 5. When changing to vacant from any status, clean up all table state
        const updateData = {
            status: status,
            lastUpdated: timestamp.serverTimestamp()
        };

        // 6. Update table status. Vacant clears the party's state and ends its
        // sessions (same helper order-updateOrderStatus uses at COMPLETED).
        console.log(`poopoo updateTableStatus - Updating table ${tableId} status from ${previousStatus} to ${status}`);
        if (status === 'vacant') {
            await vacateTable(restaurantId, tableId);
        } else {
            await tableRef.update(updateData);
        }

        console.log(`poopoo updateTableStatus - Table ${tableId} status updated successfully`);

        // 7. Return success response
        const responseData = {
            tableId,
            tableNumber: tableData.number || tableId,
            previousStatus: previousStatus || 'unknown',
            currentStatus: status,
            changed: true
        };

        return ResponseBuilder.success(responseData, "Table status updated successfully");

    } catch (error) {
        console.error('Error in updateTableStatus:', error);
        console.error('Error stack:', error.stack);

        if (error.code === 'not-found') {
            console.log(`poopoo updateTableStatus - Not found error: ${error.message}`);
            errorHandler.notFound(error.message);
        } else if (error.code === 'invalid-argument') {
            console.log(`poopoo updateTableStatus - Invalid argument error`);
            errorHandler.badRequest('Invalid or missing parameters');
        } else {
            errorHandler.handleError(error, 'updateTableStatus', {
                restaurantId: data?.restaurantId,
                tableId: data?.tableId,
                status: data?.status
            });
        }
    }
});