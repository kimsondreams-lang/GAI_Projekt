import os
import ftplib
from ftplib import FTP

def deploy():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'
    remote_root = os.getenv('FTP_ROOT', '/public_html/kimsondreams')

    print(f'Connecting to {host}...')
    try:
        ftp = FTP(timeout=120)
        ftp.connect(host, 21)
        ftp.login(user, password)
        ftp.set_pasv(True)
        print('Login successful. Passive mode enabled.')

        def upload_recursive(local_dir, remote_dir):
            print(f'Entering local: {local_dir} -> remote: {remote_dir}')
            try:
                ftp.cwd(remote_dir)
            except ftplib.error_perm:
                print(f'Creating remote directory: {remote_dir}')
                # Handle nested directory creation
                parts = remote_dir.strip('/').split('/')
                curr = ''
                for part in parts:
                    curr += '/' + part
                    try:
                        ftp.mkd(curr)
                    except:
                        pass
                ftp.cwd(remote_dir)
            
            for item in os.listdir(local_dir):
                if item.startswith('.'): continue
                l_path = os.path.join(local_dir, item)
                if os.path.isfile(l_path):
                    print(f'Uploading {l_path} to {remote_dir}/{item}')
                    with open(l_path, 'rb') as f:
                        ftp.storbinary(f'STOR {item}', f)
                elif os.path.isdir(l_path):
                    upload_recursive(l_path, f'{remote_dir}/{item}')

        upload_recursive(local_root, remote_root)
        ftp.quit()
        print('\nDeployment completed successfully.')
    except Exception as e:
        print(f'\nDeployment failed: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    deploy()
