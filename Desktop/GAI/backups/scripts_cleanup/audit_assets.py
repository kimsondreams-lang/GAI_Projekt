import json
import os
import re

articles_dir = 'data/articles'
images_dir = 'public/images/articles'
article_ids = [f.replace('.json', '') for f in os.listdir(articles_dir) if f.endswith('.json')]

report = {
    'missing_images': [],
    'broken_internal_links': []
}

for filename in os.listdir(articles_dir):
    if not filename.endswith('.json'):
        continue
    
    path = os.path.join(articles_dir, filename)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 1. Check main image
        main_img = data.get('image', '')
        if main_img:
            img_name = os.path.basename(main_img)
            if not os.path.exists(os.path.join(images_dir, img_name)):
                report['missing_images'].append({'article': filename, 'image': main_img})
        
        # 2. Check content for images and links
        content = data.get('content', '')
        
        # Images in HTML
        html_imgs = re.findall(r'src=[\"\']images/articles/([^\"\']+)[\"\']', content)
        for img in html_imgs:
            if not os.path.exists(os.path.join(images_dir, img)):
                report['missing_images'].append({'article': filename, 'image': f'images/articles/{img}'})
        
        # Internal links
        internal_links = re.findall(r'article\.html\?id=([a-zA-Z0-9\-_]+)', content)
        for link_id in internal_links:
            if link_id not in article_ids:
                report['broken_internal_links'].append({'article': filename, 'target_id': link_id})
                
    except Exception as e:
        print(f'Error processing {filename}: {e}')

print(json.dumps(report, indent=2))
