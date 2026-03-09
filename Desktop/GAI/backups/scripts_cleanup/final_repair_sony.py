import json
import re

path = 'data/articles/sony-wh-1000xm5-review.json'
try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Znajdź początek i koniec wartości pola "content"
    start_marker = '\"content\": \"'
    start_pos = content.find(start_marker)
    if start_pos == -1:
        print('BŁĄD: Nie znaleziono pola content')
        exit(1)
    
    val_start = start_pos + len(start_marker)
    
    # Szukaj końca pola content (następny klucz)
    end_marker = '\",\n  \"featured\"'
    val_end = content.find(end_marker, val_start)
    if val_end == -1:
        end_marker = '\",\n  \"views\"'
        val_end = content.find(end_marker, val_start)

    if val_end == -1:
        print('BŁĄD: Nie znaleziono końca pola content')
        exit(1)

    inner_html = content[val_start:val_end]
    
    # Naprawa: usuń błędne ucieczki i nałóż poprawne
    # Najpierw sprowadź do surowego HTML (zamień \\\" na \")
    raw_html = inner_html.replace('\\\\\\\"', '\"').replace('\\\"', '\"')
    # Teraz nałóż poprawne ucieczki dla JSON
    fixed_html = raw_html.replace('\"', '\\\"')
    
    new_content = content[:val_start] + fixed_html + content[val_end:]
    
    # Walidacja struktury
    data = json.loads(new_content)
    
    # Zapisz sformatowany JSON
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print('SUKCES: Plik Sony został naprawiony i zweryfikowany.')
except Exception as e:
    print(f'BŁĄD: {e}')
