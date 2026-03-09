import json
import os

base_dir = '/Users/jakubnetza/Desktop/GAI/temp_blog_fix/articles'

# Create schema for iPhone 16 Pro Max review
schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': 'iPhone 16 Pro Max',
    'image': 'https://kimsondreams.com/images/articles/iphone-16-pro-max.jpg',
    'description': 'Apple flagship smartphone with A18 Pro chip and 6.9-inch Super Retina XDR Pro display',
    'brand': {
        '@type': 'Brand',
        'name': 'Apple'
    },
    'review': {
        '@type': 'Review',
        'reviewRating': {
            '@type': 'Rating',
            'ratingValue': '9.5',
            'bestRating': '10',
            'worstRating': '1'
        },
        'author': {
            '@type': 'Person',
            'name': 'TechVanguard'
        },
        'datePublished': '2024-09-25',
        'reviewBody': 'The iPhone 16 Pro Max sets a new standard for flagship smartphones in 2024.'
    },
    'offers': {
        '@type': 'Offer',
        'url': 'https://www.amazon.com/s?k=iPhone+16+Pro+Max&tag=kimsondreams-21',
        'priceCurrency': 'USD',
        'availability': 'https://schema.org/InStock'
    }
}

# Read article
article_path = os.path.join(base_dir, 'article1.json')
with open(article_path, 'r', encoding='utf-8') as f:
    article = json.load(f)

# Add schema
article['schema'] = schema

# Save
with open(article_path, 'w', encoding='utf-8') as f:
    json.dump(article, f, indent=2, ensure_ascii=False)

print('SUCCESS: Schema added to article1.json')
print('Article ID:', article['id'])
print('Schema type:', schema['@type'])
