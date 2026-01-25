# 🔥 Firebase Emulator Tips & Best Practices

> **Purpose**: Consolidated knowledge for running the Firebase emulator locally.  
> **Audience**: LLM agents and developers working on Plattr Pro.  
> **Last Updated**: 2025-12-18

---

## 📋 Quick Reference

| Need | Command / Location |
|------|-------------------|
| Start emulator | `cd backend/src-plattr && npm run emulators` |
| **Clean Logs for Agent** | `cd backend/src-plattr && mkdir -p ../firebase-debug-logs && > ../firebase-debug-logs/emulator.log && npm run emulators 2>&1 \| grep -vE "\[debug\]" \| tee ../firebase-debug-logs/emulator.log` |
| Import mock data | `cd backend/src-plattr/functions && node mock/quickImport.js` |
| Kill stuck ports | `lsof -t -i:8080 -i:5002 -i:4001 \| xargs kill -9` |
| Check if running | `curl -s http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants` |
| Service account | `backend/src-plattr/secure_stuff/service-account.json` |
| Mock data file | `backend/src-plattr/functions/mock/mockDataV2.json` |
| **Log Dir** | `backend/firebase-debug-logs/` |

---

## 🚀 1. Starting the Emulator

### Standard Start (Recommended)
```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
npm run emulators
```

This command:
1. Sets `GOOGLE_APPLICATION_CREDENTIALS`
2. Uses `firebase.temp.json` for dynamic ports
3. Starts Firestore + Functions emulators
4. Enables debug mode

### Manual Start (Alternative)
```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
export GOOGLE_APPLICATION_CREDENTIALS="./secure_stuff/service-account.json"
firebase emulators:start --only firestore,functions --debug
```

### 🤖 Agent-Friendly Logging (Recommended for Debugging)
To provide clean, network-focused logs for coding agents while still seeing everything in your terminal:

```bash
# Run this from backend/src-plattr - creates log directory and truncates log file before starting
mkdir -p ../firebase-debug-logs && \
> ../firebase-debug-logs/emulator.log && \
npm run emulators 2>&1 | grep -vE "\[debug\]|work-queue" | tee ../firebase-debug-logs/emulator.log
```

**What this does:**
1.  **`mkdir -p`**: Ensures the log folder exists at `backend/firebase-debug-logs/`.
2.  **`> emulator.log`**: Truncates the log file to zero bytes (creates it if it doesn't exist), ensuring a fresh start.
3.  **`2>&1`**: Redirects errors to the same stream as standard output.
4.  **`grep -vE`**: Filters out noisy `[debug]` and `work-queue` lines that clutter the logs.
5.  **`tee`**: Simultaneously shows the output in your terminal and writes it to `backend/firebase-debug-logs/emulator.log`.
6.  **Log file**: Emulator logs are saved to `backend/firebase-debug-logs/emulator.log`.

---

## 🔑 2. Google Application Credentials

⚠️ **CRITICAL**: You MUST set credentials before starting the emulator!

### Export Command (Run First)
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/secure_stuff/service-account.json"
```

### Why It's Needed
- Firebase Admin SDK requires credentials even in emulator mode
- Without this, functions fail silently or throw auth errors
- The service account file contains project credentials for API calls

### File Location
```
backend/src-plattr/secure_stuff/service-account.json
```

> ⚠️ This file is gitignored. If missing, ask the project owner for credentials.

---

## 🔌 3. Port Management

### Default Ports
| Service | Default Port | Config Location |
|---------|--------------|-----------------|
| Functions | 5002 | `firebase.json` → `emulators.functions.port` |
| Firestore | 8080 | `firebase.json` → `emulators.firestore.port` |
| Emulator UI | 4001 | `firebase.json` → `emulators.ui.port` |
| Logging | 4501 | `firebase.json` → `emulators.logging.port` |

### Port Conflict Resolution

**Symptom**: "Port already in use" error

**Solution 1**: Kill processes using the port
```bash
# Kill all common emulator ports
lsof -t -i:8080 -i:5002 -i:4001 -i:9000 -i:9099 -i:9199 -i:9090 | xargs kill -9
```

**Solution 2**: Use the preflight-ports script
```bash
cd backend/src-plattr
npm run preflight-ports
npm run emulators
```

This script (`functions/tests/preflight_ports.sh`):
1. Checks which ports are free
2. Creates `firebase.temp.json` with available ports
3. Writes port info to `tests/.env.ports`

**Solution 3**: Find what's using a port
```bash
# Find process on port 8080
lsof -i :8080

# Find process on port 5002
lsof -i :5002
```

---

## ✅ 4. Check If Emulator Is Already Running

Before starting a new emulator, **always check** if one is already running:

### Quick Health Check
```bash
# Check Functions emulator
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants
# Returns 200 if running, connection refused if not

# Check Firestore emulator
curl -s http://127.0.0.1:8080/ > /dev/null && echo "Firestore running" || echo "Not running"
```

### Check via Port
```bash
# If port 5002 is in use, functions emulator is likely running
lsof -i :5002 | grep node && echo "Functions emulator running"

# If port 8080 is in use, Firestore emulator is likely running  
lsof -i :8080 | grep java && echo "Firestore emulator running"
```

### Programmatic Check (for scripts)
```bash
if curl -s http://127.0.0.1:5002/rms-app-dd875/us-central1/table-validateTableAndLocation > /dev/null 2>&1; then
    echo "✓ Firebase emulator is running"
else
    echo "✗ Firebase emulator is NOT running"
fi
```

> **LLM Agent Rule**: Always check if an emulator is running before starting a new one. Starting a duplicate emulator will fail or cause port conflicts.

---

## 📦 5. Loading Mock Data

### Quick Import (Recommended for Development)
```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions
node mock/quickImport.js
```

This script (`quickImport.js`):
- Sets `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` automatically
- Doesn't require service account credentials
- Imports from `mockDataV2.json`

### Standard Import
```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
npm run import-mock
```

### Mock Data File Location
```
backend/src-plattr/functions/mock/mockDataV2.json
```

### What Gets Imported
- 5 restaurants with full data
- Menu items, categories, tables, sessions
- Test customers
- Sample orders

### Import with Firestore Data Snapshot
```bash
firebase emulators:start --only firestore,functions --import=./firestore-data --debug
```

---

## 🎯 6. Ensuring Local Emulator (Not Production)

### How Environment Detection Works

The `Environment.js` singleton detects emulator vs production:

```javascript
// From: backend/src-plattr/functions/singleton/Environment.js

_detectEmulator() {
    return process.env.NODE_ENV === 'development' || 
           process.env.FUNCTIONS_EMULATOR === 'true' ||
           !!process.env.FIRESTORE_EMULATOR_HOST;
}
```

### Ensure Emulator Mode

Set ANY of these environment variables:
```bash
export NODE_ENV=development
export FUNCTIONS_EMULATOR=true
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

### Verify You're NOT Hitting Production

Check the console output when functions run:
```
Environment mode: emulator
FIRESTORE_EMULATOR_HOST: 127.0.0.1:8080
FUNCTIONS_EMULATOR: true
NODE_ENV: development
```

If you see `Environment mode: production`, STOP immediately.

### Flutter Web Targeting Emulator

In Flutter, ensure you're calling:
```
http://127.0.0.1:5002/rms-app-dd875/us-central1/<function-name>
```

NOT:
```
https://us-central1-rms-app-dd875.cloudfunctions.net/<function-name>
```

---

## 🔧 7. Complete Start-to-Finish Workflow

### Step 1: Navigate to Backend
```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
```

### Step 2: Check If Emulator Already Running
```bash
curl -s http://127.0.0.1:5002/ > /dev/null && echo "Already running!" || echo "Not running, proceed"
```

### Step 3: Kill Any Stuck Ports (if needed)
```bash
lsof -t -i:8080 -i:5002 -i:4001 | xargs kill -9 2>/dev/null || true
```

### Step 4: Start Emulator
```bash
npm run emulators
```

### Step 5: Import Mock Data (in new terminal)
```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions
node mock/quickImport.js
```

### Step 6: Verify
```bash
curl http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants
```

---

## 🔍 8. Troubleshooting

### Issue: "Could not detect project"
```bash
# Solution: Always specify project ID
firebase emulators:start --project rms-app-dd875 --only firestore,functions
```

### Issue: "Port already in use"
```bash
# Solution: Kill the port
lsof -t -i:PORT_NUMBER | xargs kill -9
```

### Issue: Functions not loading
```bash
# Check if functions compiled
cd backend/src-plattr/functions
npm run build

# Check for syntax errors
npm run lint
```

## 🚨 Critical Troubleshooting Learnings (Avoid These Pitfalls)

### 1. Node.js Version Incompatibility
**Symptom**: `TypeError: Cannot read properties of undefined (reading 'prototype')` in `buffer-equal-constant-time` or similar unexpected crashes during startup.
**Cause**: Using bleeding-edge Node versions (e.g., v25+).
**Fix**: ALWAYS ensure you are using the LTS version defined in `engines` (currently v22 or v18).
```bash
# Check version
node -v 

# Switch to LTS if using nvm
nvm use 22
```

### 2. "Failed to parse build specification"
**Symptom**: Emulator starts but functions return `404` and logs show `Failed to parse build specification`.
**Cause**: `console.log` statements executing at the global scope (outside of functions) in `index.js`, `admin/admin.js`, or their imports. This pollutes the stdout that the emulator parser reads.
**Fix**: 
- Remove or comment out top-level `console.log` calls.
- Use `console.error` for debug logs if absolutely necessary (stderr is ignored by the parser).

### 3. Flutter Web "Method not found" / Exit Code 64
**Symptom**: `flutter run -d chrome` exits immediately with code 64.
**Cause**: Using deprecated flags like `--web-renderer html`.
**Fix**: Run the standard command without renderer flags unless specifically required by a recent flutter update.
```bash
flutter run -d chrome --verbose
```

### Issue: Mock data not appearing
```bash
# Verify FIRESTORE_EMULATOR_HOST is set
echo $FIRESTORE_EMULATOR_HOST

# Should output: 127.0.0.1:8080 or localhost:8080
# If empty, set it:
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

### Issue: "Auth error" or "Permission denied"
```bash
# Solution: Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/secure_stuff/service-account.json"
```

---

## 📁 Key File Paths

| Resource | Path |
|----------|------|
| Service Account | `backend/src-plattr/secure_stuff/service-account.json` |
| Firebase Config | `backend/src-plattr/firebase.json` |
| Temp Firebase Config | `backend/src-plattr/firebase.temp.json` (gitignored) |
| Mock Data V2 | `backend/src-plattr/functions/mock/mockDataV2.json` |
| Quick Import Script | `backend/src-plattr/functions/mock/quickImport.js` |
| Standard Import Script | `backend/src-plattr/functions/mock/importMockData.js` |
| Environment Singleton | `backend/src-plattr/functions/singleton/Environment.js` |
| Preflight Ports Script | `backend/src-plattr/functions/tests/preflight_ports.sh` |
| Package Scripts | `backend/src-plattr/package.json` |

---

## 🤖 LLM Agent Checklist

Before running any Firebase emulator commands, LLM agents should:

- [ ] **Check if emulator already running**: `curl -s http://127.0.0.1:5002/` 
- [ ] **If not running**, start with clean logs from `backend/src-plattr`: `mkdir -p ../firebase-debug-logs && > ../firebase-debug-logs/emulator.log && npm run emulators 2>&1 | grep -vE "\[debug\]" | tee ../firebase-debug-logs/emulator.log`
- [ ] **If port conflict**, kill ports: `lsof -t -i:8080 -i:5002 | xargs kill -9`
- [ ] **Import mock data** (if needed): `node functions/mock/quickImport.js`
- [ ] **Verify environment**: Check console shows `Environment mode: emulator`
- [ ] **Never start duplicate emulators**: This causes cascading failures
- [ ] **Check logs**: Logs are saved to `backend/firebase-debug-logs/emulator.log`

---

## 📝 npm Scripts Reference

From `backend/src-plattr/package.json`:

| Script | Purpose |
|--------|---------|
| `npm run emulators` | Start emulator with credentials and debug |
| `npm run import-mock` | Import mock data to running emulator |
| `npm run preflight-ports` | Find free ports and create temp config |
| `npm run cart-flow` | Run cart API tests |
| `npm run cart-flow:exec` | Start emulator, import data, run tests, then exit |
