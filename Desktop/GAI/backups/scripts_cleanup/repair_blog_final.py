import json
import os
import re

# 1. Reconstruct Sony Article
sony_id = 'sony-wh-1000xm6-vs-bose-qc-ultra-comparison'
sony_path = os.path.join('data/articles', f'{sony_id}.json')

sony_content = {
    \"id\": sony_id,
    \"title\": \"Sony WH-1000XM6 vs. Bose QuietComfort Ultra: The Ultimate 2025 Noise-Canceling Battle\",
    \"subtitle\": \"We compare the two titans of premium wireless headphones to see which one reigns supreme in late 2025.\",
    \"author\": \"Technova Team\",
    \"date\": \"2025-12-15\",
    \"category\": \"COMPARISONS\",
    \"tags\": [\"Audio\", \"Headphones\", \"Sony\", \"Bose\", \"Comparison\", \"Tech\", \"Gadgets\"],
    \"image\": \"images/articles/sony-wh-1000xm6-main.jpg\",
    \"content\": \"\"\"<p>In the high-stakes world of premium noise-canceling headphones, two names consistently rise to the top: Sony and Bose. As we approach the end of 2025, the battle has reached a fever pitch with the release of the <strong>Sony WH-1000XM6</strong> and the continued dominance of the <strong>Bose QuietComfort Ultra</strong>. Both offer industry-leading active noise cancellation (ANC), but they cater to slightly different types of listeners.</p>

<h2>Design and Comfort</h2>
<p>The Sony WH-1000XM6 continues the 'noiseless design' philosophy introduced with the XM5 but refines it with a more durable carbon-fiber reinforced headband and slightly deeper ear cups for better breathability. It feels incredibly light at 250g, making it perfect for long-haul flights.</p>
<p>Bose, on the other hand, remains the king of comfort. The QuietComfort Ultra features a more traditional folding design, which many travelers prefer over Sony's non-folding structure. The plush protein leather pads and balanced clamping force make it feel like you're wearing nothing at all.</p>

<div class=\\\"article-image-wrapper\\\">
    <img src=\\\"images/articles/sony-wh-1000xm6-design.jpg\\\" alt=\\\"Sony WH-1000XM6 Design\\\" class=\\\"article-image\\\">
    <p class=\\\"image-caption\\\">The sleek, minimalist design of the Sony WH-1000XM6.</p>
</div>

<h2>Noise Cancellation Performance</h2>
<p>Sony's new Dual Processor V1 and QN1 setup in the XM6 provides a noticeable step up in high-frequency noise reduction. Whether it's the screech of a subway or the chatter in a busy cafe, the XM6 creates a vacuum of silence that is almost eerie.</p>
<p>Bose's QuietComfort Ultra counters with its proprietary CustomTune technology, which calibrates the ANC to the unique shape of your ears every time you put them on. While Sony might win on raw technical specs, Bose often feels more natural in how it handles sudden loud noises.</p>

<h2>Technical Specifications Comparison</h2>
<table class=\\\"comparison-table\\\">
    <thead>
        <tr>
            <th>Feature</th>
            <th>Sony WH-1000XM6</th>
            <th>Bose QuietComfort Ultra</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Battery Life (ANC On)</td>
            <td>40 Hours</td>
            <td>24 Hours</td>
        </tr>
        <tr>
            <td>Bluetooth Version</td>
            <td>5.4</td>
            <td>5.3</td>
        </tr>
        <tr>
            <td>Codecs</td>
            <td>LDAC, AAC, SBC</td>
            <td>aptX Adaptive, AAC, SBC</td>
        </tr>
        <tr>
            <td>Weight</td>
            <td>250g</td>
            <td>250g</td>
        </tr>
        <tr>
            <td>Spatial Audio</td>
            <td>360 Reality Audio</td>
            <td>Bose Immersive Audio</td>
        </tr>
    </tbody>
</table>

<h2>Sound Quality and Features</h2>
<p>The Sony XM6 uses a new 30mm carbon fiber driver that delivers tighter bass and more detailed highs compared to its predecessor. It remains the choice for audiophiles who want the best wireless resolution via LDAC.</p>
<p>Bose focuses on the 'Immersive Audio' experience, which makes music feel like it's coming from speakers in front of you rather than inside your head. It's a game-changer for watching movies or listening to live recordings.</p>

<div class=\\\"article-image-wrapper\\\">
    <img src=\\\"images/articles/sony-wh-1000xm6-noise-cancellation.jpg\\\" alt=\\\"Sony WH-1000XM6 ANC\\\" class=\\\"article-image\\\">
    <p class=\\\"image-caption\\\">Sony's advanced ANC technology in action.</p>
</div>

<h2>The Verdict</h2>
<p>If you prioritize battery life and technical performance, the <strong>Sony WH-1000XM6</strong> is the clear winner with its 40-hour stamina and superior codec support. However, if you value pure comfort and a more portable folding design, the <strong>Bose QuietComfort Ultra</strong> remains an unbeatable companion for the frequent traveler.</p>

<div class=\\\"product-recommendation\\\">
    <h3>Where to Buy</h3>
    <p>Check the latest prices and availability on Amazon:</p>
    <ul>
        <li><a href=\\\"https://www.amazon.com/s?k=Sony+WH-1000XM6&tag=kimsondreams-21\\\" target=\\\"_blank\\\" rel=\\\"noopener\\\">Shop Sony WH-1000XM6 on Amazon</a></li>
        <li><a href=\\\"https://www.amazon.com/dp/B0CHL68Y6Q?tag=kimsondreams-21\\\" target=\\\"_blank\\\" rel=\\\"noopener\\\">Shop Bose QuietComfort Ultra on Amazon</a></li>
    </ul>
</div>\"\"\"
}

with open(sony_path, 'w') as f:
    json.dump(sony_content, f, indent=2)
print(f'Fixed Sony article at {sony_path}')

# 2. Map Missing Images
audit_path = 'data/audit_report.json'
images_list_path = 'data/all_images_list.txt'

if os.path.exists(audit_path) and os.path.exists(images_list_path):
    with open(audit_path, 'r') as f:
        audit = json.load(f)
    with open(images_list_path, 'r') as f:
        all_images = [line.strip() for line in f if line.strip()]

    def clean_name(name):
        name = os.path.basename(name)
        name = re.sub(r'^(cover_|content_)', '', name)
        name = re.sub(r'_\\d+\\.(jpg|png|webp|jpeg|svg)$', r'.\\1', name)
        return name.lower()

    image_map = {clean_name(img): img for img in all_images}

    fixed_count = 0
    for issue in audit.get('issues', []):
        slug = issue['slug']
        path = os.path.join('data/articles', slug)
        if not os.path.exists(path): continue
        
        try:
            with open(path, 'r') as f:
                article = json.load(f)
        except:
            continue
            
        article_str = json.dumps(article)
        fixed = False
        
        for prob in issue.get('problems', []):
            match = re.search(r'images/articles/([^ ]+\\.(jpg|png|webp|jpeg|svg))', prob)
            if match:
                missing_path = f'images/articles/{match.group(1)}'
                missing_file = match.group(1)
                cleaned = clean_name(missing_file)
                
                if cleaned in image_map:
                    new_path = image_map[cleaned]
                    # Normalize path
                    new_path = new_path.replace('public/', '').replace('data/', '').replace('temp_blog_fix/', '')
                    article_str = article_str.replace(missing_path, new_path)
                    fixed = True
        
        if fixed:
            with open(path, 'w') as f:
                f.write(article_str)
            fixed_count += 1
            print(f'Fixed images in {slug}')

    print(f'Total articles fixed: {fixed_count}')
else:
    print('Audit report or image list missing.')
