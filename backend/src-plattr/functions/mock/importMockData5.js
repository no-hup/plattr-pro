// 🕒 CODING AGENT NOTE: Before running this script, ensure timestamp-related fields in MockData5EndToEndTesting.json
// are updated to relative values near the "current local time" if your logic depends on elapsed time or validity.
// Fields to check:
// - restaurants.res_e2e_all_on.orders[].*.createdAt / updatedAt (Timestamp format: {_seconds, _nanoseconds})
// - restaurants.res_e2e_all_on.carts[].*.submittedAt / checkoutTime (ISO String or Timestamp)
// - restaurants.res_e2e_all_on.offers[].*.validity.endDate (Must be in the future)
// Failing to update these may cause orders to appear "3 years ago" or offers to be "expired" in the UI.
//
// Usage:
//   node importMockData5.js                       # import with merge (original behavior)
//   node importMockData5.js --clean               # DELETE all emulator data first, then import
//   node importMockData5.js --refresh-timestamps   # offset all _seconds to (now - 10 min)
//   node importMockData5.js --clean --refresh-timestamps  # both

// Set emulator environment variables BEFORE importing admin
const environment = require('../singleton/Environment');
environment.configureEnvironment(false);
const { admin, db, FieldValue, Timestamp } = require('../admin/admin');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');
const shouldRefreshTimestamps = args.includes('--refresh-timestamps');

// Read the new mock data
const mockDataPath = path.join(__dirname, 'MockData5EndToEndTesting.json');
console.log('Loading mock data (v5) from:', mockDataPath);
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
console.log('Mock data (v5) loaded successfully');

/**
 * If --refresh-timestamps is set, walk the raw JSON and offset all
 * { _seconds, _nanoseconds } objects to (now - 600) seconds so the
 * data looks recent.
 */
function refreshTimestamps(data) {
    if (!data || typeof data !== 'object') return data;
    const nowSeconds = Math.floor(Date.now() / 1000) - 600; // 10 min ago

    const result = Array.isArray(data) ? [...data] : { ...data };
    for (const key in result) {
        const value = result[key];
        if (value && typeof value === 'object') {
            if (value._seconds !== undefined && value._nanoseconds !== undefined) {
                result[key] = { _seconds: nowSeconds, _nanoseconds: 0 };
            } else {
                result[key] = refreshTimestamps(value);
            }
        }
    }
    return result;
}

if (shouldRefreshTimestamps) {
    console.log('Refreshing timestamps to (now - 10 min)...');
    if (mockData.restaurants) {
        for (const rid of Object.keys(mockData.restaurants)) {
            mockData.restaurants[rid] = refreshTimestamps(mockData.restaurants[rid]);
        }
    }
    if (mockData.customers) {
        mockData.customers = refreshTimestamps(mockData.customers);
    }
}

function transformData(data) {
    if (!data || typeof data !== 'object') return data;
    const result = Array.isArray(data) ? [...data] : { ...data };
    for (const key in result) {
        const value = result[key];
        if (key === 'location' && value && value._latitude !== undefined && value._longitude !== undefined) {
            result[key] = new admin.firestore.GeoPoint(value._latitude, value._longitude);
            continue;
        }
        if (value && value._seconds !== undefined && value._nanoseconds !== undefined) {
            result[key] = new admin.firestore.Timestamp(value._seconds, value._nanoseconds);
            continue;
        }
        if (value && typeof value === 'object') {
            result[key] = transformData(value);
        }
    }
    return result;
}

/**
 * Delete all documents in the Firestore emulator via the REST API.
 */
async function clearEmulatorData() {
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    const projectId = 'rms-app-dd875';
    const url = `http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
    console.log(`Clearing all emulator data via DELETE ${url}...`);
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) {
        throw new Error(`Failed to clear emulator data: ${resp.status} ${resp.statusText}`);
    }
    console.log('Emulator data cleared successfully');
}

async function importData() {
    try {
        if (shouldClean) {
            await clearEmulatorData();
        }

        for (const [restaurantId, restaurantData] of Object.entries(mockData.restaurants)) {
            console.log(`Importing restaurant (v5): ${restaurantId}`);
            try {
                const transformedInfo = transformData(restaurantData.info);
                const restaurantRef = db.collection('restaurants').doc(restaurantId);
                await restaurantRef.set(transformedInfo, { merge: true });

                const subCollections = ['menus', 'subcategories', 'menuItems', 'categories', 'variants', 'tables', 'servers', 'orders', 'addons', 'kitchens', 'sessions', 'carts', 'offers'];
                for (const subCollection of subCollections) {
                    if (!restaurantData[subCollection]) continue;
                    const subCollectionRef = restaurantRef.collection(subCollection);
                    if (Array.isArray(restaurantData[subCollection])) {
                        for (const item of restaurantData[subCollection]) {
                            const docId = item.id || `${subCollection}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                            const transformedItem = transformData(item);
                            await subCollectionRef.doc(docId).set(transformedItem, { merge: true });
                        }
                    } else {
                        for (const [docId, docData] of Object.entries(restaurantData[subCollection])) {
                            const transformedDocData = transformData(docData);
                            await subCollectionRef.doc(docId).set(transformedDocData, { merge: true });
                        }
                    }
                }
            } catch (err) {
                console.error(`Error importing restaurant (v5) ${restaurantId}:`, err);
            }
        }

        if (mockData.customers) {
            console.log('Importing customers (v5)...');
            for (const [customerId, customerData] of Object.entries(mockData.customers)) {
                try {
                    const transformedCustomerData = transformData(customerData);
                    await db.collection('customers').doc(customerId).set(transformedCustomerData, { merge: true });
                } catch (err) {
                    console.error(`Error importing customer (v5) ${customerId}:`, err);
                }
            }
        }

        console.log('Data (v5) import completed successfully');
    } catch (error) {
        console.error('Error importing data (v5):', error);
        throw error;
    }
}

importData().catch(console.error);
