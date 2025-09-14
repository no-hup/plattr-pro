const functions = require('firebase-functions');
const admin = require('../admin/admin');

/**
 * Validation utilities for server module
 * Contains methods to validate input data for server operations
 */
class ServerInputValidation {
    /**
     * Validates input for server creation
     * Expected data format:
     * {
     *   name: string,  // Required: Server's name
     *   email: string, // Required: Server's email
     *   role: string   // Required: Server's role
     * }
     * 
     * @param {Object} data - Input data
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If required fields are missing
     */
    static validateCreateServer(data) {
        const { name, email, role } = data;
        
        if (!name || !email || !role) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }
    }

    /**
     * Validates input for server update
     * Expected data format:
     * {
     *   id: string,    // Required: Server's ID
     *   name?: string, // Optional: Updated name
     *   email?: string, // Optional: Updated email
     *   role?: string,  // Optional: Updated role
     *   status?: string // Optional: Updated status
     * }
     * 
     * @param {Object} data - Input data
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If server ID is missing
     */
    static validateUpdateServer(data) {
        const { id } = data;
        
        if (!id) {
            throw new functions.https.HttpsError('invalid-argument', 'Server ID is required');
        }
    }

    /**
     * Validates server exists
     * Verifies that the document snapshot represents an existing server
     * 
     * @param {DocumentSnapshot} server - Server document snapshot
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If server does not exist
     */
    static validateServerExists(server) {
        if (!server.exists) {
            throw new functions.https.HttpsError('not-found', 'Server not found');
        }
    }

    /**
     * Validates input for getting server information
     * Expected data format:
     * {
     *   id: string  // Required: Server's ID
     * }
     * 
     * @param {Object} data - Input data
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If server ID is missing
     */
    static validateGetServer(data) {
        const { id } = data;
        
        if (!id) {
            throw new functions.https.HttpsError('invalid-argument', 'Server ID is required');
        }
    }

    /**
     * Validates input for table assignment
     * Expected data format:
     * {
     *   serverId: string,  // Required: Server's ID
     *   tableId: string    // Required: Table's ID
     * }
     * 
     * @param {Object} data - Input data
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If server ID or table ID is missing
     */
    static validateTableAssignment(data) {
        const { serverId, tableId } = data;
        
        if (!serverId || !tableId) {
            throw new functions.https.HttpsError('invalid-argument', 'Server ID and Table ID are required');
        }
    }

    /**
     * Validates server and table exist
     * Verifies that both server and table document snapshots represent existing documents
     * 
     * @param {DocumentSnapshot} serverDoc - Server document snapshot
     * @param {DocumentSnapshot} tableDoc - Table document snapshot
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If server or table does not exist
     */
    static validateServerAndTableExist(serverDoc, tableDoc) {
        if (!serverDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Server not found');
        }

        if (!tableDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Table not found');
        }
    }

    /**
     * Validates input for getting tables for a restaurant
     * Expected data format:
     * {
     *   restaurantId: string  // Required: Restaurant's ID
     * }
     * 
     * @param {Object} data - Input data
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If restaurant ID is missing
     */
    static validateGetTables(data) {
        const { restaurantId } = data;
        
        if (!restaurantId) {
            throw new functions.https.HttpsError('invalid-argument', 'Restaurant ID is required');
        }
    }

    /**
     * Validates input for table OTP generation
     * Expected data format:
     * {
     *   restaurantId: string,  // Required: Restaurant's ID
     *   tableId: string        // Required: Table's ID
     * }
     * 
     * @param {Object} data - Input data
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If required parameters are missing
     */
    static validateTableOTPGeneration(data) {
        const { restaurantId, tableId } = data;
        
        if (!restaurantId) {
            throw new functions.https.HttpsError('invalid-argument', 'Restaurant ID is required');
        }
        
        if (!tableId) {
            throw new functions.https.HttpsError('invalid-argument', 'Table ID is required');
        }
    }

    /**
     * Validates input for server login
     * Expected data format:
     * {
     *   email?: string, // Optional: Server's email
     *   phoneNumber?: string, // Optional: Server's phone number
     *   password: string // Required: Server's password
     * }
     * @param {Object} data - Input data
     * @returns {void} - Throws error if validation fails
     * @throws {functions.https.HttpsError} If required fields are missing
     */
    static validateServerLogin(data) {
        const { email, phoneNumber, password } = data;
        if ((!email && !phoneNumber) || !password) {
            throw new functions.https.HttpsError('invalid-argument', 'Email or phone number and password are required');
        }
    }
}

module.exports = ServerInputValidation; 