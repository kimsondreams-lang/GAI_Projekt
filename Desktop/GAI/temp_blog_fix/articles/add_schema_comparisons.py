import json
import os

base_dir = '/Users/jakubnetza/Desktop/GAI/temp_blog_fix/articles'

# Schema templates for comparison articles (ItemList schema)
comparison_schemas = {
    'ai-assistants-comparison-2025.json': {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Best AI Assistants 2025: ChatGPT vs Claude vs Gemini Compared',
        'description': 'Comprehensive comparison of leading AI assistants in 2025',
        'numberOfItems': 3,
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'ChatGPT', 'url': 'https://www.amazon.com/s?k=ChatGPT+subscription&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Claude', 'url': 'https://www.amazon.com/s?k=Claude+AI&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 3, 'name': 'Gemini', 'url': 'https://www.amazon.com/s?k=Google+Gemini&tag=kimsondreams-21'}
        ]
    },
    'best-4k-monitors-2025.json': {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Best 4K Monitors 2025',
        'description': 'Top 4K monitors for gaming, productivity and content creation',
        'numberOfItems': 5,
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'LG 27GP950-B', 'url': 'https://www.amazon.com/s?k=LG+27GP950-B&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Dell S2722QC', 'url': 'https://www.amazon.com/s?k=Dell+S2722QC&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 3, 'name': 'ASUS ProArt PA279CV', 'url': 'https://www.amazon.com/s?k=ASUS+ProArt+PA279CV&tag=kimsondreams-21'}
        ]
    },
    'best-gaming-headsets-2025.json': {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Best Gaming Headsets 2025',
        'description': 'Top gaming headsets for immersive gaming experience',
        'numberOfItems': 5,
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'SteelSeries Arctis Nova Pro', 'url': 'https://www.amazon.com/s?k=SteelSeries+Arctis+Nova+Pro&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 2, 'name': 'HyperX Cloud III', 'url': 'https://www.amazon.com/s?k=HyperX+Cloud+III&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 3, 'name': 'Razer BlackShark V2', 'url': 'https://www.amazon.com/s?k=Razer+BlackShark+V2&tag=kimsondreams-21'}
        ]
    },
    'best-mechanical-keyboards-2025.json': {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Best Mechanical Keyboards 2025',
        'description': 'Top mechanical keyboards for typing and gaming',
        'numberOfItems': 5,
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Keychron Q1 Pro', 'url': 'https://www.amazon.com/s?k=Keychron+Q1+Pro&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Ducky One 3', 'url': 'https://www.amazon.com/s?k=Ducky+One+3&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 3, 'name': 'Corsair K70 RGB Pro', 'url': 'https://www.amazon.com/s?k=Corsair+K70+RGB+Pro&tag=kimsondreams-21'}
        ]
    },
    'best-wireless-earbuds-2025.json': {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Best Wireless Earbuds 2025',
        'description': 'Top wireless earbuds for music and calls',
        'numberOfItems': 5,
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Apple AirPods Pro 2', 'url': 'https://www.amazon.com/s?k=Apple+AirPods+Pro+2&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Sony WF-1000XM5', 'url': 'https://www.amazon.com/s?k=Sony+WF-1000XM5&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 3, 'name': 'Samsung Galaxy Buds2 Pro', 'url': 'https://www.amazon.com/s?k=Samsung+Galaxy+Buds2+Pro&tag=kimsondreams-21'}
        ]
    },
    'iphone-17-vs-samsung-s25.json': {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'iPhone 17 vs Samsung Galaxy S25 Comparison',
        'description': 'Detailed comparison of iPhone 17 and Samsung Galaxy S25',
        'numberOfItems': 2,
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'iPhone 17', 'url': 'https://www.amazon.com/s?k=iPhone+17&tag=kimsondreams-21'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Samsung Galaxy S25', 'url': 'https://www.amazon.com/s?k=Samsung+Galaxy+S25&tag=kimsondreams-21'}
        ]
    }
}

processed = 0
skipped = 0
for filename, schema in comparison_schemas.items():
    filepath = os.path.join(base_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            article = json.load(f)
        
        if 'schema' not in article:
            article['schema'] = schema
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(article, f, indent=2, ensure_ascii=False)
            print(f'ADDED schema to {filename}')
            processed += 1
        else:
            print(f'SKIP {filename} - already has schema')
            skipped += 1
    else:
        print(f'NOT FOUND: {filename}')

print(f'\\nTotal processed: {processed} articles, skipped: {skipped}')
