import os
import json
import re
from datetime import datetime

# Use absolute paths to avoid CWD issues
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(BASE_DIR, 'data/articles')
INDEX_FILE = os.path.join(ARTICLES_DIR, 'index.json')
IMAGE_DIRS = [
    os.path.join(BASE_DIR, 'public/images/articles'),
    os.path.join(BASE_DIR, 'data/images/articles')
]
AFFILIATE_TAG = 'kimsondreams-21'
CURRENT_DATE = datetime(2026, 3, 5) # Updated to current date from system

def check_image(path):
    if not path: return False
    if path.startswith('http'): return True
    # Clean path
    clean_path = path.replace('images/articles/', '')
    for d in IMAGE_DIRS:
        if os.path.exists(os.path.join(d, clean_path)):
            return True
    return False

def audit():
    print(f"Starting audit in: {ARTICLES_DIR}")
    report = {'total_articles': 0, 'issues': [], 'summary': {'missing_images': 0, 'bad_links': 0, 'future_dates': 0}}
    
    if not os.path.exists(INDEX_FILE):
        print(f"ERROR: Index file missing at {INDEX_FILE}")
        return {'error': f'Index file missing at {INDEX_FILE}'}

    with open(INDEX_FILE, 'r') as f:
        index = json.load(f)

    for slug in index:
        # Strip .json if present to avoid double extension
        clean_slug = slug[:-5] if slug.endswith('.json') else slug
        report['total_articles'] += 1
        file_path = os.path.join(ARTICLES_DIR, f"{clean_slug}.json")
        
        if not os.path.exists(file_path):
            print(f"DEBUG: File not found: {file_path}")
            report['issues'].append({'slug': slug, 'error': f'File missing at {file_path}'})
            continue
            
        try:
            with open(file_path, 'r') as f:
                art = json.load(f)
        except Exception as e:
            report['issues'].append({'slug': slug, 'error': f'JSON error: {str(e)}'})
            continue

        article_issues = []
        
        # 1. Check Main Image
        main_img = art.get('image')
        if not check_image(main_img):
            article_issues.append(f'Missing main image: {main_img}')
            report['summary']['missing_images'] += 1

        # 2. Check Date
        try:
            date_str = art.get('date', '2000-01-01')
            art_date = datetime.strptime(date_str, '%Y-%m-%d')
            if art_date > CURRENT_DATE:
                article_issues.append(f'Future date: {date_str}')
                report['summary']['future_dates'] += 1
        except:
            article_issues.append('Invalid date format')

        # 3. Check Content (Images and Links)
        content = art.get('content', '')
        
        # Links
        amazon_links = re.findall(r'href=[\"\'](https?://(?:www\.)?amazon\.[a-z\.]+/dp/[^\"\']+)[\"\']', content)
        amazon_links += re.findall(r'href=[\"\'](https?://(?:www\.)?amazon\.[a-z\.]+/s\?[^\"\']+)[\"\']', content)
        
        for link in amazon_links:
            if AFFILIATE_TAG not in link:
                article_issues.append(f'Missing affiliate tag in link: {link[:50]}...')
                report['summary']['bad_links'] += 1

        # Content Images
        content_imgs = re.findall(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', content)
        for img in content_imgs:
            if not check_image(img):
                article_issues.append(f'Missing content image: {img}')
                report['summary']['missing_images'] += 1

        if article_issues:
            report['issues'].append({'slug': slug, 'title': art.get('title'), 'problems': article_issues})

    with open('data/audit_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    return report

if __name__ == '__main__':
    audit()
