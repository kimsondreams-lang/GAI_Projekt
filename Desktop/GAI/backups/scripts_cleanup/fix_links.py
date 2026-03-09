import json
import os

def fix_file(path, replacements):
    if not os.path.exists(path):
        print(f'File not found: {path}')
        return
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    content = data.get('content', '')
    original_content = content
    for old_url, new_url in replacements.items():
        content = content.replace(old_url, new_url)
    
    if content != original_content:
        data['content'] = content
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'Updated: {path}')
    else:
        print(f'No changes made to: {path}')

# Sony WH-1000XM5
fix_file('data/articles/sony-wh-1000xm5-review.json', {
    'https://www.amazon.com/s?k=sony+wh-1000xm5&tag=kimsondreams-21': 'https://www.amazon.com/dp/B09XS7JWHH?tag=kimsondreams-21'
})

# Keychron Q1 Pro
fix_file('data/articles/best-mechanical-keyboards-2025.json', {
    'https://www.amazon.com/s?k=Keychron+Q1+Pro&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0BKGH4MHV?tag=kimsondreams-21'
})

