import json
import os
import re

def fix_razer():
    path = 'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
    if not os.path.exists(path): return
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        # Handle double encoding or malformed string-wrapped JSON
        try:
            data = json.loads(content)
            if isinstance(data, str):
                data = json.loads(data)
        except:
            # Manual unescape if it's a malformed object string
            fixed = content.replace('\\\\\\\"', '\"').replace('\\\\n', '\n')
            if fixed.startswith('\"') and fixed.endswith('\"'):
                fixed = fixed[1:-1]
            data = json.loads(fixed)
            
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print('SUCCESS: Razer fixed')
    except Exception as e:
        print(f'FAILED: Razer: {e}')

def fix_accessories():
    path = 'data/articles/best-gaming-accessories-2025.json'
    if not os.path.exists(path): return
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix the specific malformed target attribute: target=\\\\\" _blank'=\\\\\"\\\\\"
        fixed_content = re.sub(r'target=[\\\"\'\s]+_blank[^>]*?[\\\"\'\s]+', 'target=\"_blank\"', content)
        
        # Validate and pretty print
        data = json.loads(fixed_content)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print('SUCCESS: Accessories fixed')
    except Exception as e:
        print(f'FAILED: Accessories: {e}')

if __name__ == '__main__':
    fix_razer()
    fix_accessories()
