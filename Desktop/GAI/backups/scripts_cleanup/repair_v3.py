import json
import re
import os

def fix_razer():
    path = 'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
    if not os.path.exists(path): 
        print(f'File not found: {path}')
        return
    with open(path, 'r') as f:
        content = f.read()
    
    # The file has literal \\\" instead of \"
    # We need to turn \\\" into \" and \\\\n into \\n
    fixed = content.replace('\\\\\\\"', '\"').replace('\\\\n', '\\n')
    
    # If the whole thing was wrapped in quotes as a string
    if fixed.strip().startswith('\"') and fixed.strip().endswith('\"'):
        try:
            # Try to unquote it if it's a JSON string
            fixed = json.loads(fixed)
        except:
            fixed = fixed.strip()[1:-1]

    try:
        # Final check: is it valid JSON now?
        data = json.loads(fixed)
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        print('Fixed Razer file successfully')
    except Exception as e:
        # Fallback: just replace the literal escapes
        manual_fix = content.replace('\\\"', '\"').replace('\\\\n', '\n')
        try:
            data = json.loads(manual_fix)
            with open(path, 'w') as f:
                json.dump(data, f, indent=2)
            print('Fixed Razer file via manual replacement')
        except Exception as e2:
            print(f'Failed to fix Razer file: {e2}')

def fix_accessories():
    path = 'data/articles/best-gaming-accessories-2025.json'
    if not os.path.exists(path): 
        print(f'File not found: {path}')
        return
    with open(path, 'r') as f:
        content = f.read()
    
    # Fix the malformed target attribute: target=\\\" _blank'=\\\"\\\"
    # Correct format: target=\\\"_blank\\\"
    fixed = content.replace('target=\\\" _blank\'=\\\"\\\"', 'target=\\\"_blank\\\"')
    fixed = fixed.replace('target=\\\" _blank\'=\\\"\"', 'target=\\\"_blank\\\"')
    
    # Also fix the missing quote before target if it exists
    fixed = re.sub(r'tag=kimsondreams-21 target=', r'tag=kimsondreams-21\" target=', fixed)
    
    try:
        data = json.loads(fixed)
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        print('Fixed Accessories file successfully')
    except Exception as e:
        print(f'Failed to fix Accessories file: {e}')

if __name__ == '__main__':
    fix_razer()
    fix_accessories()
