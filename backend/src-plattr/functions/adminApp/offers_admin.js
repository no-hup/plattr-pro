/**
 * Offers Admin — CRUD endpoints for restaurant owners (Offers V2)
 *
 * Admin app uses these to manage offers. Consumer-facing endpoints live in
 * `../offers/` and only do READ + evaluation — no creation / update / delete.
 */

const functions = require('firebase-functions');
const { db } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const ResponseBuilder = require('../utils/ResponseBuilder');
const { validateAdminSession } = require('./auth');

const paymentsConfigFrom = require('../lib/domain/payments').configFrom;

const VALID_OFFER_TYPES = ['PERCENTAGE', 'FLAT', 'BOGO'];

// DECISION(A26, 2026-09-26): an offer date means midnight to midnight in the restaurant's clock. The admin sends days
// ("2026-09-26"); we store the instants with the zone written in, "2026-09-26T00:00:00.000+05:30" to
// "2026-09-30T23:59:59.999+05:30", so "until 30 Sep" keeps the 30th's lunch and dinner and every reader
// (offers/offerEngine.js, the MockData7 evaluator, the admin editor) reads one unambiguous value. A one-day offer is
// start = end. The clock is the restaurant's `payments.timezoneOffsetMinutes` (PY's key, default 330).
// If you change this, ask Shaurya first.
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
function isDay(s) {
    const m = typeof s === 'string' && DAY.exec(s);
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
function zone(minutes) {
    const a = Math.abs(minutes);
    return `${minutes < 0 ? '-' : '+'}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
/** Days "YYYY-MM-DD" to the stored window: 00:00 of the first day to the last millisecond of the last, in `tzOffsetMinutes`. */
function offerWindow(startDay, endDay, tzOffsetMinutes) {
    if (!isDay(startDay) || !isDay(endDay)) {
        errorHandler.badRequest('Offer dates must be days, YYYY-MM-DD', { startDay, endDay });
    }
    if (endDay < startDay) {
        errorHandler.badRequest('The offer end date is before the start date', { startDay, endDay });
    }
    // A clock setting outside ±14 h would write a zone no reader parses, and the offer would save but never apply.
    if (!Number.isInteger(tzOffsetMinutes) || Math.abs(tzOffsetMinutes) > 14 * 60) {
        errorHandler.preconditionFailed(`The restaurant clock (payments.timezoneOffsetMinutes = ${tzOffsetMinutes}) is not a real offset`);
    }
    const z = zone(tzOffsetMinutes);
    return { startDate: `${startDay}T00:00:00.000${z}`, endDate: `${endDay}T23:59:59.999${z}` };
}

/** The restaurant's clock, read from its settings the way payments reads it (a missing key is the 330 default). */
async function restaurantOffsetMinutes(restaurantId) {
    const snap = await db.collection('restaurants').doc(restaurantId).collection('config').doc('settings').get();
    return paymentsConfigFrom(snap.exists ? snap.data() : undefined).config.timezoneOffsetMinutes;
}
const VALID_OFFER_SCOPES = ['ORDER', 'CATEGORY', 'ITEM'];

/**
 * Normalize and validate an offer payload coming from the admin app.
 * Throws via errorHandler on invalid input.
 *
 * @param {Object} payload   - Raw offerData from the request
 * @param {boolean} isUpdate - If true, allow partial payloads (no required-field check)
 * @returns {Object} Cleaned offer data ready to write to Firestore
 */
function validateAndNormalizeOffer(payload, isUpdate, tzOffsetMinutes, keepStoredValidity = false) {
    if (!payload || typeof payload !== 'object') {
        errorHandler.badRequest('Offer data is required');
    }

    const normalized = {};

    // title
    if (!isUpdate || payload.title !== undefined) {
        if (!payload.title || typeof payload.title !== 'string' || payload.title.trim() === '') {
            errorHandler.badRequest('Offer title is required');
        }
        normalized.title = payload.title.trim();
    }

    // description
    if (!isUpdate || payload.description !== undefined) {
        if (!payload.description || typeof payload.description !== 'string') {
            errorHandler.badRequest('Offer description is required');
        }
        normalized.description = payload.description.trim();
    }

    // type
    if (!isUpdate || payload.type !== undefined) {
        if (!VALID_OFFER_TYPES.includes(payload.type)) {
            errorHandler.badRequest(
                `Invalid offer type. Must be one of: ${VALID_OFFER_TYPES.join(', ')}`
            );
        }
        normalized.type = payload.type;
    }

    // scope
    if (!isUpdate || payload.scope !== undefined) {
        if (!VALID_OFFER_SCOPES.includes(payload.scope)) {
            errorHandler.badRequest(
                `Invalid offer scope. Must be one of: ${VALID_OFFER_SCOPES.join(', ')}`
            );
        }
        normalized.scope = payload.scope;
    }

    // targetIds — required for CATEGORY / ITEM scope
    if (payload.targetIds !== undefined) {
        if (!Array.isArray(payload.targetIds)) {
            errorHandler.badRequest('targetIds must be an array of strings');
        }
        normalized.targetIds = payload.targetIds.filter(Boolean);
    }
    const effectiveScope = normalized.scope !== undefined ? normalized.scope : undefined;
    if (!isUpdate && (effectiveScope === 'CATEGORY' || effectiveScope === 'ITEM')) {
        if (!normalized.targetIds || normalized.targetIds.length === 0) {
            errorHandler.badRequest(
                `targetIds is required and must be non-empty for ${effectiveScope} scope`
            );
        }
    }

    // exclusionIds (optional)
    if (payload.exclusionIds !== undefined) {
        if (!Array.isArray(payload.exclusionIds)) {
            errorHandler.badRequest('exclusionIds must be an array of strings');
        }
        normalized.exclusionIds = payload.exclusionIds.filter(Boolean);
    }

    // benefit
    if (!isUpdate || payload.benefit !== undefined) {
        const benefit = payload.benefit || {};
        const cleanBenefit = {};

        const effectiveType = normalized.type !== undefined ? normalized.type : undefined;

        if (effectiveType === 'PERCENTAGE' || effectiveType === 'FLAT') {
            if (typeof benefit.value !== 'number' || benefit.value <= 0) {
                errorHandler.badRequest('benefit.value must be a positive number');
            }
            cleanBenefit.value = benefit.value;
            if (benefit.maxDiscount !== undefined) {
                if (typeof benefit.maxDiscount !== 'number' || benefit.maxDiscount < 0) {
                    errorHandler.badRequest('benefit.maxDiscount must be a non-negative number');
                }
                cleanBenefit.maxDiscount = benefit.maxDiscount;
            }
        } else if (effectiveType === 'BOGO') {
            if (typeof benefit.buyQuantity !== 'number' || benefit.buyQuantity < 1) {
                errorHandler.badRequest('benefit.buyQuantity is required and must be >= 1 for BOGO');
            }
            if (typeof benefit.getQuantity !== 'number' || benefit.getQuantity < 1) {
                errorHandler.badRequest('benefit.getQuantity is required and must be >= 1 for BOGO');
            }
            cleanBenefit.buyQuantity = benefit.buyQuantity;
            cleanBenefit.getQuantity = benefit.getQuantity;
            if (benefit.maxDiscount !== undefined) {
                cleanBenefit.maxDiscount = benefit.maxDiscount;
            }
        }
        normalized.benefit = cleanBenefit;
    }

    // conditions (optional)
    if (payload.conditions !== undefined) {
        const cond = payload.conditions || {};
        const cleanCond = {};
        if (cond.minOrderValue !== undefined) {
            if (typeof cond.minOrderValue !== 'number' || cond.minOrderValue < 0) {
                errorHandler.badRequest('conditions.minOrderValue must be a non-negative number');
            }
            cleanCond.minOrderValue = cond.minOrderValue;
        }
        if (cond.requiredItems !== undefined) {
            if (!Array.isArray(cond.requiredItems)) {
                errorHandler.badRequest('conditions.requiredItems must be an array');
            }
            cleanCond.requiredItems = cond.requiredItems;
        }
        normalized.conditions = cleanCond;
    }

    // validity
    if (!keepStoredValidity && (!isUpdate || payload.validity !== undefined)) {
        const validity = payload.validity || {};
        if (!validity.startDate) {
            errorHandler.badRequest('validity.startDate is required');
        }
        if (!validity.endDate) {
            errorHandler.badRequest('validity.endDate is required');
        }
        normalized.validity = offerWindow(validity.startDate, validity.endDate, tzOffsetMinutes);
    }

    // optional display / behavior fields
    if (payload.termsAndConditions !== undefined) {
        normalized.termsAndConditions = String(payload.termsAndConditions);
    }
    if (payload.imageUrl !== undefined) {
        normalized.imageUrl = String(payload.imageUrl);
    }
    if (payload.code !== undefined) {
        normalized.code = String(payload.code);
    }
    if (payload.priority !== undefined) {
        if (typeof payload.priority !== 'number') {
            errorHandler.badRequest('priority must be a number');
        }
        normalized.priority = payload.priority;
    }
    if (payload.isActive !== undefined) {
        normalized.isActive = Boolean(payload.isActive);
    }

    return normalized;
}

/**
 * Get all offers for a restaurant (active + inactive), sorted by createdAt desc.
 */
exports.getOffers = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data');
        }
        data = request.data;
        const { restaurantId, sessionId } = data;
        await validateAdminSession(restaurantId, sessionId);

        const snapshot = await db
            .collection('restaurants').doc(restaurantId)
            .collection('offers')
            .get();

        const offers = [];
        snapshot.forEach(doc => {
            const o = doc.data();
            // Skip documents that were soft-deleted unless admin wants them (not in MVP)
            if (o.deletedAt) return;
            offers.push({
                id: doc.id,
                ...o,
                createdAt: o.createdAt ? timestamp.toISOString(o.createdAt) : null,
                updatedAt: o.updatedAt ? timestamp.toISOString(o.updatedAt) : null,
            });
        });

        // Sort by createdAt desc (recent first)
        offers.sort((a, b) => {
            const tA = a.createdAt || '';
            const tB = b.createdAt || '';
            return tB.localeCompare(tA);
        });

        return ResponseBuilder.success(
            { restaurantId, offers, count: offers.length },
            'Offers retrieved successfully'
        );
    } catch (error) {
        console.error('Error in getOffers:', error);
        if (error.httpErrorCode) throw error;
        errorHandler.internalError('Failed to retrieve offers', {
            error: error.message,
            restaurantId: data?.restaurantId,
        });
    }
});

/**
 * Create a new offer.
 */
exports.createOffer = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data');
        }
        data = request.data;
        const { restaurantId, sessionId, offerData } = data;
        await validateAdminSession(restaurantId, sessionId);

        const normalized = validateAndNormalizeOffer(offerData, /* isUpdate */ false, await restaurantOffsetMinutes(restaurantId));
        const toStore = {
            ...normalized,
            isActive: normalized.isActive !== undefined ? normalized.isActive : true,
            createdAt: timestamp.serverTimestamp(),
            updatedAt: timestamp.serverTimestamp(),
        };

        const offersRef = db
            .collection('restaurants').doc(restaurantId)
            .collection('offers');
        const newDocRef = await offersRef.add(toStore);

        return ResponseBuilder.success(
            { offerId: newDocRef.id, offer: { id: newDocRef.id, ...normalized } },
            'Offer created successfully'
        );
    } catch (error) {
        console.error('Error in createOffer:', error);
        if (error.httpErrorCode) throw error;
        errorHandler.internalError('Failed to create offer', {
            error: error.message,
            restaurantId: data?.restaurantId,
        });
    }
});

/**
 * Update an existing offer (partial).
 */
exports.updateOffer = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data');
        }
        data = request.data;
        const { restaurantId, sessionId, offerId, offerData } = data;
        await validateAdminSession(restaurantId, sessionId);

        if (!offerId) errorHandler.badRequest('offerId is required');

        const offerRef = db
            .collection('restaurants').doc(restaurantId)
            .collection('offers').doc(offerId);
        const offerDoc = await offerRef.get();
        if (!offerDoc.exists) errorHandler.notFound('Offer not found', { offerId });

        // For updates, if the caller changes type or scope, we need to
        // re-validate the full payload. Merge existing + incoming and validate.
        const merged = { ...offerDoc.data(), ...offerData };
        // An edit that does not send dates keeps the stored window as it is (it is already instants, not days).
        const normalized = validateAndNormalizeOffer(merged, /* isUpdate */ false, await restaurantOffsetMinutes(restaurantId), offerData?.validity === undefined);

        const updates = {
            ...normalized,
            updatedAt: timestamp.serverTimestamp(),
        };

        await offerRef.update(updates);

        return ResponseBuilder.success(
            { offerId, offer: { id: offerId, ...normalized } },
            'Offer updated successfully'
        );
    } catch (error) {
        console.error('Error in updateOffer:', error);
        if (error.httpErrorCode) throw error;
        errorHandler.internalError('Failed to update offer', {
            error: error.message,
            restaurantId: data?.restaurantId,
        });
    }
});

/**
 * Soft-delete an offer (sets isActive=false and deletedAt timestamp).
 */
exports.deleteOffer = functions.https.onCall(async (request, context) => {
    let data;
    try {
        if (!request?.data) {
            errorHandler.badRequest('Invalid request format - missing data');
        }
        data = request.data;
        const { restaurantId, sessionId, offerId } = data;
        await validateAdminSession(restaurantId, sessionId);

        if (!offerId) errorHandler.badRequest('offerId is required');

        const offerRef = db
            .collection('restaurants').doc(restaurantId)
            .collection('offers').doc(offerId);
        const offerDoc = await offerRef.get();
        if (!offerDoc.exists) errorHandler.notFound('Offer not found', { offerId });

        await offerRef.update({
            isActive: false,
            deletedAt: timestamp.serverTimestamp(),
            updatedAt: timestamp.serverTimestamp(),
        });

        return ResponseBuilder.success(
            { offerId, deleted: true },
            'Offer deleted successfully'
        );
    } catch (error) {
        console.error('Error in deleteOffer:', error);
        if (error.httpErrorCode) throw error;
        errorHandler.internalError('Failed to delete offer', {
            error: error.message,
            restaurantId: data?.restaurantId,
        });
    }
});

module.exports = {
    getOffers: exports.getOffers,
    createOffer: exports.createOffer,
    updateOffer: exports.updateOffer,
    deleteOffer: exports.deleteOffer,
    offerWindow,
};
