import os
from ftplib import FTP
import uuid

def upload_file(ftp, local_path, remote_path):
    print(f'Uploading {local_path} to {remote_path}...')
    temp_name = f'tmp_{uuid.uuid4().hex[:8]}'
    try:
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {temp_name}', f)
        try: ftp.delete(remote_path)
        except: pass
        ftp.rename(temp_name, remote_path)
        print(f'Successfully uploaded {local_path} to {remote_path}')
        return True
    except Exception as e:
        print(f'Failed to upload {local_path}: {e}')
        return False

host = '89.116.53.41'
user = 'u866168581.coolkee.fun'
pw = 'cedIMA098!'
remote_root = '/public_html/kimsondreams'

try:
    ftp = FTP(timeout=60)
    ftp.connect(host, 21)
    ftp.login(user, pw)
    ftp.set_pasv(True)
    ftp.cwd(remote_root)

    # 1. Upload Index
    upload_file(ftp, 'temp_blog_fix/articles.json', 'articles.json')

    # 2. Upload Article
    try: ftp.cwd('articles')
    except: ftp.mkd('articles'); ftp.cwd('articles')
    upload_file(ftp, 'temp_blog_fix/articles/may-2026-tech-gift-guide.json', 'may-2026-tech-gift-guide.json')

    # 3. Upload Main Image
    ftp.cwd('..')
    try: ftp.cwd('images/articles')
    except: 
        try: ftp.cwd('images'); ftp.mkd('articles'); ftp.cwd('articles')
        except: pass
    upload_file(ftp, 'temp_blog_fix/images/articles/may-2026-tech-lifestyle-main.jpg', 'may-2026-tech-lifestyle-main.jpg')

    ftp.quit()
    print('Targeted upload completed.')
except Exception as e:
    print(f'Critical FTP Error: {e}')
