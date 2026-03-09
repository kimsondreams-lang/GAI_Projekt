import json
import os
import re

articles_dir = 'data/articles'
images_dir = 'public/images/articles'

def fix_images_in_file(filename):
    path = os.path.join(articles_dir, filename)
    if not os.path.isfile(path):
        return

    try:
        with open(path, 'r', encoding='utf-8') as f:
            content_str = f.read()

        # Find all image references like images/articles/something.ext
        # We look for .webp specifically as they were the main issue
        refs = re.findall(r'images/articles/([^\"\'> ]+)', content_str)
        updated_content = content_str

        for ref in set(refs):
            full_path = os.path.join('public', 'images', 'articles', ref)
            if not os.path.exists(full_path):
                base_name = os.path.splitext(ref)[0]
                
                # Special case: downgrade XM6 image to XM5
                if 'sony-wh-1000xm6' in base_name:
                    new_ref = 'sony-wh-1000xm5-main.jpg'
                else:
                    # Try common extensions
                    new_ref = None
                    for ext in ['.jpg', '.jpeg', '.png']:
                        if os.path.exists(os.path.join(images_dir, base_name + ext)):
                            new_ref = base_name + ext
                            break
                
                if new_ref:
                    old_full_ref = f'images/articles/{ref}'
                    new_full_ref = f'images/articles/{new_ref}'
                    updated_content = updated_content.replace(old_full_ref, new_full_ref)
                    print(f'[{filename}] Fixed: {ref} -> {new_ref}')
                else:
                    print(f'[{filename}] Warning: No replacement found for {ref}')

        if updated_content != content_str:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            return True
    except Exception as e:
        print(f'Error processing {filename}: {e}')
    return False

count = 0
for filename in os.listdir(articles_dir):
    if filename.endswith('.json') and filename not in ['index.json', 'articles.json']:
        if fix_images_in_file(filename):
            count += 1

print(f'Successfully updated {count} files.')
