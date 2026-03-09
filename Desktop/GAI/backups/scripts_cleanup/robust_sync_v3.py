import os
import ftplib
from ftplib import FTP_TLS
import traceback
import sys

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'
    log_file = 'sync_debug.log'

    with open(log_file, 'w') as log:
        log.write(f'Starting sync from {local_root} to FTP root\n')
        
        try:
            print(f'Connecting to {host}...')
            ftps = FTP_TLS(timeout=90)
            ftps.connect(host, 21)
            ftps.login(user, password)
            ftps.prot_p()
            ftps.set_pasv(True)
            
            base_dir = ftps.pwd()
            log.write(f'Remote base directory: {base_dir}\n')

            files_to_upload = []
            for root, dirs, files in os.walk(local_root):
                for name in files:
                    if name.startswith('.') or 'node_modules' in root:
                        continue
                    local_path = os.path.join(root, name)
                    rel_path = os.path.relpath(local_path, local_root)
                    files_to_upload.append((local_path, rel_path))

            log.write(f'Found {len(files_to_upload)} files to upload.\n')

            for local_path, rel_path in files_to_upload:
                remote_dir = os.path.dirname(rel_path)
                filename = os.path.basename(rel_path)
                
                # Navigate to remote dir
                ftps.cwd(base_dir)
                if remote_dir and remote_dir != '.':
                    for part in remote_dir.split(os.sep):
                        if not part: continue
                        try:
                            ftps.cwd(part)
                        except ftplib.error_perm:
                            log.write(f'Creating directory: {part}\n')
                            ftps.mkd(part)
                            ftps.cwd(part)
                
                log.write(f'Uploading: {rel_path}... ')
                try:
                    with open(local_path, 'rb') as f:
                        ftps.storbinary(f'STOR {filename}', f)
                    log.write('OK\n')
                except Exception as fe:
                    log.write(f'FAILED: {fe}\n')
                    print(f'Failed to upload {rel_path}: {fe}')

            print('Sync process finished. Check sync_debug.log for details.')
            ftps.quit()
        except Exception as e:
            log.write(f'CRITICAL ERROR: {e}\n')
            log.write(traceback.format_exc())
            print(f'Critical FTP Error: {e}')
            sys.exit(1)

if __name__ == '__main__':
    sync()