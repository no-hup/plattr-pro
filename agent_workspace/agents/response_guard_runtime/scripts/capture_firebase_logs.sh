#!/bin/bash
# Response Guard - Firebase Emulator Log Capture Script
# Captures and filters Firebase emulator logs for LLM consumption
# Integrates with existing session management

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$ROOT_DIR/output"
ARCHIVE_DIR="$OUTPUT_DIR/archive"
BACKEND_DIR="/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr"

# Session management (shared with Flutter logs)
SESSION_META="$OUTPUT_DIR/session_meta.json"
FIREBASE_LOG_FILE="$OUTPUT_DIR/firebase_logs.json"
LATEST_FIREBASE_LINK="$OUTPUT_DIR/latest_firebase_session.json"

# Emulator configuration
FUNCTIONS_PORT="${FUNCTIONS_PORT:-5002}"
FIRESTORE_PORT="${FIRESTORE_PORT:-8080}"
EMULATOR_HOST="${EMULATOR_HOST:-127.0.0.1}"

# Create directories
mkdir -p "$OUTPUT_DIR" "$ARCHIVE_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Help message
show_help() {
    echo -e "${GREEN}Response Guard - Firebase Log Capture${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  (default)        Start emulator with log capture"
    echo "  --capture-only   Capture logs from already running emulator (tail mode)"
    echo "  --check          Check if emulator is already running"
    echo "  --clear          Clear Firebase log files"
    echo "  --status         Show current Firebase log status"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start emulator with log capture"
    echo "  $0 --capture-only     # Just capture logs (emulator already running)"
    echo "  $0 --check            # Check emulator status"
}

# Check if emulator is already running
check_emulator() {
    local functions_running=false
    local firestore_running=false
    
    # Check Functions emulator
    if curl -s "http://${EMULATOR_HOST}:${FUNCTIONS_PORT}/" > /dev/null 2>&1; then
        functions_running=true
    fi
    
    # Check Firestore emulator
    if curl -s "http://${EMULATOR_HOST}:${FIRESTORE_PORT}/" > /dev/null 2>&1; then
        firestore_running=true
    fi
    
    if [ "$functions_running" = true ] && [ "$firestore_running" = true ]; then
        echo -e "${GREEN}✓ Firebase emulator is running${NC}"
        echo "  Functions: http://${EMULATOR_HOST}:${FUNCTIONS_PORT}"
        echo "  Firestore: http://${EMULATOR_HOST}:${FIRESTORE_PORT}"
        return 0
    elif [ "$functions_running" = true ] || [ "$firestore_running" = true ]; then
        echo -e "${YELLOW}⚠ Firebase emulator partially running${NC}"
        [ "$functions_running" = true ] && echo "  ✓ Functions: http://${EMULATOR_HOST}:${FUNCTIONS_PORT}"
        [ "$functions_running" = false ] && echo "  ✗ Functions: not running"
        [ "$firestore_running" = true ] && echo "  ✓ Firestore: http://${EMULATOR_HOST}:${FIRESTORE_PORT}"
        [ "$firestore_running" = false ] && echo "  ✗ Firestore: not running"
        return 1
    else
        echo -e "${RED}✗ Firebase emulator is NOT running${NC}"
        return 1
    fi
}

# Clear Firebase logs
clear_logs() {
    echo -e "${YELLOW}🧹 Clearing Firebase logs...${NC}"
    rm -f "$OUTPUT_DIR"/firebase_*.json
    rm -f "$LATEST_FIREBASE_LINK"
    echo -e "${GREEN}✅ Firebase logs cleared.${NC}"
}

# Show status
show_status() {
    echo -e "${GREEN}📊 Firebase Log Status${NC}"
    echo "======================"
    
    if [ -f "$FIREBASE_LOG_FILE" ]; then
        lines=$(wc -l < "$FIREBASE_LOG_FILE" 2>/dev/null || echo "0")
        size=$(wc -c < "$FIREBASE_LOG_FILE" 2>/dev/null || echo "0")
        echo "Log file: $FIREBASE_LOG_FILE"
        echo "  Entries: $lines"
        echo "  Size: $size bytes"
    else
        echo "No Firebase logs captured yet."
    fi
    
    echo ""
    check_emulator
}

# Filter and format log line
filter_log_line() {
    local line="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Determine log type and priority
    local log_type=""
    local priority=""
    local should_capture=false
    
    # HIGH PRIORITY - Function execution
    if echo "$line" | grep -qE "Beginning execution of"; then
        log_type="function_start"
        priority="high"
        should_capture=true
    elif echo "$line" | grep -qE "Finished .* in [0-9]+"; then
        log_type="function_end"
        priority="high"
        should_capture=true
    # HIGH PRIORITY - Errors
    elif echo "$line" | grep -qE "(Error|error|ERROR|Exception|exception|EXCEPTION)"; then
        log_type="error"
        priority="critical"
        should_capture=true
    # HIGH PRIORITY - Warnings
    elif echo "$line" | grep -qE "(⚠|warn|WARN|Warning)"; then
        log_type="warning"
        priority="high"
        should_capture=true
    # MEDIUM PRIORITY - Console logs from functions
    elif echo "$line" | grep -qE "^>"; then
        log_type="console"
        priority="medium"
        should_capture=true
    # MEDIUM PRIORITY - Firestore operations
    elif echo "$line" | grep -qE "(WRITE|READ|DELETE|UPDATE).*firestore"; then
        log_type="firestore_op"
        priority="medium"
        should_capture=true
    # MEDIUM PRIORITY - HTTP requests
    elif echo "$line" | grep -qE "(POST|GET|PUT|DELETE) /"; then
        log_type="http_request"
        priority="high"
        should_capture=true
    # MEDIUM PRIORITY - Response status
    elif echo "$line" | grep -qE "status.*[0-9]{3}|[0-9]{3} (OK|Created|Bad Request|Not Found|Internal Server Error)"; then
        log_type="http_response"
        priority="high"
        should_capture=true
    fi
    
    # EXCLUDE - Noise patterns
    if echo "$line" | grep -qE "(Emulator Hub|ui:|Emulator UI|logging to|Starting emulators|All emulators ready|Export data|Shutting down)"; then
        should_capture=false
    fi
    if echo "$line" | grep -qE "(Detected demo project|functions\[us-central1-|Serving at port|watching for|functions: Using)"; then
        should_capture=false
    fi
    
    # Output if should capture
    if [ "$should_capture" = true ]; then
        # Truncate long lines
        local truncated_line=$(echo "$line" | head -c 500)
        
        # Create JSON entry
        local session_id=""
        if [ -f "$SESSION_META" ]; then
            session_id=$(grep -o '"currentSessionId": "[^"]*"' "$SESSION_META" 2>/dev/null | cut -d'"' -f4 || echo "")
        fi
        
        echo "{\"timestamp\": \"$timestamp\", \"sessionId\": \"$session_id\", \"source\": \"firebase\", \"type\": \"$log_type\", \"priority\": \"$priority\", \"log\": \"$truncated_line\"}"
    fi
}

# Capture logs from running emulator (tail mode)
capture_logs_only() {
    echo -e "${GREEN}📡 Response Guard - Firebase Log Capture (Tail Mode)${NC}"
    echo "======================================================"
    
    # Check if emulator is running
    if ! check_emulator; then
        echo -e "${RED}Cannot capture logs - emulator not running.${NC}"
        echo "Start the emulator first, or run: $0 (without --capture-only)"
        exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}Capturing logs... (Ctrl+C to stop)${NC}"
    echo "Output: $FIREBASE_LOG_FILE"
    echo ""
    
    # Create/update symlink
    ln -sf "$FIREBASE_LOG_FILE" "$LATEST_FIREBASE_LINK"
    
    # Check for firebase-debug.log
    local debug_log="$BACKEND_DIR/firebase-debug.log"
    
    if [ -f "$debug_log" ]; then
        echo -e "Tailing: ${CYAN}$debug_log${NC}"
        tail -f "$debug_log" 2>/dev/null | while IFS= read -r line; do
            local json_entry=$(filter_log_line "$line")
            if [ -n "$json_entry" ]; then
                # Color output based on priority
                local priority=$(echo "$json_entry" | grep -o '"priority": "[^"]*"' | cut -d'"' -f4)
                case "$priority" in
                    critical)
                        echo -e "${RED}$json_entry${NC}"
                        ;;
                    high)
                        echo -e "${YELLOW}$json_entry${NC}"
                        ;;
                    medium)
                        echo -e "${CYAN}$json_entry${NC}"
                        ;;
                    *)
                        echo "$json_entry"
                        ;;
                esac
                echo "$json_entry" >> "$FIREBASE_LOG_FILE"
            fi
        done
    else
        echo -e "${YELLOW}firebase-debug.log not found. Will capture from stdout when starting emulator.${NC}"
        echo "Try running: $0 (without --capture-only) to start emulator with capture"
    fi
}

# Start emulator with log capture
start_with_capture() {
    echo -e "${GREEN}🔥 Response Guard - Firebase Emulator with Log Capture${NC}"
    echo "======================================================="
    
    # Check if already running
    if check_emulator 2>/dev/null; then
        echo ""
        echo -e "${YELLOW}Emulator already running. Use --capture-only to tail logs.${NC}"
        exit 0
    fi
    
    # Generate session ID
    SESSION_ID=$(date +"%Y%m%d_%H%M%S")
    FIREBASE_SESSION_FILE="$OUTPUT_DIR/firebase_session_${SESSION_ID}.json"
    
    echo ""
    echo -e "Session ID: ${CYAN}$SESSION_ID${NC}"
    echo "Output: $FIREBASE_SESSION_FILE"
    echo ""
    
    # Update session meta to include firebase session
    if [ -f "$SESSION_META" ]; then
        # Add firebase session to existing meta
        local current_meta=$(cat "$SESSION_META")
        echo "$current_meta" | sed 's/}$/,\n  "firebaseSessionId": "'$SESSION_ID'",\n  "firebaseSessionFile": "'$FIREBASE_SESSION_FILE'"\n}/' > "$SESSION_META"
    else
        cat > "$SESSION_META" << EOF
{
  "currentSessionId": "$SESSION_ID",
  "firebaseSessionId": "$SESSION_ID",
  "firebaseSessionFile": "$FIREBASE_SESSION_FILE",
  "startedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    fi
    
    # Create/update symlinks
    ln -sf "$FIREBASE_SESSION_FILE" "$FIREBASE_LOG_FILE"
    ln -sf "$FIREBASE_SESSION_FILE" "$LATEST_FIREBASE_LINK"
    
    # Clear previous session file
    > "$FIREBASE_SESSION_FILE"
    
    echo -e "${YELLOW}Starting Firebase emulator with log capture...${NC}"
    echo -e "${CYAN}Tip: Logs are filtered and saved automatically.${NC}"
    echo ""
    
    # Navigate to backend and start emulator
    cd "$BACKEND_DIR"
    
    # Set credentials
    export GOOGLE_APPLICATION_CREDENTIALS="$BACKEND_DIR/secure_stuff/service-account.json"
    
    # Run emulator and capture output
    firebase emulators:start --project rms-app-dd875 --only firestore,functions --debug 2>&1 | while IFS= read -r line; do
        # Always show raw output
        echo "$line"
        
        # Filter and save relevant logs
        local json_entry=$(filter_log_line "$line")
        if [ -n "$json_entry" ]; then
            echo "$json_entry" >> "$FIREBASE_SESSION_FILE"
        fi
    done
}

# Parse command
case "$1" in
    --help|-h)
        show_help
        exit 0
        ;;
    --check)
        check_emulator
        exit $?
        ;;
    --clear)
        clear_logs
        exit 0
        ;;
    --status)
        show_status
        exit 0
        ;;
    --capture-only)
        capture_logs_only
        exit 0
        ;;
    *)
        start_with_capture
        ;;
esac
