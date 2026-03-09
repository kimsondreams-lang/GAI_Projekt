import json
import os

path = 'data/articles/apple-watch-ultra-2-review.json'
try:
    if not os.path.exists(path):
        print(f'File {path} not found')
        exit(0)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Handle double encoding
    data = json.loads(content)
    while isinstance(data, str):
        data = json.loads(data)
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f'Successfully repaired {path}')
except Exception as e:
    print(f'Error repairing {path}: {e}')
