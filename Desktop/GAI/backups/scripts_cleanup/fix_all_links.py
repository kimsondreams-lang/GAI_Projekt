import json
import os
import re

mapping = {
    r'amazon\.com/s\?k=echo\+show\+15': 'amazon.com/dp/B09M2B6DQ7',
    r'amazon\.com/s\?k=ring\+doorbell\+plus': 'amazon.com/dp/B0B96H6S6N',
    r'amazon\.com/s\?k=nest\+hub\+max': 'amazon.com/dp/B07S5H9W98',
    r'amazon\.com/s\?k=blink\+outdoor\+4': 'amazon.com/dp/B0B1N5HW22',
    r'amazon\.com/s\?k=philips\+hue\+starter\+kit': 'amazon.com/dp/B0FMH9ZD85',
    r'amazon\.com/s\?k=Sony\+WF-1000XM5': 'amazon.com/dp/B0C33XXS56',
    r'amazon\.com/s\?k=Bose\+QuietComfort\+Ultra\+Earbuds\+2nd\+Gen': 'amazon.com/dp/B0CFZLRF28',
    r'amazon\.com/s\?k=sony\+wh-1000xm5': 'amazon.com/dp/B09XS7JWHH',
    r'amazon\.com/s\?k=Sony\+WH-1000XM5\+Headphones/s\?k=sony\+wh-1000xm5': 'amazon.com/dp/B09XS7JWHH',
}

def fix_file(path):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    for pattern, replacement in mapping.items():
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
    
    if content != original_content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {path}')
    else:
        print(f'No changes: {path}')

articles_dir = 'data/articles'
for filename in os.listdir(articles_dir):
    if filename.endswith('.json'):
        fix_file(os.path.join(articles_dir, filename))
