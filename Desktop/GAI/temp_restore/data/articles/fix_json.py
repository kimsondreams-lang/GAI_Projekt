import json
import os
import re
import sys
from datetime import datetime

def fix_date_string(date_str):
    \"\"\"Convert date strings like 'September 25, 2024' to '2024-09-25'.\"\"\"
    try:
        # If already in YYYY-MM-DD format, return as is
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return date_str
        # Try to parse common date formats
        for fmt in ('%B %d, %Y', '%b %d, %Y', '%d %B %Y', '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'):
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
    except Exception as e:
        print(f\"  Warning: Could not parse date '{date_str}': {e}\")
    return date_str  # Return original if parsing fails

def fix_json_file(filepath):
    \"\"\"Attempt to fix JSON syntax errors in a file.\"\"\"
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # First, try to parse as-is
        try:
            data = json.loads(content)
            print(f\"{os.path.basename(filepath)}: Already valid JSON\")
            return True
        except json.JSONDecodeError as e:
            print(f\"{os.path.basename(filepath)}: JSON error: {e}\")
        
        # Attempt 1: Remove backslashes before quotes at the start of property names
        # This fixes cases like \\\"id\\\" -> \"id\" but only outside HTML content
        # We'll use a simple regex that targets \\\" at the beginning of lines or after {
        # This is risky, so we'll only apply if the error is about property names
        if 'Expecting property name enclosed in double quotes' in str(e):
            # Pattern: {\\\" or ,\\\" or start of line with spaces and \\\"
            content = re.sub(r'(\\{|\\,|^\\s*)\\\\\\\"', r'\\1\"', content)
            # Also fix closing quotes: \\\":
            content = re.sub(r'\\\\\\\"\\s*:', '\":', content)
        
        # Attempt 2: Fix date field if error is about invalid literal
        if 'invalid literal for int()' in str(e):
            # Find date field and try to fix its value
            date_match = re.search(r'\"date\"\\s*:\\s*\"([^\"]+)\"', content)
            if date_match:
                old_date = date_match.group(1)
                new_date = fix_date_string(old_date)
                if new_date != old_date:
                    content = content.replace(f'\"{old_date}\"', f'\"{new_date}\"')
                    print(f\"  Fixed date: {old_date} -> {new_date}\")
        
        # Attempt 3: For 'Extra data' errors, try to extract first JSON object
        if 'Extra data' in str(e):
            # Find the first complete JSON object (from { to })
            # Simple approach: find first { and matching }
            # This is naive but may work for index.json
            start = content.find('{')
            if start != -1:
                brace_count = 0
                end = start
                for i, ch in enumerate(content[start:], start=start):
                    if ch == '{':
                        brace_count += 1
                    elif ch == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end = i + 1
                            break
                if end > start:
                    content = content[start:end]
                    print(f\"  Extracted JSON object from position {start} to {end}\")
        
        # Try parsing again
        try:
            data = json.loads(content)
            # Fix date field if present
            if 'date' in data and isinstance(data['date'], str):
                data['date'] = fix_date_string(data['date'])
            
            # Write back fixed JSON with proper formatting
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f\"  ✓ Fixed and saved\")
            return True
        except json.JSONDecodeError as e2:
            print(f\"  ✗ Still invalid after fixes: {e2}\")
            return False
    
    except Exception as ex:
        print(f\"  ✗ Error processing file: {ex}\")
        return False

def main():
    print(\"Fixing JSON files in current directory...\")
    fixed_count = 0
    total_count = 0
    
    for filename in os.listdir('.'):
        if filename.endswith('.json'):
            total_count += 1
            print(f\"\\nProcessing {filename}:\")
            if fix_json_file(filename):
                fixed_count += 1
    
    print(f\"\\n---\\nFixed {fixed_count} out of {total_count} JSON files.\")
    return 0 if fixed_count == total_count else 1

if __name__ == '__main__':
    sys.exit(main())
