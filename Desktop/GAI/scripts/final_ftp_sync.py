import os
import ftplib
from ftplib import FTP_TLS
import traceback
import sys

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    local_root = 'data/articles'

    print(f"Connecting to {host}...")
    try:
        ftps = FTP_TLS(timeout=90)
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        ftps.set_pasv(True)
        print("Login successful. Passive mode enabled.")
        
        base_dir = '/public_html/kimsondreams/data/articles'
        try:
            ftps.cwd(base_dir)
        except:
            print(f"Creating base directory: {base_dir}")
            parts = [p for p in base_dir.split('/') if p]
            ftps.cwd('/')
            for part in parts:
                try:
                    ftps.cwd(part)
                except:
                    ftps.mkd(part)
                    ftps.cwd(part)
        
        print(f"Remote root set to: {ftps.pwd()}")

        def navigate_to(rel_path):
            """Safely navigate to a relative path from base_dir"""
            ftps.cwd(base_dir)
            if not rel_path or rel_path == '.':
                return
            
            parts = [p for p in rel_path.split('/') if p]
            for part in parts:
                try:
                    ftps.cwd(part)
                except ftplib.error_perm:
                    print(f"Creating directory: {part}")
                    ftps.mkd(part)
                    ftps.cwd(part)

        def upload_recursive(local_path, remote_rel_path):
            for item in os.listdir(local_path):
                if item.startswith('.') or item == 'node_modules':
                    continue
                
                l_item_path = os.path.join(local_path, item)
                
                if os.path.isfile(l_item_path):
                    print(f"Uploading: {l_item_path} -> {remote_rel_path}/{item}")
                    navigate_to(remote_rel_path)
                    with open(l_item_path, 'rb') as f:
                        ftps.storbinary(f'STOR {item}', f)
                elif os.path.isdir(l_item_path):
                    new_remote_rel = item if remote_rel_path == '.' else f"{remote_rel_path}/{item}"
                    upload_recursive(l_item_path, new_remote_rel)

        upload_recursive(local_root, '.')
        print("\nSync completed successfully.")
        
    except Exception as e:
        print(f"\nFTP Error: {e}")
        traceback.print_exc()
        sys.exit(1)
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == '__main__':
    sync()