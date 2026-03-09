import os
from ftplib import FTP_TLS

def upload_file(ftps, local_path, remote_path):
    print(f"Uploading {local_path} to {remote_path}...")
    remote_dir = os.path.dirname(remote_path)
    try:
        ftps.cwd(remote_dir)
    except:
        print(f"Creating directory {remote_dir}")
        parts = remote_dir.strip('/').split('/')
        current = ''
        for part in parts:
            current += '/' + part
            try: ftps.mkd(current)
            except: pass
        ftps.cwd(remote_dir)
    
    with open(local_path, 'rb') as f:
        ftps.storbinary(f'STOR {os.path.basename(remote_path)}', f)

def main():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_root = '/public_html/kimsondreams/'

    ftps = FTP_TLS(timeout=60)
    ftps.connect(host, 21)
    ftps.login(user, password)
    ftps.prot_p()
    ftps.set_pasv(True)

    files_to_upload = [
        ('temp_ftp_blog/articles/june-2026-tech-guide-wwdc-rumors.json', f'{remote_root}data/articles/june-2026-tech-guide-wwdc-rumors.json'),
        ('temp_ftp_blog/images/articles/june-2026-tech-guide-main.jpg', f'{remote_root}images/articles/june-2026-tech-guide-main.jpg'),
        ('temp_ftp_blog/articles.json', f'{remote_root}articles.json')
    ]

    for local, remote in files_to_upload:
        if os.path.exists(local):
            upload_file(ftps, local, remote)
        else:
            print(f"Warning: {local} not found!")

    ftps.quit()
    print("Upload finished.")

if __name__ == '__main__':
    main()