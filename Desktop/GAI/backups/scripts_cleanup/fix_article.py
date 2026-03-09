import json
import os

article_data = {
  \"id\": \"top-5-flagship-gadgets-2025\",
  \"title\": \"Top 5 Flagship Tech Gadgets of 2025: The Ultimate Comparison\",
  \"subtitle\": \"We compare the most powerful smartphones, laptops, and audio gear available on Amazon this year.\",
  \"author\": \"Technova Team\",
  \"date\": \"2025-03-01\",
  \"category\": \"COMPARISONS\",
  \"tags\": [\"Tech\", \"Gadgets\", \"Samsung\", \"Apple\", \"Bose\", \"GoPro\", \"Kindle\"],
  \"image\": \"images/articles/top-5-gadgets-2025-main.jpg\",
  \"content\": \"<p>The tech landscape in 2025 is more competitive than ever. From AI-integrated smartphones to ultra-portable laptops, choosing the right device can be overwhelming. We have tested the top 5 flagship gadgets available on Amazon to help you decide which one deserves a spot in your tech arsenal.</p><h2>Comparison at a Glance</h2><table class='comparison-table'><thead><tr><th>Product</th><th>Category</th><th>Key Strength</th><th>Amazon Link</th></tr></thead><tbody><tr><td>Samsung Galaxy S24 Ultra</td><td>Smartphone</td><td>AI & Display</td><td><a href='https://www.amazon.com/dp/B0CMDL9S8B?tag=kimsondreams-21' target='_blank' rel='noopener'>View on Amazon</a></td></tr><tr><td>MacBook Air M3</td><td>Laptop</td><td>Portability & Power</td><td><a href='https://www.amazon.com/dp/B0CX226PB7?tag=kimsondreams-21' target='_blank' rel='noopener'>View on Amazon</a></td></tr><tr><td>Bose QC Ultra</td><td>Audio</td><td>Noise Cancellation</td><td><a href='https://www.amazon.com/dp/B0CCZ26B5V?tag=kimsondreams-21' target='_blank' rel='noopener'>View on Amazon</a></td></tr><tr><td>GoPro HERO13 Black</td><td>Camera</td><td>Stabilization</td><td><a href='https://www.amazon.com/dp/B0D9M6N8L2?tag=kimsondreams-21' target='_blank' rel='noopener'>View on Amazon</a></td></tr><tr><td>Kindle Paperwhite</td><td>E-Reader</td><td>Battery Life</td><td><a href='https://www.amazon.com/dp/B09TMN58KL?tag=kimsondreams-21' target='_blank' rel='noopener'>View on Amazon</a></td></tr></tbody></table><h2>1. Samsung Galaxy S24 Ultra</h2><p>The S24 Ultra remains the king of productivity. With its integrated S Pen and the new Galaxy AI features, it is more than just a phone; it is a pocket-sized workstation. The Titanium frame and Gorilla Armor glass make it incredibly durable.</p><h2>2. MacBook Air M3 (13-inch)</h2><p>Apple's M3 chip brings significant performance gains to the world's most popular laptop. It is fanless, silent, and offers up to 18 hours of battery life, making it the perfect companion for students and professionals on the go.</p><h2>3. Bose QuietComfort Ultra Headphones</h2><p>Bose has reclaimed the ANC crown with the Ultra series. The new Immersive Audio mode creates a wider soundstage, while the world-class noise cancellation ensures you can focus anywhere.</p><h2>4. GoPro HERO13 Black</h2><p>For creators and adventurers, the HERO13 Black offers unmatched 5.3K video quality and HyperSmooth 6.0 stabilization. It is rugged, waterproof, and now features improved battery management for longer shoots.</p><h2>5. Kindle Paperwhite (16 GB)</h2><p>The latest Kindle Paperwhite features a 6.8-inch display with adjustable warm light and up to 10 weeks of battery life. It is waterproof and perfect for reading by the pool or in bed.</p><div class='product-recommendation'><h3>Where to Buy</h3><p>You can find all these gadgets on Amazon with fast shipping. Check the latest prices using the links below:</p><ul><li><a href='https://www.amazon.com/s?k=Samsung+Galaxy+S24+Ultra&tag=kimsondreams-21' target='_blank' rel='noopener'>Samsung Galaxy S24 Ultra on Amazon</a></li><li><a href='https://www.amazon.com/s?k=MacBook+Air+M3&tag=kimsondreams-21' target='_blank' rel='noopener'>MacBook Air M3 on Amazon</a></li><li><a href='https://www.amazon.com/s?k=B0CCZ26B5V&tag=kimsondreams-21' target='_blank' rel='noopener'>Bose QC Ultra on Amazon</a></li></ul></div>\"
}

path = '/Users/jakubnetza/Desktop/GAI/data/articles/top-5-flagship-gadgets-2025.json'
with open(path, 'w', encoding='utf-8') as f:
    json.dump(article_data, f, indent=2)

index_path = '/Users/jakubnetza/Desktop/GAI/data/articles/index.json'
if os.path.exists(index_path):
    with open(index_path, 'r', encoding='utf-8') as f:
        index = json.load(f)
    if 'top-5-flagship-gadgets-2025.json' not in index:
        index.append('top-5-flagship-gadgets-2025.json')
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2)
        print('INDEX_UPDATED')
    else:
        print('ALREADY_IN_INDEX')
