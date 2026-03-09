import json
import os
import subprocess

db_path = 'data/gai_db.json'
if os.path.exists(db_path):
    try:
        with open(db_path, 'r') as f:
            data = json.load(f)
        if 'agentState' in data:
            data['agentState']['toolStats'] = {}
            data['agentState']['modelStats'] = {}
            data['agentState']['recentActions'] = []
            if 'loopDetection' in data['agentState']:
                data['agentState']['loopDetection'] = {}
            with open(db_path, 'w') as f:
                json.dump(data, f, indent=2)
            print('Database stats reset successfully.')
    except Exception as e:
        print(f'Error resetting DB: {e}')

# Kill rogue processes
subprocess.run('pkill -9 -f \"node server.js\"', shell=True)
subprocess.run('pkill -9 -f backendWatchdog', shell=True)
subprocess.run('pkill -9 -f autoRestart', shell=True)
print('Rogue processes terminated.')

# Remove lock files
if os.path.exists('data/heartbeat.lock'):
    os.remove('data/heartbeat.lock')
    print('Heartbeat lock removed.')
