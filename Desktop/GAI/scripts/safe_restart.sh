#!/usr/bin/env bash
set -euo pipefail

# GAIOS Safe Restart Script
# Comprehensive restart with build and error handling
# Version 1.0 - March 2026
# Integrates with scripts/gaios restart

SCRIPT_DIR=\"\$(cd \"\$(dirname \"\${BASH_SOURCE[0]}\")\" && pwd)\"
ROOT_DIR=\"\$(cd \"\$SCRIPT_DIR/..\" && pwd)\"
STATE_DIR=\"\$ROOT_DIR/.gaios\"

# Function to log messages with timestamp
log() {
    echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$1\"
}

# Function to check if command exists
check_command() {
    if ! command -v \"\$1\" >/dev/null 2>&1; then
        log \"ERROR: Command '\$1' not found in PATH\"
        return 1
    fi
    return 0
}

# Function to check if a process is alive
is_pid_alive() {
    local pid=\"\$1\"
    kill -0 \"\$pid\" 2>/dev/null
}

# Function to stop process by PID file
stop_pidfile() {
    local pidfile=\"\$1\"
    local name=\"\$2\"
    
    if [[ -f \"\$pidfile\
