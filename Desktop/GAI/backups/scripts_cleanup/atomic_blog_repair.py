import os
import json
import re

# ASIN Mapping and Link Replacements
REPLACEMENTS = {
    r'https://www.amazon.com/s\?k=Keychron\+Q1\+Pro&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0BKGH4MHV?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=Sony\+WH-1000XM5\+Headphones/s\?k=sony\+wh-1000xm5&tag=kimsondreams-21\\?': 'https://www.amazon.com/dp/B09JQWSQK7?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=Samsung\+Galaxy\+S24\+Ultra/dp/B0CMDL9S8B\?tag=kimsondreams-21': 'https://www.amazon.com/dp/B0CS252X96?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=Samsung\+Galaxy\+S24\+Ultra\+5G/s\?k=Samsung\+Galaxy\+S24\+Ultra&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0CS252X96?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=MacBook\+Air\+M3\+Chip/s\?k=MacBook\+Air\+M3&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0CX216Z5Z?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=iPhone\+15\+Pro\+Max/s\?k=B0CCZ26B5V&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0CHX6X6S7?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=echo\+show\+15&tag=kimsondreams-21': 'https://www.amazon.com/dp/B09B2SB9S6?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=ring\+doorbell\+plus&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0B6S76NW8?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=nest\+hub\+max&tag=kimsondreams-21': 'https://www.amazon.com/dp/B07S5H4S69?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=blink\+outdoor\+4&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0B1N5K6RL?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=philips\+hue\+starter\+kit&tag=kimsondreams-21': 'https://www.amazon.com/dp/B07351P1JK?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=Sony\+WF-1000XM5&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0C33XXS56?tag=kimsondreams-21',
    r'https://www.amazon.com/s\?k=Bose\+QuietComfort\+Ultra\+Earbuds\+2nd\+Gen&tag=kimsondreams-21': 'https://www.amazon.com/dp/B0CGM1L66V?tag=kimsondreams-21'
}

def repair_text(text):
    if not isinstance(text, str):
        return text
    # Fix encoding using unicode escapes
    text = text.replace('\u00e2\u0080\u0099', \"'\") # It's
    text = text.replace('\u00e2\u0080\u0094', '—')
    text = text.replace('\u00e2\u0080\u0093', '–')
    text = text.replace('\u00e2\u0080\u009c', '\"')
    text = text.replace('\u00e2\u0080\u009d', '\"')
    
    # Downgrade models
    text = text.replace('S25 Ultra', 'S24 Ultra')
    text = text.replace('iPhone 17', 'iPhone 16')
    
    # Replace links
    for pattern, replacement in REPLACEMENTS.items():
        text = re.sub(pattern, replacement, text)
    
    return text

def process_articles():
    articles_dir = 'data/articles'
    for filename in os.listdir(articles_dir):
        if filename.endswith('.json'):
            path = os.path.join(articles_dir, filename)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                for key in ['title', 'subtitle', 'content']:
                    if key in data:
                        data[key] = repair_text(data[key])
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f'Error: {filename}: {e}')

if __name__ == \"__main__\":
    process_articles()
