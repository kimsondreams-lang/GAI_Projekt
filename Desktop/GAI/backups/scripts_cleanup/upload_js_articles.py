import ftplib
import os

ftp_host = '89.116.53.41'
ftp_user = 'u866168581'
ftp_pass = 'KimsonDreams2024!'
remote_dir = '/public_html/kimsondreams/data/articles'
local_dir = 'data/articles'

ftp = ftplib.FTP(ftp_host)
ftp.login(ftp_user, ftp_pass)
ftp.cwd(remote_dir)

uploaded = 0
for fname in os.listdir(local_dir):
    if fname.endswith('.js'):
        fpath = os.path.join(local_dir, fname)
        with open(fpath, 'rb') as f:
            ftp.storbinary(f'STOR {fname}', f)
        uploaded += 1
        print(f'Uploaded {fname}')

print(f'Total uploaded: {uploaded} JS files')
ftp.quit()
