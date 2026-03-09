import json
import os

def update():
    target_id = 'sony-wh-1000xm5-vs-bose-qc-ultra-comparison'
    target_url = f'article.html?id={target_id}'
    
    # 1. Sony Review
    p1 = 'data/articles/sony-wh-1000xm5-review.json'
    if os.path.exists(p1):
        with open(p1, 'r', encoding='utf-8') as f:
            d = json.load(f)
        # Update Verdict link
        old_link = 'article.html?id=best-wireless-earbuds-2025'
        d['content'] = d['content'].replace(old_link, target_url)
        d['content'] = d['content'].replace('Best Wireless Earbuds 2025 comparison', 'Sony WH-1000XM5 vs Bose QuietComfort Ultra comparison')
        
        # Add to Related Articles section
        if target_url not in d['content']:
            li = f'<li><a href=\"{target_url}\">Sony vs Bose: Which flagship reigns supreme? See our full comparison</a></li>'
            if '<div class=\"related-articles-section\">' in d['content']:
                d['content'] = d['content'].replace('<ul>', f'<ul>\n        {li}', 1)
        
        with open(p1, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
        print(f'Updated {p1}')

    # 2. Earbuds Comparison
    p2 = 'data/articles/top-wireless-earbuds-2025-comparison.json'
    if os.path.exists(p2):
        with open(p2, 'r', encoding='utf-8') as f:
            d = json.load(f)
        if target_url not in d['content']:
            li = f'<li><a href=\"{target_url}\">Sony WH-1000XM5 vs Bose QuietComfort Ultra: The Ultimate ANC Showdown</a></li>'
            if '<div class=\"related-articles-section\">' in d['content']:
                d['content'] = d['content'].replace('<ul>', f'<ul>\n        {li}', 1)
        with open(p2, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
        print(f'Updated {p2}')

    # 3. Internal Linking Map
    p3 = 'data/articles/internal_linking_map.json'
    if os.path.exists(p3):
        with open(p3, 'r', encoding='utf-8') as f:
            m = json.load(f)
        updated = False
        for art in m.get('articles', []):
            if art['id'] in ['sony-wh-1000xm5-review', 'top-wireless-earbuds-2025-comparison']:
                if not any(r['id'] == target_id for r in art.get('relatedArticles', [])):
                    art.setdefault('relatedArticles', []).insert(0, {
                        'id': target_id,
                        'reason': 'Directly related flagship comparison',
                        'linkText': 'Sony vs Bose: The Ultimate ANC Showdown'
                    })
                    updated = True
        if updated:
            with open(p3, 'w', encoding='utf-8') as f:
                json.dump(m, f, indent=2, ensure_ascii=False)
            print(f'Updated {p3}')

if __name__ == '__main__':
    update()
