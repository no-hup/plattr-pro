const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const ServerInputValidation = require('./serverInputValidation');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const otpService = require('../session/otpService');

// Use the same table status enum as in table.js
const TABLE_STATUS = {
    ACTIVE: 'active',
    VACANT: 'vacant',
    DISABLED: 'disabled',
    OTP_PENDING: 'pending'
};

/**
 * Generates an OTP for a vacant table and sets its status to OTP_PENDING
 * Similar to the OTP generation that happens when a user scans a table
 * 
 * @param {Object} data - The request data
 * @param {string} data.restaurantId - Required: The ID of the restaurant
 * @param {string} data.tableId - Required: The ID of the table
 * @returns {Object} OTP details and status
 */
exports.generateTableOTP = functions.https.onCall(async (data, context) => {
    try {
        // Input validation
        ServerInputValidation.validateTableOTPGeneration(data);
        const { restaurantId, tableId } = data;

        // Get table and restaurant data
        const restaurantRef = db.collection('restaurants').doc(restaurantId);
        const restaurantDoc = await restaurantRef.get();
        
        if (!restaurantDoc.exists) {
            errorHandler.notFound('Restaurant not found', {
                details: `Restaurant with ID ${restaurantId} was not found`,
                restaurantId
            });
        }

        const tableRef = restaurantRef.collection('tables').doc(tableId);
        const tableDoc = await tableRef.get();
        
        if (!tableDoc.exists) {
            errorHandler.notFound('Table not found', {
                details: `Table with ID ${tableId} was not found in restaurant ${restaurantId}`,
                restaurantId,
                tableId
            });
        }

        const tableData = tableDoc.data();
        const originalStatus = tableData.status || TABLE_STATUS.VACANT;

        // Only generate OTP for vacant tables
        if (originalStatus !== TABLE_STATUS.VACANT) {
            errorHandler.badRequest('Cannot generate OTP for non-vacant table', {
                details: `Table is currently in ${originalStatus} status. Only vacant tables can have OTPs generated.`,
                tableStatus: originalStatus,
                restaurantId,
                tableId
            });
        }

        // Generate OTP
        console.log(`poopoo Generating OTP for table ${tableId} in restaurant ${restaurantId}`);
        const otpObject = otpService.createOTPObject();
        
        try {
            // Update table with OTP and change status
            await tableRef.update({
                currentOTP: otpObject,
                firstScannedAt: timestamp.serverTimestamp(),
                status: TABLE_STATUS.OTP_PENDING,
                lastActivity: timestamp.serverTimestamp()
            });
            
            console.log(`poopoo Table ${tableId} status updated to OTP_PENDING with new OTP`);
            
            // Return success response with OTP details
            return {
                status: "success",
                message: "OTP generated successfully",
                data: {
                    tableId,
                    restaurantId,
                    tableNumber: tableData.number,
                    otp: otpObject.code,
                    expiresAt: timestamp.toISOString(otpObject.expiresAt),
                    tableStatus: TABLE_STATUS.OTP_PENDING
                }
            };
            
        } catch (updateError) {
            console.error(`Error updating table ${tableId} to OTP_PENDING:`, updateError);
            errorHandler.internalError(
                "Failed to generate OTP for table",
                {
                    error: updateError.message,
                    tableStatus: originalStatus,
                    restaurantId,
                    tableId
                }
            );
        }
    } catch (error) {
        console.error('Error in generateTableOTP:', error);
        if (error.httpErrorCode) {
            // If it's already a custom error with httpErrorCode, just re-throw it
            throw error;
        }
        errorHandler.internalError('Failed to generate table OTP', {
            error: error.message,
            restaurantId: data?.restaurantId,
            tableId: data?.tableId
        });
    }
}); 