// Set emulator environment variables BEFORE importing admin
const environment = require('../singleton/Environment');
environment.configureEnvironment(false);
const { admin, db, FieldValue, Timestamp } = require('../admin/admin');
const fs = require('fs');
const path = require('path');

// Read the mock data V2 using the correct path
const mockDataPath = path.join(__dirname, 'mockDataV2.json');
console.log('Loading mock data (v2) from:', mockDataPath);
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
console.log('Mock data (v2) loaded successfully');

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
      console.log(`Importing restaurant (v2): ${restaurantId}`);
      try {
        const transformedInfo = transformData(restaurantData.info);
        const restaurantRef = db.collection('restaurants').doc(restaurantId);
        await restaurantRef.set(transformedInfo, { merge: true });

        const subCollections = ['menuItems', 'categories', 'variants', 'tables', 'servers', 'orders', 'addons', 'kitchens', 'sessions', 'carts'];
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
        console.error(`Error importing restaurant (v2) ${restaurantId}:`, err);
      }
    }

    if (mockData.customers) {
      console.log('Importing customers (v2)...');
      for (const [customerId, customerData] of Object.entries(mockData.customers)) {
        try {
          const transformedCustomerData = transformData(customerData);
          await db.collection('customers').doc(customerId).set(transformedCustomerData, { merge: true });
        } catch (err) {
          console.error(`Error importing customer (v2) ${customerId}:`, err);
        }
      }
    }

    console.log('Data (v2) import completed successfully');
  } catch (error) {
    console.error('Error importing data (v2):', error);
    throw error;
  }
}

importData().catch(console.error);



