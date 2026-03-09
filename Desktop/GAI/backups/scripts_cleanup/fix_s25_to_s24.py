import os
files = [
    'data/articles/affiliate_links.json',
    'data/articles/best-tech-gadgets-amazon-2025.json',
    'data/articles/schema-index.json'
]
for f_path in files:
    if os.path.exists(f_path):
        with open(f_path, 'r', encoding='utf-8') as f:
            content = f.read()
        new_content = content.replace('S25 Ultra', 'S24 Ultra')
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed: {f_path}')
    else:
        print(f'Not found: {f_path}')
