import json
import re

path = 'data/articles/sony-wh-1000xm5-review.json'
try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Znajdź granice pola content
    start_marker = '\"content\": \"'
    start_pos = content.find(start_marker)
    if start_pos == -1:
        print('ERROR: content field not found')
        exit(1)
    
    val_start = start_pos + len(start_marker)
    
    # Szukaj końca pola content (następny klucz)
    end_marker = '\",\n  \"featured\"'
    val_end = content.find(end_marker, val_start)
    if val_end == -1:
        end_marker = '\",\n  \"views\"'
        val_end = content.find(end_marker, val_start)

    if val_end == -1:
        print('ERROR: end marker not found')
        exit(1)

    inner_html_malformed = content[val_start:val_end]
    
    # Naprawa: 
    # 1. Usuń wszystkie ucieczki, aby uzyskać czysty HTML
    raw_html = inner_html_malformed.replace('\\\"', '\"').replace('\\\\', '\\')
    
    # 2. Użyj json.dumps, aby uzyskać poprawnie ucieczkowany string dla JSON
    # json.dumps doda cudzysłowy na początku i końcu, więc je odcinamy [1:-1]
    fixed_inner = json.dumps(raw_html, ensure_ascii=False)[1:-1]
    
    new_content = content[:val_start] + fixed_inner + content[val_end:]
    
    # Walidacja całego JSONa
    data = json.loads(new_content)
    
    # Zapisz sformatowany plik
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print('SUCCESS: Sony JSON repaired and validated.')
except Exception as e:
    print(f'ERROR: {e}')
