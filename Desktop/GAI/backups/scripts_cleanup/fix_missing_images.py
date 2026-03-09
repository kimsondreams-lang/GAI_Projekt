import os
import json
import re

ARTICLES_DIR = 'data/articles'
IMAGE_DIRS = [
    'public/images/articles', 
    'data/images/articles', 
    'temp_blog_fix/images/articles'
]
REPORT_FILE = 'data/audit_report.json'

def get_existing_images():
    images = {}
    for d in IMAGE_DIRS:
        if os.path.exists(d):
            for root, dirs, files in os.walk(d):
                for f in files:
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.svg')):
                        images[f.lower()] = f
    return images

def clean_name(name):
    name = os.path.basename(name)
    name = re.sub(r'^(cover_|content_)', '', name)
    # Remove timestamp patterns like _1772533876324
    name = re.sub(r'(_|-)\d+\.(jpg|jpeg|png|webp|svg)$', '', name, flags=re.I)
    return name.lower()

def find_match(missing_path, existing_images, slug):
    missing_file = os.path.basename(missing_path)
    base_missing = clean_name(missing_file)
    slug_clean = slug.replace('.json', '').lower()
    
    # 1. Exact cleaned match
    for img_file in existing_images:
        if clean_name(img_file) == base_missing:
            return f'images/articles/{existing_images[img_file]}'
            
    # 2. Slug-based match (if main image)
    if 'cover' in missing_file or 'main' in missing_file:
        for img_file in existing_images:
            if slug_clean in img_file.lower():
                return f'images/articles/{existing_images[img_file]}'
                
    # 3. Substring match
    for img_file in existing_images:
        if base_missing in img_file.lower() or img_file.lower().replace('.jpg', '') in base_missing:
            return f'images/articles/{existing_images[img_file]}'
            
    return None

def fix():
    if not os.path.exists(REPORT_FILE):
        print('Audit report missing.')
        return

    with open(REPORT_FILE, 'r') as f:
        report = json.load(f)

    existing_images = get_existing_images()
    fixed_count = 0

    for issue in report.get('issues', []):
        slug = issue['slug']
        file_path = os.path.join(ARTICLES_DIR, slug)
        if not os.path.exists(file_path): continue

        with open(file_path, 'r', encoding='utf-8') as f:
            art = json.load(f)

        changed = False
        main_img = art.get('image')
        if main_img and 'images/articles/' in main_img:
            match = find_match(main_img, existing_images, slug)
            if match and match != main_img:
                print(f'[{slug}] Fixed main image: {main_img} -> {match}')
                art['image'] = match
                changed = True

        content = art.get('content', '')
        # Find all images in content
        content_imgs = re.findall(r'src=[\"\'](images/articles/[^\"\' >]+)[\"\']', content)
        for img in content_imgs:
            match = find_match(img, existing_images, slug)
            if match and match != img:
                print(f'[{slug}] Fixed content image: {img} -> {match}')
                content = content.replace(img, match)
                changed = True
        
        if changed:
            art['content'] = content
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(art, f, indent=2, ensure_ascii=False)
            fixed_count += 1

    print(f'Finished. Fixed {fixed_count} articles.')

if __name__ == '__main__':
    fix()
