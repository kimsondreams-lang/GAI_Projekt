import os
from ftplib import FTP_TLS

def upload_file(ftps, local_path, remote_path):
    remote_dir = os.path.dirname(remote_path)
    # Ensure remote directory exists
    parts = remote_dir.strip('/').split('/')
    current = ''
    for part in parts:
        current += '/' + part
        try:
            ftps.cwd(current)
        except:
            try:
                ftps.mkd(current)
                print(f'Created directory: {current}')
            except Exception as e:
                print(f'Could not create {current}: {e}')
    
    print(f'Uploading {local_path} -> {remote_path}...')
    with open(local_path, 'rb') as f:
        ftps.storbinary(f'STOR {remote_path}', f)

def main():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    root = '/public_html/kimsondreams/'

    ftps = FTP_TLS(timeout=60)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        print('Login successful.')

        files = [
            ('data/articles/2026-march-wearable-health-guide.json', root + 'articles/2026-march-wearable-health-guide.json'),
            ('data/articles/index.json', root + 'articles.json'),
            ('public/images/articles/oura-ring-4.jpg', root + 'images/articles/oura-ring-4.jpg'),
            ('public/images/articles/smart-rings-comparison-2026.jpg', root + 'images/articles/smart-rings-comparison-2026.jpg'),
            ('public/images/articles/apple-watch-series-10-main.jpg', root + 'images/articles/apple-watch-series-10-main.jpg')
        ]

        for local, remote in files:
            if os.path.exists(local):
                upload_file(ftps, local, remote)
            else:
                print(f'Warning: Local file {local} not found.')

        print('Upload process finished.')
    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == "__main__":
    main()