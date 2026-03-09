import os
import ftplib
from ftplib import FTP_TLS
import sys

def force_sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'
    remote_base = 'kimsondreams'
    
    # Files that MUST be updated for the UI to work
    critical_files = [
        'index.html',
        'js/main.js',
        'js/articles-data.js',
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

        for rel_path in critical_files:
            local_path = os.path.join(local_root, rel_path)
            if not os.path.exists(local_path):
                print(f'Warning: {local_path} not found locally.')
                continue

            # Construct remote path starting with kimsondreams
            remote_rel_path = os.path.join(remote_base, rel_path)
            remote_dir = os.path.dirname(remote_rel_path)
            filename = os.path.basename(remote_rel_path)

            # Navigate to directory
            ftps.cwd('/')
            if remote_dir:
                for part in remote_dir.split('/'):
                    if not part: continue
                    try:
                        ftps.cwd(part)
                    except:
                        print(f'Creating directory {part}')
                        ftps.mkd(part)
                        ftps.cwd(part)

            print(f'Force uploading {rel_path} to {ftps.pwd()}/{filename}...')
            with open(local_path, 'rb') as f:
                ftps.storbinary(f'STOR {filename}', f)

        print('\nForce sync to kimsondreams/ completed.')
    except Exception as e:
        print(f'\nFTP Error: {e}')
        sys.exit(1)
    finally:
        try: ftps.quit()
        except: pass

if __name__ == "__main__":
    force_sync()