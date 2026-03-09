import os
import json
import re

def repair_json_content(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Attempt to fix unescaped quotes in HTML content fields
    # This is tricky. We look for patterns like "content": "..." and try to escape internal quotes.
    # A simpler way for this specific corruption: 
    # Find the start of the content value and the end, then escape quotes in between.
    
    def escape_internal_quotes(match):
        prefix = match.group(1)
        inner_content = match.group(2)
        suffix = match.group(3)
        # Escape quotes that are NOT already escaped
        # Negative lookbehind for backslash
        fixed_inner = re.sub(r'(?<!\\)"', r'\"', inner_content)
        # Also handle newlines which are illegal in JSON strings
        fixed_inner = fixed_inner.replace('\n', '\\n').replace('\r', '\\r')
        return f'{prefix}{fixed_inner}{suffix}'

    # Target fields likely to have HTML: content, subtitle, metaDescription
    fields = ['content', 'subtitle', 'metaDescription', 'description']
    fixed_content = content
    for field in fields:
        pattern = f'("{field}"\s*:\s*")(.*?)("\s*[,\n\r])'
        fixed_content = re.sub(pattern, escape_internal_quotes, fixed_content, flags=re.DOTALL)

    try:
        # Try to parse to verify
        json.loads(fixed_content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        return True, "Fixed"
    except json.JSONDecodeError as e:
        return False, str(e)

articles_dir = 'data/articles'
results = []

for filename in os.listdir(articles_dir):
    if filename.endswith('.json') and filename not in ['index.json', 'schema-index.json']:
        path = os.path.join(articles_dir, filename)
        try:
            with open(path, 'r') as f:
                json.load(f)
            # If it loads, it's fine
        except json.JSONDecodeError:
            success, msg = repair_json_content(path)
            results.append({"file": filename, "success": success, "message": msg})

print(json.dumps(results, indent=2))