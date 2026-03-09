import os
import json
import re

articles_dir = 'data/articles'
image_roots = ['public', 'data', '.']

files = [f for f in os.listdir(articles_dir) if f.endswith('.json') and f != 'index.json' and f != 'schema-index.json' and f != 'internal_linking_map.json']

audit_results = []

for filename in files:
    path = os.path.join(articles_dir, filename)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            print(f"Skipping {filename} as it is a list (index file)")
            continue
        article_id = data.get('id', filename)
        images = []
        
        # 1. Main image
        if 'image' in data and data['image']:
            images.append({'path': data['image'], 'source': 'main_image', 'alt': data.get('title', '')})
            
        # 2. Gallery images
        if 'gallery' in data and isinstance(data['gallery'], list):
            for idx, item in enumerate(data['gallery']):
                images.append({'path': item.get('src'), 'source': f'gallery[{idx}]', 'alt': item.get('alt', '')})
                
        # 3. Content images (HTML)
        if 'content' in data:
            content = data['content']
            img_tags = re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', content)
            for src in img_tags:
                alt_match = re.search(rf'<img[^>]+src=["\']{re.escape(src)}["\'][^>]+alt=["\']([^"\']*)["\']', content)
                alt = alt_match.group(1) if alt_match else 'MISSING'
                images.append({'path': src, 'source': 'content_html', 'alt': alt})

        for img in images:
            img_path = img['path']
            if not img_path: continue
            
            # Clean path if it starts with /
            search_path = img_path.lstrip('/')
            
            exists = False
            found_at = ""
            for root in image_roots:
                full_path = os.path.join(root, search_path)
                if os.path.exists(full_path):
                    exists = True
                    found_at = full_path
                    break
            
            audit_results.append({
                'article': article_id,
                'image_path': img_path,
                'source': img['source'],
                'alt': img['alt'],
                'exists': exists,
                'found_at': found_at
            })
    except Exception as e:
        print(f'Error auditing {filename}: {e}')

# Output summary
missing = [r for r in audit_results if not r['exists'] and not r['image_path'].startswith('http')]
missing_alt = [r for r in audit_results if not r['alt'] or r['alt'] == 'MISSING']

print(f'Total images checked: {len(audit_results)}')
print(f'Missing local files: {len(missing)}')
for m in missing[:10]:
    print(f"  - {m['article']}: {m['image_path']}")

print(f'Images with missing/empty alt: {len(missing_alt)}')
for ma in missing_alt[:10]:
    print(f"  - {ma['article']}: {ma['image_path']} ({ma['source']})")

with open('data/audit_report_images.json', 'w') as f:
    json.dump(audit_results, f, indent=2)
