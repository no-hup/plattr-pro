#!/bin/bash
# Response Guard - Flutter Web Log Capture Script
# Runs Flutter web and captures ResponseGuard logs in real-time

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$ROOT_DIR/output"
FLUTTER_DIR="/Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/flutter_boilerplate"

# Session management
SESSION_ID=$(date +"%Y%m%d_%H%M%S")
FLUTTER_LOG_FILE="$OUTPUT_DIR/flutter_web_session_${SESSION_ID}.json"
LATEST_FLUTTER_LINK="$OUTPUT_DIR/latest_flutter_web.json"
SESSION_META="$OUTPUT_DIR/session_meta.json"

# Create directories
mkdir -p "$OUTPUT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    echo -e "${GREEN}Response Guard - Flutter Web Log Capture${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  (default)     Run Flutter web with log capture"
    echo "  --status      Show current Flutter log status"
    echo "  --clear       Clear Flutter log files"
    echo "  --help        Show this help"
    echo ""
    echo "This script:"
    echo "  1. Runs 'flutter run -d chrome' in the boilerplate project"
    echo "  2. Filters [ResponseGuard] prefixed logs"
    echo "  3. Saves them to output/flutter_web_session_*.json"
}

show_status() {
    echo -e "${GREEN}📊 Flutter Web Log Status${NC}"
    echo "========================="
    
    if [ -f "$LATEST_FLUTTER_LINK" ]; then
        local target=$(readlink "$LATEST_FLUTTER_LINK" 2>/dev/null || echo "$LATEST_FLUTTER_LINK")
        local lines=$(wc -l < "$target" 2>/dev/null | tr -d ' ' || echo "0")
        local size=$(wc -c < "$target" 2>/dev/null | tr -d ' ' || echo "0")
        echo "Log file: $(basename $target)"
        echo "  Entries: $lines"
        echo "  Size: $size bytes"
    else
        echo "No Flutter web logs captured yet."
    fi
}

clear_logs() {
    echo -e "${YELLOW}🧹 Clearing Flutter web logs...${NC}"
    rm -f "$OUTPUT_DIR"/flutter_web_*.json
    rm -f "$LATEST_FLUTTER_LINK"
    echo -e "${GREEN}✅ Flutter web logs cleared.${NC}"
}

# Filter log line and output JSON if it's a ResponseGuard log
filter_log_line() {
    local line="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Check for [ResponseGuard] prefix
    if echo "$line" | grep -q "\[ResponseGuard\]"; then
        # Extract the log content after [ResponseGuard]
        local log_content=$(echo "$line" | sed 's/.*\[ResponseGuard\] //')
        
        # Determine type based on emoji
        local log_type="info"
        if echo "$log_content" | grep -q "⬆️"; then
            log_type="request"
        elif echo "$log_content" | grep -q "⬇️"; then
            log_type="response"
        elif echo "$log_content" | grep -q "❌"; then
            log_type="error"
        fi
        
        # Output JSON (escape quotes in content)
        local escaped_content=$(echo "$log_content" | sed 's/"/\\"/g' | head -c 500)
        echo "{\"timestamp\": \"$timestamp\", \"sessionId\": \"$SESSION_ID\", \"source\": \"flutter_web\", \"type\": \"$log_type\", \"log\": \"$escaped_content\"}"
    fi
    
    # Also capture [ResponseGuard:JSON] lines (structured logs)
    if echo "$line" | grep -q "\[ResponseGuard:JSON\]"; then
        local json_content=$(echo "$line" | sed 's/.*\[ResponseGuard:JSON\] //')
        # Add session metadata to existing JSON
        echo "$json_content" | sed "s/}$/, \"sessionId\": \"$SESSION_ID\", \"source\": \"flutter_web\"}/"
    fi
}

run_with_capture() {
    echo -e "${GREEN}🦋 Response Guard - Flutter Web with Log Capture${NC}"
    echo "================================================="
    echo -e "Session ID: ${CYAN}$SESSION_ID${NC}"
    echo "Output: $FLUTTER_LOG_FILE"
    echo ""
    
    # Update session meta
    cat > "$SESSION_META" << EOF
{
  "currentSessionId": "$SESSION_ID",
  "flutterWebSessionId": "$SESSION_ID",
  "flutterWebSessionFile": "$FLUTTER_LOG_FILE",
  "startedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    # Create symlink
    ln -sf "$FLUTTER_LOG_FILE" "$LATEST_FLUTTER_LINK"
    
    # Clear session file
    > "$FLUTTER_LOG_FILE"
    
    echo -e "${YELLOW}Starting Flutter web app with log capture...${NC}"
    echo -e "${CYAN}Tip: Press 'q' to quit, 'R' to hot restart${NC}"
    echo ""
    
    cd "$FLUTTER_DIR"
    
    # Run flutter and pipe through filter
    flutter run -d chrome 2>&1 | while IFS= read -r line; do
        # Show all output to terminal
        echo "$line"
        
        # Filter and save ResponseGuard logs
        local json_entry=$(filter_log_line "$line")
        if [ -n "$json_entry" ]; then
            echo "$json_entry" >> "$FLUTTER_LOG_FILE"
            # Also show extracted log in color
            echo -e "${GREEN}[CAPTURED]${NC} $json_entry" >&2
        fi
    done
}

# Parse command
case "$1" in
    --help|-h)
        show_help
        exit 0
        ;;
    --status)
        show_status
        exit 0
        ;;
    --clear)
        clear_logs
        exit 0
        ;;
    *)
        run_with_capture
        ;;
esac
