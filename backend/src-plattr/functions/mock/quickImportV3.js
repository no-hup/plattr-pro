// 🕒 CODING AGENT NOTE: Before running this script, ensure timestamp-related fields in the mock JSON
// are updated to relative values near the "current local time" if your logic depends on elapsed time or validity.
// Fields to check:
// - orders/carts: createdAt, updatedAt, submittedAt (use current Unix seconds for {_seconds: ...})
// - offers: validity.endDate (must be in the future ISO string)
// - sessions: status should be 'active'

// Quick import script for emulator - no credentials needed
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize without credentials for emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
admin.initializeApp({ projectId: 'rms-app-dd875' });
const db = admin.firestore();

const mockDataPath = path.join(__dirname, 'mockDataV3.json');
console.log('Loading mock data from:', mockDataPath);
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
console.log('Loaded. Restaurants:', Object.keys(mockData.restaurants));

async function importData() {
    for (const [restaurantId, restaurantData] of Object.entries(mockData.restaurants)) {
        console.log('Importing restaurant:', restaurantId);
        const restaurantRef = db.collection('restaurants').doc(restaurantId);

        // Import restaurant info
        if (restaurantData.info) {
            await restaurantRef.set(restaurantData.info, { merge: true });
        }

        // Import subcollections
        const subCollections = ['menuItems', 'categories', 'subcategories', 'menus', 'variants', 'addons', 'kitchens', 'tables', 'sessions', 'servers', 'carts', 'orders'];
        for (const subCollection of subCollections) {
            if (!restaurantData[subCollection]) continue;
            console.log(`  - ${subCollection}`);
            const ref = restaurantRef.collection(subCollection);

            if (Array.isArray(restaurantData[subCollection])) {
                for (const item of restaurantData[subCollection]) {
                    const docId = item.id || `${subCollection}_${Date.now()}`;
                    await ref.doc(docId).set(item, { merge: true });
                }
            } else {
                for (const [docId, docData] of Object.entries(restaurantData[subCollection])) {
                    await ref.doc(docId).set(docData, { merge: true });
                }
            }
        }
    }

    // Import customers
    if (mockData.customers) {
        console.log('Importing customers...');
        for (const [customerId, customerData] of Object.entries(mockData.customers)) {
            await db.collection('customers').doc(customerId).set(customerData, { merge: true });
        }
    }

    console.log('✅ Import complete!');
}

importData().then(() => process.exit(0)).catch(e => { console.error('Error:', e); process.exit(1); });
