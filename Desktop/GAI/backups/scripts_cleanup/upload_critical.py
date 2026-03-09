import os
import ftplib
from ftplib import FTP_TLS

host = '89.116.53.41'
user = 'u866168581.coolkee.fun'
password = 'cedIMA098!'

files = [
    ('temp_ftp_blog/data/articles/sony-wh-1000xm5-review.json', '/public_html/data/articles/sony-wh-1000xm5-review.json'),
    ('temp_ftp_blog/data/articles/iphone-16-pro-max-review.json', '/public_html/data/articles/iphone-16-pro-max-review.json'),
    ('temp_ftp_blog/images/articles/sony-xm5-black.jpg', '/public_html/images/articles/sony-xm5-black.jpg')
]

try:
    ftps = FTP_TLS(timeout=60)
    ftps.connect(host, 21)
    ftps.login(user, password)
    ftps.prot_p()
    
    for local, remote in files:
        if os.path.exists(local):
            print(f'Uploading {local}...')
            with open(local, 'rb') as f:
                ftps.storbinary(f'STOR {remote}', f)
        else:
            print(f'File not found: {local}')
    
    ftps.quit()
    print('Critical upload complete.')
except Exception as e:
    print(f'Upload failed: {e}')
