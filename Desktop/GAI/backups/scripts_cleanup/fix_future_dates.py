import json
import os
from datetime import datetime

ARTICLES_DIR = 'data/articles'
TODAY = datetime.now().strftime('%Y-%m-%d')

def fix_future_dates():
    fixed_count = 0
    if not os.path.exists(ARTICLES_DIR): return
    for filename in os.listdir(ARTICLES_DIR):
        if not filename.endswith('.json') or filename in ['index.json', 'schema-index.json']:
            continue
        path = os.path.join(ARTICLES_DIR, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if not isinstance(data, dict): continue
            
            original_date = data.get('date', '')
            if original_date and original_date > TODAY:
                data['date'] = TODAY
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(filename + ': ' + original_date + ' -> ' + TODAY)
                fixed_count += 1
        except Exception as e:
            print(filename + ': ERROR ' + str(e))
    print('Fixed ' + str(fixed_count) + ' files.')

if __name__ == '__main__':
    fix_future_dates()
