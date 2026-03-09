import os, ftplib
from ftplib import FTP_TLS
host, user, pw = '89.116.53.41', 'u866168581.coolkee.fun', 'cedIMA098!'
remote_dir = '/public_html/kimsondreams/images/articles'
local_dir = 'public/images/articles'
os.makedirs(local_dir, exist_ok=True)
print(f'Connecting to {host}...')
ftps = FTP_TLS(host)
try:
    ftps.login(user, pw)
    ftps.prot_p()
    ftps.cwd(remote_dir)
    lines = []
    ftps.retrlines('LIST', lines.append)
    count = 0
    for line in lines:
        parts = line.split()
        if len(parts) < 9: continue
        # Skip directories (permissions start with 'd')
        if parts[0].startswith('d'): continue
        
        fname = ' '.join(parts[8:])
        if fname.startswith('.'): continue
        
        try:
            size = int(parts[4])
        except: continue
        
        lpath = os.path.join(local_dir, fname)
        # Download if missing or if it's a small placeholder (< 10KB) but remote is large
        if not os.path.exists(lpath) or (os.path.getsize(lpath) < 10000 and size > 10000):
            if size > 0:
                print(f'Downloading {fname} ({size} bytes)...')
                with open(lpath, 'wb') as f:
                    ftps.retrbinary(f'RETR {fname}', f.write)
                count += 1
    print(f'Successfully downloaded {count} files.')
finally:
    try: ftps.quit()
    except: pass
