import json
import re
import os

def repair_file(path, fix_fn):
    if not os.path.exists(path):
        print(f'File not found: {path}')
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixed_content = fix_fn(content)
    
    try:
        # Validate JSON
        data = json.loads(fixed_content)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f'Successfully repaired and validated: {path}')
    except Exception as e:
        print(f'Failed to validate {path}: {e}')
        # Debug: print a snippet around the error if possible
        if hasattr(e, 'pos'):
            start = max(0, e.pos - 50)
            end = min(len(fixed_content), e.pos + 50)
            print(f'Error context: ...{fixed_content[start:end]}...')

def fix_razer(content):
    # Remove literal backslashes before quotes
    fixed = content.replace('\\\"', '"')
    # Fix double escaped newlines
    fixed = fixed.replace('\\\\n', '\\n')
    # If the file is wrapped in extra quotes
    fixed = fixed.strip()
    if fixed.startswith('"') and fixed.endswith('"'):
        fixed = fixed[1:-1]
    return fixed

def fix_accessories(content):
    # Fix the specific malformed target attribute
    # Pattern: tag=kimsondreams-21 target=\" _blank'=\"\"
    fixed = content.replace('tag=kimsondreams-21 target=\\\" _blank\'=\\\"\\\"', 'tag=kimsondreams-21\\\" target=\\\"_blank\\\"')
    fixed = fixed.replace('tag=kimsondreams-21 target=\\\" _blank\'=\\\""', 'tag=kimsondreams-21\\\" target=\\\"_blank\\\"')
    # General regex for any similar mangled target in this file
    fixed = re.sub(r'tag=kimsondreams-21\s+target=\\\"\s*_blank[^>]*?\\\"', r'tag=kimsondreams-21\\\" target=\\\"_blank\\\"', fixed)
    return fixed

if __name__ == '__main__':
    repair_file('data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json', fix_razer)
    repair_file('data/articles/best-gaming-accessories-2025.json', fix_accessories)
