import os
import json

articles_dir = 'data/articles'
images_dir = 'public/images/articles'
index_path = 'data/articles/index.json'

def fix_assets():
    if not os.path.exists(articles_dir):
        print(f'Error: {articles_dir} not found')
        return

    files = [f for f in os.listdir(articles_dir) if f.endswith('.json') and f != 'index.json']
    processed = []
    news_count = 0

    for filename in files:
        path = os.path.join(articles_dir, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            changed = False
            # 1. Fix image paths (remove public/ prefix)
            for key in ['image', 'thumb']:
                if key in data and isinstance(data[key], str) and 'public/' in data[key]:
                    data[key] = data[key].replace('public/', '')
                    changed = True
            
            # 2. Check gallery images
            if 'gallery' in data and isinstance(data['gallery'], list):
                for item in data['gallery']:
                    if 'src' in item and isinstance(item['src'], str) and 'public/' in item['src']:
                        item['src'] = item['src'].replace('public/', '')
                        changed = True

            if data.get('category') == 'NEWS':
                news_count += 1
            
            if changed:
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
            
            processed.append({
                'file': filename,
                'date': data.get('date', '0000-00-00'),
                'category': data.get('category', 'OTHER')
            })
        except Exception as e:
            print(f'Error processing {filename}: {e}')

    # 3. Ensure at least 3 NEWS articles
    if news_count < 3:
        print(f'News count ({news_count}) is low. Promoting latest articles to NEWS...')
        processed.sort(key=lambda x: x['date'], reverse=True)
        needed = 3 - news_count
        for item in processed:
            if needed <= 0: break
            if item['category'] != 'NEWS':
                path = os.path.join(articles_dir, item['file'])
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    data['category'] = 'NEWS'
                    with open(path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2)
                    item['category'] = 'NEWS'
                    needed -= 1
                    news_count += 1
                except: continue

    # 4. Rebuild index.json
    valid_files = sorted([p['file'] for p in processed], reverse=True)
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(valid_files, f, indent=2)

    print(f'SUCCESS: Processed {len(processed)} articles. News count: {news_count}. Index rebuilt.')

if __name__ == '__main__':
    fix_assets()
