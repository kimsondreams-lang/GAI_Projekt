import os
import time
from ftplib import FTP, all_errors
import sys
import traceback
import uuid

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'temp_blog_fix'
    
    remote_root = '/public_html/kimsondreams'
    
    uploaded_log = 'data/uploaded_files.log'
    uploaded_files = set()
    if os.path.exists(uploaded_log):
        with open(uploaded_log, 'r') as f:
            uploaded_files = set(line.strip() for line in f)

    def get_ftp():
        print(f'Connecting to {host}...', flush=True)
        ftp = FTP(timeout=300)
        ftp.connect(host, 21)
        ftp.login(user, password)
        ftp.set_pasv(True)
        return ftp

    ftp = get_ftp()
    print(f'Login successful. Current Remote Dir: {ftp.pwd()}', flush=True)

    failed_files = []

    try:
        for root, dirs, files in os.walk(local_root):
            rel_path = os.path.relpath(root, local_root)
            valid_files = [f for f in files if not (f.startswith('.') or f.endswith('.bak') or f.endswith('.py') or f == '.DS_Store')]
            if not valid_files and not dirs: continue

            # Navigation logic
            try:
                ftp.cwd(remote_root)
                if rel_path != '.':
                    for part in rel_path.replace('\\', '/').split('/'):
                        if not part: continue
                        try: ftp.cwd(part)
                        except: 
                            print(f'Creating directory: {part}', flush=True)
                            ftp.mkd(part)
                            ftp.cwd(part)
            except Exception as e:
                print(f'Dir error: {e}, reconnecting...', flush=True)
                ftp = get_ftp()
                ftp.cwd(remote_root)
                if rel_path != '.':
                    for part in rel_path.replace('\\', '/').split('/'):
                        if part: 
                            try: ftp.cwd(part)
                            except: ftp.mkd(part); ftp.cwd(part)

            for fname in valid_files:
                local_file = os.path.join(root, fname)
                file_id = f'{rel_path}/{fname}'
                if file_id in uploaded_files: continue

                print(f'Uploading: {file_id}', flush=True)
                success = False
                for attempt in range(3):
                    try:
                        # Strategy: Try to rename existing to avoid 550 lock
                        temp_remote_name = f'tmp_{uuid.uuid4().hex[:8]}_{fname}'
                        
                        # 1. Try to delete/rename existing locks
                        for lock_name in [fname, f'.in.{fname}']:
                            try: ftp.delete(lock_name)
                            except: pass
                        
                        # 2. Upload to a temporary name first
                        with open(local_file, 'rb') as f:
                            ftp.storbinary(f'STOR {temp_remote_name}', f)
                        
                        # 3. Rename temp to final (this often bypasses .in. locks)
                        try: ftp.delete(fname)
                        except: pass
                        ftp.rename(temp_remote_name, fname)
                        
                        success = True
                        with open(uploaded_log, 'a') as log_f:
                            log_f.write(f'{file_id}\n')
                        break
                    except Exception as e:
                        print(f'  Attempt {attempt+1} failed for {fname}: {e}', flush=True)
                        time.sleep(1)
                        try: 
                            ftp.quit()
                            ftp = get_ftp()
                            ftp.cwd(remote_root)
                            if rel_path != '.':
                                for part in rel_path.replace('\\', '/').split('/'):
                                    if part: ftp.cwd(part)
                        except: pass
                
                if not success:
                    print(f'  SKIPPING {fname} after 3 attempts.', flush=True)
                    failed_files.append(file_id)
                
                time.sleep(0.05)

        ftp.quit()
        print(f'\nSync finished. Failed files: {len(failed_files)}', flush=True)
        for f in failed_files: print(f' - {f}')
        if not failed_files and os.path.exists(uploaded_log): os.remove(uploaded_log)
    except Exception as e:
        print(f'\nCritical Error: {e}', flush=True)
        sys.exit(1)

if __name__ == "__main__":
    sync()