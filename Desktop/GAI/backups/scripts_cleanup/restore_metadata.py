import json
import os
import re

ARTICLES_DIR = 'data/articles'
INDEX_FILE = 'data/articles/index.json'

def slug_to_title(slug):
    # Remove .json extension if present
    name = slug.replace('.json', '')
    # Replace hyphens with spaces and title case
    title = name.replace('-', ' ').title()
    # Special cases for years or acronyms
    title = title.replace('2025', '2025').replace('Ai', 'AI').replace('4K', '4K')
    return title

def infer_category(slug):
    slug = slug.lower()
    if 'review' in slug:
        return 'REVIEWS'
    if 'comparison' in slug or 'vs' in slug:
        return 'COMPARISONS'
    if 'guide' in slug or 'best' in slug:
        return 'COMPARISONS'
    if 'gadgets' in slug or 'tech' in slug:
        return 'NEWS'
    return 'NEWS'

def restore():
    if not os.path.exists(INDEX_FILE):
        print(f'Error: {INDEX_FILE} not found')
        return

    with open(INDEX_FILE, 'r') as f:
        index = json.load(f)

    restored_count = 0
    for slug in index:
        file_path = os.path.join(ARTICLES_DIR, slug if slug.endswith('.json') else f'{slug}.json')
        if not os.path.exists(file_path):
            continue

        with open(file_path, 'r') as f:
            try:
                article = json.load(f)
            except json.JSONDecodeError:
                print(f'Error decoding {file_path}')
                continue

        if article.get('title') == 'Recovered Article':
            new_title = slug_to_title(slug)
            article['title'] = new_title
            article['category'] = infer_category(slug)
            
            # Simple tag generation from slug
            tags = [word.capitalize() for word in slug.replace('.json', '').split('-') if len(word) > 2]
            article['tags'] = list(set(article.get('tags', []) + tags))
            
            # Add a placeholder subtitle if missing
            if not article.get('subtitle'):
                article['subtitle'] = f'Exploring the latest in {new_title}'

            with open(file_path, 'w') as f:
                json.dump(article, f, indent=2)
            
            print(f'Restored metadata for: {slug} -> {new_title}')
            restored_count += 1

    print(f'Successfully restored {restored_count} articles.')

if __name__ == "__main__":
    restore()
