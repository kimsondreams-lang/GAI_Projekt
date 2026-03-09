import json
import os
import re

def repair():
    results = []
    # 1. Fix Article JSON (Unwrap double-stringification)
    article_path = 'data/articles/razer-v4-pro-vs-logitech-g915x-comparison.json'
    if os.path.exists(article_path):
        try:
            with open(article_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
            
            data = content
            # Iteratively unwrap if it's a string
            while isinstance(data, str):
                try:
                    data = json.loads(data)
                except:
                    break
            
            if isinstance(data, dict):
                with open(article_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                results.append(f'SUCCESS: Repaired JSON in {article_path}')
            else:
                results.append(f'ERROR: Failed to parse {article_path} into dict. Type: {type(data)}')
        except Exception as e:
            results.append(f'ERROR: Repairing article: {str(e)}')
    else:
        results.append(f'ERROR: Article not found at {article_path}')

    # 2. Update FTP Host to ftp.hostinger.com
    scripts = ['scripts/ftpsync.py', 'scripts/upload_articles.py']
    for s in scripts:
        if os.path.exists(s):
            try:
                with open(s, 'r', encoding='utf-8') as f:
                    content = f.read()
                # Replace host assignment
                new_content = re.sub(r\"host\s*=\s*['\"].*?['\"]\", \"host = 'ftp.hostinger.com'\", content)
                with open(s, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                results.append(f'SUCCESS: Updated host in {s}')
            except Exception as e:
                results.append(f'ERROR: Updating {s}: {str(e)}')
        else:
            results.append(f'WARNING: Script {s} not found')

    # 3. Ensure article is in index.json
    index_path = 'data/articles/index.json'
    if os.path.exists(index_path):
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                index = json.load(f)
            slug = 'razer-v4-pro-vs-logitech-g915x-comparison.json'
            if slug not in index:
                index.append(slug)
                index.sort()
                with open(index_path, 'w', encoding='utf-8') as f:
                    json.dump(index, f, indent=2)
                results.append(f'SUCCESS: Added {slug} to index')
            else:
                results.append(f'INFO: {slug} already in index')
        except Exception as e:
            results.append(f'ERROR: Updating index: {str(e)}')

    # 4. Create image placeholders if missing
    images = ['article6-cover.jpg', 'razer-v4-pro-vs-logitech-g915x-comparison-main.jpg']
    img_dir = 'public/images/articles'
    os.makedirs(img_dir, exist_ok=True)
    for img in images:
        path = os.path.join(img_dir, img)
        if not os.path.exists(path):
            with open(path, 'wb') as f:
                f.write(b'') # Empty placeholder
            results.append(f'SUCCESS: Created placeholder {path}')

    return results

if __name__ == '__main__':
    logs = repair()
    for log in logs:
        print(log)
