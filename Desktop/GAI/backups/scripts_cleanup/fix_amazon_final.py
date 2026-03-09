import json
import re
import os

articles_dir = '/Users/jakubnetza/Desktop/GAI/data/articles'
files = [
    'best-amazon-gadgets-march-2025.json',
    'best-mechanical-keyboards-2025.json',
    'sony-wh-1000xm5-review.json',
    'top-5-flagship-gadgets-2025.json',
    'top-ai-gadgets-amazon-2025.json',
    'top-wireless-earbuds-2025-comparison.json'
]

def fix_content(content):
    # 1. Fix missing quotes in href (specifically for kimsondreams-21 followed by target)
    content = re.sub(r\"(href='https://www\\.amazon\\.com/[^']+tag=kimsondreams-21)(\\s+target=)\", r\"\\1'\\2\", content)
    content = re.sub(r'(href=\"https://www\\.amazon\\.com/[^\"]+tag=kimsondreams-21)(\\s+target=)', r'\\1\"\\2', content)
    
    # 2. Fix concatenated URLs
    def split_concat(match):
        full_str = match.group(0)
        urls = re.findall(r'https://www\\.amazon\\.com/[^\\s\\'\">]+', full_str)
        if len(urls) > 1:
            # Prefer dp links over search links
            dp_links = [u for u in urls if '/dp/' in u]
            return dp_links[-1] if dp_links else urls[-1]
        return full_str
    
    content = re.sub(r'https://www\\.amazon\\.com/[^\\s\\'\">]+https://www\\.amazon\\.com/[^\\s\\'\">]+', split_concat, content)
    
    # 3. Fix trailing backslashes (often escaped in JSON as \\\\ or \\)
    content = content.replace('kimsondreams-21\\\\', 'kimsondreams-21')
    content = content.replace('kimsondreams-21\\', 'kimsondreams-21')
    
    # 4. Specific 404 fix for best-amazon-gadgets-march-2025 (B0C7GTXN8K)
    content = content.replace('https://www.amazon.com/dp/B0C7GTXN8K?tag=kimsondreams-21', 'https://www.amazon.com/s?k=SteelSeries+Arctis+Nova+Pro+Wireless&tag=kimsondreams-21')
    
    # 5. Fix the specific Sony WH-1000XM5 concatenation issue
    content = content.replace('Sony+WH-1000XM5+Headphones/s?k=sony+wh-1000xm5', 'sony+wh-1000xm5')
    
    return content

for f in files:
    path = os.path.join(articles_dir, f)
    if not os.path.exists(path):
        print(f'File not found: {f}')
        continue
    try:
        with open(path, 'r', encoding='utf-8') as jf:
            data = json.load(jf)
        
        old_content = data.get('content', '')
        new_content = fix_content(old_content)
        
        if old_content != new_content:
            data['content'] = new_content
            with open(path, 'w', encoding='utf-8') as jf:
                json.dump(data, jf, indent=2, ensure_ascii=False)
            print(f'✓ Fixed: {f}')
        else:
            print(f'- No changes: {f}')
    except Exception as e:
        print(f'✗ Error {f}: {e}')

