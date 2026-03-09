import os
from ftplib import FTP

def ensure_dirs():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_root = '/public_html/kimsondreams'
    
    dirs_to_ensure = ['css', 'js', 'articles', 'images', 'images/articles', 'data', 'data/articles']
    
    print(f'Connecting to {host}...')
    ftp = FTP(timeout=60)
    ftp.connect(host, 21)
    ftp.login(user, password)
    ftp.set_pasv(True)
    
    try:
        ftp.cwd(remote_root)
        print(f'In remote root: {remote_root}')
    except:
        print(f'Creating remote root: {remote_root}')
        ftp.mkd(remote_root)
        ftp.cwd(remote_root)

    for d in dirs_to_ensure:
        parts = d.split('/')
        current = ''
        ftp.cwd(remote_root)
        for part in parts:
            if not part: continue
            current = os.path.join(current, part) if current else part
            try:
                ftp.cwd(part)
                print(f'Directory exists: {current}')
            except:
                print(f'Creating directory: {current}')
                ftp.mkd(part)
                ftp.cwd(part)
        
    ftp.quit()
    print('Done.')

if __name__ == "__main__":
    ensure_dirs()
