import json
import os

def sanitize(text):
    return text.replace('2026', '2025').replace('2027', '2025')

def run_seo_injection():
    kw_path = 'data/seo_keyword_research.json'
    meta_path = 'data/internal_linking_metadata.json'
    articles_dir = 'data/articles'

    if not os.path.exists(kw_path) or not os.path.exists(meta_path):
        print('Error: Missing data files.')
        return

    with open(kw_path, 'r') as f:
        kw_data = json.load(f)
    
    with open(meta_path, 'r') as f:
        meta_data = json.load(f)

    keywords = [k['keyword'] for k in kw_data.get('keywords', [])]
    
    updated_count = 0
    for article_meta in meta_data:
        filename = article_meta.get('file')
        if not filename: continue
        
        file_path = os.path.join(articles_dir, filename)
        if not os.path.exists(file_path): continue

        try:
            with open(file_path, 'r') as f:
                article = json.load(f)
            
            best_kw = None
            title_lower = article.get('title', '').lower()
            tags_lower = [t.lower() for t in article.get('tags', [])]
            
            for kw in keywords:
                kw_parts = kw.lower().split()
                if any(part in title_lower for part in kw_parts) or any(part in ' '.join(tags_lower) for part in kw_parts):
                    best_kw = kw
                    break
            
            if best_kw:
                lsi_text = f'<p><i>SEO Update: As we look into the future of technology, understanding the impact of {best_kw} is crucial for staying ahead in 2025.</i></p>'
                if lsi_text not in article.get('content', ''):
                    article['content'] = article.get('content', '') + '\n' + lsi_text
                    
                if 'Exploring the latest in' in article.get('subtitle', ''):
                    article['subtitle'] = f'A deep dive into {best_kw} and its implications for 2025.'
                
                with open(file_path, 'w') as f:
                    json.dump(article, f, indent=2)
                updated_count += 1
        except Exception:
            continue

    print(f'SUCCESS: Updated {updated_count} articles.')

if __name__ == '__main__':
    run_seo_injection()
