import os
import json
from datetime import datetime

articles_dir = 'data/articles'
output_js = 'temp_blog_fix/js/articles-data.js'
output_json = 'temp_blog_fix/articles.json'
current_date_str = '2025-03-05'
current_date = datetime.strptime(current_date_str, '%Y-%m-%d')

# Files to exclude from the manifest (placeholders/low quality)
exclude_files = ['index.json', 'articles.json', 'affiliate_links.json', 'article1.json', 'article3.json', 'article4.json', 'article9.json']

valid_articles = []
for filename in os.listdir(articles_dir):
    if filename.endswith('.json') and filename not in exclude_files:
        path = os.path.join(articles_dir, filename)
        try:
            with open(path, 'r') as f:
                data = json.load(f)
                if 'date' in data and 'id' in data and 'title' in data:
                    try:
                        article_date = datetime.strptime(data['date'], '%Y-%m-%d')
                        # Fix future dates to current date for the sake of the blog
                        if article_date > current_date:
                            data['date'] = current_date_str
                        valid_articles.append(data)
                    except ValueError:
                        print(f'Invalid date format in {filename}')
        except Exception as e:
            print(f'Error reading {filename}: {e}')

# Sort by date descending, then by ID
valid_articles.sort(key=lambda x: (x['date'], x['id']), reverse=True)

# Generate articles-data.js (3 latest)
latest_3 = []
for a in valid_articles[:3]:
    latest_3.append({
        'id': a['id'],
        'title': a['title'],
        'date': a['date'],
        'category': a.get('category', 'NEWS'),
        'image': a.get('image', ''),
        'subtitle': a.get('subtitle', '')
    })

js_content = f"(function(){{ const articles = {json.dumps(latest_3, indent=2)}; if (typeof window !== 'undefined') {{ window.latestArticles = articles; }} if (typeof module !== 'undefined' && module.exports) {{ module.exports = articles; }} }})();"

with open(output_js, 'w') as f:
    f.write(js_content)

# Generate articles.json (all slugs)
all_slugs = [a['id'] for a in valid_articles]
with open(output_json, 'w') as f:
    json.dump(all_slugs, f, indent=2)

print(f'Successfully regenerated manifests. Total articles: {len(all_slugs)}')
print(f'Latest 3: {[a["id"] for a in latest_3]}')
