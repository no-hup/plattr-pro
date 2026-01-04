# 🔥 Sub-Agent: Firebase Emulator Manager

> **Purpose**: Instructions for a sub-agent to set up and manage the Firebase emulator.  
> **Usage**: Spawn a sub-agent with this file as context to handle emulator lifecycle.

---

## 🎯 Objectives

Your job is to:
1. **Check** if Firebase emulator is already running
2. **Start** the emulator if not running
3. **Import** mock data into Firestore
4. **Capture** logs to a file for the main agent
5. **Report** status back

---

## 📍 Critical Paths

```
Backend Directory:     /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
Response Guard:        /Users/shauryajaiswal/Desktop/dev/plattr-pro/agent_workspace/agents/response_guard_runtime
Service Account:       backend/src-plattr/secure_stuff/service-account.json
Mock Data:             backend/src-plattr/functions/mock/mockDataV2.json
Firebase Config:       backend/src-plattr/firebase.json
```

---

## 🚀 Step-by-Step Instructions

### Step 1: Check If Emulator Already Running

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants
```

**If returns `200`**: Emulator is running → Skip to Step 4  
**If connection refused**: Emulator not running → Continue to Step 2

### Step 2: Kill Any Stuck Ports (if needed)

```bash
lsof -t -i:8080 -i:5002 -i:4001 | xargs kill -9 2>/dev/null || true
```

### Step 3: Start Emulator with Log Capture

**Option A: Using Response Guard script (Recommended)**
```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/agent_workspace/agents/response_guard_runtime
./scripts/capture_firebase_logs.sh
```

**Option B: Manual start (if script unavailable)**
```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr
export GOOGLE_APPLICATION_CREDENTIALS="./secure_stuff/service-account.json"
firebase emulators:start --project rms-app-dd875 --only firestore,functions --debug
```

> ⚠️ **IMPORTANT**: This command runs in foreground. Keep the terminal open.

### Step 4: Import Mock Data (in new terminal)

Wait 5-10 seconds for emulator to initialize, then:

```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions
node mock/quickImport.js
```

**Expected output:**
```
Loading mock data from: .../mockDataV2.json
Loaded. Restaurants: [ 'rest_basic_001', 'rest_premium_001', ... ]
Importing restaurant: rest_basic_001
  - menuItems
  - categories
  - tables
  ...
✅ Import complete!
```

### Step 5: Verify Everything Works

```bash
# Test a function endpoint
curl -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants \
  -H "Content-Type: application/json" \
  -d '{"data":{}}'
```

**Expected**: JSON response with restaurant list (status: "success")

### Step 6: (Optional) Start Log Capture If Using Manual Start

If you started manually in Step 3B, capture logs separately:

```bash
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/agent_workspace/agents/response_guard_runtime
./scripts/capture_firebase_logs.sh --capture-only
```

---

## ✅ Success Criteria

Report success when ALL of these are true:
- [ ] Functions emulator responding on `http://127.0.0.1:5002`
- [ ] Firestore emulator responding on `http://127.0.0.1:8080`
- [ ] Mock data imported (5 restaurants visible)
- [ ] `dev-listRestaurants` returns valid JSON
- [ ] Logs being captured to `agents/response_guard_runtime/output/firebase_logs.json`

---

## 🔧 Troubleshooting

### "Port already in use"
```bash
lsof -t -i:8080 -i:5002 | xargs kill -9
```

### "Could not detect project"
Always include `--project rms-app-dd875` flag.

### "Auth error / Permission denied"
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/secure_stuff/service-account.json"
```

### Mock data not appearing
Ensure `FIRESTORE_EMULATOR_HOST` is set correctly by the script, or set manually:
```bash
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

---

## 📋 Status Report Template

When done, report to main agent:

```
## Firebase Emulator Status ✅

- **Functions Endpoint**: http://127.0.0.1:5002/rms-app-dd875/us-central1/
- **Firestore Endpoint**: http://127.0.0.1:8080
- **Mock Data**: Imported (5 restaurants)
- **Log Capture**: Active → agents/response_guard_runtime/output/firebase_logs.json
- **Emulator UI**: http://127.0.0.1:4001

Ready for API testing.
```

---

## 🔄 Shutdown (When Done)

To stop the emulator cleanly:
1. `Ctrl+C` in the emulator terminal
2. Or: `lsof -t -i:5002 | xargs kill -9`

---

## 📚 Reference Files

For more details, see:
- `agent_workspace/agents/response_guard_runtime/firebase_emulator_tips.md` - Comprehensive tips
- `agent_workspace/agents/response_guard_runtime/README.md` - Response Guard docs
- `backend/src-plattr/package.json` - npm scripts available
