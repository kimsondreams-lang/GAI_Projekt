#!/bin/bash

# Monitoring script for GAI OS (1 hour duration)
# Checks health every 60 seconds and restarts if needed.

LOG_FILE="monitor_gai_hour.log"
DURATION=3600
INTERVAL=60
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))

echo "Starting GAI OS Monitoring for 1 hour..." | tee -a "$LOG_FILE"
echo "Start Time: $(date)" | tee -a "$LOG_FILE"

while [ $(date +%s) -lt $END_TIME ]; do
    CURRENT_TIME=$(date)
    echo "[$CURRENT_TIME] Checking system status..." | tee -a "$LOG_FILE"

    # Check process status using gaios script
    STATUS_OUTPUT=$(./scripts/gaios status)
    
    # Check API health
    HEALTH_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:1234/api/health)
    
    if [[ "$STATUS_OUTPUT" == *"System zatrzymany"* ]] || [ "$HEALTH_HTTP_CODE" -ne 200 ]; then
        echo "[$CURRENT_TIME] ⚠️ ALERT: System is down or unhealthy (HTTP $HEALTH_HTTP_CODE). Restarting..." | tee -a "$LOG_FILE"
        ./scripts/gaios restart --web >> "$LOG_FILE" 2>&1
        echo "[$CURRENT_TIME] Restart command issued." | tee -a "$LOG_FILE"
        sleep 10 # Wait for restart
    else
        echo "[$CURRENT_TIME] ✅ System is healthy. (HTTP $HEALTH_HTTP_CODE)" | tee -a "$LOG_FILE"
    fi

    sleep $INTERVAL
done

echo "Monitoring finished at $(date)." | tee -a "$LOG_FILE"
