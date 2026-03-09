import json
import os

ARTICLES_DIR = 'data/articles'
TAG = 'kimsondreams-21'

# Specific replacements for search links found in grep
REPLACEMENTS = {
    'https://www.amazon.com/s?k=Sony+WF-1000XM5&tag=kimsondreams-21': f'https://www.amazon.com/dp/B0C33XXS56?tag={TAG}',
    'https://www.amazon.com/s?k=Bose+QuietComfort+Ultra+Earbuds+2nd+Gen&tag=kimsondreams-21': f'https://www.amazon.com/dp/B0CCZ26B5V?tag={TAG}',
    'https://www.amazon.com/s?k=Keychron+Q1+Pro&tag=kimsondreams-21': f'https://www.amazon.com/dp/B0BKGH4MHV?tag={TAG}',
    'https://www.amazon.com/s?k=Logitech+G+Pro+X+TKL&tag=kimsondreams-21': f'https://www.amazon.com/dp/B0BQBRS3WC?tag={TAG}',
    'https://www.amazon.com/s?k=Razer+Huntsman+V3+Pro&tag=kimsondreams-21': f'https://www.amazon.com/dp/B0FRVVTXRC?tag={TAG}',
    'https://www.amazon.com/s?k=SteelSeries+Apex+Pro+TKL&tag=kimsondreams-21': f'https://www.amazon.com/dp/B0B9R7T672?tag={TAG}'
}

def process_files():
    targets = [
        'top-wireless-earbuds-2025-comparison.json',
        'best-mechanical-keyboards-2025.json'
    ]
    
    for filename in targets:
        path = os.path.join(ARTICLES_DIR, filename)
        if not os.path.exists(path):
            print(f'File not found: {path}')
            continue
            
        try:
            with open(path, 'r') as f:
                content = f.read()
            
            original = content
            for search_url, direct_url in REPLACEMENTS.items():
                content = content.replace(search_url, direct_url)
            
            if content != original:
                with open(path, 'w') as f:
                    f.write(content)
                print(f'Fixed search links in {filename}')
            else:
                print(f'No search links found in {filename} (or already fixed)')
                
        except Exception as e:
            print(f'Error processing {filename}: {e}')

if __name__ == '__main__':
    process_files()
