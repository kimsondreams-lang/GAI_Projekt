import json
import re
import os

articles_dir = "/Users/jakubnetza/Desktop/GAI/data/articles"

def fix_duplicated_urls(content):
    """Fix URLs like: https://amazon.com/s?k=Producthttps://amazon.com/s?k=Product&tag=..."""
    
    # Pattern 1: Duplicated search URLs
    # Match: https://www.amazon.com/s?k=SOMETHINGhttps://www.amazon.com/s?k=ELSE&tag=...
    pattern1 = r'https://www\.amazon\.com/s\?k=[A-Za-z0-9+]+https://www\.amazon\.com/s\?k=([A-Za-z0-9+]+)&tag=kimsondreams-21'
    content = re.sub(pattern1, r'https://www.amazon.com/s?k=\1&tag=kimsondreams-21', content)
    
    # Pattern 2: Mixed dp and search URLs
    pattern2 = r'https://www\.amazon\.com/s\?k=[A-Za-z0-9+]+https://www\.amazon\.com/dp/([A-Z0-9]+)\?tag=kimsondreams-21'
    content = re.sub(pattern2, r'https://www.amazon.com/dp/\1?tag=kimsondreams-21', content)
    
    # Pattern 3: Search URL with product name concatenated
    pattern3 = r'https://www\.amazon\.com/s\?k=([A-Za-z0-9+]+)[A-Za-z0-9+]*https://www\.amazon\.com/s\?k=\1&tag=kimsondreams-21'
    content = re.sub(pattern3, r'https://www.amazon.com/s?k=\1&tag=kimsondreams-21', content)
    
    return content

files_to_fix = [
    "best-mechanical-keyboards-2025.json",
    "sony-wh-1000xm5-review.json", 
    "top-5-flagship-gadgets-2025.json"
]

fixed_count = 0
for filename in files_to_fix:
    filepath = os.path.join(articles_dir, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        continue
    
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        original = data.get('content', '')
        fixed = fix_duplicated_urls(original)
        
        if original != fixed:
            data['content'] = fixed
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"✓ Fixed: {filename}")
            fixed_count += 1
        else:
            print(f"- No changes: {filename}")
    except Exception as e:
        print(f"✗ Error {filename}: {e}")

print(f"\nTotal fixed: {fixed_count}")
