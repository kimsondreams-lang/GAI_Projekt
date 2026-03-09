import os
import json
import re

ARTICLES_DIR = 'data/articles'
IMAGE_DIR = 'public/images/articles'

# Manual overrides for persistent missing assets
MANUAL_MAPPING = {
    'images/articles/cover_2025-flagship-smartphone-guide_1772724959418.jpg': 'images/articles/2026-flagship-guide-main.jpg',
    'images/articles/cover_samsung-galaxy-s25-ultra-review_1772724985729.jpg': 'images/articles/s25-ultra-display.jpg'
}

def find_best_image_match(missing_path):
    if missing_path in MANUAL_MAPPING:
        return MANUAL_MAPPING[missing_path]

    filename = os.path.basename(missing_path)
    # Extract prefix
    prefix_match = re.match(r'^(.*?)(?:_\d+)?\.(?:jpg|jpeg|png|webp)$', filename)
    if not prefix_match:
        return None
    
    prefix = prefix_match.group(1)
    clean_prefix = re.sub(r'_\d+$', '', prefix)
    
    if not os.path.exists(IMAGE_DIR):
        return None
        
    available_files = os.listdir(IMAGE_DIR)
    
    # 1. Try exact prefix match with any timestamp
    for f in available_files:
        if f.startswith(clean_prefix) and f.endswith(('.jpg', '.jpeg', '.png', '.webp')):
            return f'images/articles/{f}'
            
    # 2. Special case: 2025 -> 2026
    if '2025' in clean_prefix:
        alt_prefix = clean_prefix.replace('2025', '2026')
        for f in available_files:
            if f.startswith(alt_prefix):
                return f'images/articles/{f}'

    return None

def repair():
    if not os.path.exists(ARTICLES_DIR):
        return

    for filename in os.listdir(ARTICLES_DIR):
        if not filename.endswith('.json') or filename in ['index.json', 'schema-index.json', 'affiliate_links.json', 'internal_linking_map.json', 'articles.json']:
            continue
            
        path = os.path.join(ARTICLES_DIR, filename)
        with open(path, 'r') as f:
            try:
                art = json.load(f)
            except:
                continue

        if not isinstance(art, dict):
            continue

        changed = False
        
        # Fix Title (2025 -> 2026 for 2026 slugs)
        if '2026' in filename and art.get('title', '').startswith('2025'):
            art['title'] = art['title'].replace('2025', '2026', 1)
            changed = True

        # Fix Main Image
        main_img = art.get('image', '')
        if main_img and not os.path.exists(os.path.join('public', main_img)):
            match = find_best_image_match(main_img)
            if match:
                print(f"Repairing main image in {filename}: {main_img} -> {match}")
                art['image'] = match
                changed = True

        # Fix Content Images
        content = art.get('content', '')
        if content:
            img_tags = re.findall(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', content)
            for img_path in img_tags:
                if not img_path.startswith('http') and not os.path.exists(os.path.join('public', img_path)):
                    match = find_best_image_match(img_path)
                    if match:
                        print(f"Repairing content image in {filename}: {img_path} -> {match}")
                        content = content.replace(img_path, match)
                        changed = True
            
            if changed:
                art['content'] = content
        
        if changed:
            with open(path, 'w') as f:
                json.dump(art, f, indent=2)
                print(f"Saved {filename}")

if __name__ == '__main__':
    repair()
