import os
import json
import re

def repair_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Fix double escaped quotes
        content = content.replace('\\\"', '\"')
        # Fix double escaped newlines
        content = content.replace('\\\\n', '\\n')
        # Fix specific HTML error in best-gaming-accessories-2025.json
        content = content.replace('target=\\\" _blank\\\'=\\\"\\\"', 'target=\\\"_blank\\\"')
        
        # Try to parse
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            # If still failing, try a more aggressive approach for the razer file which seems to have escaped everything
            if 'razer-v4' in file_path:
                # Remove leading/trailing quotes if it's a string-wrapped JSON
                content = content.strip().strip('\"')
                data = json.loads(content)
            else:
                raise e

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f'SUCCESS: Repaired {file_path}')
        return True
    except Exception as e:
        print(f'FAILED: {file_path} - {e}')
        return False

if __name__ == \"__main__\":
    repair_json('data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json')
    repair_json('data/articles/best-gaming-accessories-2025.json')
