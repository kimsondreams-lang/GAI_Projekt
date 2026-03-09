import json, os
p = 'data/gai_db.json'
if os.path.exists(p):
    with open(p, 'r') as f: d = json.load(f)
    if 'agentState' in d: d['agentState']['toolStats'] = {}
    with open(p, 'w') as f: json.dump(d, f, indent=2)
