import os
from ftplib import FTP

def upload_file(ftp, local_path, remote_path):
    print(f'Uploading {local_path} to {remote_path}...')
    remote_dir = os.path.dirname(remote_path)
    try:
        ftp.cwd(remote_dir)
    except:
        # Try to create dir if not exists (simplified)
        pass
    
    with open(local_path, 'rb') as f:
        ftp.storbinary(f'STOR {os.path.basename(remote_path)}', f)
    print('  Success.')

def main():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    pw = 'cedIMA098!'
    root = '/public_html/kimsondreams/'

    ftp = FTP(host)
    ftp.login(user, pw)
    
    files = [
        ('data/articles/ifa-2026-iphone-18-pro-preview.json', root + 'articles/ifa-2026-iphone-18-pro-preview.json'),
        ('data/articles/index.json', root + 'articles/index.json'),
        ('public/images/articles/ifa-2026-iphone-18-pro-preview.jpg', root + 'images/articles/ifa-2026-iphone-18-pro-preview.jpg')
    ]

    for local, remote in files:
        if os.path.exists(local):
            upload_file(ftp, local, remote)
        else:
            print(f'Error: Local file {local} not found.')

    ftp.quit()

if __name__ == '__main__':
    main()
