# 🦋 Flutter App Tips & Best Practices

> **Purpose**: Consolidated knowledge for running Flutter apps with optimized logging.  
> **Audience**: LLM agents and developers working on Plattr Pro.  
> **Last Updated**: 2026-01-25

---

## 📋 Quick Reference

| Need | Command / Location |
|------|-------------------|
| **Consumer App (Boilerplate)** | `bash backend/flutter-app-logs/run_consumer.sh` |
| **Server App** | `bash backend/flutter-app-logs/run_server.sh` |
| **Log Dir** | `backend/flutter-app-logs/` |
| **Kill Flutter/Dart** | `pkill -9 -f flutter; pkill -9 -f dart` |
| **ResponseGuard Interceptor** | `agent_workspace/agents/response_guard_runtime/flutter/response_guard_interceptor.dart` |

---

## 🚀 1. Running Apps with Optimized Logging

To provide clean logs for coding agents, redirect Flutter's output to the central log directory while filtering out noise.

### **Recommended Method: Use Shell Scripts**

The easiest way to run the apps with logging is to use the provided shell scripts:

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
**Fix**: Press `R` in the terminal running the app (Hot Restart) or `q` and restart.

### Issue: Logs are empty
**Fix**: Ensure `LogInterceptor` is enabled in `lib/network/dio_client.dart`.

---

## 🤖 LLM Agent Checklist

Before analyzing Flutter issues:
- [ ] **Read the logs**: `tail -n 100 backend/flutter-app-logs/consumer.log` (or `server.log` for server app)
- [ ] **Search for Dio errors**: `grep -i "Dio" backend/flutter-app-logs/consumer.log` (or `server.log`)
- [ ] **Search for crashes**: `grep -iE "Exception|Error" backend/flutter-app-logs/consumer.log` (or `server.log`)
- [ ] **Verify Backend**: Check if the Firebase emulator is also running if network calls fail.
