import os
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

INDEX_PATH = 'data/articles/index.json'
ARTICLES_DIR = 'data/articles'
EXCLUDE = [
    'index.json', 
    'articles.json', 
    'schema-index.json', 
    'internal_linking_map.json', 
    'affiliate_links.json', 
    'fix_json.py', 
    'article_schema.json'
]

def verify():
    if not os.path.exists(INDEX_PATH):
        logging.error('Index file missing')
        return False

    try:
        with open(INDEX_PATH, 'r') as f:
            index = json.load(f)
    except Exception as e:
        logging.error(f'Failed to load index: {e}')
        return False

    articles_in_dir = [f for f in os.listdir(ARTICLES_DIR) if f.endswith('.json') and f not in EXCLUDE]
    index_files = [item['file'] for item in index]

    missing_in_index = set(articles_in_dir) - set(index_files)
    extra_in_index = set(index_files) - set(articles_in_dir)

    success = True
    if missing_in_index:
        logging.error(f'Missing in index: {missing_in_index}')
        success = False
    if extra_in_index:
        logging.error(f'Extra in index (should have been excluded): {extra_in_index}')
        success = False

    for entry in index:
        required = ['id', 'title', 'date', 'category', 'tags', 'image', 'file']
        for field in required:
            if field not in entry:
                logging.error(f'Entry {entry.get("file")} missing field: {field}')
                success = False

    if success:
        logging.info(f'Verification successful. Index contains {len(index)} valid entries.')
    else:
        logging.error('Verification failed.')
    
    return success

if __name__ == "__main__":
    import sys
    if not verify():
        sys.exit(1)