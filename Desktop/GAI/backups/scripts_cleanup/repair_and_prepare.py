import json
import os
import re

article_path = 'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
index_path = 'data/articles/articles.json'
scripts = ['scripts/ftpsync.py', 'scripts/upload_articles.py']

def fix_json(path):
    if not os.path.exists(path):
        print(f'File not found: {path}')
        return None
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    data = content
    try:
        # Iterative unwrap
        while isinstance(data, str):
            data = json.loads(data)
    except Exception as e:
        print(f'Error parsing {path}: {e}')
        return None

    if isinstance(data, dict):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f'SUCCESS: Fixed {path}')
        return data
    return None

# 1. Fix Article JSON
data = fix_json(article_path)

# 2. Update FTP Host
for script in scripts:
    if os.path.exists(script):
        with open(script, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = re.sub(r\"host\s*=\s*['\\\"].*?['\\\"]\", \"host = 'ftp.hostinger.com'\", content)
        with open(script, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'SUCCESS: Updated host in {script}')

# 3. Update Index
if os.path.exists(index_path):
    with open(index_path, 'r', encoding='utf-8') as f:
        index = json.load(f)
    fname = os.path.basename(article_path)
    if fname not in index:
        index.append(fname)
        index.sort()
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2)
        print(f'SUCCESS: Added {fname} to index')

# 4. Create Placeholders
if data:
    images = [data.get('image')] + [item.get('src') for item in data.get('gallery', [])]
    for img in images:
        if img:
            # Check both data/ and public/ paths
            for base in ['data', 'public']:
                full_path = os.path.join(base, img)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                if not os.path.exists(full_path):
                    with open(full_path, 'wb') as f: f.write(b'')
                    print(f'SUCCESS: Created placeholder {full_path}')
