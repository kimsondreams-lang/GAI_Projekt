import os
import json

path = 'data/articles/apple-watch-ultra-2-review.json'
try:
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove literal backslashes before quotes
        fixed = content.replace('\\\"', '\"')
        
        # Try to parse to ensure it's valid now
        data = json.loads(fixed)
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'Successfully fixed and formatted {path}')
    else:
        print(f'File {path} not found')
except Exception as e:
    print(f'Error: {e}')
    # If it's still failing, it might be double-wrapped in quotes
    try:
        data = json.loads(json.loads(content))
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'Fixed via double json.loads {path}')
    except:
        print('Emergency fix failed.')
