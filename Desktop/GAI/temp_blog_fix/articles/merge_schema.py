import json
import os

base_dir = '/Users/jakubnetza/Desktop/GAI/temp_blog_fix/articles'

# Read article1.json
with open(os.path.join(base_dir, 'article1.json'), 'r', encoding='utf-8') as f:
    article = json.load(f)

# Read schema patch
with open(os.path.join(base_dir, 'article1_schema_patch.json'), 'r', encoding='utf-8') as f:
    schema = json.load(f)

# Add schema to article
article['schema'] = schema

# Save updated article
with open(os.path.join(base_dir, 'article1.json'), 'w', encoding='utf-8') as f:
    json.dump(article, f, indent=2, ensure_ascii=False)

print('Schema added to article1.json successfully')
print('Article ID:', article['id'])
print('Schema type:', schema['@type'])
