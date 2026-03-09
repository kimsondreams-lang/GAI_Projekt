import os
import ftplib
from ftplib import FTP_TLS

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_root = os.getenv('FTP_ROOT', '/public_html/kimsondreams/')

    print(f"Connecting to {host} with timeout...")
    ftps = FTP_TLS(timeout=60)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        print("Login and PROT P successful.")

        def upload_dir(local_path, remote_path):
            try:
                ftps.cwd(remote_path)
            except ftplib.error_perm:
                print(f"Creating directory: {remote_path}")
                parts = remote_path.strip('/').split('/')
                current = ''
                for part in parts:
                    current += '/' + part
                    try:
                        ftps.mkd(current)
                    except:
                        pass
                ftps.cwd(remote_path)

            for item in os.listdir(local_path):
                l_path = os.path.join(local_path, item)
                if os.path.isfile(l_path):
                    if item.startswith('.'): continue
                    print(f"Uploading {l_path} to {remote_path}/{item}")
                    with open(l_path, 'rb') as f:
                        ftps.storbinary(f'STOR {item}', f)
                elif os.path.isdir(l_path):
                    upload_dir(l_path, f"{remote_path}/{item}")

        # Sync from staging area (temp_ftp_blog)
        staging_root = 'temp_ftp_blog'
        
        # Sync data/articles
        upload_dir(os.path.join(staging_root, 'data/articles'), f"{remote_root}data/articles")
        
        # Sync images/articles
        upload_dir(os.path.join(staging_root, 'images/articles'), f"{remote_root}images/articles")
        
        # Sync CSS, JS, and HTML
        upload_dir(os.path.join(staging_root, 'css'), f"{remote_root}css")
        upload_dir(os.path.join(staging_root, 'js'), f"{remote_root}js")
        
        # Sync root files
        for root_file in ['index.html', 'article.html', 'articles.json']:
            local_file = os.path.join(staging_root, root_file)
            if os.path.exists(local_file):
                print(f"Uploading {root_file} to root...")
                with open(local_file, 'rb') as f:
                    ftps.cwd(remote_root)
                    ftps.storbinary(f'STOR {root_file}', f)
        
        print("Sync completed successfully.")
    except Exception as e:
        print(f"FTP Error: {e}")
        raise
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == '__main__':
    sync()
