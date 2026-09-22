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
const { resolveTableId, unmergeChildren } = require('./mergedTables');
const customerService = require('../customer/customerService');
const ResponseBuilder = require('../utils/ResponseBuilder');

// Initialize Firestore

const TABLE_STATUS = {
    ACTIVE: 'active',
    VACANT: 'vacant',
    DISABLED: 'disabled',
    // Read-only since 2026-09-21: nothing writes `pending` any more. A guest part way through
    // signing in is a hold on `currentOTP.expiresAt`, derived where it is needed instead of
    // stored — a status had to be undone by a cleanup job, and that job was never scheduled
    // (TD-044). Kept here so a document written before that date still reads sanely.
    OTP_PENDING: 'pending',
    RESERVED: 'reserved'   // staff-held: no self-service join until a waiter marks it vacant
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
        let { restaurantId, tableId, userLocation, sessionId } = data;

        // A merged table's QR code still says table 6. Everything below this line —
        // the disabled guard, the session, the cart — is about the table the party is
        // actually sitting at.
        tableId = await resolveTableId(restaurantId, tableId);

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
            // validateTableSession is table-scoped: it returns whatever session the table
            // has. Resume only if the caller actually holds that id — anything else is a
            // stale or guessed id and goes through OTP like everyone else.
            if (validatedSession && validatedSession.id !== sessionId) validatedSession = null;
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

        // 5d. Reserved table: a waiter seats the party (server app → Vacant) and the
        // normal scan → OTP flow takes over. Deliberately after 5c so a party already
        // seated here keeps access if staff flip the table to reserved mid-meal.
        if (originalStatus === TABLE_STATUS.RESERVED) {
            errorHandler.forbidden(
                "This table is reserved. Please ask the staff to seat you.",
                {
                    tableStatus: TABLE_STATUS.RESERVED,
                    restaurant: restaurantInfo,
                    table: tableInfo,
                    error: 'Table is reserved'
                }
            );
        }

        // 6. A scan HOLDS the table; it does not mint a new code and does not change the status.
        //
        // Decided 2026-09-21 (moonshot/reviews/2026-09-21-otp-and-table-state.md). Minting here
        // was a live flaw: anyone who can read the QR could rotate the code, which silently
        // invalidated the number the waiter was in the middle of reading out. A code is minted
        // only when the table has none — a fresh table, or one just freed, since `vacateTable`
        // and FL's Clear both write `currentOTP: null`. That is also where rotation happens: a
        // new party gets a new code because the old one was cleared when the table was freed.
        //
        // The old `pending` status is gone. What it carried — "someone is part way through
        // signing in" — is now the hold on `currentOTP.expiresAt`, which lapses on its own clock
        // and so needs no cleanup job to undo it.
        if (originalStatus === TABLE_STATUS.VACANT || originalStatus === TABLE_STATUS.OTP_PENDING) {
            const otpObject = otpService.handleOTPGeneration(tableData);   // keeps the code it has; mints only if there is none
            console.log(`Table ${tableId} is ${originalStatus}; holding it for this scan${tableData.currentOTP?.code ? '' : ' and minting its first code'}`);

            try {
                await tableRef.update({
                    currentOTP: { ...otpObject, expiresAt: otpService.holdExpiry() },
                    firstScannedAt: timestamp.serverTimestamp()
                });
                console.log(`Table ${tableId} held in Firestore`);
            } catch (updateError) {
                console.error(`Error holding table ${tableId}:`, updateError);
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
            console.log('Table scan auth details:', { originalStatus, isPhoneNumberMandatory, isUsernameMandatory, isMultiUserSupported });

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
    console.log("==== validateOTP called with data:", {
        restaurantId: data?.restaurantId,
        tableId: data?.tableId,
        otp: data?.otp,
        phoneNumber: data?.phoneNumber,
        name: data?.name
    });
    try {
        // 1. Input Validation
        console.log("validateOTP - Validating input parameters");
        TableInputValidation.validateOTPInput(data);
        let { restaurantId, tableId, otp, phoneNumber, name } = data;

        // Scanning the merged table's QR must accept the parent table's OTP, because
        // the OTP lives on the parent's doc.
        tableId = await resolveTableId(restaurantId, tableId);

        // 2. Data Fetching
        const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`validateOTP - Table data retrieved successfully`);

        // Validate table data structure
        if (!tableData) {
            console.error("validateOTP - Error: Table data is null or undefined");
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
        console.log(`validateOTP - Current table status: ${originalStatus}`);

        // Reserved tables are staff-seated: no self-service OTP join until a waiter marks
        // the table vacant (mirrors the scan-time guard in validateTableAndLocation).
        if (originalStatus === TABLE_STATUS.RESERVED) {
            errorHandler.forbidden("This table is reserved. Please ask the staff to seat you.", {
                tableStatus: originalStatus,
                error: 'Table is reserved',
                restaurantId,
                tableId
            });
        }

        // 3. Hoisted Requirement Calculations
        const isPhoneNumberRequired = (originalStatus === TABLE_STATUS.VACANT || originalStatus === TABLE_STATUS.OTP_PENDING)
            || featureFlags.isEnabled('isMultiUserSupportEnabled');
        console.log(`validateOTP - isPhoneNumberRequired: ${isPhoneNumberRequired}, phoneNumber provided: ${!!phoneNumber}`);

        // Early exit if phone number is required but missing
        if (isPhoneNumberRequired && !phoneNumber) {
            console.log("validateOTP - Error: Phone number is required but not provided");
            errorHandler.badRequest('Phone number is required for this operation', {
                details: 'Phone number is required for primary customers (vacant/pending table) or when multi-user support is enabled'
            });
        }

        // Calculate potential primary status based on initial table state
        const potentiallyPrimary = (originalStatus === TABLE_STATUS.OTP_PENDING || originalStatus === TABLE_STATUS.VACANT);
        const isUsernameEnabled = featureFlags.isEnabled('isUsernameEnabled');
        //todo shaurya recheck this logic
        const isUsernameRequired = isUsernameEnabled && potentiallyPrimary;
        console.log(`validateOTP - isUsernameRequired: ${isUsernameRequired}, name provided: ${!!name}`);

        // Early exit if username is required but missing
        if (isUsernameRequired && !name) {
            console.log("validateOTP - Error: Name is required but not provided");
            errorHandler.badRequest('Name is required for this operation', {
                details: 'Name is required for primary customers or when username feature is enabled'
            });
        }

        // 4. OTP Validation Logic
        let isPrimaryCustomer = false;

        if (originalStatus === TABLE_STATUS.OTP_PENDING || originalStatus === TABLE_STATUS.VACANT) {
            console.log(`validateOTP - Validating OTP for potential primary customer`);

            // Validate OTP data exists and has required structure
            if (!tableData.currentOTP || typeof tableData.currentOTP !== 'object') {
                console.error("validateOTP - Error: currentOTP missing or invalid for VACANT/PENDING table");
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
                console.error("validateOTP - Error: Invalid OTP code structure");
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

            // No expiry check. The code lives as long as the party does (see session/otpService.js);
            // `expiresAt` is the hold a scan put on the table, not the life of the code, and a guest
            // who took twenty minutes to find a waiter must not be sent back to the QR. The ACTIVE
            // branch below never checked expiry either, so this is now one rule instead of two.

            console.log(`validateOTP - Expected OTP: ${tableData.currentOTP.code}, Provided OTP: ${otp}`);
            if (tableData.currentOTP.code !== otp) {
                console.log("validateOTP - Error: Invalid OTP provided");
                errorHandler.unauthorized('Invalid OTP', {
                    details: 'The provided OTP is incorrect',
                    tableStatus: originalStatus
                });
            }

            isPrimaryCustomer = true;
            console.log("validateOTP - User confirmed as primary customer");

            // Update table status and customer info with proper null checks
            console.log("validateOTP - Updating table as active with primary customer info");
            const updateData = {
                status: TABLE_STATUS.ACTIVE,
                primaryCustomer: { phoneNumber, name },
                // The claim is spent: they are in. The code stays, because their friends join on it.
                currentOTP: { ...tableData.currentOTP, expiresAt: null },
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
            console.log("validateOTP - Table updated successfully");

        } else if (originalStatus === TABLE_STATUS.ACTIVE) {
            console.log("validateOTP - Validating OTP for secondary user");

            // Validate OTP data exists and has required structure
            if (!tableData.currentOTP || typeof tableData.currentOTP !== 'object') {
                console.error("validateOTP - Error: currentOTP missing or invalid for ACTIVE table");
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
                console.error("validateOTP - Error: Invalid OTP code structure");
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

            console.log(`validateOTP - Expected OTP: ${tableData.currentOTP.code}, Provided OTP: ${otp}`);
            if (tableData.currentOTP.code !== otp) {
                console.log("validateOTP - Wrong OTP for active table");
                errorHandler.unauthorized('Invalid OTP', {
                    status: 'ask_primary_customer',
                    message: 'Please ask the primary customer or the server/waiter for the correct OTP.',
                    tableStatus: originalStatus
                });
            }

            if (phoneNumber) {
                console.log("validateOTP - Adding secondary user to occupied list");
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
                console.log("validateOTP - Table updated with new user");
            }
        } else {
            console.warn(`validateOTP - Unexpected table status: ${originalStatus}`);
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
            console.log(`validateOTP - Creating/updating customer profile for ${phoneNumber}`);
            try {
                await customerService.createOrUpdateCustomerProfileDirect(phoneNumber, name);
                console.log("validateOTP - Customer profile updated successfully");
            } catch (profileError) {
                console.error("validateOTP - Error updating customer profile:", profileError);
                // Continue execution even if profile update fails
            }
        }

        // 6. Session Management
        let session;
        if (isPrimaryCustomer) {
            console.log(`validateOTP - Creating new session for primary customer ${phoneNumber}`);
            try {
                session = await sessionService.createOrGetTableSession(
                    restaurantId,
                    tableId,
                    phoneNumber
                );
                console.log(`validateOTP - Session created with ID: ${session.id}`);
            } catch (sessionError) {
                console.error("validateOTP - Error creating table session:", sessionError);
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
            console.log("validateOTP - Validating existing table session");
            try {
                const tableSession = await sessionService.validateTableSession(restaurantId, tableId);
                console.log(`validateOTP - Existing session validation result: ${tableSession ? tableSession.id : 'null'}`);

                if (!tableSession) {
                    console.log("validateOTP - No active session found");
                    errorHandler.preconditionFailed('No active session for this table', {
                        restaurantId,
                        tableId,
                        error: 'Missing active session'
                    });
                }

                if (phoneNumber) {
                    console.log(`validateOTP - Adding user ${phoneNumber} to existing session ${tableSession.id}`);
                    try {
                        session = await sessionService.addUserToTableSession(restaurantId, tableSession.id, phoneNumber);
                        console.log(`validateOTP - User added to session, updated session: ${session.id}`);
                    } catch (addUserError) {
                        console.error("validateOTP - Error adding user to session:", addUserError);
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
                console.error("validateOTP - Error handling session:", sessionError);
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
            console.log(`validateOTP - Creating custom token for user ${phoneNumber}`);
            try {
                customToken = await admin.auth().createCustomToken(phoneNumber);
                console.log("validateOTP - Custom token created successfully");
            } catch (tokenError) {
                console.error("validateOTP - Error creating custom token:", tokenError);
                // Continue execution even if token creation fails
            }
        }

        // 8. Return Success Response
        console.log(`validateOTP - Returning success response, isPrimaryCustomer: ${isPrimaryCustomer}, sessionId: ${session.id}`);
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

// cleanupInactiveSessions moved: the idle sweep is app/floor.ts releaseIdle behind the
// `floor-releaseIdleTables` schedule, and its emulator-only manual trigger keeps this name from
// lib/api/floor.ts (index.js wires it into the table group). FL-S36, TD-044.

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
exports.checkTableStatus = functions.https.onCall(async (request, context) => {
    // Read request.data, like every other callable here. Destructuring the
    // request wrapper itself left restaurantId/tableId undefined on every call,
    // which is why this endpoint always returned 500.
    const data = request?.data ?? request;
    console.log("==== checkTableStatus called with data:", JSON.stringify(data));
    try {
        console.log("checkTableStatus - Validating input parameters");
        TableInputValidation.validateTableStatusInput(data);
        let { restaurantId, tableId } = data;
        tableId = await resolveTableId(restaurantId, tableId);

        console.log(`checkTableStatus - Getting restaurant and table data`);
        const { tableData } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`checkTableStatus - Table data retrieved successfully`);

        if (!Object.values(TABLE_STATUS).includes(tableData.status)) {
            console.warn(`checkTableStatus - Invalid table status: ${tableData.status}. Defaulting to VACANT`);
            tableData.status = TABLE_STATUS.VACANT;
        }

        let serverInfo = null;
        if (tableData.assignedServerId) {
            console.log(`checkTableStatus - Fetching server info for serverId: ${tableData.assignedServerId}`);
            try {
                const serverDoc = await db
                    .collection('restaurants')
                    .doc(restaurantId)
                    .collection('servers')
                    .doc(tableData.assignedServerId)
                    .get();

                console.log(`checkTableStatus - Server document exists: ${serverDoc.exists}`);
                if (serverDoc.exists) {
                    const serverData = serverDoc.data();
                    serverInfo = {
                        name: serverData.name,
                        status: serverData.status
                    };
                    console.log(`checkTableStatus - Server info retrieved: ${JSON.stringify(serverInfo)}`);
                }
            } catch (serverError) {
                console.error("checkTableStatus - Error fetching server info:", serverError);
                // Continue execution even if server info fetch fails
            }
        }

        console.log(`checkTableStatus - Checking whether the table carries a code`);
        // A code does not expire any more, so the honest answer is whether one exists. The old
        // check here read the hold, which is a different question (session/otpService.js).
        const hasActiveOTP = !!tableData.currentOTP?.code;
        console.log(`checkTableStatus - OTP validity: ${hasActiveOTP}`);

        console.log("checkTableStatus - Returning table status response");
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
            console.log(`checkTableStatus - Not found error: ${message}`);
            errorHandler.notFound(message);
        } else if (error.code === 'invalid-argument') {
            console.log(`checkTableStatus - Invalid argument error`);
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
        console.log('getTablesForRestaurant - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('getTablesForRestaurant - Request data:', { restaurantId: data.restaurantId });

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
        console.log(`getTablesForRestaurant - Fetching tables for restaurant ${restaurantId}`);
        const tablesSnapshot = await restaurantRef.collection('tables').get();

        if (tablesSnapshot.empty) {
            console.log(`getTablesForRestaurant - No tables found for restaurant ${restaurantId}`);
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

            // Merged tables: the child names its parent so the app can draw them as one
            // group, and names who merged them so that waiter can be told when the
            // bill frees them again.
            if (tableData.mergedInto) {
                formattedTable.mergedInto = tableData.mergedInto;
                if (tableData.mergedBy) {
                    formattedTable.mergedBy = tableData.mergedBy;
                }
            }

            // If serverId is specified, filter tables by assigned server
            if (!serverId || tableData.assignedServerId === serverId) {
                tables.push(formattedTable);
            }
        });

        console.log(`getTablesForRestaurant - Successfully retrieved ${tables.length} tables`);

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
        console.log('getTableDetails - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('getTableDetails - Request data:', {
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
        console.log(`getTableDetails - Getting table and restaurant data`);
        const { tableData, tableRef, restaurantData } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`getTableDetails - Table data retrieved successfully`);

        // 4. Get server information if assigned
        let serverInfo = null;
        if (tableData.assignedServerId) {
            console.log(`getTableDetails - Fetching server info for serverId: ${tableData.assignedServerId}`);
            try {
                const serverDoc = await db
                    .collection('restaurants')
                    .doc(restaurantId)
                    .collection('servers')
                    .doc(tableData.assignedServerId)
                    .get();

                console.log(`getTableDetails - Server document exists: ${serverDoc.exists}`);
                if (serverDoc.exists) {
                    const serverData = serverDoc.data();
                    serverInfo = {
                        id: tableData.assignedServerId,
                        name: serverData.name,
                        status: serverData.status,
                        profileImage: serverData.profileImage || null
                    };
                    console.log(`getTableDetails - Server info retrieved: ${JSON.stringify(serverInfo)}`);
                }
            } catch (serverError) {
                console.error("getTableDetails - Error fetching server info:", serverError);
                // Continue execution even if server info fetch fails
            }
        }

        // 5. Check OTP validity
        console.log(`getTableDetails - Checking whether the table carries a code`);
        // A code does not expire any more, so the honest answer is whether one exists. The old
        // check here read the hold, which is a different question (session/otpService.js).
        const hasActiveOTP = !!tableData.currentOTP?.code;
        console.log(`getTableDetails - OTP validity: ${hasActiveOTP}`);

        // 6. Get recent orders for this table (last 3)
        console.log(`getTableDetails - Fetching recent orders for table`);
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
            console.log(`getTableDetails - Retrieved ${recentOrders.length} recent orders`);
        } catch (ordersError) {
            console.error("getTableDetails - Error fetching recent orders:", ordersError);
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

        console.log("getTableDetails - Returning table details response");
        return ResponseBuilder.success(responseData, "Table details retrieved successfully");

    } catch (error) {
        console.error('Error in getTableDetails:', error);
        console.error('Error stack:', error.stack);

        if (error.code === 'not-found') {
            const message = error.message.includes('Restaurant') ?
                'Restaurant not found' : 'Table not found';
            console.log(`getTableDetails - Not found error: ${message}`);
            errorHandler.notFound(message);
        } else if (error.code === 'invalid-argument') {
            console.log(`getTableDetails - Invalid argument error`);
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
        console.log('assignTableToServer - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('assignTableToServer - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId,
            serverId: data.serverId
        });

        // 2. Validate required parameters
        TableInputValidation.validateAssignTableInput(data);
        const { restaurantId, tableId, serverId } = data;

        await validateStaffSession(restaurantId, data.sessionId);

        // 3. Get table and restaurant data
        console.log(`assignTableToServer - Getting table and restaurant data`);
        const { tableData, tableRef, restaurantData } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`assignTableToServer - Table data retrieved successfully`);

        // 4. Validate server exists
        console.log(`assignTableToServer - Validating server ${serverId} exists`);
        const serverRef = db.collection('restaurants').doc(restaurantId).collection('servers').doc(serverId);
        const serverDoc = await serverRef.get();

        if (!serverDoc.exists) {
            console.error(`assignTableToServer - Server ${serverId} not found in restaurant ${restaurantId}`);
            errorHandler.notFound('Server not found', {
                details: `Server with ID ${serverId} was not found in restaurant ${restaurantId}`,
                serverId,
                restaurantId
            });
        }

        const serverData = serverDoc.data();
        console.log(`assignTableToServer - Server data retrieved successfully: ${serverData.name}`);

        // 5. Check if table is already assigned to this server
        if (tableData.assignedServerId === serverId) {
            console.log(`assignTableToServer - Table ${tableId} is already assigned to server ${serverId}`);
            const responseData = {
                tableId,
                serverId,
                serverName: serverData.name,
                tableNumber: tableData.number || tableId
            };
            return ResponseBuilder.success(responseData, "Table is already assigned to this server");
        }

        // 6. Update table with new server assignment
        console.log(`assignTableToServer - Assigning table ${tableId} to server ${serverId}`);
        await tableRef.update({
            assignedServerId: serverId,
            lastUpdated: timestamp.serverTimestamp()
        });

        console.log(`assignTableToServer - Table ${tableId} successfully assigned to server ${serverId}`);

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
            console.log(`assignTableToServer - Not found error: ${error.message}`);
            errorHandler.notFound(error.message);
        } else if (error.code === 'invalid-argument') {
            console.log(`assignTableToServer - Invalid argument error`);
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
        console.log('unassignTableFromServer - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('unassignTableFromServer - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId
        });

        // 2. Validate required parameters
        TableInputValidation.validateUnassignTableInput(data);
        const { restaurantId, tableId } = data;

        await validateStaffSession(restaurantId, data.sessionId);

        // 3. Get table and restaurant data
        console.log(`unassignTableFromServer - Getting table and restaurant data`);
        const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`unassignTableFromServer - Table data retrieved successfully`);

        // 4. Check if table is not assigned to any server
        if (!tableData.assignedServerId) {
            console.log(`unassignTableFromServer - Table ${tableId} is not assigned to any server`);
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
            console.error(`unassignTableFromServer - Error fetching server info: ${serverError.message}`);
            // Continue execution even if server info fetch fails
        }

        // 6. Update table to remove server assignment
        console.log(`unassignTableFromServer - Unassigning table ${tableId} from server ${previousServerId}`);
        await tableRef.update({
            assignedServerId: null,
            lastUpdated: timestamp.serverTimestamp()
        });

        console.log(`unassignTableFromServer - Table ${tableId} successfully unassigned from server`);

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
            console.log(`unassignTableFromServer - Not found error: ${error.message}`);
            errorHandler.notFound(error.message);
        } else if (error.code === 'invalid-argument') {
            console.log(`unassignTableFromServer - Invalid argument error`);
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
        console.log('generateTableOTP - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('generateTableOTP - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId
        });

        // 2. Validate required parameters
        TableInputValidation.validateGenerateOTPInput(data);
        const { restaurantId, tableId } = data;

        // OTP minting is the root of the consumer auth chain — staff only.
        await validateStaffSession(restaurantId, data.sessionId);

        // 3. Get table and restaurant data
        console.log(`generateTableOTP - Getting table and restaurant data`);
        const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`generateTableOTP - Table data retrieved successfully`);

        // 4. Generate new OTP
        console.log(`generateTableOTP - Generating new OTP for table ${tableId}`);
        const otpObject = otpService.createOTPObject();

        // 5. Update table with new OTP
        await tableRef.update({
            currentOTP: otpObject,
            lastUpdated: timestamp.serverTimestamp()
        });

        console.log(`generateTableOTP - New OTP generated successfully: ${otpObject.code}`);

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
            console.log(`generateTableOTP - Not found error: ${error.message}`);
            errorHandler.notFound(error.message);
        } else if (error.code === 'invalid-argument') {
            console.log(`generateTableOTP - Invalid argument error`);
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
        console.log('updateTableStatus - Function called');

        // 1. Input Validation & Standardization
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        console.log('updateTableStatus - Request data:', {
            restaurantId: data.restaurantId,
            tableId: data.tableId,
            status: data.status
        });

        // 2. Validate required parameters
        TableInputValidation.validateUpdateTableStatusInput(data);
        const { restaurantId, tableId, status } = data;

        await validateStaffSession(restaurantId, data.sessionId);

        // 3. Get table and restaurant data
        console.log(`updateTableStatus - Getting table and restaurant data`);
        const { tableData, tableRef } = await TableInputValidation.getTableAndRestaurantData(restaurantId, tableId);
        console.log(`updateTableStatus - Table data retrieved successfully`);

        // 4. Check if status is already set to requested value
        if (tableData.status === status) {
            console.log(`updateTableStatus - Table ${tableId} is already in ${status} status`);
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
        console.log(`updateTableStatus - Updating table ${tableId} status from ${previousStatus} to ${status}`);
        if (status === 'vacant') {
            await vacateTable(restaurantId, tableId);
        } else {
            await tableRef.update(updateData);
        }

        console.log(`updateTableStatus - Table ${tableId} status updated successfully`);

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
            console.log(`updateTableStatus - Not found error: ${error.message}`);
            errorHandler.notFound(error.message);
        } else if (error.code === 'invalid-argument') {
            console.log(`updateTableStatus - Invalid argument error`);
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

/**
 * Merges tables together, or releases a merge.
 *
 * A party of eight walks in and the waiter pushes table 6 against table 5. One
 * party, one cart, one kitchen ticket, one bill — so the waiter who moved the
 * furniture tells us, from the server app (or the till's floor screen, which calls
 * this same endpoint).
 *
 * The child keeps its printed QR code but goes `disabled`: the server app already
 * greys disabled tables out, so nobody seats a second party on it, and a guest who
 * scans it is resolved to the parent instead of being turned away.
 *
 * Unmerging normally happens by itself when the bill is paid (vacateTable). This
 * endpoint's `merge: false` is the manual escape hatch for when the party moves
 * before paying.
 *
 * @param {Object} request.data.restaurantId
 * @param {Object} request.data.parentTableId - the table the party is billed on
 * @param {Object} request.data.childTableIds - tables absorbed into the parent
 * @param {Object} [request.data.merge=true] - false releases the parent's children
 * @param {Object} request.data.sessionId - staff session
 */
// setMerge lives in one place now: app/floor.ts, wired as `table-setMerge` from index.js so the
// endpoint name and its door are unchanged. It gained what the batch version could not have: the
// child re-read inside the transaction (FL-S32 — two cashiers could both win before), the R14
// refusal to release a group that still holds money, a role check, and an audit row.

// OR-S1: staff open a table without a QR scan. Own file, same door.
exports.openTable = require("./openTable").openTable;
