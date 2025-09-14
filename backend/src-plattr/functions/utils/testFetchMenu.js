const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDof-ULqXYgbRPs_-bVn2rwLQw1RybZZN4",
  authDomain: "rms-app-dd875.firebaseapp.com",
  projectId: "rms-app-dd875",
  storageBucket: "rms-app-dd875.appspot.com",
  messagingSenderId: "563584335869",
  appId: "1:563584335869:web:1234567890abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Get the fetchMenu function
const fetchMenu = httpsCallable(functions, 'menu-fetchMenu-fetchMenu');

// Test the function
async function testFetchMenu() {
  try {
    const result = await fetchMenu({
      restaurantId: 'rest001'
    });
    console.log('Menu:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testFetchMenu(); 