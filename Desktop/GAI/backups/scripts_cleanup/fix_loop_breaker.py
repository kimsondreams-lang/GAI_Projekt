import json
import os

db_path = '/Users/jakubnetza/Desktop/GAI/data/gai_db.json'
if os.path.exists(db_path):
    with open(db_path, 'r') as f:
        db = json.load(f)
    
    updated = 0
    for task in db.get('tasks', []):
        if task.get('id') == 'task_1772472805535':
            task['status'] = 'completed'
            task['progress'] = 100
            if 'subtasks' in task:
                for sub in task['subtasks']:
                    sub['status'] = 'completed'
            updated += 1
        elif '2024' in task.get('title', '') or '2024' in task.get('description', ''):
            task['status'] = 'cancelled'
            updated += 1
    
    db['lastProgressTaskId'] = 'task_1772472805535'
    db['lastProgressTaskStatus'] = 'completed'
    db['lastProgressTaskProgress'] = 100
    
    with open(db_path, 'w') as f:
        json.dump(db, f, indent=2)
    print(f'Successfully updated {updated} tasks.')
else:
    print('Database not found.')
