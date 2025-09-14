/**
 * Script to scan the codebase for direct usage of FieldValue.serverTimestamp() 
 * and recommend replacements with timestamp.serverTimestamp()
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Regular expression to find FieldValue.serverTimestamp() usage
const fieldValueRegex = /FieldValue\.serverTimestamp\(\)/g;

// Directories to scan
const directoriesToScan = [
  'functions'
];

// Files to skip
const excludedPaths = [
  'node_modules',
  '.git',
  'testFirestore.js'
];

console.log('poopoo 🔍 Scanning for FieldValue.serverTimestamp() usage...');

exec(`grep -r "FieldValue\\.serverTimestamp()" --include="*.js" functions/`, (error, stdout, stderr) => {
  if (error && error.code !== 1) {
    console.error(`Error executing grep: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Grep stderr: ${stderr}`);
    return;
  }
  
  console.log('poopoo \n🔥 Found FieldValue.serverTimestamp() usage in these files:');
  
  if (!stdout.trim()) {
    console.log('poopoo ✅ No direct usage found. Your codebase is clean!');
    return;
  }
  
  // Parse grep results
  const results = stdout.trim().split('\n').map(line => {
    const [filePath, ...contentParts] = line.split(':');
    const content = contentParts.join(':').trim();
    return { filePath, content };
  });
  
  // Group by file path
  const fileGroups = {};
  results.forEach(({ filePath, content }) => {
    if (!fileGroups[filePath]) {
      fileGroups[filePath] = [];
    }
    fileGroups[filePath].push(content);
  });
  
  // Output findings with suggested fixes
  Object.entries(fileGroups).forEach(([filePath, occurrences]) => {
    console.log(`poopoo \n📄 ${filePath} (${occurrences.length} occurrences):`);
    
    // Check if file is already importing timestamp utility
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const hasTimestampImport = fileContent.includes('require(\'../utils/timestamp\')') || 
                               fileContent.includes('require("../utils/timestamp")');
                               
    if (!hasTimestampImport) {
      console.log('poopoo   ⚠️ Missing import: Add this import to the file:');
      console.log('poopoo   const timestamp = require(\'../utils/timestamp\');');
    }
    
    console.log('poopoo   🔄 Replace these occurrences:');
    occurrences.forEach((line, index) => {
      console.log(`poopoo   ${index + 1}. ${line} → replace with timestamp.serverTimestamp()`);
    });
  });
  
  console.log('poopoo \n✅ Recommendation: Replace direct FieldValue.serverTimestamp() calls with timestamp.serverTimestamp()');
  console.log('poopoo 📝 This ensures consistent handling of timestamps and provides fallbacks for emulator environments.');
}); 