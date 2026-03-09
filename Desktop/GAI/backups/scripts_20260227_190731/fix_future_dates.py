#!/usr/bin/env python3
import json
import os
import re
from datetime import datetime

ARTICLES_DIR = '/Users/jakubnetza/Desktop/GAI/data/articles'
TODAY = '2026-02-25'

def fix_future_dates():
    fixed_count = 0
    for filename in os.listdir(ARTICLES_DIR):
        if not filename.endswith('.json'):
            continue
        path = os.path.join(ARTICLES_DIR, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            original_date = data.get('date', '')
            if not original_date:
                continue
            
            # Sprawdź czy data jest przyszła (większa niż TODAY)
            if original_date > TODAY:
                # Zasada: jeśli rok to 2025, zmień na 2024 (zachowaj miesiąc i dzień)
                # Jeśli rok >= 2026, zmień na 2024-01-01
                year = int(original_date[:4])
                if year == 2025:
                    new_date = '2024' + original_date[4:]
                else:  # 2026, 2027, 2028, 2029
                    new_date = '2024-01-01'
                
                data['date'] = new_date
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f'{filename}: {original_date} -> {new_date}')
                fixed_count += 1
            else:
                print(f'{filename}: OK ({original_date})')
        except Exception as e:
            print(f'{filename}: ERROR {e}')
    
    print(f'\nNaprawiono {fixed_count} plików.')
    return fixed_count

if __name__ == '__main__':
    fix_future_dates()
