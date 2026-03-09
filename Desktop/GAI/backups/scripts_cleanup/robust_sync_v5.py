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
        fail_count = 0

        for remote_dir, files in files_by_dir.items():
            # Navigate to or create directory
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
            
            current_remote_dir = ftps.pwd()
            
            for local_path, filename in files:
                try:
                    print(f'Uploading {remote_dir}/{filename}...')
                    with open(local_path, 'rb') as f:
                        ftps.storbinary(f'STOR {filename}', f)
                    success_count += 1
                except ftplib.error_perm as e:
                    err_msg = str(e)
                    if '550' in err_msg:
                        print(f'  [RECOVERY] 550 error for {filename}. Attempting to clear lock files...')
                        try:
                            # Try to delete common lock patterns
                            for pattern in [f'.in.{filename}', f'.in.{filename}.']:
                                try: ftps.delete(pattern)
                                except: pass
                            time.sleep(0.5)
                            with open(local_path, 'rb') as f:
                                ftps.storbinary(f'STOR {filename}', f)
                            print(f'  [SUCCESS] Recovered {filename}')
                            success_count += 1
                        except Exception as re:
                            print(f'  [FAILED] Recovery failed for {filename}: {re}')
                            fail_count += 1
                    else:
                        print(f'  [ERROR] {err_msg}')
                        fail_count += 1
                except Exception as e:
                    print(f'  [ERROR] {filename}: {e}')
                    fail_count += 1

        print(f'\nSync finished. Success: {success_count}, Failed: {fail_count}')
    except Exception as e:
        print(f'\nFTP Critical Error: {e}')
        sys.exit(1)
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == "__main__":
    sync()
