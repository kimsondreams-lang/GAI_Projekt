import json
import os

articles_dir = 'data/articles'
files = [f for f in os.listdir(articles_dir) if f.endswith('.json')]

print(f'Checking {len(files)} files in {articles_dir}...')
corrupted = []

for filename in files:
    path = os.path.join(articles_dir, filename)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            json.load(f)
    except Exception as e:
        print(f'CORRUPTED: {filename} - {str(e)}')
        corrupted.append(filename)

if not corrupted:
    print('ALL ARTICLES ARE VALID JSON.')
else:
    print(f'Found {len(corrupted)} corrupted files.')