import json
import re

def fix_best_tech():
    path = 'data/articles/best-tech-gadgets-comparison-2025.json'
    print(f'Repairing {path}...')
    try:
        with open(path, 'r') as f:
            content = f.read().strip()
        
        # The content is literally {\"id\":...\"}
        # To make it a valid JSON string, we wrap it in double quotes
        wrapped = '\"' + content + '\"'
        decoded_str = json.loads(wrapped)
        data = json.loads(decoded_str)
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        print('Successfully fixed best-tech-gadgets-comparison-2025.json')
    except Exception as e:
        print(f'Failed to fix best-tech: {e}')

def fix_sony():
    path = 'data/articles/sony-wh-1000xm5-review.json'
    print(f'Repairing {path}...')
    try:
        with open(path, 'r') as f:
            content = f.read()
        
        # The issue is unescaped quotes in HTML attributes inside the 'content' value.
        # We look for patterns like class=\"...\" and fix them if they are class=\"...\"
        # Actually, the head output showed class=\" was NOT escaped.
        # Let's use a regex to find the content block and escape internal quotes.
        
        match = re.search(r'\"content\":\s*\"(.*)\",\s*\"featured\"', content, re.DOTALL)
        if match:
            inner_content = match.group(1)
            # Escape quotes that are not already escaped
            # This is tricky. Let's just escape all quotes and then fix double escapes.
            fixed_inner = inner_content.replace('\"', '\\\"')
            # Fix cases where we might have double escaped: \\\" -> \"
            # But wait, if they were already escaped, they'd be \\\"
            # Let's just do a simple replacement for common HTML attributes first
            # as seen in the head output.
            
            # Re-read and do line by line for safety if regex is too broad
            lines = content.splitlines()
            new_lines = []
            in_content = False
            for line in lines:
                if '\"content\":' in line:
                    in_content = True
                
                if in_content:
                    # Fix unescaped quotes in HTML tags
                    line = re.sub(r'(\w+)=\"([^\"]*)\"', r'\1=\\\"\2\\\"', line)
                
                if '\"featured\":' in line:
                    in_content = False
                new_lines.append(line)
            
            final_content = '\n'.join(new_lines)
            with open(path, 'w') as f:
                f.write(final_content)
            
            # Verify
            with open(path, 'r') as f:
                json.load(f)
            print('Successfully fixed sony-wh-1000xm5-review.json')
        else:
            print('Could not find content block in sony-wh-1000xm5-review.json')
    except Exception as e:
        print(f'Failed to fix sony: {e}')

fix_best_tech()
fix_sony()
