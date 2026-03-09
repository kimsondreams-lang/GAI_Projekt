import json
import os

path = 'data/articles/apple-watch-ultra-2-review.json'
try:
    with open(path, 'rb') as f:
        raw = f.read()
    
    # Try to decode and handle double encoding or escaped quotes
    content = raw.decode('utf-8').strip()
    
    # If it starts and ends with quotes, it might be a JSON string containing JSON
    if content.startswith('\"') and content.endswith('\"'):
        content = json.loads(content)
    
    data = json.loads(content)
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f'Successfully repaired {path}')
except Exception as e:
    print(f'Error: {e}')
    # Fallback: try to find the first { and last }
    try:
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != 0:
            data = json.loads(content[start:end])
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f'Repaired via slicing {path}')
    except Exception as e2:
        print(f'Fallback failed: {e2}')
