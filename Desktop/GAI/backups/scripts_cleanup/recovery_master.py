import json
import os
import re
from PIL import Image

# Configuration
ARTICLES_DIR = 'data/articles'
IMAGES_DIR = 'data/images/articles'
TAG = 'kimsondreams-21'

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
    # Replace search links or malformed links with direct ASIN links
    for name, asin in ASIN_MAP.items():
        pattern = rf'https://www\.amazon\.com/(?:s\?k=[^"\'>\s]+|dp/[A-Z0-9]+)(?:\?[^"\'>\s]*)?'
        # This is a bit broad, let's be more specific for the products we know
        if name in content:
            new_link = f'https://www.amazon.com/dp/{asin}?tag={TAG}'
            # Simple string replacement for known bad patterns in the report
            content = content.replace('https://www.amazon.com/s?k=Keychron+Q1+Pro&tag=kimsondreams-21', new_link)
            content = content.replace('https://www.amazon.com/s?k=Sony+WH-1000XM5+Headphones/s?k=sony+wh-1000xm5&tag=kimsondreams-21\\', new_link)
            # Add more specific replacements as needed based on the report
    return content

def convert_to_webp():
    if not os.path.exists(IMAGES_DIR):
        return {}
    
    mapping = {}
    for filename in os.listdir(IMAGES_DIR):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            path = os.path.join(IMAGES_DIR, filename)
            webp_name = os.path.splitext(filename)[0] + '.webp'
            webp_path = os.path.join(IMAGES_DIR, webp_name)
            
            try:
                with Image.open(path) as img:
                    img.save(webp_path, 'WEBP')
                mapping[filename] = webp_name
                print(f'Converted {filename} to {webp_name}')
            except Exception as e:
                print(f'Error converting {filename}: {e}')
    return mapping

def process_articles(image_map):
    for filename in os.listdir(ARTICLES_DIR):
        if filename.endswith('.json'):
            path = os.path.join(ARTICLES_DIR, filename)
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                
                # Fix content links and models
                if 'content' in data:
                    data['content'] = fix_links(data['content'])
                    # Downgrade S25 to S24 for 2025 accuracy
                    data['content'] = data['content'].replace('S25 Ultra', 'S24 Ultra')
                    data['content'] = data['content'].replace('Snapdragon 8 Elite', 'Snapdragon 8 Gen 3')
                
                if 'title' in data:
                    data['title'] = data['title'].replace('S25 Ultra', 'S24 Ultra')

                # Update image references
                if 'image' in data:
                    img_filename = os.path.basename(data['image'])
                    if img_filename in image_map:
                        data['image'] = data['image'].replace(img_filename, image_map[img_filename])
                
                with open(path, 'w') as f:
                    json.dump(data, f, indent=2)
                print(f'Processed {filename}')
            except Exception as e:
                print(f'Error processing {filename}: {e}')

if __name__ == "__main__":
    print("Starting Recovery Master...")
    img_map = convert_to_webp()
    process_articles(img_map)
    print("Recovery Master Finished.")
