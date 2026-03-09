import json
import os
import shutil

articles_dir = 'data/articles'
output_js = 'temp_ftp_blog/js/articles-data.js'
output_index_dir = 'temp_ftp_blog/data/articles'
output_index = os.path.join(output_index_dir, 'index.json')

all_articles = []
skip_files = {'index.json', 'affiliate-links.json', 'internal_linking_map.json', 'schema-index.json', 'articles.json'}

# 1. Collect articles
if os.path.exists(articles_dir):
    files = [f for f in os.listdir(articles_dir) if f.endswith('.json') and f not in skip_files]
    for filename in files:
        path = os.path.join(articles_dir, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'id' in data and 'title' in data:
                    all_articles.append(data)
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and 'id' in item and 'title' in item:
                            all_articles.append(item)
        except Exception as e:
            print(f'Error reading {filename}: {e}')

# 2. Sort by date descending
def get_date(x):
    d = x.get('date')
    return str(d) if d else '0000-00-00'

all_articles.sort(key=get_date, reverse=True)

# 3. Write articles-data.js
os.makedirs(os.path.dirname(output_js), exist_ok=True)
js_content = 'window.articlesAPI = window.articlesAPI || {};\n'
js_content += 'window.articlesAPI.articles = ' + json.dumps(all_articles, indent=2) + ';\n'
js_content += 'window.articlesData = window.articlesAPI.articles; // Compatibility\n'

with open(output_js, 'w', encoding='utf-8') as f:
    f.write(js_content)

# 4. Sync index.json
os.makedirs(output_index_dir, exist_ok=True)
src_index = os.path.join(articles_dir, 'index.json')
if os.path.exists(src_index):
    shutil.copy2(src_index, output_index)
    print(f'Synced index.json to {output_index}')

print(f'Successfully wrote {len(all_articles)} articles to {output_js}')