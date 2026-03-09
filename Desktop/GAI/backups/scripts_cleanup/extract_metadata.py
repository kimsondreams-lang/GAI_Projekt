import json
import os

articles_dir = 'data/articles'
index_path = 'data/articles/index.json'
output_path = 'data/internal_linking_metadata.json'

try:
    with open(index_path, 'r') as f:
        index = json.load(f)
    
    metadata = []
    for filename in index:
        path = os.path.join(articles_dir, filename)
        if os.path.exists(path):
            with open(path, 'r') as af:
                try:
                    data = json.load(af)
                    metadata.append({
                        'id': data.get('id'),
                        'title': data.get('title'),
                        'tags': data.get('tags', []),
                        'file': filename
                    })
                except Exception as e:
                    print(f'Error parsing {filename}: {e}')
        else:
            print(f'Warning: {path} not found')
            
    with open(output_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f'Successfully extracted metadata for {len(metadata)} articles to {output_path}')
except Exception as e:
    print(f'Fatal error: {e}')
