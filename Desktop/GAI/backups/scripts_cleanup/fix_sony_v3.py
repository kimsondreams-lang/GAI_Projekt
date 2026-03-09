import re
import json

path = 'data/articles/sony-wh-1000xm5-review.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Regex to find the content field and its value
# It captures: 1) prefix, 2) the inner HTML, 3) the suffix starting with the next key
pattern = r'(\"content\":\s*\")(.*?)(\",\s*\"(?:featured|views|gallery|likes)\")'

def clean_html(match):
    prefix = match.group(1)
    inner = match.group(2)
    suffix = match.group(3)
    
    # Step 1: Normalize by removing existing escapes to avoid double escaping
    # We replace \" with "
    normalized = inner.replace('\\\"', '\"')
    
    # Step 2: Escape all double quotes for JSON compatibility
    # We replace " with \"
    escaped = normalized.replace('\"', '\\\"')
    
    return prefix + escaped + suffix

fixed_content = re.sub(pattern, clean_html, content, flags=re.DOTALL)

try:
    # Validate if it's now valid JSON
    json_data = json.loads(fixed_content)
    # Save with proper formatting
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    print('SUCCESS: Sony JSON repaired and validated.')
except json.JSONDecodeError as e:
    print(f'FAILURE: JSON still invalid: {e}')
    # Print a snippet around the error
    pos = e.pos
    start = max(0, pos - 40)
    end = min(len(fixed_content), pos + 40)
    print(f'Context: ...{fixed_content[start:pos]}>>>ERROR<<<{fixed_content[pos:end]}...')
