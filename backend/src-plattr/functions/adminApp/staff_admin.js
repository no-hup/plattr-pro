const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const ResponseBuilder = require('../utils/ResponseBuilder');
const { SERVER_STATUS } = require('../server/serverEnums');
const { validateAdminSession, SERVER_ROLES } = require('./auth');

/**
 * Generates a random 4-6 digit PIN
 */
function generatePIN(length = 4) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Get all servers for a restaurant
 */
exports.getServers = functions.https.onCall(async (request, context) => {
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

        // Get all servers for this restaurant
        const serversSnapshot = await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('servers')
            .get();

        const servers = [];
        serversSnapshot.forEach(doc => {
            const serverData = doc.data();
            servers.push({
                id: doc.id,
                name: serverData.name || '',
                phoneNumber: serverData.phoneNumber || '',
                email: serverData.email || '',
                role: serverData.role || SERVER_ROLES.SERVER,
                status: serverData.status || SERVER_STATUS.INACTIVE,
                profileImageUrl: serverData.profileImageUrl || '',
                createdAt: serverData.createdAt ? timestamp.toISOString(serverData.createdAt) : null,
                updatedAt: serverData.updatedAt ? timestamp.toISOString(serverData.updatedAt) : null,
            });
        });

        // Sort by name
        servers.sort((a, b) => a.name.localeCompare(b.name));

        return ResponseBuilder.success({
            restaurantId,
            servers,
            count: servers.length
        }, 'Servers retrieved successfully');

    } catch (error) {
        console.error('Error in getServers:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to retrieve servers', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

/**
 * Add a new server to a restaurant
 */
exports.addServer = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        const { restaurantId, sessionId, server } = data;

        // Validate admin session
        await validateAdminSession(restaurantId, sessionId);

        // Validate server data
        if (!server || !server.name) {
            errorHandler.badRequest('Server name is required', {
                details: 'server.name is required'
            });
        }

        if (!server.phoneNumber && !server.email) {
            errorHandler.badRequest('Either phone number or email is required', {
                details: 'server.phoneNumber or server.email is required for login'
            });
        }

        // Check for duplicate phone/email
        const serversRef = db.collection('restaurants').doc(restaurantId).collection('servers');

        if (server.phoneNumber) {
            const existingPhone = await serversRef.where('phoneNumber', '==', server.phoneNumber).limit(1).get();
            if (!existingPhone.empty) {
                errorHandler.badRequest('A server with this phone number already exists', {
                    phoneNumber: server.phoneNumber
                });
            }
        }

        if (server.email) {
            const existingEmail = await serversRef.where('email', '==', server.email).limit(1).get();
            if (!existingEmail.empty) {
                errorHandler.badRequest('A server with this email already exists', {
                    email: server.email
                });
            }
        }

        // Generate a PIN if not provided
        const pin = server.password || generatePIN(4);

        // Create server document
        const serverData = {
            name: server.name,
            phoneNumber: server.phoneNumber || '',
            email: server.email || '',
            role: server.role || SERVER_ROLES.SERVER,
            status: SERVER_STATUS.ACTIVE,
            password: pin, // TODO: Hash password in production
            profileImageUrl: server.profileImageUrl || '',
            createdAt: timestamp.serverTimestamp(),
            updatedAt: timestamp.serverTimestamp(),
        };

        const newServerRef = await serversRef.add(serverData);

        return ResponseBuilder.success({
            serverId: newServerRef.id,
            name: serverData.name,
            phoneNumber: serverData.phoneNumber,
            email: serverData.email,
            role: serverData.role,
            status: serverData.status,
            pin: pin, // Return PIN so admin can share it with server
        }, 'Server added successfully');

    } catch (error) {
        console.error('Error in addServer:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to add server', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

/**
 * Update an existing server
 */
exports.updateServer = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        const { restaurantId, sessionId, serverId, updateData } = data;

        // Validate admin session
        await validateAdminSession(restaurantId, sessionId);

        if (!serverId) {
            errorHandler.badRequest('Server ID is required', {
                details: 'serverId is required'
            });
        }

        // Get existing server
        const serverRef = db.collection('restaurants').doc(restaurantId).collection('servers').doc(serverId);
        const serverDoc = await serverRef.get();

        if (!serverDoc.exists) {
            errorHandler.notFound('Server not found', { serverId });
        }

        // Build update object
        const updates = {
            updatedAt: timestamp.serverTimestamp(),
        };

        if (updateData.name !== undefined) {
            updates.name = updateData.name;
        }

        if (updateData.phoneNumber !== undefined) {
            // Check for duplicates
            if (updateData.phoneNumber) {
                const existingPhone = await db.collection('restaurants')
                    .doc(restaurantId)
                    .collection('servers')
                    .where('phoneNumber', '==', updateData.phoneNumber)
                    .limit(1)
                    .get();

                if (!existingPhone.empty && existingPhone.docs[0].id !== serverId) {
                    errorHandler.badRequest('A server with this phone number already exists', {
                        phoneNumber: updateData.phoneNumber
                    });
                }
            }
            updates.phoneNumber = updateData.phoneNumber;
        }

        if (updateData.email !== undefined) {
            // Check for duplicates
            if (updateData.email) {
                const existingEmail = await db.collection('restaurants')
                    .doc(restaurantId)
                    .collection('servers')
                    .where('email', '==', updateData.email)
                    .limit(1)
                    .get();

                if (!existingEmail.empty && existingEmail.docs[0].id !== serverId) {
                    errorHandler.badRequest('A server with this email already exists', {
                        email: updateData.email
                    });
                }
            }
            updates.email = updateData.email;
        }

        if (updateData.role !== undefined) {
            updates.role = updateData.role;
        }

        if (updateData.status !== undefined) {
            updates.status = updateData.status;
        }

        if (updateData.profileImageUrl !== undefined) {
            updates.profileImageUrl = updateData.profileImageUrl;
        }

        // Update server
        await serverRef.update(updates);

        return ResponseBuilder.success({
            serverId,
            updated: true
        }, 'Server updated successfully');

    } catch (error) {
        console.error('Error in updateServer:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to update server', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

/**
 * Reset server PIN
 */
exports.resetServerPin = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data', {
                details: 'Request must include a data object'
            });
        }

        data = request.data;
        const { restaurantId, sessionId, serverId, newPin } = data;

        // Validate admin session
        await validateAdminSession(restaurantId, sessionId);

        if (!serverId) {
            errorHandler.badRequest('Server ID is required', {
                details: 'serverId is required'
            });
        }

        // Get existing server
        const serverRef = db.collection('restaurants').doc(restaurantId).collection('servers').doc(serverId);
        const serverDoc = await serverRef.get();

        if (!serverDoc.exists) {
            errorHandler.notFound('Server not found', { serverId });
        }

        // Generate new PIN or use provided one
        const pin = newPin || generatePIN(4);

        // Update password
        await serverRef.update({
            password: pin, // TODO: Hash password in production
            updatedAt: timestamp.serverTimestamp(),
        });

        return ResponseBuilder.success({
            serverId,
            newPin: pin
        }, 'Server PIN reset successfully');

    } catch (error) {
        console.error('Error in resetServerPin:', error);
        if (error.httpErrorCode) {
            throw error;
        }
        errorHandler.internalError('Failed to reset server PIN', {
            error: error.message,
            restaurantId: data?.restaurantId
        });
    }
});

module.exports = {
    getServers: exports.getServers,
    addServer: exports.addServer,
    updateServer: exports.updateServer,
    resetServerPin: exports.resetServerPin,
    SERVER_ROLES,
};
