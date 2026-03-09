import json
import os

base_dir = '/Users/jakubnetza/Desktop/GAI/temp_blog_fix/articles'

# Define schemas for each review article
schemas = {
    'sony-wh-1000xm5-review.json': {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': 'Sony WH-1000XM5',
        'image': 'https://kimsondreams.com/images/articles/sony-wh-1000xm5.jpg',
        'description': 'Premium wireless noise-canceling headphones with exceptional sound quality and 30-hour battery life.',
        'brand': {'@type': 'Brand', 'name': 'Sony'},
        'review': {
            '@type': 'Review',
            'reviewRating': {'@type': 'Rating', 'ratingValue': '9.0', 'bestRating': '10', 'worstRating': '1'},
            'author': {'@type': 'Person', 'name': 'TechVanguard'},
            'datePublished': '2024-06-15',
            'reviewBody': 'The Sony WH-1000XM5 delivers exceptional noise cancellation and sound quality.'
        },
        'offers': {
            '@type': 'Offer',
            'url': 'https://www.amazon.com/s?k=Sony+WH-1000XM5&tag=kimsondreams-21',
            'priceCurrency': 'USD',
            'availability': 'https://schema.org/InStock'
        }
    },
    'dji-mini-4-pro-review.json': {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': 'DJI Mini 4 Pro',
        'image': 'https://kimsondreams.com/images/articles/dji-mini-4-pro.jpg',
        'description': 'Ultra-lightweight drone with 4K camera, obstacle avoidance, and 34-minute flight time.',
        'brand': {'@type': 'Brand', 'name': 'DJI'},
        'review': {
            '@type': 'Review',
            'reviewRating': {'@type': 'Rating', 'ratingValue': '9.2', 'bestRating': '10', 'worstRating': '1'},
            'author': {'@type': 'Person', 'name': 'TechVanguard'},
            'datePublished': '2024-08-20',
            'reviewBody': 'The DJI Mini 4 Pro is the best lightweight drone for travelers and content creators.'
        },
        'offers': {
            '@type': 'Offer',
            'url': 'https://www.amazon.com/s?k=DJI+Mini+4+Pro&tag=kimsondreams-21',
            'priceCurrency': 'USD',
            'availability': 'https://schema.org/InStock'
        }
    },
    'iphone-16-pro-max-review.json': {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': 'iPhone 16 Pro Max',
        'image': 'https://kimsondreams.com/images/articles/iphone-16-pro-max.jpg',
        'description': 'Apple flagship smartphone with A18 Pro chip, 6.9-inch Super Retina XDR Pro display.',
        'brand': {'@type': 'Brand', 'name': 'Apple'},
        'review': {
            '@type': 'Review',
            'reviewRating': {'@type': 'Rating', 'ratingValue': '9.5', 'bestRating': '10', 'worstRating': '1'},
            'author': {'@type': 'Person', 'name': 'TechVanguard'},
            'datePublished': '2024-09-25',
            'reviewBody': 'The iPhone 16 Pro Max sets a new standard for flagship smartphones.'
        },
        'offers': {
            '@type': 'Offer',
            'url': 'https://www.amazon.com/s?k=iPhone+16+Pro+Max&tag=kimsondreams-21',
            'priceCurrency': 'USD',
            'availability': 'https://schema.org/InStock'
        }
    }
}

processed = 0
for filename, schema in schemas.items():
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
    else:
        print(f'NOT FOUND: {filename}')

print(f'\\nTotal processed: {processed} articles')
