import json
import re
import os

path = 'data/articles/sony-wh-1000xm5-review.json'
print(f'Attempting final repair for {path}...')

try:
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read()

    # The issue is unescaped quotes in HTML attributes within the 'content' string.
    # We find the content boundaries.
    start_marker = '\"content\": \"'
    end_marker = '\",\n  \"featured\"'
    
    s_idx = raw.find(start_marker)
    if s_idx == -1:
        print('Start marker not found')
        exit(1)
    
    s_idx += len(start_marker)
    e_idx = raw.find(end_marker, s_idx)
    
    if e_idx == -1:
        # Try alternative end marker
        end_marker = '\",\n  \"views\"'
        e_idx = raw.find(end_marker, s_idx)

    if e_idx == -1:
        print('End marker not found')
        exit(1)

    inner = raw[s_idx:e_idx]
    
    # Strategy: 
    # 1. Replace any existing escaped quotes with a placeholder to avoid double-escaping
    # 2. Escape all remaining quotes
    # 3. Restore placeholders
    
    placeholder = \"__ESCAPED_QUOTE__\"
    step1 = inner.replace('\\\\\\\"', placeholder) # Handle already escaped quotes
    step2 = step1.replace('\"', '\\\\\\\"')
    final_inner = step2.replace(placeholder, '\\\\\\\"')
    
    new_raw = raw[:s_idx] + final_inner + raw[e_idx:]
    
    # Validate
    try:
        data = json.loads(new_raw)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print('Successfully repaired and formatted JSON.')
    except json.JSONDecodeError as e:
        print(f'JSON validation failed: {e}')
        # If it failed, let's try a simpler regex for HTML attributes specifically
        print('Trying attribute-specific regex...')
        # This regex looks for attr=\"value\" where the quote is NOT escaped
        fixed_inner_alt = re.sub(r'([a-z]+)=([\\\\\"]*)(\"|\\\\\\\")([^\\\"\\\\]*)(\"|\\\\\\\")', r'\1=\\\\\"\4\\\\\"', inner)
        new_raw_alt = raw[:s_idx] + fixed_inner_alt + raw[e_idx:]
        data = json.loads(new_raw_alt)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print('Successfully repaired using attribute regex.')

except Exception as e:
    print(f'Error: {e}')
