import json, os
def r(p):
    print(f'Processing {p}...')
    try:
        if not os.path.exists(p):
            print(f'File {p} does not exist.')
            return
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        # Handle potential double encoding or leading/trailing quotes
        data = None
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # Try unescaping once if it looks like a string-wrapped JSON
            if content.startswith('\"') and content.endswith('\"'):
                try:
                    data = json.loads(json.loads(content))
                except:
                    pass
        
        if data is None:
            # Fallback: try to fix common syntax errors like missing quotes around keys or trailing commas
            # But for now, let's try the double-load which is common in this environment
            print(f'Failed initial parse for {p}, attempting deep unescape...')
            try:
                # Some files might be triple encoded or have weird escaping
                import ast
                data = ast.literal_eval(content)
                if isinstance(data, str):
                    data = json.loads(data)
            except:
                print(f'Could not repair {p} automatically.')
                return

        if isinstance(data, str):
            data = json.loads(data)

        with open(p, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'Successfully repaired {p}')
    except Exception as e:
        print(f'Error repairing {p}: {e}')

files = [
    'data/articles/best-tech-gadgets-comparison-2025.json',
    'data/articles/sony-wh-1000xm5-review.json',
    'data/articles/top-5-flagship-gadgets-2025.json',
    'data/articles/best-mechanical-keyboards-2025.json'
]
for f in files:
    r(f)
