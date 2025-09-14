const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const ServerInputValidation = require('./serverInputValidation');
const timestamp = require('../utils/timestamp');
const { safeArrayUnion, safeArrayRemove, applyArrayOperation } = require('../utils/arrayOperations');
const errorHandler = require('../singleton/ErrorHandler');

// Import modular server logic
const tablesFetch = require('./tables_fetch');
const tableOTP = require('./table_otp');

// --- Exported Functions ---
// Table-related
exports.getTables = tablesFetch.getTables;
exports.generateTableOTP = tableOTP.generateTableOTP;

// --- Server CRUD Functions ---
/**
 * Creates a new server
 * @param {Object} data - The server data
 * @param {string} data.name - Required: The name of the server
 * @param {string} data.email - Required: The email of the server
 * @param {string} data.role - Required: The role of the server
 * @returns {Object} The created server object with ID
 */
exports.createServer = functions.https.onCall(async (data, context) => {
    // TODO: Add authentication check here
    ServerInputValidation.validateCreateServer(data);
    const { name, email, role } = data;
    const serverData = {
        name,
        email,
        role,
        status: 'active',
        createdAt: timestamp.serverTimestamp(),
        updatedAt: timestamp.serverTimestamp(),
        assignedTables: []
    };
    try {
        const serverRef = await db.collection('servers').add(serverData);
        return { id: serverRef.id, ...serverData };
    } catch (error) {
        console.error('Error creating server:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create server');
    }
});

/**
 * Updates server information
 * @param {Object} data - The update data
 * @param {string} data.id - Required: The ID of the server to update
 * @param {string} [data.name] - Optional: The updated name of the server
 * @param {string} [data.email] - Optional: The updated email of the server
 * @param {string} [data.role] - Optional: The updated role of the server
 * @param {string} [data.status] - Optional: The updated status of the server
 * @returns {Object} Success message
 */
exports.updateServer = functions.https.onCall(async (data, context) => {
    // TODO: Add authentication check here
    ServerInputValidation.validateUpdateServer(data);
    const { id, ...updateData } = data;
    try {
        const serverRef = db.collection('servers').doc(id);
        const server = await serverRef.get();
        if (!server.exists) {
            errorHandler.notFound('Server not found', { id });
        }
        updateData.updatedAt = timestamp.serverTimestamp();
        await serverRef.update(updateData);
        return { message: 'Server updated successfully' };
    } catch (error) {
        console.error('Error updating server:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update server');
    }
});

/**
 * Retrieves a specific server's details
 * @param {Object} data - The request data
 * @param {string} data.id - Required: The ID of the server
 * @returns {Object} Server details
 */
exports.getServer = functions.https.onCall(async (data, context) => {
    // TODO: Add authentication check here
    const { id } = data;
    if (!id) {
        throw new functions.https.HttpsError('invalid-argument', 'Server ID is required');
    }
    try {
        const serverRef = db.collection('servers').doc(id);
        const server = await serverRef.get();
        if (!server.exists) {
            throw new functions.https.HttpsError('not-found', 'Server not found');
        }
        return server.data();
    } catch (error) {
        console.error('Error getting server:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get server');
    }
});

/**
 * Assigns a table to a server
 * @param {Object} data - The request data
 * @param {string} data.serverId - Required: The ID of the server
 * @param {string} data.tableId - Required: The ID of the table
 * @returns {Object} Success message
 */
exports.assignTable = functions.https.onCall(async (data, context) => {
    // TODO: Add authentication check here
    ServerInputValidation.validateTableAssignment(data);
    const { serverId, tableId } = data;
    try {
        const serverRef = db.collection('servers').doc(serverId);
        const tableRef = db.collection('tables').doc(tableId);
        // Example logic, adjust as per your schema
        await serverRef.update({ assignedTables: safeArrayUnion(tableId) });
        await tableRef.update({ assignedServerId: serverId });
        return { message: 'Table assigned successfully' };
    } catch (error) {
        console.error('Error assigning table:', error);
        throw new functions.https.HttpsError('internal', 'Failed to assign table');
    }
});

/**
 * Unassigns a table from a server
 * @param {Object} data - The request data
 * @param {string} data.serverId - Required: The ID of the server
 * @param {string} data.tableId - Required: The ID of the table
 * @returns {Object} Success message
 */
exports.unassignTable = functions.https.onCall(async (data, context) => {
    // TODO: Add authentication check here
    ServerInputValidation.validateTableAssignment(data);
    const { serverId, tableId } = data;
    try {
        const serverRef = db.collection('servers').doc(serverId);
        const tableRef = db.collection('tables').doc(tableId);
        // Example logic, adjust as per your schema
        await serverRef.update({ assignedTables: safeArrayRemove(tableId) });
        await tableRef.update({ assignedServerId: null });
        return { message: 'Table unassigned successfully' };
    } catch (error) {
        console.error('Error unassigning table:', error);
        throw new functions.https.HttpsError('internal', 'Failed to unassign table');
    }
});
