import os
import ftplib
from ftplib import FTP
import sys

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'

    print(f'Connecting to {host}...')
    try:
        ftp = FTP(timeout=60)
        ftp.connect(host, 21)
        ftp.login(user, password)
        ftp.set_pasv(True)
        print(f'Login successful. Current directory: {ftp.pwd()}')

        def ensure_dir(dirname):
            try:
                ftp.mkd(dirname)
                print(f'Created directory: {dirname}')
            except:
                pass # Already exists or permission error

        # Walk through local staging area
        for root, dirs, files in os.walk(local_root):
            rel_path = os.path.relpath(root, local_root)
            
            # Create remote directories
            if rel_path != '.':
                remote_dir = rel_path.replace('\\', '/')
                ensure_dir(remote_dir)
            
            # Upload files
            for fname in files:
                if fname.startswith('.'): continue
                local_file = os.path.join(root, fname)
                remote_file = fname if rel_path == '.' else f"{rel_path.replace('\\', '/')}/{fname}"
                
                print(f'Uploading: {local_file} -> {remote_file}')
                try:
                    with open(local_file, 'rb') as f:
                        ftp.storbinary(f'STOR {remote_file}', f)
                except Exception as e:
                    print(f'Failed to upload {remote_file}: {e}')

        ftp.quit()
        print('\nSync finished.')
    except Exception as e:
        print(f'\nFTP Error: {e}')
        sys.exit(1)

if __name__ == '__main__':
    sync()