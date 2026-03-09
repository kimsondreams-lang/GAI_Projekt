import os
import ftplib
from ftplib import FTP
import sys

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'
    remote_root = os.getenv('FTP_ROOT_REL', 'kimsondreams').strip('/')

    print(f'Connecting to {host}...')
    try:
        ftp = FTP(timeout=120)
        ftp.connect(host, 21)
        ftp.login(user, password)
        ftp.set_pasv(True)
        print(f'Login successful. Current directory: {ftp.pwd()}')

        def ensure_remote_dir(rel_path):
            if not rel_path or rel_path == '.':
                return
            
            parts = [p for p in rel_path.split('/') if p]
            current = '.'
            if remote_root:
                parts = [remote_root] + parts
            for part in parts:
                current = f'{current}/{part}'
                try:
                    ftp.cwd(current)
                except:
                    try:
                        ftp.mkd(current)
                        print(f'Created remote dir: {current}')
                    except Exception as e:
                        print(f'Warning: Could not create/cwd to {current}: {e}')
            ftp.cwd('.')

        # First, ensure all directories exist
        for root, dirs, files in os.walk(local_root):
            rel_path = os.path.relpath(root, local_root)
            if rel_path != '.':
                ensure_remote_dir(rel_path.replace('\\', '/'))

        # Then upload files
        for root, dirs, files in os.walk(local_root):
            rel_path = os.path.relpath(root, local_root)
            remote_dir = rel_path.replace('\\', '/')
            
            for fname in files:
                if fname.startswith('.'): continue
                local_file = os.path.join(root, fname)
                remote_file_path = f'{remote_dir}/{fname}' if remote_dir != '.' else fname
                if remote_root:
                    remote_file_path = f'{remote_root}/{remote_file_path}'
                
                print(f'Uploading: {local_file} -> {remote_file_path}')
                try:
                    with open(local_file, 'rb') as f:
                        ftp.storbinary(f'STOR {remote_file_path}', f)
                except Exception as e:
                    print(f'Error uploading {fname}: {e}')

        ftp.quit()
        print('\nSync completed successfully.')
    except Exception as e:
        print(f'\nCritical Sync Error: {e}')
        sys.exit(1)

if __name__ == "__main__":
    sync()
