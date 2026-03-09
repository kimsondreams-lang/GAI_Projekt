import os
from PIL import Image

articles_dir = '/Users/jakubnetza/Desktop/GAI/public/images/articles'
corrupted = []

for f in os.listdir(articles_dir):
    if f.endswith(('.jpg', '.jpeg', '.png')):
        try:
            img_path = os.path.join(articles_dir, f)
            with Image.open(img_path) as img:
                w, h = img.size
                if w < 800 or h < 400:
                    corrupted.append(f'{f}: {w}x{h}')
        except Exception as e:
            corrupted.append(f'{f}: ERROR - {e}')

print('CORRUPTED/SMALL IMAGES:')
for c in corrupted:
    print(c)
print(f'\nTotal: {len(corrupted)} problematic images')
