import os
import json

path = 'data/articles/top-5-flagship-gadgets-2025.json'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Naprawa eskapowania i usuwanie śmieci
    fixed = content.replace('\\\"', '\"').replace('\\\\\"', '\"').replace('\\n', '\n').replace('EOF', '').strip()
    
    # Próba parsowania dla pewności
    try:
        data = json.loads(fixed)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print('SUCCESS_REPAIR')
    except Exception as e:
        print(f'PARSE_ERROR: {e}')
        # Jeśli nadal błąd, zapiszemy chociaż to co mamy oczyszczone
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed)
else:
    print('FILE_NOT_FOUND')
