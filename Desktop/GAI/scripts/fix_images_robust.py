import os, json, re, shutil

articles_dir = 'data/articles'
public_img_dir = 'public/images/articles'
src_img_dir = 'images/articles'

# Valid 10x10 pixel black PNG
placeholder_data = bytes.fromhex('89504e470d0a1a0a0000000d494844520000000a0000000a0802000000025058ea0000001849444154189563f8ff7f06060601610601010100003102010164e065900000000049454e44ae426082')

def is_valid_image(path):
    if not os.path.exists(path) or os.path.getsize(path) < 200: # Force replacement of tiny 1x1 placeholders
        return False
    try:
        with open(path, 'rb') as f:
            header = f.read(2048).lower()
            if b'<html' in header or b'<!doc' in header or b'<svg' in header or b'<?xml' in header:
                return False
            f.seek(0)
            magic = f.read(4)
            return magic.startswith(b'\xff\xd8') or magic.startswith(b'\x89PNG') or b'RIFF' in magic
    except:
        return False

# 1. Collect all referenced images
referenced = set()
if os.path.exists(articles_dir):
    for f in os.listdir(articles_dir):
        if f.endswith('.json') and f != 'index.json':
            try:
                with open(os.path.join(articles_dir, f), 'r') as j:
                    data = json.load(j)
                    if 'image' in data:
                        referenced.add(data['image'].split('/')[-1])
                    content = data.get('content', '')
                    imgs = re.findall(r'src=[\"\']images/articles/([^\"\']+)[\"\']', content)
                    for img in imgs:
                        referenced.add(img)
            except:
                continue

print(f'Auditing {len(referenced)} unique referenced images...')
os.makedirs(public_img_dir, exist_ok=True)

stats = {'synced': 0, 'placeholders': 0, 'kept': 0, 'cleaned': 0}

for img_name in referenced:
    target = os.path.join(public_img_dir, img_name)
    src = os.path.join(src_img_dir, img_name)
    
    # If target exists but is invalid, remove it
    if os.path.exists(target) and not is_valid_image(target):
        print(f'Deleting invalid file in public: {img_name}')
        os.remove(target)
        stats['cleaned'] += 1

    if is_valid_image(target):
        stats['kept'] += 1
        continue

    # Try to sync from src
    if is_valid_image(src):
        shutil.copy2(src, target)
        print(f'Synced from src: {img_name}')
        stats['synced'] += 1
    else:
        # Create placeholder
        with open(target, 'wb') as f:
            f.write(placeholder_data)
        print(f'Created placeholder for: {img_name}')
        stats['placeholders'] += 1

print(f'Final Summary: {stats}')
