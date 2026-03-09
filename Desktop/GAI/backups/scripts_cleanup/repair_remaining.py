import json
import os

def repair_json(path, replacements):
    if not os.path.exists(path):
        print(f'File not found: {path}')
        return
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Repair content
        content = data.get('content', '')
        for old, new in replacements:
            content = content.replace(old, new)
        data['content'] = content
        
        # Repair affiliateLinks if exist
        if 'affiliateLinks' in data:
            for link in data['affiliateLinks']:
                for old, new in replacements:
                    link['url'] = link['url'].replace(old, new)
                    link['label'] = link['label'].replace(old, new)

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'Successfully repaired: {path}')
    except Exception as e:
        print(f'Error repairing {path}: {str(e)}')

# 1. Fix best-tech-gadgets-amazon-2025.json
repair_json('data/articles/best-tech-gadgets-amazon-2025.json', [
    ('samsung galaxy s25 ultra', 'samsung galaxy s24 ultra'),
    ('s25', 's24'),
    ('asus-rog-zephyrus-g14-2025', 'asus-rog-zephyrus-g14-2024'),
    ('RTX 5070', 'RTX 4070')
])

# 2. Fix best-tech-gadgets-comparison-2025.json
repair_json('data/articles/best-tech-gadgets-comparison-2025.json', [
    ('Sony WH-1000XM6', 'Sony WH-1000XM5'),
    ('B0D1XD1ZV3', 'B09XS7JWHH'),
    ('B0DGFBX8VZ', 'B0DHJ896RY')
])

# 3. Fix internal_linking_map.json
map_path = 'data/articles/internal_linking_map.json'
if os.path.exists(map_path):
    with open(map_path, 'r', encoding='utf-8') as f:
        map_data = json.load(f)
    
    str_data = json.dumps(map_data)
    str_data = str_data.replace('Sony WF-1000XM6', 'Sony WF-1000XM5')
    str_data = str_data.replace('AirPods Pro 3', 'AirPods Pro 2')
    str_data = str_data.replace('Bose QC Ultra 2', 'Bose QC Ultra')
    str_data = str_data.replace('iphone-17-vs-samsung-s25', 'iphone-16-pro-max-vs-samsung-s24-ultra')
    
    with open(map_path, 'w', encoding='utf-8') as f:
        f.write(str_data)
    print(f'Repaired: {map_path}')

print('Remaining repairs completed.')
