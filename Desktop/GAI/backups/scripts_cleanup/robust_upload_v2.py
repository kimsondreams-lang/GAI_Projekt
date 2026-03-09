import os
import sys
import ftplib
from ftplib import FTP_TLS

def log(msg):
    print(msg)
    sys.stdout.flush()

host, user, pw = '89.116.53.41', 'u866168581.coolkee.fun', 'cedIMA098!'

def get_ftp():
    ftps = FTP_TLS(timeout=60)
    ftps.connect(host, 21)
    ftps.login(user, pw)
    ftps.prot_p()
    ftps.set_pasv(True)
    return ftps

try:
    ftps = get_ftp()
    log('Connected to FTP.')

    # 1. Sync JSON Articles
    log('Syncing articles...')
    ftps.cwd('/public_html/articles')
    remote_articles = set(ftps.nlst())
    local_articles_dir = 'data/articles'
    articles = [f for f in os.listdir(local_articles_dir) if f.endswith('.json') and f != 'index.json']
    
    for fn in articles:
        local_path = os.path.join(local_articles_dir, fn)
        # Always upload JSONs to ensure content updates (like S24 fix) are live
        with open(local_path, 'rb') as f:
            ftps.storbinary(f'STOR {fn}', f)
        log(f'Updated article: {fn}')

    # 2. Sync WebP Images (Incremental)
    log('Syncing images...')
    ftps.cwd('/public_html/images/articles')
    remote_images = set(ftps.nlst())
    local_images_dir = 'data/images/articles'
    images = [f for f in os.listdir(local_images_dir) if f.endswith('.webp')]
    
    to_upload = [f for f in images if f not in remote_images]
    log(f'Total images: {len(images)}. Missing on remote: {len(to_upload)}')

    for i, fn in enumerate(to_upload):
        try:
            with open(os.path.join(local_images_dir, fn), 'rb') as f:
                ftps.storbinary(f'STOR {fn}', f)
            if (i + 1) % 10 == 0 or (i + 1) == len(to_upload):
                log(f'Progress: {i+1}/{len(to_upload)} new images uploaded.')
        except Exception as e:
            log(f'Failed to upload {fn}: {e}')
            # Try to reconnect if connection lost
            try: ftps = get_ftp(); ftps.cwd('/public_html/images/articles')
            except: break

    # 3. Update Index
    log('Updating articles.json index...')
    ftps.cwd('/public_html')
    if os.path.exists('data/articles/index.json'):
        with open('data/articles/index.json', 'rb') as f:
            ftps.storbinary('STOR articles.json', f)
        log('Index updated.')

    ftps.quit()
    log('Sync completed successfully.')
except Exception as e:
    log(f'Sync failed: {e}')
    sys.exit(1)
