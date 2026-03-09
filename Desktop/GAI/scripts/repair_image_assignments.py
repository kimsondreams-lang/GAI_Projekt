#!/usr/bin/env python3
"""
Repair script to fix duplicate and mismatched image assignments in articles.json
Maps articles to unique images based on keyword matching from titles.
"""

import json
import os
import re
from collections import defaultdict
from pathlib import Path

# Paths
TEMP_FTP_ARTICLES = "/Users/jakubnetza/Desktop/GAI/temp_ftp_blog/articles.json"
DATA_ARTICLES = "/Users/jakubnetza/Desktop/GAI/data/articles/index.json"
IMAGES_DIR = "/Users/jakubnetza/Desktop/GAI/temp_ftp_blog/images/articles"

def get_all_images():
    """Get all available image files."""
    images = []
    for f in os.listdir(IMAGES_DIR):
        if f.endswith(('.jpg', '.jpeg', '.png', '.webp')):
            images.append(f)
    return images

def extract_keywords(title):
    """Extract meaningful keywords from article title."""
    # Convert to lowercase and extract words
    title_lower = title.lower()
    # Remove common stop words
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'your', 'our', 'their', 'his', 'her', 'its', 'my', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'then', 'here', 'there', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once', 'during', 'before', 'after', 'above', 'below', 'between', 'through', 'into', 'within', 'without', 'against', 'among', 'around', 'behind', 'beyond', 'despite', 'during', 'except', 'inside', 'outside', 'since', 'toward', 'under', 'until', 'upon', 'via', 'worth', 'per', 'plus', 'minus', 'times', 'divided', 'equals', 'less', 'more', 'most', 'least', 'best', 'better', 'good', 'bad', 'worse', 'worst', 'new', 'old', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'right', 'left', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important', 'few', 'public', 'same', 'able', 'how', 'when', 'where', 'why', 'what', 'which', 'who', 'whom', 'whose', 'whatever', 'whenever', 'wherever', 'whether', 'while', 'because', 'since', 'until', 'although', 'though', 'unless', 'whether', 'if', 'than', 'as', 'like', 'so', 'such', 'very', 'just', 'only', 'even', 'also', 'too', 'still', 'yet', 'already', 'almost', 'quite', 'rather', 'enough', 'indeed', 'thus', 'hence', 'therefore', 'however', 'moreover', 'furthermore', 'nevertheless', 'nonetheless', 'otherwise', 'instead', 'meanwhile', 'afterwards', 'eventually', 'finally', 'initially', 'previously', 'subsequently', 'ultimately', 'especially', 'particularly', 'specifically', 'generally', 'usually', 'normally', 'typically', 'actually', 'certainly', 'definitely', 'probably', 'possibly', 'perhaps', 'maybe', 'likely', 'surely', 'clearly', 'obviously', 'apparently', 'evidently', 'presumably', 'supposedly', 'arguably', 'undoubtedly', 'unquestionably', 'absolutely', 'completely', 'entirely', 'totally', 'wholly', 'partly', 'partially', 'mostly', 'mainly', 'largely', 'primarily', 'principally', 'basically', 'essentially', 'fundamentally', 'virtually', 'practically', 'nearly', 'almost', 'approximately', 'roughly', 'around', 'about', 'over', 'under', 'above', 'below', 'up', 'down', 'off', 'on', 'in', 'out', 'inside', 'outside', 'throughout', 'through', 'across', 'along', 'around', 'behind', 'beneath', 'beside', 'between', 'beyond', 'inside', 'into', 'near', 'onto', 'opposite', 'outside', 'over', 'past', 'round', 'since', 'toward', 'under', 'underneath', 'until', 'unto', 'upon', 'via', 'with', 'within', 'without', 'worth', 'per', 'plus', 'minus', 'times', 'divided', 'equals', 'less', 'more', 'most', 'least', 'best', 'better', 'good', 'bad', 'worse', 'worst', 'new', 'old', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'right', 'left', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important', 'few', 'public', 'same', 'able', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'}
    
    words = re.findall(r'\b[a-z]+\b', title_lower)
    keywords = [w for w in words if w not in stop_words and len(w) > 2]
    
    # Also extract product names (capitalized words, model numbers)
    products = re.findall(r'\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*\b', title)
    products = [p.lower() for p in products]
    
    # Extract model numbers (e.g., iPhone 16, RTX 5090, WH-1000XM5)
    models = re.findall(r'\b(?:iphone|galaxy|pixel|rtx|macbook|watch|oura|sony|bose|dell|asus|acer|lenovo|hp|msi|razer|alienware|thinkpad|xps|rog|zephyrus|surface|ipad|airpods|xm5|xm4|qc|wh|g14|x14|m3|m4|m5|m6|ultra|pro|max|plus|se|a|s|note|tab|fold|flip|ring|band|fit|sense|versa|charge|inspire|lux|aria|index|scale|drone|mini|air|spark|mavic|phantom|osmo|pocket|action|gopro|hero|session|fusion|max|360|one|r|x2|x3|rs|gimbal|ronin|dji|tello|ryze|autel|evo|nano|lite|plus|pro|air|2s|3|classic|zoom|enterprise|agriculture|matrice|inspire|phantom|fimi|xiaomi|hubsan|syma|cheerson|wltoys|jjrc|udirc|potensic|holy|stone|contixo|deerc|snaptain|drocon|neheme|hs|d20|d40|d50|d60|d70|d80|d90|d100|d110|d120|d130|d140|d150|d160|d170|d180|d190|d200|d210|d220|d230|d240|d250|d260|d270|d280|d290|d300|d310|d320|d330|d340|d350|d360|d370|d380|d390|d400|d410|d420|d430|d440|d450|d460|d470|d480|d490|d500|d510|d520|d530|d540|d550|d560|d570|d580|d590|d600|d610|d620|d630|d640|d650|d660|d670|d680|d690|d700|d710|d720|d730|d740|d750|d760|d770|d780|d790|d800|d810|d820|d830|d840|d850|d860|d870|d880|d890|d900|d910|d920|d930|d940|d950|d960|d970|d980|d990|d1000)\s*(?:\d+[a-z]*|pro|max|ultra|plus|mini|air|se|s|plus|max|ultra|pro|edition|version|variant|model|series|gen|generation|mark|mk|rev|revision|ver|version|v\d+)?', title_lower)
    
    all_keywords = list(set(keywords + products + models))
    return all_keywords

def score_image_match(image_name, keywords):
    """Score how well an image matches the given keywords."""
    score = 0
    image_lower = image_name.lower().replace('-', ' ').replace('_', ' ').replace('.', ' ')
    
    for keyword in keywords:
        keyword_lower = keyword.lower()
        # Exact match in filename
        if keyword_lower in image_lower:
            score += 10
            # Bonus for being at the start of filename
            if image_lower.startswith(keyword_lower):
                score += 5
        # Partial match
        elif keyword_lower.replace(' ', '') in image_lower.replace(' ', ''):
            score += 5
    
    return score

def find_best_image(article, available_images, used_images):
    """Find the best matching unused image for an article."""
    title = article.get('title', '')
    keywords = extract_keywords(title)
    
    # Score all available images
    candidates = []
    for img in available_images:
        if img not in used_images:
            score = score_image_match(img, keywords)
            if score > 0:
                candidates.append((img, score))
    
    # Sort by score descending
    candidates.sort(key=lambda x: x[1], reverse=True)
    
    if candidates:
        return candidates[0][0]
    
    # Fallback: find any unused image
    for img in available_images:
        if img not in used_images:
            return img
    
    return None

def repair_articles(articles_path, images, is_data_index=False):
    """Repair image assignments in articles file."""
    with open(articles_path, 'r') as f:
        data = json.load(f)
    
    if is_data_index:
        articles = data.get('articles', data) if isinstance(data, dict) else data
    else:
        articles = data if isinstance(data, list) else data.get('articles', [])
    
    used_images = set()
    changes = []
    
    for article in articles:
        article_id = article.get('id', 'unknown')
        title = article.get('title', '')
        current_image = article.get('image', '')
        
        # Extract just the filename from current image path
        current_filename = os.path.basename(current_image) if current_image else ''
        
        # Check if current image is already used by another article
        if current_filename in used_images:
            # Need to find a new unique image
            new_image = find_best_image(article, images, used_images)
            if new_image:
                article['image'] = f"images/articles/{new_image}"
                changes.append({
                    'id': article_id,
                    'title': title,
                    'old_image': current_image,
                    'new_image': article['image'],
                    'reason': 'duplicate'
                })
                used_images.add(new_image)
            else:
                # No available images left
                changes.append({
                    'id': article_id,
                    'title': title,
                    'old_image': current_image,
                    'new_image': None,
                    'reason': 'no_available_images'
                })
        else:
            # Check if current image is a mismatch (doesn't match keywords well)
            keywords = extract_keywords(title)
            current_score = score_image_match(current_filename, keywords)
            
            # Find best matching image
            best_image = find_best_image(article, images, used_images)
            best_score = score_image_match(best_image, keywords) if best_image else 0
            
            # If current is a poor match and we have a better option
            if current_score < 5 and best_score > current_score + 10:
                article['image'] = f"images/articles/{best_image}"
                changes.append({
                    'id': article_id,
                    'title': title,
                    'old_image': current_image,
                    'new_image': article['image'],
                    'reason': 'mismatch',
                    'old_score': current_score,
                    'new_score': best_score
                })
                used_images.add(best_image)
            else:
                # Keep current image
                if current_filename:
                    used_images.add(current_filename)
    
    # Save repaired file
    with open(articles_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    return changes

def main():
    print("=" * 60)
    print("REPAIRING IMAGE ASSIGNMENTS")
    print("=" * 60)
    
    # Get all available images
    images = get_all_images()
    print(f"\nFound {len(images)} available images")
    
    # Repair temp_ftp_blog/articles.json
    print("\n" + "-" * 60)
    print(f"Repairing: {TEMP_FTP_ARTICLES}")
    print("-" * 60)
    changes_temp = repair_articles(TEMP_FTP_ARTICLES, images, is_data_index=False)
    print(f"Made {len(changes_temp)} changes:")
    for change in changes_temp:
        print(f"  - {change['id']}: {change['reason']}")
        if change.get('new_image'):
            print(f"    {change['old_image']} -> {change['new_image']}")
    
    # Repair data/articles/index.json
    print("\n" + "-" * 60)
    print(f"Repairing: {DATA_ARTICLES}")
    print("-" * 60)
    changes_data = repair_articles(DATA_ARTICLES, images, is_data_index=True)
    print(f"Made {len(changes_data)} changes:")
    for change in changes_data:
        print(f"  - {change['id']}: {change['reason']}")
        if change.get('new_image'):
            print(f"    {change['old_image']} -> {change['new_image']}")
    
    # Save report
    report = {
        'temp_ftp_changes': changes_temp,
        'data_changes': changes_data,
        'total_changes': len(changes_temp) + len(changes_data)
    }
    report_path = "/Users/jakubnetza/Desktop/GAI/data/image_repair_report.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print("\n" + "=" * 60)
    print(f"Total changes: {report['total_changes']}")
    print(f"Report saved to: {report_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
