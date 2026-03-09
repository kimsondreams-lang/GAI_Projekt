import json
import os

def repair_json(path, replacements, metadata_updates=None):
    if not os.path.exists(path):
        print(f'File not found: {path}')
        return
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        content = data.get('content', '')
        for old, new in replacements:
            content = content.replace(old, new)
        data['content'] = content
        
        if metadata_updates:
            data.update(metadata_updates)
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'Successfully repaired: {path}')
    except Exception as e:
        print(f'Error repairing {path}: {str(e)}')

# 1. Repair Keyboards
kb_path = 'data/articles/best-mechanical-keyboards-2025.json'
if os.path.exists(kb_path):
    with open(kb_path, 'r', encoding='utf-8') as f:
        kb_data = json.load(f)
    content = kb_data['content']
    content = content.replace('B0BKGH4MHV?tag=kimsondreams-21', 'B0CQ55Z8TY?tag=kimsondreams-21', 1)
    content = content.replace('B0BKGH4MHV?tag=kimsondreams-21', 'B0C9S7W9B7?tag=kimsondreams-21', 1)
    content = content.replace('B0BKGH4MHV?tag=kimsondreams-21', 'B0CFX7G789?tag=kimsondreams-21', 1)
    content = content.replace('B0BKGH4MHV?tag=kimsondreams-21', 'B0B8627S2N?tag=kimsondreams-21', 1)
    content = content.replace('B0BKGH4MHV?tag=kimsondreams-21', 'B0C9S7W9B7?tag=kimsondreams-21', 1)
    content = content.replace('B0BKGH4MHV?tag=kimsondreams-21', 'B0B8627S2N?tag=kimsondreams-21', 1)
    kb_data['content'] = content
    with open(kb_path, 'w', encoding='utf-8') as f:
        json.dump(kb_data, f, indent=2, ensure_ascii=False)
    print(f'Repaired: {kb_path}')

# 2. Repair Sony Review
repair_json('data/articles/sony-wh-1000xm5-review.json', [
    ('https://www.amazon.com/s?k=Sony+WH-1000XM5+Headphones/s?k=sony+wh-1000xm5&tag=kimsondreams-21', 'https://www.amazon.com/dp/B09XS7JWHH?tag=kimsondreams-21')
])

# 3. Repair Flagships
repair_json('data/articles/top-5-flagship-gadgets-2025.json', [
    ('S25 Ultra', 'S24 Ultra'),
    ('S25 ultra', 'S24 Ultra'),
    ('s25-ultra-display.webp', 's24-ultra-display.jpg'),
    ('https://www.amazon.com/s?k=Samsung+Galaxy+S24+Ultra/dp/B0CMDL9S8B?tag=kimsondreams-21', 'https://www.amazon.com/dp/B0CMDL9S8B?tag=kimsondreams-21'),
    ('https://www.amazon.com/s?k=Samsung+Galaxy+S24+Ultra+5G/s?k=Samsung+Galaxy+S24+Ultra&tag=kimsondreams-21', 'https://www.amazon.com/dp/B0CMDL9S8B?tag=kimsondreams-21'),
    ('https://www.amazon.com/s?k=MacBook+Air+M3+Chip/s?k=MacBook+Air+M3&tag=kimsondreams-21', 'https://www.amazon.com/dp/B0CX226PB7?tag=kimsondreams-21'),
    ('https://www.amazon.com/s?k=iPhone+15+Pro+Max/s?k=B0CCZ26B5V&tag=kimsondreams-21', 'https://www.amazon.com/dp/B0DHJ896RY?tag=kimsondreams-21')
], metadata_updates={'image': 'images/articles/s24-ultra-display.jpg'})

# 4. Repair Earbuds
repair_json('data/articles/top-wireless-earbuds-2025-comparison.json', [
    ('Sony WF-1000XM6', 'Sony WF-1000XM5'),
    ('AirPods Pro 3', 'AirPods Pro 2'),
    ('Bose QC Ultra 2', 'Bose QC Ultra'),
    ('Integrated Processor V3', 'Integrated Processor V2'),
    ('H3 chip', 'H2 chip'),
    ('Feb 2025', 'Aug 2023'),
    ('Jan 2025', 'Sep 2023'),
    ('June 2025', 'Oct 2023'),
    ('https://www.amazon.com/dp/B0C33XXS56?tag=kimsondreams-21', 'https://www.amazon.com/dp/B0C33XXS56?tag=kimsondreams-21'),
    ('https://www.amazon.com/dp/B0FQFB8FMG?tag=kimsondreams-21', 'https://www.amazon.com/dp/B0CHXNFQD6?tag=kimsondreams-21'),
    ('https://www.amazon.com/dp/B0CFZLRF28?tag=kimsondreams-21', 'https://www.amazon.com/dp/B0CFZLRF28?tag=kimsondreams-21')
], metadata_updates={'title': 'Best Wireless Earbuds of 2025: Sony WF-1000XM5 vs. AirPods Pro 2 vs. Bose QC Ultra'})

# 5. Fix iPhone 17 vs S25
old_file = 'data/articles/iphone-17-vs-samsung-s25.json'
new_file = 'data/articles/iphone-16-pro-max-vs-samsung-s24-ultra.json'
if os.path.exists(old_file):
    with open(old_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    data['id'] = 'iphone-16-pro-max-vs-samsung-s24-ultra'
    data['title'] = 'iPhone 16 Pro Max vs. Samsung Galaxy S24 Ultra: 2025 Flagship Battle'
    data['subtitle'] = 'Comparing the two most powerful smartphones of 2025.'
    data['tags'] = ['Apple', 'Samsung', 'iPhone 16', 'S24 Ultra', 'Comparison']
    data['image'] = 'images/articles/iphone-16-pro-max.jpg'
    data['content'] = '<p>The battle for smartphone supremacy in 2025 comes down to the iPhone 16 Pro Max and the Samsung Galaxy S24 Ultra. Both devices offer peak performance, incredible cameras, and advanced AI features.</p><h2>Design and Display</h2><p>The iPhone 16 Pro Max features a refined titanium design with a 6.9-inch display, while the S24 Ultra maintains its sharp, professional look with an integrated S Pen.</p><h2>Performance</h2><p>Apple A18 Pro chip vs. Qualcomm Snapdragon 8 Gen 3. Both provide more power than most users will ever need.</p><h2>Camera Comparison</h2><p>iPhone 48MP main sensor vs. Samsung 200MP sensor. Both deliver professional-grade photography and video.</p><div class=\"product-recommendation\"><h3>Check Prices on Amazon</h3><p><a href=\"https://www.amazon.com/dp/B0DHJ896RY?tag=kimsondreams-21\">iPhone 16 Pro Max</a> | <a href=\"https://www.amazon.com/dp/B0CMDL9S8B?tag=kimsondreams-21\">Samsung Galaxy S24 Ultra</a></p></div>'
    with open(new_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.remove(old_file)
    print(f'Renamed and repaired: {old_file} -> {new_file}')

print('Repairs completed.')
