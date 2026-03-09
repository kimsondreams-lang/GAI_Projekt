import json
import sys
import re
import os

def validate_article(file_path, schema_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        with open(schema_path, 'r') as f:
            schema = json.load(f)
    except Exception as e:
        print(f"ERROR: Failed to load files: {e}")
        return False

    errors = []
    
    # Required fields
    for field in schema['required']:
        if field not in data:
            errors.append(f"Missing required field: {field}")

    # Field types and patterns
    if 'id' in data and not re.match(schema['properties']['id']['pattern'], data['id']):
        errors.append(f"Invalid ID format: {data['id']}")
    
    if 'date' in data and not re.match(schema['properties']['date']['pattern'], data['date']):
        errors.append(f"Invalid date format: {data['date']}")

    if 'category' in data and data['category'] not in schema['properties']['category']['enum']:
        errors.append(f"Invalid category: {data['category']}")

    if 'image' in data and not re.match(schema['properties']['image']['pattern'], data['image']):
        errors.append(f"Invalid image path: {data['image']}")

    if 'content' in data and len(data['content']) < schema['properties']['content']['minLength']:
        errors.append("Content too short")

    # Amazon Link Check
    if 'affiliateLinks' in data:
        for link in data['affiliateLinks']:
            if 'url' in link and 'tag=kimsondreams-21' not in link['url']:
                errors.append(f"Missing affiliate tag in link: {link['url']}")

    if errors:
        print(f"VALIDATION FAILED for {file_path}:")
        for err in errors:
            print(f"  - {err}")
        return False
    
    print(f"SUCCESS: {file_path} is valid.")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 validate_article.py <article_json_path>")
        sys.exit(1)
    
    article_path = sys.argv[1]
    schema_path = 'config/article_schema.json'
    if not validate_article(article_path, schema_path):
        sys.exit(1)
