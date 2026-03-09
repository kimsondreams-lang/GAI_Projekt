import json
import os

files = [
    'data/articles/best-gaming-accessories-2025.json',
    'data/articles/sony-wh-1000xm5-review.json',
    'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
]

for f_path in files:
    if not os.path.exists(f_path):
        print(f'{f_path}: MISSING')
        continue
    try:
        with open(f_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        content = data.get('content', '')
        # Check for literal double-escaped quotes or newlines in the string
        has_double_esc_quote = '\\"' in content
        has_double_esc_nl = '\\n' in content
        
        status = 'VALID'
        if has_double_esc_quote or has_double_esc_nl:
            status = 'VALID_BUT_DIRTY (Double-escaped content found)'
            
        print(f'{f_path}: {status}')
    except Exception as e:
        print(f'{f_path}: INVALID - {str(e)}')