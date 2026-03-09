import os
import json
import re

def sanitize_amazon_url(url):
    # Remove trailing backslashes or quotes or escaped quotes
    url = url.strip().rstrip('\\').rstrip('"').rstrip('\\"')
    
    # Fix double /s?k= or /dp/ patterns
    if '/s?k=' in url and url.count('/s?k=') > 1:
        parts = url.split('/s?k=')
        url = 'https://www.amazon.com/s?k=' + parts[-1]
    
    # Fix search + dp combo
    if '/s?k=' in url and '/dp/' in url:
        parts = url.split('/dp/')
        url = 'https://www.amazon.com/dp/' + parts[-1]

    # Ensure tag is present and not duplicated
    if 'tag=kimsondreams-21' not in url:
        separator = '&' if '?' in url else '?'
        url = url + separator + 'tag=kimsondreams-21'
    
    # Clean up double tags or double separators
    url = url.replace('??', '?').replace('&&', '&').replace('?&', '?')
    
    return url

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        raw_content = f.read()
    
    # Regex to find links inside JSON-escaped HTML content
    # Matches href=\"URL\" or href=\"URL\" or href='URL'
    pattern = r'href=\"*\\*"*(https://www\.amazon\.com/[^\\"\'>\s]+)'
    
    modified_raw = raw_content
    links = re.findall(pattern, raw_content)
    
    unique_links = sorted(list(set(links)), key=len, reverse=True)
    changes_made = 0
    
    for link in unique_links:
        sanitized = sanitize_amazon_url(link)
        if sanitized != link:
            modified_raw = modified_raw.replace(link, sanitized)
            changes_made += 1
    
    if changes_made > 0:
        # Verify JSON integrity before saving
        try:
            json.loads(modified_raw)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(modified_raw)
            return True, f"Repaired {changes_made} links"
        except Exception as e:
            return False, f"Repair failed integrity check: {str(e)}"
    
    return False, "No changes"

articles_dir = 'data/articles'
results = []

for filename in os.listdir(articles_dir):
    if filename.endswith('.json') and filename not in ['index.json', 'schema-index.json']:
        path = os.path.join(articles_dir, filename)
        success, msg = process_file(path)
        if success:
            results.append({"file": filename, "message": msg})

print(json.dumps(results, indent=2))