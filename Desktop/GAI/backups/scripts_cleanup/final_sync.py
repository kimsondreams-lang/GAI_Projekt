import os
import ftplib
from ftplib import FTP_TLS

def recursive_upload():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_root = '/public_html/'
    local_root = 'temp_ftp_blog/'

    print(f'Connecting to {host}...')
    ftps = FTP_TLS(host)
    try:
        ftps.login(user, password)
        ftps.prot_p()
        print('Login successful.')

        def upload_dir(local_path, remote_path):
            print(f'Syncing: {local_path} -> {remote_path}')
            try:
                ftps.cwd(remote_path)
            except ftplib.error_perm:
                print(f'Creating directory: {remote_path}')
                parts = remote_path.strip('/').split('/')
                current = ''
                for part in parts:
                    if not part: continue
                    current += '/' + part
                    try:
                        ftps.mkd(current)
                    except:
                        pass
                ftps.cwd(remote_path)

            for item in os.listdir(local_path):
                if item.startswith('.'): continue
                l_path = os.path.join(local_path, item)
                r_path = remote_path.rstrip('/') + '/' + item
                
                if os.path.isfile(l_path):
                    print(f'  Uploading {item}')
                    with open(l_path, 'rb') as f:
                        ftps.storbinary(f'STOR {item}', f)
                elif os.path.isdir(l_path):
                    upload_dir(l_path, r_path)
                    ftps.cwd(remote_path)

        upload_dir(local_root, remote_root)
        print('Full sync completed.')
    except Exception as e:
        print(f'Error: {e}')
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == '__main__':
    recursive_upload()
