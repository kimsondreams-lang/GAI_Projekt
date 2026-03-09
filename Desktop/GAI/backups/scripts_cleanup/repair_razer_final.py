import json
import os

path = 'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'

try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    # Recursive parsing to handle double/triple stringification
    data = content
    while isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            # If it fails, maybe it's just a string with escaped quotes but not a full JSON string
            # Try to fix common escaping issues manually if json.loads fails
            if '\\\"' in data:
                data = data.replace('\\\"', '\"').replace('\\\\n', '\\n')
                continue
            else:
                raise

    if isinstance(data, dict):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'SUCCESS: Repaired {path}')
    else:
        print(f'ERROR: Result is not a dict, it is {type(data)}')
        exit(1)

except Exception as e:
    print(f'FAILED: {str(e)}')
    exit(1)
