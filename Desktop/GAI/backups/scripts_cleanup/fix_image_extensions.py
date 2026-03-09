import json
import os

articles_dir = 'data/articles'
images_dir = 'public/images/articles'

# List of missing images from the audit report
missing_report = [
    {\"article\": \"best-4k-monitors-2025.json\", \"image\": \"images/articles/cover_best-4k-monitors-2025_1772533908698.webp\"},
    {\"article\": \"top-ai-gadgets-amazon-2025.json\", \"image\": \"images/articles/cover_top-ai-gadgets-amazon-2025_1772534001676.webp\"},
    {\"article\": \"best-mechanical-keyboards-2025.json\", \"image\": \"images/articles/article6-cover.webp\"},
    {\"article\": \"top-wireless-earbuds-2025-comparison.json\", \"image\": \"images/articles/cover_top-wireless-earbuds-2025-comparison_1772534006512.webp\"},
    {\"article\": \"best-laptops-2025.json\", \"image\": \"images/articles/best-laptops-2025.webp\"},
    {\"article\": \"apple-watch-ultra-2-review.json\", \"image\": \"images/articles/apple-watch-ultra-2.webp\"},
    {\"article\": \"best-gaming-accessories-2025.json\", \"image\": \"images/articles/best-gaming-accessories-2025-main.webp\"},
    {\"article\": \"best-gaming-accessories-2025.json\", \"image\": \"images/articles/sony-wh-1000xm6-main.webp\"},
    {\"article\": \"iphone-16-pro-max-review.json\", \"image\": \"images/articles/iphone-16-pro-max.webp\"},
    {\"article\": \"sony-wh-1000xm5-review.json\", \"image\": \"images/articles/sony-wh-1000xm5-main.webp\"},
    {\"article\": \"sony-wh-1000xm5-review.json\", \"image\": \"images/articles/sony-xm5-black.webp\"},
    {\"article\": \"best-tech-gadgets-amazon-2025.json\", \"image\": \"images/articles/tech-gadgets-2025-main.webp\"},
    {\"article\": \"dji-mini-4-pro-review.json\", \"image\": \"images/articles/dji-mini-4-pro.webp\"},
    {\"article\": \"sony-wh-1000xm5-vs-bose-qc-ultra-comparison.json\", \"image\": \"images/articles/sony-wh-1000xm5-main.webp\"}
]

def fix_file(article_file, old_img_path):
    path = os.path.join(articles_dir, article_file)
    if not os.path.exists(path):
        return
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content_str = f.read()
        
        # Try to find a replacement extension
        base_name = os.path.splitext(os.path.basename(old_img_path))[0]
        
        # Special case for XM6
        if 'sony-wh-1000xm6' in base_name:
            new_name = 'sony-wh-1000xm5-main.jpg'
        else:
            new_name = None
            for ext in ['.jpg', '.png', '.jpeg']:
                if os.path.exists(os.path.join(images_dir, base_name + ext)):
                    new_name = base_name + ext
                    break
        
        if new_name:
            new_path = f'images/articles/{new_name}'
            new_content = content_str.replace(old_img_path, new_path)
            if new_content != content_str:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Fixed {article_file}: {old_img_path} -> {new_path}')
            else:
                print(f'No change needed for {article_file} (string not found)')
        else:
            print(f'Could not find replacement for {old_img_path} in {article_file}')
            
    except Exception as e:
        print(f'Error fixing {article_file}: {e}')

for item in missing_report:
    fix_file(item['article'], item['image'])

print('Image extension fix completed.')
