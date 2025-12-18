#!/bin/bash
# Response Guard - Log Capture Script
# Captures and filters Flutter logs for LLM consumption
# Supports session management with timestamps and cleanup

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$ROOT_DIR/output"
ARCHIVE_DIR="$OUTPUT_DIR/archive"
CONFIG_DIR="$ROOT_DIR/config"

# Session management
SESSION_ID=$(date +"%Y%m%d_%H%M%S")
SESSION_FILE="$OUTPUT_DIR/session_${SESSION_ID}.json"
LATEST_LINK="$OUTPUT_DIR/latest_session.json"
SESSION_META="$OUTPUT_DIR/session_meta.json"

# Legacy file names (for backward compatibility)
LOG_FILE="$OUTPUT_DIR/raw_logs.json"

# Create directories
mkdir -p "$OUTPUT_DIR" "$ARCHIVE_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Help message
show_help() {
    echo -e "${GREEN}Response Guard - Log Capture${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  (default)       Start interactive log capture (new session)"
    echo "  --background    Start background log capture"
    echo "  --clear         Clear current session logs only"
    echo "  --clear-all     Clear all logs and archive"
    echo "  --archive       Archive current session and start fresh"
    echo "  --list          List all sessions with timestamps"
    echo "  --status        Show current session status"
    echo "  --help          Show this help message"
    echo ""
    echo "Session files are stored with timestamps: session_YYYYMMDD_HHMMSS.json"
    echo "Old sessions are automatically archived after 1 hour of inactivity."
}

# List all sessions
list_sessions() {
    echo -e "${GREEN}📋 Available Sessions${NC}"
    echo "====================="
    
    if [ -z "$(ls -A $OUTPUT_DIR/*.json 2>/dev/null)" ]; then
        echo "No sessions found."
        return
    fi
    
    echo ""
    echo "Active Sessions:"
    for f in "$OUTPUT_DIR"/session_*.json 2>/dev/null; do
        if [ -f "$f" ]; then
            filename=$(basename "$f")
            size=$(wc -c < "$f" | tr -d ' ')
            lines=$(wc -l < "$f" | tr -d ' ')
            modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$f" 2>/dev/null || stat -c "%y" "$f" 2>/dev/null | cut -d'.' -f1)
            echo "  - $filename (${lines} entries, ${size} bytes, $modified)"
        fi
    done
    
    echo ""
    if [ -d "$ARCHIVE_DIR" ] && [ -n "$(ls -A $ARCHIVE_DIR 2>/dev/null)" ]; then
        echo "Archived Sessions:"
        for f in "$ARCHIVE_DIR"/*.json 2>/dev/null; do
            if [ -f "$f" ]; then
                filename=$(basename "$f")
                echo "  - $filename"
            fi
        done
    fi
}

# Clear current session
clear_current() {
    echo -e "${YELLOW}🧹 Clearing current session logs...${NC}"
    rm -f "$OUTPUT_DIR"/session_*.json
    rm -f "$LOG_FILE"
    rm -f "$LATEST_LINK"
    rm -f "$OUTPUT_DIR/llm_context.md"
    rm -f "$OUTPUT_DIR/anomalies.json"
    echo -e "${GREEN}✅ Current session cleared.${NC}"
}

# Clear all logs
clear_all() {
    echo -e "${RED}⚠️  This will delete ALL logs including archives.${NC}"
    read -p "Are you sure? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf "$OUTPUT_DIR"/*
        mkdir -p "$ARCHIVE_DIR"
        echo -e "${GREEN}✅ All logs cleared.${NC}"
    else
        echo "Cancelled."
    fi
}

# Archive current session
archive_session() {
    echo -e "${CYAN}📦 Archiving current session...${NC}"
    
    for f in "$OUTPUT_DIR"/session_*.json; do
        if [ -f "$f" ]; then
            mv "$f" "$ARCHIVE_DIR/"
            echo "  Archived: $(basename $f)"
        fi
    done
    
    rm -f "$LOG_FILE"
    rm -f "$LATEST_LINK"
    echo -e "${GREEN}✅ Session archived. Ready for new session.${NC}"
}

# Show session status
show_status() {
    echo -e "${GREEN}📊 Session Status${NC}"
    echo "================="
    
    if [ -f "$LATEST_LINK" ]; then
        target=$(readlink "$LATEST_LINK" 2>/dev/null || echo "$LATEST_LINK")
        echo "Current session: $(basename $target)"
        lines=$(wc -l < "$target" 2>/dev/null || echo "0")
        size=$(wc -c < "$target" 2>/dev/null || echo "0")
        echo "  Entries: $lines"
        echo "  Size: $size bytes"
    else
        echo "No active session."
    fi
    
    echo ""
    active_count=$(ls -1 "$OUTPUT_DIR"/session_*.json 2>/dev/null | wc -l | tr -d ' ')
    archive_count=$(ls -1 "$ARCHIVE_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "Active sessions: $active_count"
    echo "Archived sessions: $archive_count"
}

# Auto-archive old sessions (older than 1 hour)
auto_archive_old() {
    for f in "$OUTPUT_DIR"/session_*.json; do
        if [ -f "$f" ]; then
            # Check if file is older than 1 hour (3600 seconds)
            if [ $(( $(date +%s) - $(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null) )) -gt 3600 ]; then
                mv "$f" "$ARCHIVE_DIR/"
                echo -e "${CYAN}Auto-archived old session: $(basename $f)${NC}"
            fi
        fi
    done
}

# Check if flutter is available
check_flutter() {
    if ! command -v flutter &> /dev/null; then
        echo -e "${RED}Error: Flutter not found. Please ensure Flutter is in your PATH.${NC}"
        exit 1
    fi
}

# Parse command
case "$1" in
    --help|-h)
        show_help
        exit 0
        ;;
    --clear)
        clear_current
        exit 0
        ;;
    --clear-all)
        clear_all
        exit 0
        ;;
    --archive)
        archive_session
        exit 0
        ;;
    --list)
        list_sessions
        exit 0
        ;;
    --status)
        show_status
        exit 0
        ;;
esac

# Main capture logic
check_flutter

# Auto-archive old sessions before starting new one
auto_archive_old

echo -e "${GREEN}🔍 Response Guard - Log Capture${NC}"
echo "================================"
echo -e "Session ID: ${CYAN}$SESSION_ID${NC}"
echo "Output: $SESSION_FILE"
echo ""

# Create session metadata
cat > "$SESSION_META" << EOF
{
  "currentSessionId": "$SESSION_ID",
  "startedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "sessionFile": "$SESSION_FILE"
}
EOF

# Create/update symlink to latest session
ln -sf "$SESSION_FILE" "$LATEST_LINK"
# Also maintain legacy file for backward compatibility
ln -sf "$SESSION_FILE" "$LOG_FILE"

if [ "$1" == "--background" ]; then
    echo -e "${YELLOW}Running in background mode...${NC}"
    echo "Logs will be written to: $SESSION_FILE"
    echo "Use './capture_logs.sh --status' to check progress"
    echo "Use 'kill $!' to stop capture when done"
    
    # Background capture with pattern filtering
    flutter logs 2>/dev/null | while IFS= read -r line; do
        # Apply capture patterns
        if echo "$line" | grep -qE "(⬆️|⬇️|Response|Error|Exception|parsing|DioException|invalid-argument|not-found|unauthenticated)"; then
            # Skip excluded patterns
            if ! echo "$line" | grep -qE "(verbose|debug|Observatory|Reloaded|Hot restart|Syncing files|DevTools)"; then
                timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                truncated_line=$(echo "$line" | head -c 500)
                echo "{\"timestamp\": \"$timestamp\", \"sessionId\": \"$SESSION_ID\", \"log\": \"$truncated_line\"}" >> "$SESSION_FILE"
            fi
        fi
    done &
    
    echo "PID: $!"
else
    echo -e "${YELLOW}Running in interactive mode (Ctrl+C to stop)...${NC}"
    echo -e "Tip: Use ${CYAN}--clear${NC} to clear logs between sessions"
    echo ""
    
    # Clear previous session file for fresh start
    > "$SESSION_FILE"
    
    # Interactive capture with real-time display
    flutter logs 2>/dev/null | while IFS= read -r line; do
        # Apply capture patterns
        if echo "$line" | grep -qE "(⬆️|⬇️|Response|Error|Exception|parsing|DioException|invalid-argument|not-found|unauthenticated)"; then
            # Skip excluded patterns
            if ! echo "$line" | grep -qE "(verbose|debug|Observatory|Reloaded|Hot restart|Syncing files|DevTools)"; then
                timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
                
                # Color-code output based on type
                if echo "$line" | grep -qE "(Error|Exception|DioException)"; then
                    echo -e "${RED}[$timestamp] $line${NC}"
                elif echo "$line" | grep -qE "(⬆️|Sending)"; then
                    echo -e "${GREEN}[$timestamp] $line${NC}"
                elif echo "$line" | grep -qE "(⬇️|Response)"; then
                    echo -e "${YELLOW}[$timestamp] $line${NC}"
                else
                    echo "[$timestamp] $line"
                fi
                
                # Truncate and save to file with session ID
                truncated_line=$(echo "$line" | head -c 500)
                echo "{\"timestamp\": \"$timestamp\", \"sessionId\": \"$SESSION_ID\", \"log\": \"$truncated_line\"}" >> "$SESSION_FILE"
            fi
        fi
    done
fi

