const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const ServerInputValidation = require('./serverInputValidation');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const ResponseBuilder = require('../utils/ResponseBuilder');

/**
 * Retrieves all tables for a restaurant with their status
 * @param {Object} data - The request data
 * @param {string} data.restaurantId - Required: The ID of the restaurant
 * @returns {Object} List of tables with status information
 */
exports.getTables = functions.https.onCall(async (data, context) => {
    try {
        // Input validation — unwrap nested data (onCall may double-wrap)
        const requestData = data.data || data;
        ServerInputValidation.validateGetTables(requestData);
        const { restaurantId } = requestData;

        // Verify restaurant exists
        const restaurantRef = db.collection('restaurants').doc(restaurantId);
        const restaurantDoc = await restaurantRef.get();
        
        if (!restaurantDoc.exists) {
            errorHandler.notFound('Restaurant not found', {
                details: `Restaurant with ID ${restaurantId} was not found`,
                restaurantId
            });
        }

        // Fetch all tables for this restaurant
        const tablesSnapshot = await restaurantRef.collection('tables').get();
        
        if (tablesSnapshot.empty) {
            return ResponseBuilder.success(
                {
                    tables: [],
                    restaurantId,
                    count: 0
                },
                "No tables found for this restaurant"
            );
        }

        // Define valid table statuses
        // 'reserved' is a real staff-held status (PRD 16.1) — pass it through rather than
        // coercing it to 'vacant', or the waiter sees a held table as free.
        const VALID_STATUSES = ['active', 'vacant', 'disabled', 'reserved', 'pending', 'OTP_PENDING'];
        
        // Process tables data
        const tables = tablesSnapshot.docs.map(doc => {
            const tableData = doc.data();
            
            // Validate table status
            const validStatus = tableData.status && VALID_STATUSES.includes(tableData.status) 
                ? tableData.status 
                : 'vacant';
            
            // Create a sanitized version of table data for the frontend
            return {
                id: doc.id,
                number: tableData.number,
                status: validStatus,
                capacity: tableData.capacity || null,
                assignedServerId: tableData.assignedServerId || null,
                isOccupied: validStatus === 'active',
                primaryCustomer: tableData.primaryCustomer || null,
                lastActivity: tableData.lastActivity ? timestamp.toISOString(tableData.lastActivity) : null
            };
        });

        // Sort tables by number
        tables.sort((a, b) => {
            // Extract numeric portion from table numbers (e.g., "T1" -> 1)
            const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.number.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        return ResponseBuilder.success(
            {
                restaurantId,
                tables,
                count: tables.length
            },
            "Tables retrieved successfully"
        );
    } catch (error) {
        console.error('Error getting tables:', error);
        if (error.httpErrorCode) {
            // If it's already a custom error with httpErrorCode, just re-throw it
            throw error;
        }
        errorHandler.internalError('Failed to retrieve tables', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
}); 