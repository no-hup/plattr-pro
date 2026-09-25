const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const ResponseBuilder = require('../utils/ResponseBuilder');
const { SERVER_STATUS } = require('../server/serverEnums');
const { validateAdminSession, SERVER_ROLES } = require('./auth');
const { hashPassword } = require('../utils/passwordUtils');
const { auditRow } = require('../lib/domain/approvals');

// DECISION(TD-139, 2026-09-26): only an ADMIN gives or takes the ADMIN or MANAGER role; nobody changes their own
// role; every role given (a change, or a new staff member) writes one audit row in the same transaction. The cashier's
// till@ login is a MANAGER and could make itself ADMIN, which put every owner-only rule one tap from the person it
// controls. Taking a role is the same power as giving it, so a manager cannot demote the owner either.
// If you change this, ask Shaurya first.
const OWNER_ROLES = [SERVER_ROLES.ADMIN, SERVER_ROLES.MANAGER];

/** Why this caller may not give `toRole` to this staff member (targetId null = a new one), or null when allowed. */
function roleChangeRefusal({ callerRole, callerId, targetId, fromRole, toRole }) {
    if (fromRole === toRole) return null;
    if (targetId && callerId === targetId) return 'Nobody can change their own role';
    if (callerRole !== SERVER_ROLES.ADMIN && (OWNER_ROLES.includes(toRole) || OWNER_ROLES.includes(fromRole))) {
        return 'Only an Admin can give or take the Admin or Manager role';
    }
    return null;
}

// DECISION(TD-147, 2026-09-26): only an ADMIN changes an ADMIN's or MANAGER's staff card: name, phone, email, status
// or PIN, a manager's own card included. till@ (a MANAGER) could reset the owner's PIN and was shown it, and the owner's
// PIN approves everything SPEC_ST guards. Every change to a card writes an audit row in the same transaction as the
// write. There is no delete endpoint; a card is switched inactive, which is this same rule. If you change this, ask Shaurya first.
function cardEditRefusal({ callerRole, targetRole }) {
    return callerRole !== SERVER_ROLES.ADMIN && OWNER_ROLES.includes(targetRole) ? 'Only an Admin can change an Admin or Manager card' : null;
}

/** Fail closed: an unknown role is refused, never stored. */
function checkRole(role) {
    if (!Object.values(SERVER_ROLES).includes(role)) {
        errorHandler.badRequest(`Unknown role "${role}"`, { role });
    }
}

function staffAuditRow(callerId, serverId, action, before, after) {
    return { ...auditRow({ ts: Date.now(), cid: `staff_${serverId}`, action, staffId: callerId, sev: 'P1',
        reason: action, note: null, lineId: null, before, after }), createdAt: timestamp.serverTimestamp() };
}

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

        const { serverData: caller, serverId: callerId } = await validateAdminSession(restaurantId, sessionId);

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

        const role = server.role || SERVER_ROLES.SERVER;
        checkRole(role);
        const refusal = roleChangeRefusal({ callerRole: caller.role, callerId, targetId: null, fromRole: null, toRole: role });
        if (refusal) errorHandler.forbidden(refusal, { restaurantId, role });

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

        // Two secrets, each hashed (TD-041): the login password and the approval PIN. Both are
        // returned in plain text once, below, so the admin can hand them over; never stored plain.
        const password = server.password || generatePIN(6);
        const pin = server.pin || generatePIN(4);
        const [hashedPassword, hashedPin] = await Promise.all([hashPassword(password), hashPassword(pin)]);

        // Create server document
        const serverData = {
            name: server.name,
            phoneNumber: server.phoneNumber || '',
            email: server.email || '',
            role,
            status: SERVER_STATUS.ACTIVE,
            password: hashedPassword,
            pinHash: hashedPin,
            profileImageUrl: server.profileImageUrl || '',
            createdAt: timestamp.serverTimestamp(),
            updatedAt: timestamp.serverTimestamp(),
        };

        const newServerRef = serversRef.doc();
        await db.runTransaction(async tx => {
            tx.create(newServerRef, serverData);
            tx.create(db.collection('restaurants').doc(restaurantId).collection('audit').doc(), staffAuditRow(callerId, newServerRef.id, 'staffRoleChange', null, { role }));
        });
        console.log(JSON.stringify({ cid: `staff_${newServerRef.id}`, action: 'staffRoleChange', restaurantId, staffId: callerId, from: null, to: role }));

        return ResponseBuilder.success({
            serverId: newServerRef.id,
            name: serverData.name,
            phoneNumber: serverData.phoneNumber,
            email: serverData.email,
            role: serverData.role,
            status: serverData.status,
            pin, // Return PIN so admin can share it with server
            password, // and the login password, once
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

        const { serverData: caller, serverId: callerId } = await validateAdminSession(restaurantId, sessionId);

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

        if (updateData.role !== undefined) checkRole(updateData.role);

        if (updateData.status !== undefined) {
            updates.status = updateData.status;
        }

        if (updateData.profileImageUrl !== undefined) {
            updates.profileImageUrl = updateData.profileImageUrl;
        }

        // The card is read in the same transaction that writes it, so two edits at once cannot both pass on a stale role.
        const { action, before, after } = await db.runTransaction(async tx => {
            const current = (await tx.get(serverRef)).data();
            const roleChanged = updateData.role !== undefined && updateData.role !== current.role;
            if (roleChanged) {
                const refusal = roleChangeRefusal({ callerRole: caller.role, callerId, targetId: serverId, fromRole: current.role, toRole: updateData.role });
                if (refusal) errorHandler.forbidden(refusal, { restaurantId, serverId, role: updateData.role });
                updates.role = updateData.role;
            }
            const cardRefusal = cardEditRefusal({ callerRole: caller.role, targetRole: current.role });
            if (cardRefusal) errorHandler.forbidden(cardRefusal, { restaurantId, serverId });
            const changed = Object.keys(updates).filter(k => k !== 'updatedAt' && updates[k] !== current[k]);
            const row = { action: roleChanged ? 'staffRoleChange' : 'staffCardChange',
                before: Object.fromEntries(changed.map(k => [k, current[k] ?? null])), after: Object.fromEntries(changed.map(k => [k, updates[k]])) };
            if (changed.length) tx.create(db.collection('restaurants').doc(restaurantId).collection('audit').doc(), staffAuditRow(callerId, serverId, row.action, row.before, row.after));
            tx.update(serverRef, updates);
            return changed.length ? row : {};
        });
        // Field names only: the audit row keeps the values, and phone numbers and emails stay out of the logs.
        if (action) console.log(JSON.stringify({ cid: `staff_${serverId}`, action, restaurantId, staffId: callerId, fields: Object.keys(after), role: after.role }));

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

        const { serverData: caller, serverId: callerId } = await validateAdminSession(restaurantId, sessionId);

        if (!serverId) {
            errorHandler.badRequest('Server ID is required', {
                details: 'serverId is required'
            });
        }

        // Generate new PIN or use provided one. The plain PIN is returned
        // once in the response; the stored value is always hashed, and never written to the audit row.
        const pin = newPin || generatePIN(4);
        const hashedPin = await hashPassword(pin);

        // TD-147: the card's role is read in the same transaction that writes the PIN and its audit row.
        const serverRef = db.collection('restaurants').doc(restaurantId).collection('servers').doc(serverId);
        await db.runTransaction(async tx => {
            const serverDoc = await tx.get(serverRef);
            if (!serverDoc.exists) errorHandler.notFound('Server not found', { serverId });
            const refusal = cardEditRefusal({ callerRole: caller.role, targetRole: serverDoc.data().role });
            if (refusal) errorHandler.forbidden(refusal, { restaurantId, serverId });
            // Update the PIN only; the login password is untouched (TD-041)
            tx.update(serverRef, { pinHash: hashedPin, updatedAt: timestamp.serverTimestamp() });
            tx.create(db.collection('restaurants').doc(restaurantId).collection('audit').doc(), staffAuditRow(callerId, serverId, 'staffPinReset', null, null));
        });
        console.log(JSON.stringify({ cid: `staff_${serverId}`, action: 'staffPinReset', restaurantId, staffId: callerId }));

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
    roleChangeRefusal,
    cardEditRefusal,
};
