const { admin, FieldValue, Timestamp } = require('../admin/admin');

// Check if we're in a Firebase environment with proper initialization
const isFirebaseInitialized = (() => {
  try {
    // More robust check to ensure FieldValue.serverTimestamp is a function
    if (!admin || !admin.firestore || typeof FieldValue?.serverTimestamp !== 'function') {
      console.log('poopoo Firebase Admin SDK not properly initialized, using fallback timestamp methods');
      return false;
    }
    
    // Verify that serverTimestamp actually returns a value
    const testTimestamp = FieldValue.serverTimestamp();
    if (!testTimestamp) {
      console.log('poopoo FieldValue.serverTimestamp() returns undefined, using fallback timestamp methods');
      return false;
    }
    
    console.log('poopoo Firebase Admin SDK properly initialized, serverTimestamp is available');
    return true;
  } catch (e) {
    console.error('Error checking Firebase initialization:', e);
    return false;
  }
})();

// Create a wrapper for serverTimestamp to avoid errors
const getServerTimestamp = () => {
  try {
    if (isFirebaseInitialized) {
      const timestamp = FieldValue.serverTimestamp();
      if (!timestamp) {
        throw new Error('serverTimestamp returned undefined');
      }
      return timestamp;
    }
  } catch (e) {
    console.error('Error getting serverTimestamp:', e);
  }
  // Fallback if serverTimestamp isn't available
  console.log('poopoo Using fallback timestamp implementation');
  return { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
};

const timestamp = {
  /**
   * Returns the current server timestamp
   * @returns {Timestamp|number}
   */
  now: () => {
    try {
      if (isFirebaseInitialized) {
        return Timestamp.now();
      }
    } catch (e) {
      console.error('Error getting Timestamp.now():', e);
    }
    return Date.now();
  },

  /**
   * Returns a Firestore server timestamp that will be evaluated when the document is written
   * @returns {FieldValue|object}
   */
  serverTimestamp: () => {
    return getServerTimestamp();
  },

  /**
   * Converts a Date object to Firestore Timestamp
   * @param {Date} date - JavaScript Date object
   * @returns {Timestamp|Date|object}
   */
  fromDate: (date) => {
    try {
      if (isFirebaseInitialized) {
        return Timestamp.fromDate(date);
      }
    } catch (e) {
      console.error('Error in fromDate:', e);
    }
    // Return a raw timestamp-like object as fallback
    return { 
      _seconds: Math.floor(date.getTime() / 1000), 
      _nanoseconds: 0 
    };
  },

  /**
   * Returns timestamp for a specific date/time
   * @param {number} year 
   * @param {number} month - 0-11 (January is 0)
   * @param {number} day 
   * @param {number} [hours=0] 
   * @param {number} [minutes=0] 
   * @param {number} [seconds=0] 
   * @returns {Timestamp|Date|object}
   */
  fromDateTime: (year, month, day, hours = 0, minutes = 0, seconds = 0) => {
    const date = new Date(year, month, day, hours, minutes, seconds);
    try {
      if (isFirebaseInitialized) {
        return Timestamp.fromDate(date);
      }
    } catch (e) {
      console.error('Error in fromDateTime:', e);
    }
    // Return a raw timestamp-like object as fallback
    return { 
      _seconds: Math.floor(date.getTime() / 1000), 
      _nanoseconds: 0 
    };
  },

  /**
   * Safely converts a timestamp value to a Date
   * @param {*} timestamp - Timestamp value (could be Date, Firestore Timestamp, number, string, or raw timestamp object)
   * @returns {Date|null} JavaScript Date object or null if invalid
   */
  safeToDate: (timestamp) => {
    try {
      if (!timestamp) return null;
      
      // If it's already a JavaScript Date
      if (timestamp instanceof Date) return timestamp;
      
      // Handle raw Firestore timestamp with _seconds and _nanoseconds
      if (timestamp._seconds !== undefined && typeof timestamp._seconds === 'number') {
        return new Date(timestamp._seconds * 1000);
      }
      
      // If it's a Firestore Timestamp with toDate method
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      
      // If it's a string or number representing seconds or milliseconds
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        // Try parsing as a date string first
        const dateObj = new Date(timestamp);
        if (!isNaN(dateObj.getTime())) return dateObj;
        
        // If it's a number in seconds (Firestore stores as seconds)
        const seconds = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
        if (!isNaN(seconds)) {
          // Check if it's seconds (Unix timestamp) or milliseconds
          return new Date(seconds < 10000000000 ? seconds * 1000 : seconds);
        }
      }
      
      console.warn(`Unrecognized timestamp format: ${typeof timestamp}`, JSON.stringify(timestamp));
      return null;
    } catch (error) {
      console.error(`Error parsing timestamp: ${error.message}`);
      return null;
    }
  },
  
  /**
   * Creates an ISO date string from a timestamp value, with fallback to default expiry
   * @param {*} timestamp - Timestamp value to convert
   * @param {number} [defaultExpiryHours=4] - Default expiry hours if timestamp is invalid
   * @returns {string} ISO date string
   */
  toISOString: function(timestamp, defaultExpiryHours = 4) {
    try {
      const dateObj = this.safeToDate(timestamp);
      
      if (dateObj) {
        return dateObj.toISOString();
      } else {
        console.warn('Could not convert timestamp to date, using default expiry', timestamp);
        // Default to N hours from now if timestamp is invalid
        return new Date(Date.now() + (defaultExpiryHours * 60 * 60 * 1000)).toISOString();
      }
    } catch (error) {
      console.error(`Error converting timestamp to ISO string: ${error.message}`);
      return new Date(Date.now() + (defaultExpiryHours * 60 * 60 * 1000)).toISOString();
    }
  }
};

module.exports = timestamp;