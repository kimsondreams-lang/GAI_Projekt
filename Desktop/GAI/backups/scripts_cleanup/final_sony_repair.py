import json
import os

path = 'data/articles/sony-wh-1000xm5-review.json'
print(f'Repairing {path}...')

try:
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read()

    # Find the boundaries of the 'content' value
    start_marker = '\"content\": \"'
    s_idx = raw.find(start_marker)
    if s_idx == -1:
        print('Error: Start marker not found')
        exit(1)
    
    s_idx += len(start_marker)
    
    # The content ends before the next key (featured, views, etc.)
    end_marker = '\",\n  \"featured\"'
    e_idx = raw.find(end_marker, s_idx)
    if e_idx == -1:
        end_marker = '\",\n  \"views\"'
        e_idx = raw.find(end_marker, s_idx)
    
    if e_idx == -1:
        print('Error: End marker not found')
        exit(1)

    inner_content = raw[s_idx:e_idx]
    
    # Step 1: Normalize - replace any existing escaped quotes with raw quotes
    # We use string.replace with literal backslash and quote
    normalized = inner_content.replace('\\\"', '\"')
    
    # Step 2: Escape all quotes for JSON
    escaped = normalized.replace('\"', '\\\"')
    
    # Reconstruct the file
    new_raw = raw[:s_idx] + escaped + raw[e_idx:]
    
    # Validate
    data = json.loads(new_raw)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print('SUCCESS: File repaired and formatted.')

except Exception as e:
    print(f'FATAL ERROR: {e}')
    exit(1)
