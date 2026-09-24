const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const ResponseBuilder = require('../utils/ResponseBuilder');
const { validateAdminSession } = require('./auth');

/**
 * Table status constants
 */
const TABLE_STATUS = {
    ACTIVE: 'active',
    VACANT: 'vacant',
    DISABLED: 'disabled',
    OTP_PENDING: 'pending'
};

/**
 * Get all tables for a restaurant (admin view)
 */
exports.getTables = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        const { restaurantId, sessionId } = data;

        // Validate admin session
        await validateAdminSession(restaurantId, sessionId);

        // Get all tables for this restaurant
        const tablesSnapshot = await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('tables')
            .get();

        const tables = [];
        tablesSnapshot.forEach(doc => {
            const tableData = doc.data();
            tables.push({
                id: doc.id,
                number: tableData.number || doc.id,
                status: tableData.status || TABLE_STATUS.VACANT,
                capacity: tableData.capacity ?? null,
                assignedServerId: tableData.assignedServerId || null,
                isOccupied: tableData.status === TABLE_STATUS.ACTIVE,
                primaryCustomer: tableData.primaryCustomer || null,
                lastActivity: tableData.lastActivity ? timestamp.toISOString(tableData.lastActivity) : null,
            });
        });

        // Sort tables by number
        tables.sort((a, b) => {
            const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.number.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        return ResponseBuilder.success({
            restaurantId,
            tables,
            count: tables.length
        }, 'Tables retrieved successfully');

    } catch (error) {
        console.error('Error in getTables:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to retrieve tables', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

/**
 * Update table status (enable/disable)
 */
exports.updateTableStatus = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        const { restaurantId, sessionId, tableId, status } = data;

        // Validate admin session
        await validateAdminSession(restaurantId, sessionId);

        if (!tableId) {
            errorHandler.badRequest('Table ID is required', {
                details: 'tableId is required'
            });
        }

        // Validate status
        const validStatuses = [TABLE_STATUS.VACANT, TABLE_STATUS.DISABLED];
        if (!validStatuses.includes(status)) {
            errorHandler.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, {
                status,
                validStatuses
            });
        }

        // Get table reference
        const tableRef = db.collection('restaurants').doc(restaurantId).collection('tables').doc(tableId);
        const tableDoc = await tableRef.get();

        if (!tableDoc.exists) {
            errorHandler.notFound('Table not found', { tableId });
        }

        const tableData = tableDoc.data();

        // If table is currently active (occupied), don't allow disabling
        if (tableData.status === TABLE_STATUS.ACTIVE && status === TABLE_STATUS.DISABLED) {
            errorHandler.badRequest('Cannot disable an occupied table. Please wait for guests to leave.', {
                tableId,
                currentStatus: tableData.status
            });
        }

        // Update table status
        await tableRef.update({
            status: status,
            updatedAt: timestamp.serverTimestamp(),
        });

        return ResponseBuilder.success({
            tableId,
            status,
            updated: true
        }, `Table ${status === TABLE_STATUS.DISABLED ? 'disabled' : 'enabled'} successfully`);

    } catch (error) {
        console.error('Error in updateTableStatus:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to update table status', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

/**
 * Update table details (number, capacity)
 */
exports.updateTable = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        const { restaurantId, sessionId, tableId, updateData } = data;

        // Validate admin session
        await validateAdminSession(restaurantId, sessionId);

        if (!tableId) {
            errorHandler.badRequest('Table ID is required', {
                details: 'tableId is required'
            });
        }

        // Get table reference
        const tableRef = db.collection('restaurants').doc(restaurantId).collection('tables').doc(tableId);
        const tableDoc = await tableRef.get();

        if (!tableDoc.exists) {
            errorHandler.notFound('Table not found', { tableId });
        }

        // Build update object
        const updates = {
            updatedAt: timestamp.serverTimestamp(),
        };

        if (updateData.number !== undefined) {
            updates.number = updateData.number;
        }

        if (updateData.capacity !== undefined) {
            updates.capacity = updateData.capacity;
        }

        // Update table
        await tableRef.update(updates);

        return ResponseBuilder.success({
            tableId,
            updated: true
        }, 'Table updated successfully');

    } catch (error) {
        console.error('Error in updateTable:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to update table', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

module.exports = {
    getTables: exports.getTables,
    updateTableStatus: exports.updateTableStatus,
    updateTable: exports.updateTable,
    TABLE_STATUS,
};
