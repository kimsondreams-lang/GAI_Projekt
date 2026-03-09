import json

# Read article1.json
with open('/Users/jakubnetza/Desktop/GAI/temp_blog_fix/articles/article1.json', 'r') as f:
    article = json.load(f)

# Read schema patch
with open('/Users/jakubnetza/Desktop/GAI/temp_blog_fix/articles/article1_schema_patch.json', 'r') as f:
    schema = json.load(f)

# Add schema to article
article['schema'] = schema

# Save updated article
with open('/Users/jakubnetza/Desktop/GAI/temp_blog_fix/articles/article1.json', 'w') as f:
    json.dump(article, f, indent=2, ensure_ascii=False)

print('Schema added to article1.json successfully')
print('Article ID:', article['id'])
print('Schema type:', schema['@type'])
