import os
import json
from datetime import datetime

articles_dir = 'data/articles'
index_path = os.path.join(articles_dir, 'index.json')
today = datetime.now().strftime('%Y-%m-%d')

def sync():
    if not os.path.exists(articles_dir): return
    all_files = [f for f in os.listdir(articles_dir) if f.endswith('.json')]
    exclude = ['index.json', 'affiliate_links.json', 'internal_linking_map.json', 'schema-index.json', 'keyword-report-2025.json']
    
    valid_articles = []
    for filename in all_files:
        if filename in exclude or filename.endswith('.bak') or filename.endswith('.backup'):
            continue
        path = os.path.join(articles_dir, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if not isinstance(data, dict) or 'id' not in data or 'date' not in data:
                continue
            
            if data['date'] > today:
                print('Fixing future date in ' + filename + ': ' + data['date'] + ' -> ' + today)
                data['date'] = today
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            
            valid_articles.append(filename)
        except Exception as e:
            print('Error processing ' + filename + ': ' + str(e))
    
    valid_articles.sort()
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(valid_articles, f, indent=2, ensure_ascii=False)
    print('index.json updated with ' + str(len(valid_articles)) + ' articles.')

if __name__ == '__main__':
    sync()
