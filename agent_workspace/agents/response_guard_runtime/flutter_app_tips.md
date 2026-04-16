# 🦋 Flutter App Tips & Best Practices

> **Purpose**: Consolidated knowledge for running Flutter apps with optimized logging.  
> **Audience**: LLM agents and developers working on Plattr Pro.  
> **Last Updated**: 2026-01-25

---

## 📋 Quick Reference

| Need | Command / Location |
|------|-------------------|
| **🚀 Full Dev Environment** | `zsh backend/flutter-app-logs/god-level-script-to-run-everything.sh` |
| **Consumer App (VS Code)** | Press `F5` → Select `flutter_boilerplate` |
| **Server App (VS Code)** | Press `F5` → Select `platter_server` |
| **Consumer App (Terminal)** | `bash backend/flutter-app-logs/run_consumer.sh` |
| **Server App (Terminal)** | `bash backend/flutter-app-logs/run_server.sh` |
| **Log Dir** | `backend/flutter-app-logs/` |
| **Kill Flutter/Dart** | `pkill -9 -f flutter; pkill -9 -f dart` |
| **ResponseGuard Interceptor** | `agent_workspace/agents/response_guard_runtime/flutter/response_guard_interceptor.dart` |

---

## 🚀 1. Running Apps with Optimized Logging

To provide clean logs for coding agents, redirect Flutter's output to the central log directory while filtering out noise.

### **Recommended Method: God-Level Script (iTerm2)**

The easiest way to launch the entire development environment:

```zsh
# From project root
zsh backend/flutter-app-logs/god-level-script-to-run-everything.sh
# OR simply:
./backend/flutter-app-logs/god-level-script-to-run-everything.sh
```

This script will:
1. Prompt you to select which mock data to import (V2, V3, quick imports, or skip)
2. Kill any existing Flutter/Dart/Firebase processes
3. Launch Firebase Emulator in a new iTerm tab
4. Wait for emulator to be ready (30s timeout with error logging)
5. Import the selected mock data
6. Launch Server App in a new iTerm tab (port 5050)
7. Launch Consumer App in a new iTerm tab (port 5051)
8. Display a summary with all URLs and log file locations

**Requirements:** iTerm2 + zsh

> ⚠️ **Note for LLM Agents:** This script is for manual use only. Do NOT run this script automatically. Use the individual `run_server.sh` or `run_consumer.sh` scripts if you need to launch apps programmatically.

---

### **Alternative Method 1: VS Code Launch (Auto Hot Reload)**

The easiest way to run apps with automatic hot reload on file save:

#### Using VS Code/Cursor
1. Open the app folder in VS Code/Cursor
2. Press `F5` or go to Run & Debug panel
3. Select the configuration:
   - **Consumer App**: `flutter_boilerplate` 
   - **Server App**: `platter_server`
4. Hot reload happens automatically when you save files (`Cmd+S` / `Ctrl+S`)

**Benefits:**
- ✅ Automatic hot reload on save (no terminal access needed)
- ✅ Integrated debugging with breakpoints
- ✅ Console output visible in Debug Console
- ✅ Stop/restart from VS Code UI

### **Alternative Method 2: Shell Scripts (Individual Apps)**

If you have terminal access and want centralized logging:

#### Consumer App (Boilerplate)
```bash
# From project root
bash backend/flutter-app-logs/run_consumer.sh
```

#### Server App
```bash
# From project root
bash backend/flutter-app-logs/run_server.sh
```

These scripts automatically:
- Create the log directory if needed
- Truncate the log file for a fresh start
- Run Flutter with full output logging
- Display output in terminal AND save to file
- **Enable hot reload** - press `r` to hot reload, `R` to hot restart, `q` to quit

---

### **Alternative: Manual Commands**

If you prefer to run manually or need to customize:

#### Consumer App (Boilerplate)
```bash
mkdir -p /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/flutter-app-logs && \
: > /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/flutter-app-logs/consumer.log && \
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/flutter_boilerplate && \
flutter run -d chrome 2>&1 | tee ../../backend/flutter-app-logs/consumer.log
```

#### Server App
```bash
mkdir -p /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/flutter-app-logs && \
: > /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/flutter-app-logs/server.log && \
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/src-platter-apps/apps/platter_server && \
flutter run -d chrome 2>&1 | tee ../../../../backend/flutter-app-logs/server.log
```

---

## 🔍 2. Identifying Important Logs

Agents should look for these specific tags/patterns in `backend/flutter-app-logs/`:

| Pattern | Meaning | 
|---------|---------|
| `[AppLogger]` | Application-level logic logs. |
| `Dio` or `*** Request ***` | Network request/response lifecycle (via Dio LogInterceptor). |
| `Exception` / `Error` | Logical failures or unhandled exceptions. |
| `Unhandled Exception` | Potential application crashes. |
| `Status code 401` | Authentication/Session issues. |

---

## 📁 3. App Locations

| App | Path |
|-----|------|
| **Platter Server** | `frontend/src-platter-apps/apps/platter_server` |
| **Platter Admin** | `frontend/src-platter-apps/apps/platter_admin` |
| **Platter Kitchen** | `frontend/src-platter-apps/apps/platter_kitchen` |
| **Boilerplate** | `frontend/flutter_boilerplate` |

---

## 🛠 4. Troubleshooting

### Issue: "Address already in use" (Port 8080/5002)
This usually means the **Firebase Emulator** is stuck.  
**Fix**: `lsof -t -i:8080 -i:5002 | xargs kill -9`

### Issue: Flutter app not picking up changes
**Hot Reload**: Press `r` in the terminal for hot reload (preserves app state)  
**Hot Restart**: Press `R` for full restart (resets app state)  
**Full Restart**: Press `q` to quit and restart the script

### Issue: Logs are empty
**Fix**: Ensure `LogInterceptor` is enabled in `lib/network/dio_client.dart`.

---

## 🤖 LLM Agent Checklist

Before analyzing Flutter issues:
- [ ] **Read the logs**: `tail -n 100 backend/flutter-app-logs/consumer.log` (or `server.log` for server app)
- [ ] **Search for Dio errors**: `grep -i "Dio" backend/flutter-app-logs/consumer.log` (or `server.log`)
- [ ] **Search for crashes**: `grep -iE "Exception|Error" backend/flutter-app-logs/consumer.log` (or `server.log`)
- [ ] **Verify Backend**: Check if the Firebase emulator is also running if network calls fail.
