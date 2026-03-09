import json
import os

p = 'data/articles/sony-wh-1000xm5-review.json'
try:
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()

    # Find content field boundaries
    start_marker = '\"content\": \"'
    start_idx = c.find(start_marker)
    if start_idx == -1:
        print('Error: content start not found')
        exit(1)
    
    s = start_idx + len(start_marker)
    
    # Find end of content (next key)
    end_marker = '\",\n  \"featured\"'
    e = c.find(end_marker, s)
    if e == -1:
        end_marker = '\",\n  \"views\"'
        e = c.find(end_marker, s)

    if e == -1:
        print('Error: content end not found')
        exit(1)

    # Extract and clean HTML
    html_part = c[s:e]
    # Remove existing escapes to get raw HTML, then use json.dumps for perfect escaping
    raw_html = html_part.replace('\\\"', '\"').replace('\\\\', '\\')
    fixed_inner = json.dumps(raw_html, ensure_ascii=False)[1:-1]
    
    # Reconstruct and validate
    new_json_str = c[:s] + fixed_inner + c[e:]
    data = json.loads(new_json_str)
    
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print('SUCCESS')
except Exception as err:
    print(f'FAILED: {err}')
