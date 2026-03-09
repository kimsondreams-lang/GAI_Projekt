import json
import os
import re
from PIL import Image

ARTICLES_DIR = 'data/articles'
IMAGES_DIR = 'data/images/articles'
TAG = 'kimsondreams-21'

# ASIN Map for link fixing
ASIN_MAP = {
    'Sony WH-1000XM5': 'B09JQWSQK7',
    'Keychron Q1 Pro': 'B0BKGH4MHV',
    'Samsung Galaxy S24 Ultra': 'B0CMDM65JH',
    'MacBook Air M3': 'B0CX24BN3L',
    'iPhone 16 Pro Max': 'B0DHJ896RY',
    'Echo Show 15': 'B0C5DPSW5Y',
    'Ring Battery Doorbell Plus': 'B0F9CN26NX',
    'Ring Wired Doorbell Plus': 'B0F9CN26NX',
    'Google Nest Hub Max': 'B07S52S6S7',
    'Blink Outdoor 4': 'B0B1N7F9C6',
    'Philips Hue': 'B07351P1JK',
    'Bose QC Ultra': 'B0CCZ26B5V',
    'GoPro HERO13 Black': 'B0D9M6N8L2',
    'Kindle Paperwhite': 'B09TMN58KL',
    'Sony WF-1000XM5': 'B0C33XXS56',
    'Bose QuietComfort Ultra Earbuds': 'B0CCZ26B5V'
}

def fix_links(content):
    for name, asin in ASIN_MAP.items():
        if name in content:
            new_link = f'https://www.amazon.com/dp/{asin}?tag={TAG}'
            content = content.replace('https://www.amazon.com/s?k=Keychron+Q1+Pro&tag=kimsondreams-21', new_link)
            content = content.replace('https://www.amazon.com/s?k=Sony+WH-1000XM5+Headphones/s?k=sony+wh-1000xm5&tag=kimsondreams-21\\', new_link)
    return content

def process_articles():
    # Get list of successfully converted webp files to avoid blind replacement
    webp_files = {f for f in os.listdir(IMAGES_DIR) if f.endswith('.webp')}
    base_names = {os.path.splitext(f)[0] for f in webp_files}

    for filename in os.listdir(ARTICLES_DIR):
        if filename.endswith('.json'):
            path = os.path.join(ARTICLES_DIR, filename)
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                
                changed = False
                if 'content' in data:
                    original_content = data['content']
                    # Fix links and models
                    data['content'] = fix_links(data['content'])
                    data['content'] = data['content'].replace('S25 Ultra', 'S24 Ultra')
                    data['content'] = data['content'].replace('Snapdragon 8 Elite', 'Snapdragon 8 Gen 3')
                    
                    # Fix HTML image tags: find src="images/articles/name.jpg" and replace with .webp if it exists
                    for base in base_names:
                        for ext in ['.jpg', '.jpeg', '.png']:
                            old_ref = f'images/articles/{base}{ext}'
                            new_ref = f'images/articles/{base}.webp'
                            if old_ref in data['content']:
                                data['content'] = data['content'].replace(old_ref, new_ref)
                    
                    if data['content'] != original_content: changed = True

                if 'image' in data and data['image'].split('.')[-1] in ['jpg', 'jpeg', 'png']:
                    base = os.path.splitext(os.path.basename(data['image']))[0]
                    if base in base_names:
                        data['image'] = f'images/articles/{base}.webp'
                        changed = True

                if changed:
                    with open(path, 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f'Updated HTML and links in {filename}')
            except Exception as e:
                print(f'Error processing {filename}: {e}')

if __name__ == "__main__":
    print("Starting Recovery Master V2 (HTML Content Fix)...")
    process_articles()
    print("Recovery Master V2 Finished.")
