import json
import os
import re

files = [
    'data/articles/best-gaming-accessories-2025.json',
    'data/articles/sony-wh-1000xm5-review.json',
    'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
]

def repair_file(path):
    if not os.path.exists(path):
        return f'MISSING: {path}'
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Aggressive cleanup of multiple backslashes before quotes and 'n'
        # We want to reach a state where it's just \" and \n
        fixed = content
        
        # Fix the razer file specifically which has 4 or more backslashes
        fixed = fixed.replace('\\\\\\\\"', '\"')
        fixed = fixed.replace('\\\\\\\\n', '\\n')
        
        # Fix double escaping
        fixed = fixed.replace('\\\\"', '\"')
        fixed = fixed.replace('\\\\n', '\\n')
        
        # Try to parse
        try:
            data = json.loads(fixed)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return f'FIXED: {path}'
        except json.JSONDecodeError as e:
            # If still failing, try a more radical approach: 
            # Replace all sequences of 2 or more backslashes with a single one
            # but ONLY if followed by " or n
            fixed2 = re.sub(r'\\{2,}"', r'\"', content)
            fixed2 = re.sub(r'\\{2,}n', r'\\n', fixed2)
            try:
                data = json.loads(fixed2)
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                return f'FIXED (Regex): {path}'
            except:
                return f'FAILED: {path} - {str(e)}'
                
    except Exception as e:
        return f'ERROR: {path} - {str(e)}'

if __name__ == '__main__':
    for f in files:
        print(repair_file(f))