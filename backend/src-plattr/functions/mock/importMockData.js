// Set emulator environment variables before importing admin
const environment = require('../singleton/Environment');
const { admin, db, FieldValue, Timestamp } = require('../admin/admin');
const fs = require('fs');
const path = require('path');

// Configure for emulator mode
environment.configureEnvironment(false);

// Read the mock data using the correct path
const mockDataPath = path.join(__dirname, 'mockData.json');
console.log('Loading mock data from:', mockDataPath);
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
console.log('Mock data loaded successfully');

// Helper function to transform data before saving
function transformData(data) {
  if (!data || typeof data !== 'object') return data;
  
  // Create a copy to avoid modifying the original
  const result = Array.isArray(data) ? [...data] : {...data};
  
  // Process each property
  for (const key in result) {
    const value = result[key];
    
    // Handle location objects with _latitude and _longitude
    if (key === 'location' && value && value._latitude !== undefined && value._longitude !== undefined) {
      result[key] = new admin.firestore.GeoPoint(value._latitude, value._longitude);
      continue;
    }
    
    // Handle timestamps
    if (value && value._seconds !== undefined && value._nanoseconds !== undefined) {
      result[key] = new admin.firestore.Timestamp(value._seconds, value._nanoseconds);
      continue;
    }
    
    // Recursively process nested objects and arrays
    if (value && typeof value === 'object') {
      result[key] = transformData(value);
    }
  }
  
  return result;
}

async function importData() {
  try {
    // Import restaurants
    for (const [restaurantId, restaurantData] of Object.entries(mockData.restaurants)) {
      console.log(`Importing restaurant: ${restaurantId}`);
      
      try {
        // Transform the data to handle special Firestore data types
        const transformedInfo = transformData(restaurantData.info);
        console.log('Transformed restaurant info:', JSON.stringify(transformedInfo, (key, value) => {
          if (value instanceof admin.firestore.GeoPoint) {
            return `GeoPoint(${value.latitude}, ${value.longitude})`;
          }
          if (value instanceof admin.firestore.Timestamp) {
            return `Timestamp(${value.seconds}, ${value.nanoseconds})`;
          }
          return value;
        }));
        
        // Create restaurants collection if it doesn't exist
        console.log('Creating restaurant document reference...');
        const restaurantRef = db.collection('restaurants').doc(restaurantId);
        
        console.log('Setting restaurant data...');
        await restaurantRef.set(transformedInfo, { merge: true });
        console.log(`Restaurant ${restaurantId} info imported successfully`);

        // Import sub-collections
        const subCollections = ['menuItems', 'categories', 'variants', 'tables', 'servers', 'orders', 'addons', 'kitchens', 'sessions', 'carts'];
        
        for (const subCollection of subCollections) {
          if (restaurantData[subCollection]) {
            console.log(`Processing ${subCollection} for restaurant ${restaurantId}...`);
            // Create sub-collection reference
            const subCollectionRef = restaurantRef.collection(subCollection);
            
            // Handle different data structures (objects vs arrays)
            if (Array.isArray(restaurantData[subCollection])) {
              // For array-based collections like carts and orders
              for (const item of restaurantData[subCollection]) {
                const docId = item.id || `${subCollection}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                console.log(`Importing ${subCollection} document: ${docId}`);
                const transformedItem = transformData(item);
                await subCollectionRef.doc(docId).set(transformedItem, { merge: true });
                console.log(`Imported ${subCollection} document: ${docId}`);
              }
            } else {
              // For object-based collections like menuItems, categories, etc.
              for (const [docId, docData] of Object.entries(restaurantData[subCollection])) {
                console.log(`Importing ${subCollection} document: ${docId}`);
                const transformedDocData = transformData(docData);
                await subCollectionRef.doc(docId).set(transformedDocData, { merge: true });
                console.log(`Imported ${subCollection} document: ${docId}`);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error importing restaurant ${restaurantId}:`, err);
      }
    }

    // Import customers
    if (mockData.customers) {
      console.log('Importing customers...');
      for (const [customerId, customerData] of Object.entries(mockData.customers)) {
        try {
          console.log(`Importing customer: ${customerId}`);
          const transformedCustomerData = transformData(customerData);
          await db.collection('customers').doc(customerId).set(transformedCustomerData, { merge: true });
          console.log(`Imported customer: ${customerId}`);
        } catch (err) {
          console.error(`Error importing customer ${customerId}:`, err);
        }
      }
    }

    console.log('Data import completed successfully');
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

importData().catch(console.error);

// Note: When using the Firebase Emulator, make sure to use the correct port!
// Second issue: The script was getting stuck when trying to connect to the Firestore emulator
// because it was looking for the emulator on port 8080, but it was actually running on port 8081.
// Make sure your FIRESTORE_EMULATOR_HOST environment variable matches the actual port your
// emulator is running on (check firebase.json or the emulator output to confirm).