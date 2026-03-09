import os
import json
from ftplib import FTP
from dotenv import load_dotenv

load_dotenv()

FTP_HOST = os.getenv('FTP_HOST')
FTP_USER = os.getenv('FTP_USER')
FTP_PASS = os.getenv('FTP_PASS')
FTP_ROOT = '/public_html/kimsondreams/'

def sync_files():
    ftp = FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    
    # Files to sync from temp_blog_fix to FTP_ROOT
    files_to_sync = [
        ('temp_blog_fix/articles.json', 'articles.json'),
        ('temp_blog_fix/js/articles-data.js', 'js/articles-data.js'),
    ]
    
    # Also sync all articles from data/articles/ to FTP_ROOT/articles/
    articles_dir = 'data/articles'
    for filename in os.listdir(articles_dir):
        if filename.endswith('.json') and filename not in ['index.json', 'articles.json', 'affiliate_links.json']:
            files_to_sync.append((os.path.join(articles_dir, filename), f'articles/{filename}'))

    for local_path, remote_path in files_to_sync:
        full_remote_path = os.path.join(FTP_ROOT, remote_path)
        remote_dir = os.path.dirname(full_remote_path)
        
        # Ensure remote directory exists
        dirs = remote_dir.split('/')
        current_dir = ''
        for d in dirs:
            if not d: continue
            current_dir += '/' + d
            try:
                ftp.cwd(current_dir)
            except:
                ftp.mkd(current_dir)
        
        print(f'Uploading {local_path} to {full_remote_path}...')
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {full_remote_path}', f)

    ftp.quit()
    print('Sync completed successfully.')

if __name__ == '__main__':
    sync_files()