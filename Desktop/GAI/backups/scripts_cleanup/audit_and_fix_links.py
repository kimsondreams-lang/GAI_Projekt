import os
import json
import re

articles_dir = 'data/articles'
affiliate_tag = 'tag=kimsondreams-21'

def fix_links(content):
    # Find all amazon links
    amazon_links = re.findall(r'https?://(?:www\.)?amazon\.[a-z.]+/\S+', content)
    fixed_content = content
    for link in amazon_links:
        # Clean trailing characters like ", ', <, >
        clean_link = link.rstrip("\"'<>)")
        if 'amazon.' in clean_link and affiliate_tag not in clean_link:
            separator = '&' if '?' in clean_link else '?'
            new_link = clean_link + separator + affiliate_tag
            fixed_content = fixed_content.replace(clean_link, new_link)
    return fixed_content

fixed_count = 0
for filename in os.listdir(articles_dir):
    if filename.endswith('.json') and filename not in ['index.json', 'articles.json', 'affiliate_links.json']:
        path = os.path.join(articles_dir, filename)
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            
            original_content = data.get('content', '')
            new_content = fix_links(original_content)
            
            if original_content != new_content:
                data['content'] = new_content
                with open(path, 'w') as f:
                    json.dump(data, f, indent=2)
                fixed_count += 1
                print(f'Fixed links in {filename}')
        except Exception as e:
            print(f'Error processing {filename}: {e}')

print(f'Total files fixed: {fixed_count}')
