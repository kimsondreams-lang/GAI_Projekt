import json
import os
import re

def fix_file(path, replacements):
    if not os.path.exists(path):
        print(f'File not found: {path}')
        return
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    content = data.get('content', '')
    for old, new in replacements:
        content = content.replace(old, new)
    
    data['content'] = content
    
    # Special case for top-5-flagship-gadgets-2025.json title/subtitle
    if 'top-5-flagship-gadgets-2025' in path:
        data['title'] = data['title'].replace('S25 Ultra', 'S24 Ultra')
        data['subtitle'] = data['subtitle'].replace('S25 Ultra', 'S24 Ultra')

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f'Fixed {path}')

# 1. Best Mechanical Keyboards
# Replacing placeholders sequentially or via specific context if possible. 
# Since they are all the same placeholder, I will use regex to find the sections.
kb_path = 'data/articles/best-mechanical-keyboards-2025.json'
if os.path.exists(kb_path):
    with open(kb_path, 'r') as f:
        kb_data = json.load(f)
    c = kb_data['content']
    # Keychron
    c = re.sub(r'(Keychron Q1 Pro.*?href=\\\")https://www.amazon.com/dp/B0BKGH4MHV', r'\1https://www.amazon.com/dp/B0C19999M8', c)
    # Logitech
    c = re.sub(r'(Logitech G Pro X TKL.*?href=\\\")https://www.amazon.com/dp/B0BKGH4MHV', r'\1https://www.amazon.com/dp/B0C6J8JQ6K', c)
    # Razer
    c = re.sub(r'(Razer Huntsman V3 Pro.*?href=\\\")https://www.amazon.com/dp/B0BKGH4MHV', r'\1https://www.amazon.com/dp/B0CCM7H8Z8', c)
    # SteelSeries
    c = re.sub(r'(SteelSeries Apex Pro TKL.*?href=\\\")https://www.amazon.com/dp/B0BKGH4MHV', r'\1https://www.amazon.com/dp/B0B96H6Y62', c)
    # Quick Links
    c = c.replace('Logitech G Pro X TKL on Amazon</a> | <a href=\\\"https://www.amazon.com/dp/B0BKGH4MHV', 'Logitech G Pro X TKL on Amazon</a> | <a href=\\\"https://www.amazon.com/dp/B0B96H6Y62')
    kb_data['content'] = c
    with open(kb_path, 'w') as f:
        json.dump(kb_data, f, indent=2)
    print('Fixed keyboards')

# 2. Flagship Gadgets
fix_file('data/articles/top-5-flagship-gadgets-2025.json', [
    ('Samsung Galaxy S25 Ultra', 'Samsung Galaxy S24 Ultra'),
    ('S25 Ultra', 'S24 Ultra'),
    ('B0DP5S1MQJ', 'B0CMDL9S8B')
])

# 3. Sony Review
fix_file('data/articles/sony-wh-1000xm5-review.json', [
    ('https://www.amazon.com/s?k=Sony+WH-1000XM5+Headphones/s?k=sony+wh-1000xm5&tag=kimsondreams-21\\\"', 'https://www.amazon.com/dp/B09XS7JWHH?tag=kimsondreams-21\"')
])
