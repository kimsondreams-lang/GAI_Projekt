import json
import os
from datetime import datetime

ARTICLES_DIR = 'data/articles'
OUTPUT_MAP = 'data/articles/internal_linking_map.json'
INDEX_FILE = 'data/articles/index.json'

def generate_map():
    if not os.path.exists(INDEX_FILE):
        print(f'Error: {INDEX_FILE} not found')
        return

    with open(INDEX_FILE, 'r') as f:
        index = json.load(f)

    articles_data = []
    for slug in index:
        file_path = os.path.join(ARTICLES_DIR, slug if slug.endswith('.json') else f'{slug}.json')
        if not os.path.exists(file_path):
            continue
        
        with open(file_path, 'r') as f:
            try:
                art = json.load(f)
                # Skip stubs that haven't been fully restored or are too thin
                if art.get('title') == 'Recovered Article' or not art.get('content') or len(art.get('content')) < 100:
                    continue
                
                articles_data.append({
                    'id': art.get('id'),
                    'title': art.get('title'),
                    'tags': [t.lower() for t in art.get('tags', [])],
                    'category': art.get('category')
                })
            except Exception as e:
                print(f'Error reading {slug}: {e}')

    new_articles_map = []
    
    for target in articles_data:
        related = []
        target_tags = set(target['tags'])
        
        for candidate in articles_data:
            if target['id'] == candidate['id']:
                continue
            
            candidate_tags = set(candidate['tags'])
            overlap = target_tags.intersection(candidate_tags)
            
            if overlap:
                # Create a link suggestion
                tags_list = list(overlap)[:3]
                reason = 'Shared tags: ' + ', '.join(tags_list)
                title = candidate['title']
                link_text = f'Read more about {title}'
                if 'review' in candidate['id'].lower():
                    link_text = f'Check out our full {title}'
                elif 'comparison' in candidate['id'].lower() or 'vs' in candidate['id'].lower():
                    link_text = f'See how it compares in our {title}'
                
                related.append({
                    'id': candidate['id'],
                    'reason': reason,
                    'linkText': link_text
                })
        
        # Limit to top 3 related articles
        related = related[:3]
        
        if related:
            new_articles_map.append({
                'id': target['id'],
                'title': target['title'],
                'category': target['category'],
                'tags': target['tags'],
                'relatedArticles': related
            })

    output = {
        'generatedAt': datetime.now().strftime('%Y-%m-%d'),
        'articles': new_articles_map,
        'summary': {
            'totalArticles': len(new_articles_map),
            'totalLinks': sum(len(a['relatedArticles']) for a in new_articles_map)
        }
    }

    with open(OUTPUT_MAP, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f'Successfully generated linking map with {len(new_articles_map)} articles.')

if __name__ == '__main__':
    generate_map()
