import os
import ftplib
from ftplib import FTP_TLS
import sys

def deploy():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'
    remote_root = os.getenv('FTP_ROOT', '/public_html/kimsondreams/')

    print(f'Connecting to {host}...')
    try:
        ftps = FTP_TLS(timeout=120)
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        ftps.set_pasv(True)
        print('Login successful. Secure connection established.')

        def ensure_remote_dir(remote_path):
            parts = [p for p in remote_path.split('/') if p]
            current = ''
            for part in parts:
                current += '/' + part
                try:
                    ftps.cwd(current)
                except ftplib.error_perm:
                    print(f'Creating remote directory: {current}')
                    ftps.mkd(current)
                    ftps.cwd(current)

        for root, dirs, files in os.walk(local_root):
            rel_path = os.path.relpath(root, local_root)
            if rel_path == '.':
                target_dir = remote_root
            else:
                target_dir = os.path.join(remote_root, rel_path).replace('\\', '/')
            
            ensure_remote_dir(target_dir)
            
            for fname in files:
                if fname.startswith('.'): continue
                local_file = os.path.join(root, fname)
                print(f'Uploading: {local_file} -> {target_dir}/{fname}')
                with open(local_file, 'rb') as f:
                    ftps.storbinary(f'STOR {fname}', f)

        print('\nDeployment completed successfully.')
    except Exception as e:
        print(f'\nDeployment failed: {e}')
        sys.exit(1)
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == "__main__":
    deploy()
