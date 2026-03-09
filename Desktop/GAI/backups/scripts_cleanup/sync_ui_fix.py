import os
import ftplib
from ftplib import FTP_TLS
import sys

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'

    files_to_upload = [
        ('index.html', 'index.html'),
        ('js/articles-data.js', 'js/articles-data.js')
    ]

    print(f'Connecting to {host}...')
    try:
        ftps = FTP_TLS(timeout=60)
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        ftps.set_pasv(True)
        print('Login successful.')

        for local_rel, remote_rel in files_to_upload:
            local_path = os.path.join(local_root, local_rel)
            remote_dir = os.path.dirname(remote_rel)
            filename = os.path.basename(remote_rel)

            ftps.cwd('/')
            if remote_dir and remote_dir != '.':
                for part in remote_dir.split('/'):
                    try:
                        ftps.cwd(part)
                    except:
                        ftps.mkd(part)
                        ftps.cwd(part)

            print(f'Uploading {remote_rel}...')
            with open(local_path, 'rb') as f:
                ftps.storbinary(f'STOR {filename}', f)

        print('\nMinimal sync finished successfully.')
    except Exception as e:
        print(f'\nFTP Error: {e}')
        sys.exit(1)
    finally:
        try: ftps.quit()
        except: pass

if __name__ == '__main__':
    sync()