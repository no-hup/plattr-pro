#!/bin/zsh

# =============================================================================
# 🚀 GOD-LEVEL SCRIPT - Plattr Pro Development Environment Launcher
# =============================================================================
# Launches Firebase Emulator + Mock Data + Flutter Apps in iTerm2 tabs
# Usage: zsh backend/flutter-app-logs/god-level-script-to-run-everything.sh
#        OR: ./backend/flutter-app-logs/god-level-script-to-run-everything.sh
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
PROJECT_ROOT="${0:A:h:h:h}"   # <repo>/backend/flutter-app-logs/<script> -> <repo>
BACKEND_DIR="$PROJECT_ROOT/backend/src-plattr"
MOCK_DIR="$BACKEND_DIR/functions/mock"

# Log directories and files
EMULATOR_LOG_DIR="$PROJECT_ROOT/backend/firebase-debug-logs"
FLUTTER_LOG_DIR="$PROJECT_ROOT/backend/flutter-app-logs"
EMULATOR_LOG="$EMULATOR_LOG_DIR/emulator.log"
SERVER_LOG="$FLUTTER_LOG_DIR/server.log"
CONSUMER_LOG="$FLUTTER_LOG_DIR/consumer.log"
KITCHEN_LOG="$FLUTTER_LOG_DIR/kitchen.log"
ADMIN_LOG="$FLUTTER_LOG_DIR/admin.log"

# Flutter app directories
SERVER_APP_DIR="$PROJECT_ROOT/frontend/src-platter-apps/apps/platter_server"
CONSUMER_APP_DIR="$PROJECT_ROOT/frontend/flutter_boilerplate"
KITCHEN_APP_DIR="$PROJECT_ROOT/frontend/src-platter-apps/apps/platter_kitchen"
ADMIN_APP_DIR="$PROJECT_ROOT/frontend/src-platter-apps/apps/platter_admin"

# Ports
EMULATOR_FIRESTORE_PORT=8080
EMULATOR_FUNCTIONS_PORT=5002
EMULATOR_UI_PORT=4001
SERVER_APP_PORT=5050
CONSUMER_APP_PORT=5051
KITCHEN_APP_PORT=5052
ADMIN_APP_PORT=5053

# Restaurant setup files (standalone imports)
BIG_BREWSKI_FILE="$PROJECT_ROOT/restaurant-menu-setup-prod/big-brewski/firestore-big-brewski.json"

# Timing
EMULATOR_WAIT_SECONDS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}▶ $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# -----------------------------------------------------------------------------
# Cleanup Function
# -----------------------------------------------------------------------------
cleanup_processes() {
    log_step "Cleaning up existing processes"
    
    # Kill Flutter/Dart processes
    if pgrep -f "flutter" > /dev/null 2>&1; then
        log_info "Killing Flutter processes..."
        pkill -9 -f "flutter" 2>/dev/null || true
        sleep 1
    fi
    
    if pgrep -f "dart" > /dev/null 2>&1; then
        log_info "Killing Dart processes..."
        pkill -9 -f "dart" 2>/dev/null || true
        sleep 1
    fi
    
    # Kill Firebase emulator processes
    if pgrep -f "firebase" > /dev/null 2>&1; then
        log_info "Killing Firebase processes..."
        pkill -9 -f "firebase" 2>/dev/null || true
        sleep 1
    fi
    
    # Kill processes on specific ports
    for port in $EMULATOR_FIRESTORE_PORT $EMULATOR_FUNCTIONS_PORT $EMULATOR_UI_PORT $SERVER_APP_PORT $CONSUMER_APP_PORT $KITCHEN_APP_PORT $ADMIN_APP_PORT; do
        if lsof -ti:$port > /dev/null 2>&1; then
            log_info "Killing process on port $port..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    sleep 2
    log_success "Cleanup complete"
}

# -----------------------------------------------------------------------------
# Mock Data Selection
# -----------------------------------------------------------------------------
select_mock_data() {
    MOCK_EXTRA_ARGS=""
    log_step "Select Mock Data to Import"
    
    echo -e "${CYAN}Available mock data options:${NC}\n"
    echo "  1) mockDataV2 (importMockDataV2.js) - Standard V2 dataset"
    echo "  2) mockDataV3 (importMockDataV3.js) - Latest V3 dataset with offers"
    echo "  3) quickImport (quickImport.js)     - Quick V2 import (minimal)"
    echo "  4) quickImportV3 (quickImportV3.js) - Quick V3 import (minimal)"
    echo "  5) mockData5EndToEndTesting (importMockData5.js) - New E2E Test data"
    echo "  6) mockData5 + Big Brewski - E2E data + real restaurant"
    echo "  7) Big Brewski only - standalone real restaurant"
    echo "  8) mockData6 (Toit + Karavalli, big realistic)"
    echo "  9) mockData7 (5 Bangalore restaurants, goal-line seed) [recommended]"
    echo " 10) Skip mock data import"
    echo ""

    while true; do
        read "choice?Enter your choice [1-10]: "
        case $choice in
            1)
                MOCK_SCRIPT="importMockDataV2.js"
                MOCK_NAME="mockDataV2"
                break
                ;;
            2)
                MOCK_SCRIPT="importMockDataV3.js"
                MOCK_NAME="mockDataV3"
                break
                ;;
            3)
                MOCK_SCRIPT="quickImport.js"
                MOCK_NAME="quickImport (V2)"
                break
                ;;
            4)
                MOCK_SCRIPT="quickImportV3.js"
                MOCK_NAME="quickImportV3"
                break
                ;;
            5)
                MOCK_SCRIPT="importMockData5.js"
                MOCK_NAME="mockData5EndToEndTesting"
                break
                ;;
            6)
                MOCK_SCRIPT="importMockData5.js"
                MOCK_NAME="mockData5 + Big Brewski"
                MOCK_EXTRA_ARGS="--include=$BIG_BREWSKI_FILE"
                break
                ;;
            7)
                MOCK_SCRIPT="importMockData5.js"
                MOCK_NAME="Big Brewski only"
                MOCK_EXTRA_ARGS="--file=$BIG_BREWSKI_FILE"
                break
                ;;
            8)
                MOCK_SCRIPT="importMockData5.js"
                MOCK_NAME="mockData6 (Toit + Karavalli)"
                MOCK_EXTRA_ARGS="--file=$MOCK_DIR/MockData6BigRestaurants.json --clean --refresh-timestamps"
                break
                ;;
            9)
                MOCK_SCRIPT="importMockData5.js"
                MOCK_NAME="mockData7 (goal-line, 5 restaurants)"
                MOCK_EXTRA_ARGS="--file=$MOCK_DIR/MockData7ProductionMenus.json --clean --refresh-timestamps"
                break
                ;;
            10)
                MOCK_SCRIPT=""
                MOCK_NAME="(skipped)"
                break
                ;;
            *)
                log_warn "Invalid choice. Please enter 1-10."
                ;;
        esac
    done
    
    log_info "Selected: $MOCK_NAME"
}

# -----------------------------------------------------------------------------
# Create Log Directories
# -----------------------------------------------------------------------------
setup_log_dirs() {
    log_step "Setting up log directories"
    
    mkdir -p "$EMULATOR_LOG_DIR"
    mkdir -p "$FLUTTER_LOG_DIR"
    
    # Truncate log files
    : > "$EMULATOR_LOG"
    : > "$SERVER_LOG"
    : > "$CONSUMER_LOG"
    : > "$KITCHEN_LOG"
    : > "$ADMIN_LOG"
    
    log_success "Log directories ready"
    log_info "Emulator logs: $EMULATOR_LOG"
    log_info "Server logs:   $SERVER_LOG"
    log_info "Consumer logs: $CONSUMER_LOG"
    log_info "Kitchen logs:  $KITCHEN_LOG"
    log_info "Admin logs:    $ADMIN_LOG"
}

# -----------------------------------------------------------------------------
# Launch Firebase Emulator in iTerm Tab
# -----------------------------------------------------------------------------
launch_emulator_tab() {
    log_step "Launching Firebase Emulator in new iTerm tab"
    
    local tab_name="Firebase Emulator"
    local emulator_cmd="cd $BACKEND_DIR && echo Starting Firebase Emulator... && npm run emulators 2>&1 | tee $EMULATOR_LOG"
    
    osascript - "$tab_name" "$emulator_cmd" <<'APPLESCRIPT'
on run argv
    set tabName to item 1 of argv
    set cmd to item 2 of argv
    tell application "iTerm"
        tell current window
            set newTab to (create tab with default profile)
            tell newTab
                tell current session
                    set name to tabName
                    write text cmd
                end tell
            end tell
        end tell
    end tell
end run
APPLESCRIPT
    
    log_success "Emulator tab created: $tab_name"
}

# -----------------------------------------------------------------------------
# Wait for Emulator to be Ready
# -----------------------------------------------------------------------------
wait_for_emulator() {
    log_step "Waiting for Firebase Emulator to start (${EMULATOR_WAIT_SECONDS}s timeout)"
    
    local start_time=$(date +%s)
    local ready=false
    
    for i in {1..$EMULATOR_WAIT_SECONDS}; do
        # Check if emulator is responding
        if curl -s "http://127.0.0.1:$EMULATOR_UI_PORT" > /dev/null 2>&1; then
            ready=true
            break
        fi
        
        # Show progress
        printf "\r${CYAN}[%2d/%ds]${NC} Waiting for emulator..." "$i" "$EMULATOR_WAIT_SECONDS"
        sleep 1
    done
    
    echo "" # New line after progress
    
    if [ "$ready" = true ]; then
        local elapsed=$(($(date +%s) - start_time))
        log_success "Emulator is ready! (took ${elapsed}s)"
        return 0
    else
        log_error "Emulator failed to start within ${EMULATOR_WAIT_SECONDS}s"
        echo ""
        log_error "=== Last 30 lines of emulator log ==="
        if [ -f "$EMULATOR_LOG" ] && [ -s "$EMULATOR_LOG" ]; then
            tail -30 "$EMULATOR_LOG"
        else
            echo "(Log file is empty or not found)"
        fi
        echo ""
        log_error "=== Checking for port conflicts ==="
        for port in $EMULATOR_FIRESTORE_PORT $EMULATOR_FUNCTIONS_PORT $EMULATOR_UI_PORT; do
            if lsof -ti:$port > /dev/null 2>&1; then
                echo "Port $port is in use by:"
                lsof -i:$port
            fi
        done
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Import Mock Data
# -----------------------------------------------------------------------------
import_mock_data() {
    if [ -z "$MOCK_SCRIPT" ]; then
        log_info "Skipping mock data import"
        return 0
    fi
    
    log_step "Importing Mock Data: $MOCK_NAME"
    
    local script_path="$MOCK_DIR/$MOCK_SCRIPT"
    
    if [ ! -f "$script_path" ]; then
        log_error "Mock script not found: $script_path"
        return 1
    fi
    
    log_info "Running: node $MOCK_SCRIPT ${MOCK_EXTRA_ARGS:-}"

    cd "$BACKEND_DIR"

    # Set environment variables for emulator
    export FIRESTORE_EMULATOR_HOST="127.0.0.1:$EMULATOR_FIRESTORE_PORT"
    export FUNCTIONS_EMULATOR=true
    export NODE_ENV=development

    if node "$script_path" ${=MOCK_EXTRA_ARGS}; then
        log_success "Mock data imported successfully"
    else
        log_error "Mock data import failed"
        log_error "Check the script output above for details"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Launch Flutter Server App in iTerm Tab
# -----------------------------------------------------------------------------
launch_server_app_tab() {
    log_step "Launching Server App in new iTerm tab"
    
    local tab_name="Server App ($SERVER_APP_PORT)"
    local flutter_cmd="cd $SERVER_APP_DIR && echo Starting Server App... && flutter run -d chrome --web-hostname 127.0.0.1 --web-port $SERVER_APP_PORT 2>&1 | tee $SERVER_LOG"
    
    osascript - "$tab_name" "$flutter_cmd" <<'APPLESCRIPT'
on run argv
    set tabName to item 1 of argv
    set cmd to item 2 of argv
    tell application "iTerm"
        tell current window
            set newTab to (create tab with default profile)
            tell newTab
                tell current session
                    set name to tabName
                    write text cmd
                end tell
            end tell
        end tell
    end tell
end run
APPLESCRIPT
    
    log_success "Server App tab created: $tab_name"
    log_info "URL: http://127.0.0.1:$SERVER_APP_PORT"
}

# -----------------------------------------------------------------------------
# Launch Flutter Consumer App in iTerm Tab
# -----------------------------------------------------------------------------
launch_consumer_app_tab() {
    log_step "Launching Consumer App in new iTerm tab"
    
    local tab_name="Consumer App ($CONSUMER_APP_PORT)"
    local flutter_cmd="cd $CONSUMER_APP_DIR && echo Starting Consumer App... && flutter run -d chrome --web-hostname 127.0.0.1 --web-port $CONSUMER_APP_PORT 2>&1 | tee $CONSUMER_LOG"
    
    osascript - "$tab_name" "$flutter_cmd" <<'APPLESCRIPT'
on run argv
    set tabName to item 1 of argv
    set cmd to item 2 of argv
    tell application "iTerm"
        tell current window
            set newTab to (create tab with default profile)
            tell newTab
                tell current session
                    set name to tabName
                    write text cmd
                end tell
            end tell
        end tell
    end tell
end run
APPLESCRIPT
    
    log_success "Consumer App tab created: $tab_name"
    log_info "URL: http://127.0.0.1:$CONSUMER_APP_PORT"
}

# -----------------------------------------------------------------------------
# Launch Flutter Kitchen App in iTerm Tab
# -----------------------------------------------------------------------------
launch_kitchen_app_tab() {
    log_step "Launching Kitchen App in new iTerm tab"
    
    local tab_name="Kitchen App ($KITCHEN_APP_PORT)"
    local flutter_cmd="cd $KITCHEN_APP_DIR && echo Starting Kitchen App... && flutter run -d chrome --web-hostname 127.0.0.1 --web-port $KITCHEN_APP_PORT 2>&1 | tee $KITCHEN_LOG"
    
    osascript - "$tab_name" "$flutter_cmd" <<'APPLESCRIPT'
on run argv
    set tabName to item 1 of argv
    set cmd to item 2 of argv
    tell application "iTerm"
        tell current window
            set newTab to (create tab with default profile)
            tell newTab
                tell current session
                    set name to tabName
                    write text cmd
                end tell
            end tell
        end tell
    end tell
end run
APPLESCRIPT
    
    log_success "Kitchen App tab created: $tab_name"
    log_info "URL: http://127.0.0.1:$KITCHEN_APP_PORT"
}

# -----------------------------------------------------------------------------
# Launch Flutter Admin App in iTerm Tab
# -----------------------------------------------------------------------------
launch_admin_app_tab() {
    log_step "Launching Admin App in new iTerm tab"
    
    local tab_name="Admin App ($ADMIN_APP_PORT)"
    local flutter_cmd="cd $ADMIN_APP_DIR && echo Starting Admin App... && flutter run -d chrome --web-hostname 127.0.0.1 --web-port $ADMIN_APP_PORT 2>&1 | tee $ADMIN_LOG"
    
    osascript - "$tab_name" "$flutter_cmd" <<'APPLESCRIPT'
on run argv
    set tabName to item 1 of argv
    set cmd to item 2 of argv
    tell application "iTerm"
        tell current window
            set newTab to (create tab with default profile)
            tell newTab
                tell current session
                    set name to tabName
                    write text cmd
                end tell
            end tell
        end tell
    end tell
end run
APPLESCRIPT
    
    log_success "Admin App tab created: $tab_name"
    log_info "URL: http://127.0.0.1:$ADMIN_APP_PORT"
}

# -----------------------------------------------------------------------------
# Print Summary
# -----------------------------------------------------------------------------
print_summary() {
    log_step "🎉 All Services Launched!"
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}                    DEVELOPMENT ENVIRONMENT READY${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${CYAN}Firebase Emulator UI:${NC}  http://127.0.0.1:$EMULATOR_UI_PORT"
    echo -e "  ${CYAN}Firestore Emulator:${NC}   http://127.0.0.1:$EMULATOR_FIRESTORE_PORT"
    echo -e "  ${CYAN}Functions Emulator:${NC}   http://127.0.0.1:$EMULATOR_FUNCTIONS_PORT"
    echo ""
    echo -e "  ${CYAN}Server App:${NC}           http://127.0.0.1:$SERVER_APP_PORT"
    echo -e "  ${CYAN}Consumer App:${NC}         http://127.0.0.1:$CONSUMER_APP_PORT"
    echo -e "  ${CYAN}Kitchen App:${NC}          http://127.0.0.1:$KITCHEN_APP_PORT"
    echo -e "  ${CYAN}Admin App:${NC}            http://127.0.0.1:$ADMIN_APP_PORT"
    echo ""
    echo -e "  ${CYAN}Mock Data:${NC}            $MOCK_NAME"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}                         LOG FILES${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  Emulator:  $EMULATOR_LOG"
    echo -e "  Server:    $SERVER_LOG"
    echo -e "  Consumer:  $CONSUMER_LOG"
    echo -e "  Kitchen:   $KITCHEN_LOG"
    echo -e "  Admin:     $ADMIN_LOG"
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}                      HOT RELOAD TIPS${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  In Flutter app tabs:"
    echo -e "    ${GREEN}r${NC} - Hot reload (preserves state)"
    echo -e "    ${GREEN}R${NC} - Hot restart (resets state)"
    echo -e "    ${GREEN}q${NC} - Quit"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------
main() {
    echo ""
    echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║     🚀 PLATTR PRO - GOD-LEVEL DEVELOPMENT LAUNCHER 🚀        ║${NC}"
    echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Step 1: Select mock data
    select_mock_data
    
    # Step 2: Cleanup existing processes
    cleanup_processes
    
    # Step 3: Setup log directories
    setup_log_dirs
    
    # Step 4: Launch emulator in new tab
    launch_emulator_tab
    
    # Step 5: Wait for emulator to be ready
    if ! wait_for_emulator; then
        log_error "Aborting due to emulator startup failure"
        exit 1
    fi
    
    # Step 6: Import mock data
    if ! import_mock_data; then
        log_warn "Mock data import had issues, but continuing..."
    fi
    
    # Step 7: Launch Flutter apps
    sleep 2  # Brief pause before launching apps
    launch_server_app_tab
    sleep 1
    launch_consumer_app_tab
    sleep 1
    launch_kitchen_app_tab
    sleep 1
    launch_admin_app_tab
    
    # Step 8: Print summary
    sleep 2
    print_summary
}

# Run main function
main "$@"
