# Autonomy Framework v2.0 - Loop Breaking System
## Problem Analysis
Root causes: cooldownMs too low (3000ms), no exponential backoff, task-agnostic thresholds.
## Solution
1. Adaptive Retry Logic with exponential backoff
2. Task-Specific Cooldowns (FTP: 15s, API: 10s, FILE: 5s)
3. Loop Detection via signature tracking
4. Recovery Strategies: Tool Substitution, Task Decomposition, Human Escalation
