import json
import os

def fix_mismatches():
    audit_path = 'data/link_checker/audit_report_2026-03-08T16-23-54-651Z.json'
    articles_dir = 'temp_blog_fix/data/articles'
    index_path = os.path.join(articles_dir, 'index.json')

    if not os.path.exists(audit_path):
        print(f'Error: {audit_path} not found')
        return

    with open(audit_path, 'r') as f:
        audit = json.load(f)

    mismatches = audit.get('images', {}).get('mismatches', [])
    if not mismatches:
        print('No mismatches found in audit report.')
        return

    # Load index
    if os.path.exists(index_path):
        with open(index_path, 'r') as f:
            index_data = json.load(f)
    else:
        index_data = []

    count = 0
    for m in mismatches:
        article_id = m['id']
        # Extract filename and ensure it points to local images/articles/
        img_name = m['image'].split('/')[-1]
        local_path = f'images/articles/{img_name}'
        
        # Update individual JSON
        article_path = os.path.join(articles_dir, f'{article_id}.json')
        if os.path.exists(article_path):
            try:
                with open(article_path, 'r') as f:
                    art = json.load(f)
                art['image'] = local_path
                with open(article_path, 'w') as f:
                    json.dump(art, f, indent=2)
                count += 1
            except Exception as e:
                print(f'Error updating {article_path}: {e}')
        
        # Update index
        for item in index_data:
            if item.get('id') == article_id:
                item['image'] = local_path

    if index_data:
        with open(index_path, 'w') as f:
            json.dump(index_data, f, indent=2)

    print(f'Successfully updated {count} article files and the index.')

if __name__ == '__main__':
    fix_mismatches()