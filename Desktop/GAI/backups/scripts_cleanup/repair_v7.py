import json
import re
import os

def repair_razer():
    path = 'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    try:
        # Try to decode if it's a double-stringified JSON
        data = json.loads(content)
        if isinstance(data, str):
            data = json.loads(data)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f'Successfully repaired Razer (Double-Decoded)')
    except:
        # Fallback: manual replacement of literal escapes
        clean = content.replace('\\\"', '"').replace('\\n', '\n')
        if clean.startswith('"') and clean.endswith('"'): clean = clean[1:-1]
        try:
            data = json.loads(clean)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f'Successfully repaired Razer (Manual Clean)')
        except Exception as e:
            print(f'Failed Razer: {e}')

def repair_accessories():
    path = 'data/articles/best-gaming-accessories-2025.json'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Fix the mangled target attribute
    fixed = content.replace('target=\\" _blank\'=\\"\\"', 'target=\\"_blank\\"')
    fixed = fixed.replace('target=\\" _blank\'=\\""', 'target=\\"_blank\\"')
    
    # 2. Fix unescaped quotes in HTML attributes (e.g., .jpg" -> .jpg\")
    # We look for patterns like src=\"..." and replace the trailing " with \"
    fixed = re.sub(r'(src|alt|href)=\\"([^\\"]+)"', r'\1=\\"\2\\"', fixed)
    
    # 3. Fix specific known broken links from logs
    fixed = fixed.replace('tag=kimsondreams-21 target=', 'tag=kimsondreams-21\\" target=')

    try:
        data = json.loads(fixed)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f'Successfully repaired Accessories')
    except Exception as e:
        print(f'Failed Accessories: {e}')
        if hasattr(e, 'pos'):
            print(f'Context: {fixed[max(0, e.pos-40):min(len(fixed), e.pos+40)]}')

if __name__ == "__main__":
    repair_razer()
    repair_accessories()
