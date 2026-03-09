import json
import os

MAP_FILE = 'data/articles/internal_linking_map.json'
ARTICLES_DIR = 'data/articles'

def apply_links():
    if not os.path.exists(MAP_FILE):
        print(f'Error: {MAP_FILE} not found')
        return

    with open(MAP_FILE, 'r') as f:
        data = json.load(f)

    articles_map = data.get('articles', [])
    updated_count = 0

    for entry in articles_map:
        article_id = entry.get('id')
        related = entry.get('relatedArticles', [])
        
        file_path = os.path.join(ARTICLES_DIR, f'{article_id}.json')
        if not os.path.exists(file_path):
            print(f'Warning: Article file {file_path} not found')
            continue

        with open(file_path, 'r') as f:
            article = json.load(f)

        content = article.get('content', '')
        
        # Check if we already added a related section
        if 'related-articles-section' in content:
            print(f'Skipping {article_id}: Related section already exists')
            continue

        # Build the related articles HTML
        related_html = '\n\n<div class=\"related-articles-section\">\n    <h3>Related Articles</h3>\n    <ul>\n'
        for rel in related:
            rel_id = rel.get('id')
            link_text = rel.get('linkText')
            related_html += f'        <li><a href=\"article.html?id={rel_id}\">{link_text}</a></li>\n'
        related_html += '    </ul>\n</div>'

        # Append to content
        article['content'] = content + related_html
        
        with open(file_path, 'w') as f:
            json.dump(article, f, indent=2)
        
        print(f'Updated {article_id} with {len(related)} internal links.')
        updated_count += 1

    print(f'Successfully updated {updated_count} articles.')

if __name__ == '__main__':
    apply_links()
