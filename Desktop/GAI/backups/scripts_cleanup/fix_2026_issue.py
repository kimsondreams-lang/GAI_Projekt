import json
import os

article_dir = 'data/articles'
old_id = 'top-wireless-earbuds-2026-comparison'
new_id = 'top-wireless-earbuds-2025-comparison'
old_path = os.path.join(article_dir, f'{old_id}.json')
new_path = os.path.join(article_dir, f'{new_id}.json')
index_path = os.path.join(article_dir, 'index.json')

# 1. Update Article
if os.path.exists(old_path):
    with open(old_path, 'r') as f:
        article = json.load(f)
    
    article['id'] = new_id
    article['title'] = article['title'].replace('2026', '2025')
    # Fix date if it's still 2026 or 2024 (from previous failed sed)
    if '2026' in article['date'] or '2024' in article['date']:
        article['date'] = '2025-01-15'
    
    # Also fix the non-existent Sony model mentioned in the report
    article['content'] = article['content'].replace('WF-1000XM6', 'WF-1000XM5')
    
    with open(new_path, 'w') as f:
        json.dump(article, f, indent=2)
    
    os.remove(old_path)
    print(f'Updated article: {old_id} -> {new_id}')

# 2. Update Index
if os.path.exists(index_path):
    with open(index_path, 'r') as f:
        index = json.load(f)
    
    updated = False
    for item in index:
        if item.get('id') == old_id:
            item['id'] = new_id
            if 'title' in item:
                item['title'] = item['title'].replace('2026', '2025')
            updated = True
    
    if updated:
        with open(index_path, 'w') as f:
            json.dump(index, f, indent=2)
        print('Updated index.json')
