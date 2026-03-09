import os
import ftplib
from ftplib import FTP_TLS
import sys

def sync_manifests():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'
    
    manifests = [
        'articles/index.json',
        'data/articles/articles.json',
        'data/articles/index.json'
    ]

    print(f'Connecting to {host}...')
    try:
        ftps = FTP_TLS(timeout=60)
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        ftps.set_pasv(True)
        print('Login successful.')

        for rel_path in manifests:
            local_path = os.path.join(local_root, rel_path)
            if not os.path.exists(local_path):
                print(f'Skipping {rel_path} (not found locally)')
                continue

            remote_dir = os.path.dirname(rel_path)
            filename = os.path.basename(rel_path)

            # Navigate to directory
            ftps.cwd('/')
            if remote_dir:
                for part in remote_dir.split('/'):
                    try:
                        ftps.cwd(part)
                    except:
                        print(f'Creating directory {part}')
                        ftps.mkd(part)
                        ftps.cwd(part)

            print(f'Uploading {rel_path}...')
            with open(local_path, 'rb') as f:
                ftps.storbinary(f'STOR {filename}', f)

        print('\nManifest sync finished successfully.')
    except Exception as e:
        print(f'\nFTP Error: {e}')
        sys.exit(1)
    finally:
        try: ftps.quit()
        except: pass

if __name__ == "__main__":
    sync_manifests()