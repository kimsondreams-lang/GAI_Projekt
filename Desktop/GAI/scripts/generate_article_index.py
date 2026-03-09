import os
import json
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

ARTICLES_DIR = 'data/articles'
OUTPUT_INDEX = 'data/articles/index.json'
# Comprehensive exclusion list for non-article JSON files
EXCLUDE_FILES = [
    'index.json', 
    'articles.json', 
    'schema-index.json', 
    'internal_linking_map.json', 
    'affiliate_links.json', 
    'fix_json.py', 
    'article_schema.json'
]

def generate_index():
    if not os.path.exists(ARTICLES_DIR):
        logging.error(f'Directory {ARTICLES_DIR} does not exist.')
        return

    index_data = []
    files = [f for f in os.listdir(ARTICLES_DIR) if f.endswith('.json') and f not in EXCLUDE_FILES]
    
    logging.info(f'Found {len(files)} articles to index.')

    for filename in files:
        path = os.path.join(ARTICLES_DIR, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                article = json.load(f)
            
            # Basic validation: must have at least a title or content to be an article
            if not isinstance(article, dict) or ('title' not in article and 'content' not in article):
                logging.warning(f'Skipping {filename}: Not a valid article structure.')
                continue

            # Extract metadata
            metadata = {
                'id': article.get('id', filename.replace('.json', '')),
                'title': article.get('title', 'Untitled'),
                'subtitle': article.get('subtitle', ''),
                'date': article.get('date', '1970-01-01'),
                'category': article.get('category', 'NEWS'),
                'tags': article.get('tags', []),
                'image': article.get('image', 'images/articles/default.jpg'),
                'file': filename
            }
            index_data.append(metadata)
        except Exception as e:
            logging.error(f'Failed to process {filename}: {e}')

    # Sort by date descending
    index_data.sort(key=lambda x: x['date'], reverse=True)

    # We keep it as an array for backward compatibility with existing frontend logic,
    # but we could wrap it in an object if needed.
    with open(OUTPUT_INDEX, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=2)
    
    logging.info(f'Successfully generated index with {len(index_data)} entries at {OUTPUT_INDEX}')

if __name__ == '__main__':
    generate_index()