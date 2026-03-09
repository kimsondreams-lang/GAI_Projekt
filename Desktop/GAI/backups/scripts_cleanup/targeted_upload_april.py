import os
from ftplib import FTP_TLS

def upload_specific_files():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_base = '/public_html/kimsondreams/'
    
    # (local_path, remote_relative_path)
    files_to_upload = [
        ('data/articles/pixel-10a-vs-iphone-se-4-comparison.json', 'data/articles/pixel-10a-vs-iphone-se-4-comparison.json'),
        ('data/images/articles/pixel-10a-vs-iphone-se-4-main.jpg', 'images/articles/pixel-10a-vs-iphone-se-4-main.jpg'),
        ('data/images/articles/modern-smartphone-display.jpg', 'images/articles/modern-smartphone-display.jpg'),
        ('data/images/articles/smartphone-ai-features.jpg', 'images/articles/smartphone-ai-features.jpg'),
        ('data/articles/index.json', 'articles.json')
    ]

    print(f'Connecting to {host}...')
    ftps = FTP_TLS(timeout=60)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        print('FTP Login Successful.')

        for local, remote in files_to_upload:
            if not os.path.exists(local):
                print(f'Error: Local file {local} not found. Skipping.')
                continue

            remote_path = remote_base + remote
            remote_dir = os.path.dirname(remote_path)
            
            # Ensure remote directory exists
            try:
                ftps.cwd(remote_dir)
            except:
                print(f'Creating directory {remote_dir}')
                parts = remote_dir.strip('/').split('/')
                curr = ''
                for p in parts:
                    curr += '/' + p
                    try: ftps.mkd(curr)
                    except: pass
                ftps.cwd(remote_dir)

            print(f'Uploading {local} to {remote_path}...')
            with open(local, 'rb') as f:
                ftps.storbinary(f'STOR {os.path.basename(remote_path)}', f)
        
        print('Targeted upload completed successfully.')
    except Exception as e:
        print(f'FTP Error: {e}')
        exit(1)
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == "__main__":
    upload_specific_files()