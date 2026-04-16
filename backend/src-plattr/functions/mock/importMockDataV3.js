// Force emulator environment before importing admin/singletons.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FUNCTIONS_EMULATOR = 'true';
process.env.NODE_ENV = 'development';

const environment = require('../singleton/Environment');
environment.configureEnvironment(false);
const { admin, db } = require('../admin/admin');
const fs = require('fs');
const path = require('path');

// IMPORTANT: mockDataV3.json uses near-now timestamps for served cart visibility.
// Update the timestamps (createdAt/updatedAt/statusHistory) in mockDataV3.json before re-importing if the data gets stale.
const mockDataPath = path.join(__dirname, 'mockDataV3.json');
console.log('Loading mock data (v3) from:', mockDataPath);
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
console.log('Mock data (v3) loaded successfully');

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

async function importData() {
  try {
    for (const [restaurantId, restaurantData] of Object.entries(mockData.restaurants)) {
      console.log(`Importing restaurant (v3): ${restaurantId}`);
      try {
        const transformedInfo = transformData(restaurantData.info);
        const restaurantRef = db.collection('restaurants').doc(restaurantId);
        await restaurantRef.set(transformedInfo, { merge: true });

        const subCollections = [
          'menus',
          'subcategories',
          'menuItems',
          'categories',
          'variants',
          'tables',
          'servers',
          'orders',
          'addons',
          'kitchens',
          'sessions',
          'carts'
        ];
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
        console.error(`Error importing restaurant (v3) ${restaurantId}:`, err);
      }
    }

    if (mockData.customers) {
      console.log('Importing customers (v3)...');
      for (const [customerId, customerData] of Object.entries(mockData.customers)) {
        try {
          const transformedCustomerData = transformData(customerData);
          await db.collection('customers').doc(customerId).set(transformedCustomerData, { merge: true });
        } catch (err) {
          console.error(`Error importing customer (v3) ${customerId}:`, err);
        }
      }
    }

    console.log('Data (v3) import completed successfully');
  } catch (error) {
    console.error('Error importing data (v3):', error);
    throw error;
  }
}

importData().catch(console.error);
