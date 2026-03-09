import json
import os
import re

AUDIT_FILE = 'data/audit_report.json'
IMAGES_LIST_FILE = 'data/all_images_list.txt'
ARTICLES_DIR = 'data/articles'

if not os.path.exists(AUDIT_FILE) or not os.path.exists(IMAGES_LIST_FILE):
    print('Missing data files.')
    exit(1)

with open(AUDIT_FILE, 'r') as f:
    audit = json.load(f)

with open(IMAGES_LIST_FILE, 'r') as f:
    available_images = [line.strip() for line in f.readlines()]

def clean_path(path):
    # Convert public/images/articles/x.jpg to images/articles/x.jpg
    # Convert temp_blog_fix/images/articles/x.jpg to images/articles/x.jpg
    p = re.sub(r'^(public/|temp_blog_fix/|data/)', '', path)
    if not p.startswith('images/'):
        p = 'images/' + p
    return p

def find_match(missing_path, slug):
    filename = os.path.basename(missing_path)
    # Remove cover_, content_, and timestamp
    base = re.sub(r'^(cover_|content_|main_)', '', filename)
    base = re.sub(r'_\d+\.(jpg|png|jpeg|webp)$', '', base)
    slug_base = slug.replace('.json', '')
    
    # 1. Try exact match on cleaned base
    for img in available_images:
        if base.lower() in img.lower():
            return clean_path(img)
            
    # 2. Try match on slug
    for img in available_images:
        if slug_base.lower() in img.lower():
            return clean_path(img)
            
    # 3. Fallback to category keywords
    keywords = {
        'ai': 'ai-tech-products-2025.jpg',
        'smart-home': 'smart-home-gadgets-2025.jpg',
        'eco': 'eco-friendly-2025.jpg',
        'laptop': 'best-laptops-2025.jpg',
        'gaming': 'best-gaming-accessories-2025-main.jpg',
        'earbuds': 'sony-wf-1000xm5.jpg',
        'monitor': 'best-laptops-2025.jpg'
    }
    for kw, fallback in keywords.items():
        if kw in slug.lower():
            for img in available_images:
                if fallback in img:
                    return clean_path(img)
    return None

results = []
for issue in audit.get('issues', []):
    slug = issue['slug']
    article_path = os.path.join(ARTICLES_DIR, slug)
    if not os.path.exists(article_path): continue
    
    try:
        with open(article_path, 'r') as f:
            article = json.load(f)
    except: continue
    
    updated = False
    for prob in issue['problems']:
        if 'Missing main image' in prob:
            missing = prob.split(': ')[1]
            match = find_match(missing, slug)
            if match:
                article['image'] = match
                updated = True
        elif 'Missing content image' in prob:
            missing = prob.split(': ')[1]
            match = find_match(missing, slug)
            if match:
                article['content'] = article['content'].replace(missing, match)
                updated = True
    
    if updated:
        with open(article_path, 'w') as f:
            json.dump(article, f, indent=2)
        results.append(f'Updated {slug}')

print(f'Successfully updated {len(results)} articles.')
