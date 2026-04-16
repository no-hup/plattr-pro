# Mock Data Directory

This directory contains mock data JSON files and import scripts for seeding the Firestore emulator.

## 📚 Important Guidelines

**BEFORE creating or modifying mock data, please read:**
👉 **[MOCK_DATA_LEARNING.md](MOCK_DATA_LEARNING.md)**

This document contains critical information about required schema fields (especially for Variants and Addons) that are necessary for the Flutter frontend to parse the data correctly.

## Available Data Sets

*   **`mockDataV2.json`**: The standard, comprehensive dataset.
*   **`mockDataV3.json`**: Updated dataset including Offers system.
*   **`MockData5EndToEndTesting.json`**: Minimal dataset for End-to-End manual testing (Created Jan 2026).
    *   Contains 3 restaurants with different feature flag configurations.
    *   2 Customers.
    *   Simple Menu (Burger, Pizza, etc.).

## How to Import
Use the `god-level-script` or run node scripts directly:

```bash
# God Mode (Recommended)
./backend/flutter-app-logs/god-level-script-to-run-everything.sh

# Manual Import
node backend/src-plattr/functions/mock/importMockData5.js
```
