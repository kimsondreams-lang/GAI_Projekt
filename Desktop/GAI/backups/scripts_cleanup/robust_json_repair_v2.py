import json
import os
import re

def robust_repair(file_path):
    if not os.path.exists(file_path):
        return False, "File not found"
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            raw_content = f.read()
        
        # Try to load as JSON first
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError:
            # If it fails, it might be double-escaped at the top level (rare but possible)
            # Or it might have unescaped quotes in content. 
            # Let's try a simple unescape for common patterns if it's not valid JSON
            raw_content = raw_content.replace('\\\"', '"').replace('\\n', '\n')
            data = json.loads(raw_content)

        # Function to recursively clean strings in the JSON object
        def clean_value(v):
            if isinstance(v, str):
                # Replace double-escaped quotes and newlines
                # We do this carefully to not break valid single escapes
                v = v.replace('\\\"', '"').replace('\\n', '\n')
                return v
            elif isinstance(v, list):
                return [clean_value(i) for i in v]
            elif isinstance(v, dict):
                return {k: clean_value(val) for k, val in v.items()}
            return v

        cleaned_data = clean_value(data)
        
        # Write back clean JSON
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
        
        return True, "Success"
    except Exception as e:
        return False, str(e)

files_to_fix = [
    'data/articles/best-gaming-accessories-2025.json',
    'data/articles/sony-wh-1000xm5-review.json',
    'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
]

for f in files_to_fix:
    ok, msg = robust_repair(f)
    print(f"{f}: {msg}")
