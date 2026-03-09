import json
import os
import re

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    content = data.get('content', '')
    tag = 'tag=kimsondreams-21'
    
    def add_tag(match):
        url = match.group(0)
        if 'tag=' in url:
            return url
        separator = '&' if '?' in url else '?'
        return f'{url}{separator}{tag}'

    # Match amazon.com links
    new_content = re.sub(r'https://www\.amazon\.com/[^\"\'\s<>]+', add_tag, content)
    
    changed = False
    if new_content != content:
        data['content'] = new_content
        changed = True
        
    if 'affiliateLinks' in data:
        for link_obj in data['affiliateLinks']:
            url = link_obj.get('url', '')
            if 'amazon.com' in url and 'tag=' not in url:
                separator = '&' if '?' in url else '?'
                link_obj['url'] = f'{url}{separator}{tag}'
                changed = True

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    return False

if __name__ == '__main__':
    files = [
        'ai-assistants-comparison-2025.json', 'article1.json', 'article3.json', 'article4.json', 
        'article9.json', 'best-4k-monitors-2025.json', 'best-budget-tech-gadgets-2024.json', 
        'best-eco-friendly-products-amazon-2025.json', 'best-gaming-headsets-2025.json', 
        'best-laptops-2025.json', 'best-portable-monitors-2025.json', 'best-smart-home-devices-2025.json', 
        'best-wireless-earbuds-2025.json', 'dji-mini-4-pro-review.json', 'iphone-17-vs-samsung-s25.json', 
        'revolutionary-ai-tech-products-amazon-2025.json', 'summer-2025-laptop-buying-guide.json', 
        'top-10-smart-home-gadgets-amazon-2025.json'
    ]
    base_dir = 'data/articles'
    fixed = 0
    for f_name in files:
        path = os.path.join(base_dir, f_name)
        if os.path.exists(path):
            if fix_file(path):
                fixed += 1
                print(f'Fixed: {f_name}')
    print(f'Total files fixed: {fixed}')
