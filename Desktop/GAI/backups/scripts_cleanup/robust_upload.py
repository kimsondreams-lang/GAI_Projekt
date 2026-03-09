import os, sys, ftplib
from ftplib import FTP_TLS

def log(msg):
    print(msg)
    sys.stdout.flush()

try:
    host, user, pw = '89.116.53.41', 'u866168581.coolkee.fun', 'cedIMA098!'
    log(f"Connecting to {host}...")
    ftps = FTP_TLS(timeout=120)
    ftps.connect(host, 21)
    ftps.login(user, pw)
    ftps.prot_p()
    log("Connected and logged in.")

    # 1. Upload Index
    log("Uploading index.json...")
    ftps.cwd('/public_html')
    if os.path.exists('data/articles/index.json'):
        with open('data/articles/index.json', 'rb') as f:
            ftps.storbinary('STOR articles.json', f)
        log("Successfully uploaded articles.json to root.")

    # 2. Upload Articles
    log("Uploading articles...")
    ftps.cwd('articles')
    articles = [f for f in os.listdir('data/articles') if f.endswith('.json') and f != 'index.json']
    for fn in articles:
        with open(os.path.join('data/articles', fn), 'rb') as f:
            ftps.storbinary(f'STOR {fn}', f)
        log(f"Uploaded: {fn}")

    # 3. Upload Images
    log("Uploading images...")
    ftps.cwd('/public_html/images/articles')
    images = [f for f in os.listdir('data/images/articles') if f.endswith('.webp')]
    log(f"Total images to upload: {len(images)}")
    for i, fn in enumerate(images):
        try:
            with open(os.path.join('data/images/articles', fn), 'rb') as f:
                ftps.storbinary(f'STOR {fn}', f)
            if (i + 1) % 10 == 0 or (i + 1) == len(images):
                log(f"Progress: {i+1}/{len(images)} images uploaded.")
        except Exception as img_e:
            log(f"Failed to upload image {fn}: {img_e}")

    ftps.quit()
    log("Deployment Finished Successfully.")
except Exception as e:
    log(f"Deployment Failed: {e}")
    sys.exit(1)
