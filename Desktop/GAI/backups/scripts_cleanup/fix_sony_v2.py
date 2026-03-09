import json
import os

path = 'data/articles/sony-wh-1000xm5-review.json'
try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Manual repair of the specific problematic area around char 1068
    # The head output showed: <div class=\"article-image-wrapper\">\n    <img 
    # It seems the quotes in HTML attributes are the issue.
    
    # Let's try a more surgical approach: 
    # 1. Find the 'content' value
    # 2. Escape all double quotes that are NOT preceded by a backslash
    # 3. Reconstruct the JSON
    
    import re
    
    # This regex finds the content string by looking for the start and end markers
    match = re.search(r'(\"content\":\s*\")(.*?)(\",\s*\"featured\")', content, re.DOTALL)
    if match:
        prefix = match.group(1)
        inner = match.group(2)
        suffix = match.group(3)
        
        # Replace unescaped quotes with escaped ones
        # We look for a quote that doesn't have a backslash before it
        fixed_inner = re.sub(r'(?<!\\)\"', r'\\"', inner)
        
        new_content = content[:match.start()] + prefix + fixed_inner + suffix + content[match.end():]
        
        # Test if it's valid JSON now
        data = json.loads(new_content)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print('Successfully fixed sony-wh-1000xm5-review.json')
    else:
        print('Could not find content block with regex')
except Exception as e:
    print(f'Error: {e}')
