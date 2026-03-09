#!/usr/bin/env python3
"""
SEO Meta Tags & Structured Data Injection Script
Processes all article JSONs and adds SEO fields
"""

import json
import os
import re
from pathlib import Path

ARTICLES_DIR = Path("/Users/jakubnetza/Desktop/GAI/data/articles")
BASE_URL = "https://technova.buzz"
REPORT_PATH = Path("/Users/jakubnetza/Desktop/GAI/data/seo_injection_report.json")

def generate_meta_description(article):
    """Generate meta description from subtitle or content"""
    if article.get("subtitle") and len(article["subtitle"]) > 20:
        return article["subtitle"][:160]
    # Strip HTML and truncate content
    text = re.sub(r'<[^>]+>', '', article.get("content", ""))
    text = text.strip()
    if len(text) > 160:
        return text[:157] + "..."
    return text

def generate_open_graph(article):
    """Generate Open Graph tags object"""
    image = article.get("image", "")
    image_url = image if image.startswith("http") else f"{BASE_URL}/{image}"
    
    return {
        "title": article.get("title", ""),
        "description": generate_meta_description(article),
        "type": "article",
        "url": f"{BASE_URL}/articles/{article.get('id', '')}",
        "image": image_url,
        "siteName": "TechNova",
        "locale": "en_US",
        "articlePublishedTime": article.get("date", ""),
        "articleSection": article.get("category", ""),
        "articleTags": ", ".join(article.get("tags", []))
    }

def generate_json_ld(article):
    """Generate JSON-LD structured data"""
    image = article.get("image", "")
    image_url = image if image.startswith("http") else f"{BASE_URL}/{image}"
    
    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": article.get("title", ""),
        "description": generate_meta_description(article),
        "image": image_url,
        "author": {
            "@type": "Organization",
            "name": article.get("author", "TechNova Team")
        },
        "publisher": {
            "@type": "Organization",
            "name": "TechNova",
            "logo": {
                "@type": "ImageObject",
                "url": f"{BASE_URL}/images/logo.png"
            }
        },
        "datePublished": article.get("date", ""),
        "dateModified": article.get("date", ""),
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": f"{BASE_URL}/articles/{article.get('id', '')}"
        },
        "articleSection": article.get("category", ""),
        "keywords": ", ".join(article.get("tags", []))
    }

def process_article(file_path):
    """Process a single article file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            article = json.load(f)
        
        # Skip if already has SEO fields (idempotent)
        if article.get("metaDescription") and article.get("jsonLd"):
            return {"file": file_path.name, "status": "skipped", "reason": "already has SEO fields"}
        
        # Generate SEO fields
        article["metaDescription"] = generate_meta_description(article)
        article["openGraph"] = generate_open_graph(article)
        article["jsonLd"] = generate_json_ld(article)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(article, f, indent=2, ensure_ascii=False)
        
        title = article.get("title", "")[:50] + "..." if len(article.get("title", "")) > 50 else article.get("title", "")
        return {"file": file_path.name, "status": "processed", "title": title}
    except Exception as e:
        return {"file": file_path.name, "status": "error", "error": str(e)}

def main():
    print("🔍 SEO Meta Injection Script Starting...\n")
    
    # Get all JSON files (excluding index.json)
    json_files = [f for f in ARTICLES_DIR.glob("*.json") if f.name != "index.json"]
    json_files.sort()
    
    print(f"Found {len(json_files)} articles to process\n")
    
    results = {
        "processed": 0,
        "skipped": 0,
        "errors": 0,
        "details": []
    }
    
    for i, file_path in enumerate(json_files, 1):
        result = process_article(file_path)
        results["details"].append(result)
        
        if result["status"] == "processed":
            results["processed"] += 1
        elif result["status"] == "skipped":
            results["skipped"] += 1
        else:
            results["errors"] += 1
        
        # Progress indicator
        if i % 10 == 0 or i == len(json_files):
            print(f"Progress: {i}/{len(json_files)}", end="\r", flush=True)
    
    print("\n\n✅ SEO Injection Complete!\n")
    print(f"📊 Results:")
    print(f"   Processed: {results['processed']}")
    print(f"   Skipped:   {results['skipped']}")
    print(f"   Errors:    {results['errors']}")
    
    # Save report
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n📄 Report saved to: {REPORT_PATH}")
    
    # Exit with error code if any errors
    return 1 if results["errors"] > 0 else 0

if __name__ == "__main__":
    exit(main())
