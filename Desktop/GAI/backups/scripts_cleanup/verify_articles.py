import json
import os
import datetime

def verify():
    idx_path = 'data/articles/index.json'
    art_dir = 'data/articles'
    now = datetime.date(2026, 3, 5)
    
    if not os.path.exists(idx_path):
        print(f'ERROR: {idx_path} not found')
        return

    with open(idx_path, 'r') as f:
        try:
            idx = json.load(f)
        except Exception as e:
            print(f'ERROR: Failed to parse index.json: {e}')
            return

    report = []
    for entry in idx:
        if not isinstance(entry, dict):
            continue
        f_name = entry.get('file')
        if not f_name:
            continue
        p = os.path.join(art_dir, f_name)
        if not os.path.exists(p):
            report.append(f'MISSING_FILE: {f_name}')
            continue
        
        try:
            with open(p, 'r', encoding='utf-8') as j:
                data = json.load(j)
                
                # Skip corrupted/recovered articles
                if data.get('title') == 'Recovered Article' or not data.get('content'):
                    continue

                # Check date
                d_str = data.get('date', '0000-00-00')
                try:
                    d_obj = datetime.datetime.strptime(d_str, '%Y-%m-%d').date()
                    if d_obj > now:
                        report.append(f'FUTURE_DATE: {f_name} ({d_str})')
                except:
                    report.append(f'INVALID_DATE_FORMAT: {f_name} ({d_str})')
                
                # Check affiliate tag only if Amazon link is present
                content_str = json.dumps(data)
                if 'amazon.com' in content_str and 'kimsondreams-21' not in content_str:
                    report.append(f'MISSING_AFFILIATE: {f_name}')
                    
        except Exception as e:
            report.append(f'JSON_ERROR: {f_name} ({e})')
            
    if not report:
        print('ALL_OK')
    else:
        for line in report:
            print(line)

if __name__ == '__main__':
    verify()
