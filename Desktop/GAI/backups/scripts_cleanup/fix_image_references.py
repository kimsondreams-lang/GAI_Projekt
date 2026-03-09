import os, json, re

img_dirs = ['data/images/articles', 'public/images/articles']
art_dir = 'data/articles'

available_imgs = set()
for d in img_dirs:
    if os.path.exists(d):
        available_imgs.update(os.listdir(d))

def normalize(name):
    n = re.sub(r'^(cover_|content_)', '', name)
    n = re.sub(r'(_\d+)+$', '', os.path.splitext(n)[0])
    return n

mapping = {}
for img in sorted(available_imgs, key=len):
    if img.startswith('.'): continue
    norm = normalize(img)
    if norm not in mapping or 'main' in img or 'cover' in img:
        mapping[norm] = img

# Manual overrides for known mismatches
mapping['sony-wh-1000xm5-review'] = 'sony-wh-1000xm5-main.jpg'
mapping['iphone-16-pro-max-review'] = 'iphone-16-pro-max.jpg'
mapping['apple-watch-ultra-2-review'] = 'apple-watch-ultra-2.jpg'

print(f'Found {len(available_imgs)} images, created {len(mapping)} mappings.')

count = 0
for f in os.listdir(art_dir):
    if f.endswith('.json') and f != 'index.json':
        p = os.path.join(art_dir, f)
        with open(p, 'r', encoding='utf-8') as file:
            data = file.read()
        
        new_data = data
        refs = re.findall(r'images/articles/([^\"\'\s>]+)', data)
        for ref in set(refs):
            norm_ref = normalize(ref)
            if norm_ref in mapping:
                new_data = new_data.replace(ref, mapping[norm_ref])
            else:
                for norm_key in mapping:
                    if norm_ref.startswith(norm_key):
                        new_data = new_data.replace(ref, mapping[norm_key])
                        break
        
        if new_data != data:
            with open(p, 'w', encoding='utf-8') as file:
                file.write(new_data)
            print(f'Updated {f}')
            count += 1

print(f'Successfully fixed {count} files.')
