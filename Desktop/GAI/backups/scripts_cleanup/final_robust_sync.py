import os
import ftplib
from ftplib import FTP
import sys

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'
    remote_root = os.getenv('FTP_ROOT', '/public_html/kimsondreams')

    print(f'Connecting to {host}...')
    try:
        ftp = FTP(timeout=60)
        ftp.connect(host, 21)
        ftp.login(user, password)
        ftp.set_pasv(True)
        print('Login successful. Passive mode enabled.')

        def ensure_remote_dir(remote_dir):
            parts = [p for p in remote_dir.split('/') if p]
            curr = ''
            for part in parts:
                curr += '/' + part
                try:
                    ftp.cwd(curr)
                except:
                    try:
                        ftp.mkd(curr)
                        print(f'Created remote dir: {curr}')
                    except Exception as e:
                        print(f'Could not create dir {curr}: {e}')

        for root, dirs, files in os.walk(local_root):
            rel_path = os.path.relpath(root, local_root)
            if rel_path == '.':
                target_remote_dir = remote_root
            else:
                target_remote_dir = os.path.join(remote_root, rel_path).replace('\\', '/')
            
            ensure_remote_dir(target_remote_dir)
            ftp.cwd(target_remote_dir)
            
            for fname in files:
                if fname.startswith('.'): continue
                local_file = os.path.join(root, fname)
                print(f'Uploading: {rel_path}/{fname} -> {target_remote_dir}/{fname}')
                try:
                    with open(local_file, 'rb') as f:
                        ftp.storbinary(f'STOR {fname}', f)
                except Exception as e:
                    print(f'Failed to upload {fname}: {e}')

        ftp.quit()
        print('\nSync completed successfully.')
    except Exception as e:
        print(f'\nCritical Sync Error: {e}')
        sys.exit(1)

if __name__ == "__main__":
    sync()
