#!/usr/bin/env python3
"""
Image Assignment Validation Script
Checks for duplicate images and keyword mismatches in articles.
"""

import json
import os
import re
import argparse
from collections import defaultdict
from pathlib import Path

def extract_keywords(title):
    """Extract product keywords from article title"""
    if not title: return set()
    title_lower = title.lower()
    patterns = [
        r'iphone[\s-]*(\d+)',
        r'samsung[\s-]*galaxy[\s-]*s(\d+)',
        r'macbook[\s-]*(air|pro|neo)?',
        r'apple[\s-]*watch',
        r'pixel[\s-]*(\d+)',
        r'sony[\s-]*wh',
        r'bose',
        r'nintendo[\s-]*switch',
    ]
    keywords = set()
    for pattern in patterns:
        matches = re.findall(pattern, title_lower)
        for match in matches:
            if isinstance(match, tuple): keywords.update(m for m in match if m)
            else: keywords.add(match)
    words = re.findall(r'\b[a-z]{4,}\b', title_lower)
    stop_words = {'the', 'and', 'for', 'with', 'best', 'review', 'guide', 'vs', 'comparison'}
    keywords.update(w for w in words if w not in stop_words)
    return keywords

def check_image_keywords(image_path, keywords):
    if not image_path: return True, set()
    filename = os.path.basename(image_path).lower()
    filename_words = set(re.findall(r'[a-z0-9]+', filename))
    matches = keywords & filename_words
    return len(matches) > 0 or not keywords, matches

def validate_articles(articles_path):
    print(f"\nValidating: {articles_path}")
    if not os.path.exists(articles_path):
        print(f"File not found: {articles_path}")
        return None

    with open(articles_path, 'r') as f:
        data = json.load(f)

    articles = []
    base_dir = os.path.dirname(articles_path)

    if isinstance(data, list):
        for item in data:
            if isinstance(item, str):
                # It's a filename from an index
                file_path = os.path.join(base_dir, item)
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f_art:
                        art_data = json.load(f_art)
                        if isinstance(art_data, dict): articles.append(art_data)
                        elif isinstance(art_data, list): articles.extend([a for a in art_data if isinstance(a, dict)])
            elif isinstance(item, dict):
                articles.append(item)
    elif isinstance(data, dict):
        articles = [data]

    image_counts = defaultdict(list)
    issues = []
    mismatches = []

    for article in articles:
        if not isinstance(article, dict): continue
        image = article.get('image', '')
        title = article.get('title', '')
        article_id = article.get('id', 'unknown')

        if image:
            image_counts[image].append({'id': article_id, 'title': title})
            keywords = extract_keywords(title)
            has_match, matches = check_image_keywords(image, keywords)
            if not has_match:
                mismatches.append({'id': article_id, 'title': title, 'image': image, 'keywords': list(keywords)})

    duplicates = {img: arts for img, arts in image_counts.items() if len(arts) > 1}
    
    for img, arts in duplicates.items():
        issues.append({'type': 'duplicate', 'image': img, 'articles': arts})
    
    for m in mismatches:
        issues.append({'type': 'mismatch', **m})

    print(f"Summary: {len(articles)} articles, {len(duplicates)} duplicates, {len(mismatches)} mismatches")
    return {'total': len(articles), 'issues': issues}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dir', help='Directory containing articles')
    parser.add_argument('--output', help='Output report path')
    args = parser.parse_args()

    targets = []
    if args.dir:
        idx = os.path.join(args.dir, 'index.json')
        if os.path.exists(idx): targets.append(idx)
        art_json = os.path.join(args.dir, 'articles.json')
        if os.path.exists(art_json): targets.append(art_json)
    
    # Fallback to defaults if no targets found via args
    if not targets:
        targets = ['/Users/jakubnetza/Desktop/GAI/data/articles/index.json']

    results = {}
    for t in targets:
        res = validate_articles(t)
        if res: results[t] = res

    output_path = args.output or '/Users/jakubnetza/Desktop/GAI/data/image_validation_report.json'
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Report saved to {output_path}")
