import os
import ftplib
from ftplib import FTP_TLS
import sys
import time

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'

    print(f'Connecting to {host}...')
    try:
        ftps = FTP_TLS(timeout=60)
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        ftps.set_pasv(True)
        print('Login successful.')

        files_by_dir = {}
        for root, dirs, files in os.walk(local_root):
            for file in files:
                if file.startswith('.') or 'scripts' in root:
                    continue
                local_path = os.path.join(root, file)
                remote_rel_path = os.path.relpath(local_path, local_root)
                remote_dir = os.path.dirname(remote_rel_path)
                if remote_dir not in files_by_dir:
                    files_by_dir[remote_dir] = []
                files_by_dir[remote_dir].append((local_path, file))

        total_files = sum(len(f) for f in files_by_dir.values())
        print(f'Found {total_files} files in {len(files_by_dir)} directories.')

        success_count = 0
        skip_count = 0
        fail_count = 0

        for remote_dir, files in files_by_dir.items():
            ftps.cwd('/')
            if remote_dir and remote_dir != '.':
                for part in remote_dir.split('/'):
                    if not part: continue
                    try:
                        ftps.cwd(part)
                    except ftplib.error_perm:
                        print(f'  Creating directory: {part}')
                        ftps.mkd(part)
                        ftps.cwd(part)
            
            # Get remote file sizes to skip existing ones
            remote_files = {}
            try:
                for name, facts in ftps.mlsd():
                    if facts['type'] == 'file':
                        remote_files[name] = int(facts.get('size', 0))
            except:
                try:
                    for name in ftps.nlst():
                        remote_files[name] = -1 # Size unknown
                except: pass

            for local_path, filename in files:
                local_size = os.path.getsize(local_path)
                if filename in remote_files and (remote_files[filename] == local_size or remote_files[filename] == -1):
                    print(f'  Skipping {filename} (already exists)')
                    skip_count += 1
                    continue

                try:
                    print(f'Uploading {remote_dir}/{filename}...')
                    with open(local_path, 'rb') as f:
                        ftps.storbinary(f'STOR {filename}', f)
                    success_count += 1
                    time.sleep(0.1) # Small delay to prevent flooding
                except Exception as e:
                    print(f'  [ERROR] {filename}: {e}')
                    fail_count += 1

        print(f'\nSync finished. Success: {success_count}, Skipped: {skip_count}, Failed: {fail_count}')
    except Exception as e:
        print(f'\nFTP Critical Error: {e}')
        sys.exit(1)
    finally:
        try: ftps.quit()
        except: pass

if __name__ == "__main__":
    sync()