import json
import re
import os

articles_dir = "/Users/jakubnetza/Desktop/GAI/data/articles"
fixed_count = 0

def fix_link(href):
    # Fix duplicated URLs like: https://amazon.com/s?k=Producthttps://amazon.com/s?k=Product&tag=...
    # Pattern: find where URL is duplicated
    if 'https://www.amazon.com' in href and href.count('https://www.amazon.com') > 1:
        # Find the second occurrence and truncate there
        parts = href.split('https://www.amazon.com')
        href = 'https://www.amazon.com' + parts[1]
    
    # Fix missing closing quote before target
    href = re.sub(r"(\?tag=kimsondreams-21)\s+target=", r'\1" target=', href)
    href = re.sub(r"(&tag=kimsondreams-21)\s+target=", r'\1" target=', href)
    
    # Ensure proper quote at end if missing
    if not href.endswith('"') and 'target=' in href:
        href = href.replace(' target=', '" target=')
    
    return href

def fix_content(content):
    # Find all href attributes and fix them
    def replace_href(match):
        full_match = match.group(0)
        href = match.group(1)
        fixed_href = fix_link(href)
        return f'href="{fixed_href}"'
    
    # Pattern for href='...' or href="..."
    content = re.sub(r"href='([^']*?)'\s+target=", lambda m: f'href="{fix_link(m.group(1))}" target=', content)
    content = re.sub(r'href="([^"]*?)"\s+target=', lambda m: f'href="{fix_link(m.group(1))}" target=', content)
    
    return content

files_to_fix = [
    "best-mechanical-keyboards-2025.json",
    "sony-wh-1000xm5-review.json", 
    "top-5-flagship-gadgets-2025.json"
]

for filename in files_to_fix:
    filepath = os.path.join(articles_dir, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        continue
    
    try:
        with open(filepath, 'r') as f:
            article = json.load(f)
        
        original_content = article.get('content', '')
        fixed_content = fix_content(original_content)
        
        if original_content != fixed_content:
            article['content'] = fixed_content
            with open(filepath, 'w') as f:
                json.dump(article, f, indent=2)
            print(f"Fixed: {filename}")
            fixed_count += 1
        else:
            print(f"No changes needed: {filename}")
    except Exception as e:
        print(f"Error processing {filename}: {e}")

print(f"\nTotal files fixed: {fixed_count}")
