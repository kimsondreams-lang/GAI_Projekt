import json
import re
import os

files = [
    'data/articles/best-gaming-accessories-2025.json',
    'data/articles/sony-wh-1000xm5-review.json',
    'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
]

def repair_json(path):
    print(f'Repairing {path}...')
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern: .jpg followed by a quote that is NOT escaped
    # In raw file, an escaped quote is \"
    # A corrupted quote is just "
    # We look for .jpg" and replace with .jpg\"
    
    # Use regex to find .jpg" where " is not preceded by \
    # Note: in Python strings, we need to be careful with backslashes.
    # Raw string r'.jpg(?<!\\)"' matches .jpg followed by " NOT preceded by \
    fixed = re.sub(r'\.jpg(?<!\\)"', r'.jpg\"', content)
    fixed = re.sub(r'\.png(?<!\\)"', r'.png\"', fixed)
    
    try:
        json.loads(fixed)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f'SUCCESS: {path} is now valid JSON.')
        return True
    except json.JSONDecodeError as e:
        print(f'STILL FAILING: {path} at {e.pos}: {e.msg}')
        # Show context of new failure
        start = max(0, e.pos - 20)
        print(f'Context: {fixed[start:e.pos+20]}')
        return False

if __name__ == "__main__":
    for f in files:
        repair_json(f)
