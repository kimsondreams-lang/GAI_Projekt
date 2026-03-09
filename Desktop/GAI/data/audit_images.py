import os
import json
import re

articles_dir = 'data/articles'
js_file = 'public/js/articles-data.js'
images_dir = 'public/images/articles'

referenced = set()

# From JSON
if os.path.exists(articles_dir):
    for f in os.listdir(articles_dir):
        if f.endswith('.json'):
            with open(os.path.join(articles_dir, f), 'r') as jf:
                try:
                    data = json.load(jf)
                    if 'image' in data: referenced.add(data['image'])
                    if 'gallery' in data:
                        for item in data['gallery']:
                            if 'src' in item: referenced.add(item['src'])
                except: pass

# From JS
if os.path.exists(js_file):
    with open(js_file, 'r') as jf:
        content = jf.read()
        matches = re.findall(r'"image":\s*"([^"]+)"', content)
        referenced.update(matches)

missing = []
for ref in referenced:
    if ref.startswith('http'): continue
    # Normalize: remove leading slash, remove 'images/articles/' prefix if present
    path = ref.lstrip('/')
    if path.startswith('images/articles/'):
        path = path.replace('images/articles/', '')
    
    full_path = os.path.join(images_dir, path)
    if not os.path.exists(full_path):
        missing.append(ref)

print(f"Total unique references: {len(referenced)}")
print(f"Missing images: {missing}")
