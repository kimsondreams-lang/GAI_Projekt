import os
import json
from ftplib import FTP

def load_env(path):
    env = {}
    if os.path.exists(path):
        with open(path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    k, v = line.strip().split('=', 1)
                    env[k] = v.strip('"').strip("'")
    return env

env = load_env('.env.local')
FTP_HOST = env.get('FTP_HOST')
FTP_USER = env.get('FTP_USER')
FTP_PASS = env.get('FTP_PASS')
FTP_ROOT = '/public_html/kimsondreams/'

def sync_files():
    if not all([FTP_HOST, FTP_USER, FTP_PASS]):
        print('Error: FTP credentials missing in .env.local')
        return

    ftp = FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    
    # Files to sync - use temp_ftp_blog which has full 41 articles
    files_to_sync = [
        ('temp_ftp_blog/articles.json', 'articles.json'),
        ('temp_ftp_blog/js/articles-data.js', 'js/articles-data.js'),
        ('temp_ftp_blog/index.html', 'index.html'),
    ]
    
    # Sync all articles from data/articles/ - upload .js files to /articles/ (hosting blocks /data/ directory)
    articles_dir = 'data/articles'
    for filename in os.listdir(articles_dir):
        if filename.endswith('.js') and filename not in ['index.js', 'articles.js', 'affiliate-links.js']:
            files_to_sync.append((os.path.join(articles_dir, filename), f'articles/{filename}'))
    # Also upload index.js and articles.js to /articles/
    for js_file in ['index.js', 'articles.js']:
        local_path = os.path.join(articles_dir, js_file)
        if os.path.exists(local_path):
            files_to_sync.append((local_path, f'articles/{js_file}'))

    for local_path, remote_path in files_to_sync:
        if not os.path.exists(local_path):
            print(f'Skipping {local_path} (not found)')
            continue
            
        full_remote_path = FTP_ROOT + remote_path
        remote_dir = os.path.dirname(full_remote_path)
        
        # Ensure remote directory exists
        parts = remote_dir.strip('/').split('/')
        current = ''
        for part in parts:
            current += '/' + part
            try:
                ftp.cwd(current)
            except:
                try:
                    ftp.mkd(current)
                    print(f'Created directory: {current}')
                except Exception as e:
                    print(f'Could not create {current}: {e}')
        
        print(f'Uploading {local_path} -> {full_remote_path}')
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {full_remote_path}', f)

    ftp.quit()
    print('Sync completed successfully.')

if __name__ == '__main__':
    sync_files()