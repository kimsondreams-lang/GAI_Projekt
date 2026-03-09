import json
import os
import re

files = [
    'data/articles/best-gaming-accessories-2025.json',
    'data/articles/sony-wh-1000xm5-review.json',
    'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
]

def aggressive_repair(path):
    if not os.path.exists(path):
        return f'MISSING: {path}'
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        current = content
        iterations = 0
        success = False
        
        # Loop to collapse backslashes
        while iterations < 5:
            # Try to parse current state
            try:
                data = json.loads(current)
                # If it parses, check if 'content' still has literal double backslashes
                if isinstance(data.get('content'), str) and '\\\\' in data['content']:
                    data['content'] = data['content'].replace('\\\\n', '\n').replace('\\\\\"', '\"')
                    current = json.dumps(data, indent=2, ensure_ascii=False)
                else:
                    # Fully repaired
                    with open(path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    success = True
                    break
            except json.JSONDecodeError:
                # If it doesn't parse, try to fix the raw string
                new_content = current.replace('\\\\', '\\')
                if new_content == current:
                    # Try specific fixes for common corruption patterns
                    new_content = current.replace('\\\"', '\"').replace('\\n', '\n')
                
                if new_content == current:
                    break
                current = new_content
            
            iterations += 1

        if success:
            return f'FIXED (v10): {path}'
        else:
            # Final attempt: Regex to force valid escaping
            # Replace any sequence of backslashes followed by " with just \"
            fixed = re.sub(r'\\+"', r'\"', content)
            fixed = re.sub(r'\\+n', r'\n', fixed)
            try:
                data = json.loads(fixed)
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                return f'FIXED (Regex Force): {path}'
            except Exception as e:
                return f'FAILED: {path} - {str(e)}'
                
    except Exception as e:
        return f'ERROR: {path} - {str(e)}'

if __name__ == "__main__":
    for f in files:
        print(aggressive_repair(f))