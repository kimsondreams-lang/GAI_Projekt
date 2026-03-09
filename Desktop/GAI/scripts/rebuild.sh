#!/usr/bin/env bash
set -euo pipefail

# GAI OS Rebuild Script
# Safely stops gaios, rebuilds the project, and restarts
# Runs in background to prevent killing the agent process

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_PATH/.." && pwd)"
LOG_FILE="$ROOT_DIR/.gaios/rebuild.log"

# Ensure log directory exists
mkdir -p "$ROOT_DIR/.gaios"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Run the rebuild sequence in background with delay
(
    # Wait for agent to finish current operation
    sleep 3
    
    log "=== Starting GAI OS Rebuild ==="
    
    # Change to project root
    cd "$ROOT_DIR"
    
    # Step 1: Stop gaios
    log "Step 1: Stopping gaios..."
    if "$SCRIPT_PATH/gaios" stop >> "$LOG_FILE" 2>&1; then
        log "✓ gaios stopped successfully"
    else
        log "⚠ gaios stop returned non-zero (may already be stopped)"
    fi
    
    # Wait a moment for processes to fully terminate
    sleep 2
    
    # Step 2: Run npm build
    log "Step 2: Running npm run build..."
    if npm run build >> "$LOG_FILE" 2>&1; then
        log "✓ Build completed successfully"
    else
        log "✗ Build failed! Check $LOG_FILE for details"
        exit 1
    fi
    
    # Step 3: Start gaios
    log "Step 3: Starting gaios..."
    if "$SCRIPT_PATH/gaios" start >> "$LOG_FILE" 2>&1; then
        log "✓ gaios started successfully"
    else
        log "✗ Failed to start gaios! Check $LOG_FILE for details"
        exit 1
    fi
    
    log "=== Rebuild completed successfully ==="
) &

# Detach the background process
disown

echo "Rebuild started in background (PID: $!)"
echo "Log file: $LOG_FILE"
echo "The system will stop, rebuild, and restart automatically."
