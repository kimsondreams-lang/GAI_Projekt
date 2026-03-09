import json
import os

files = [
    'data/articles/best-gaming-accessories-2025.json',
    'data/articles/sony-wh-1000xm5-review.json',
    'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
]

def repair(path):
    if not os.path.exists(path):
        print(f'File not found: {path}')
        return
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # The corruption pattern identified: .jpg" followed by a space or tag end
    # In the raw file, escaped quotes look like \"
    # The sed command likely left a raw " after .jpg
    
    # Fix: .jpg" -> .jpg\"
    # We target the specific pattern seen in logs to avoid false positives
    fixed = content.replace('.jpg" alt=\"', '.jpg\" alt=\"')
    fixed = fixed.replace('.jpg" class=\"', '.jpg\" class=\"')
    fixed = fixed.replace('.jpg">', '.jpg\">')
    
    try:
        json.loads(fixed)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'Successfully repaired {path}')
    except json.JSONDecodeError as e:
        print(f'Failed to repair {path}: {e}')
        # Try a more aggressive approach if simple replace fails
        # Find all .jpg" and replace with .jpg\" if not already escaped
        import re
        fixed_agg = re.sub(r'\.jpg(?<!\\)"', r'.jpg\"', content)
        try:
            json.loads(fixed_agg)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(fixed_agg)
            print(f'Successfully repaired {path} using regex.')
        except:
            print(f'Aggressive repair failed for {path}')

if __name__ == "__main__":
    for f in files:
        repair(f)