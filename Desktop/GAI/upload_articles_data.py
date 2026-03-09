#!/usr/bin/env python3
import ftplib
from ftplib import FTP_TLS
import os

host = '89.116.53.41'
user = 'u866168581.coolkee.fun'
password = 'cedIMA098!'
remote_path = '/public_html/kimsondreams/js/'
local_file = '/Users/jakubnetza/Desktop/GAI/temp_ftp_blog/js/articles-data.js'

print(f'Connecting to {host}...')
ftps = FTP_TLS(timeout=60)
ftps.connect(host, 21)
ftps.login(user, password)
ftps.prot_p()
print('Login successful')

# Change to remote directory
ftps.cwd(remote_path)
print(f'Changed to {remote_path}')

# Upload articles-data.js
filename = 'articles-data.js'
print(f'Uploading {filename}...')
with open(local_file, 'rb') as f:
    ftps.storbinary(f'STOR {filename}', f)
print('Upload complete!')

# Verify upload
ftps.retrlines(f'LIST {filename}')

ftps.quit()
print('FTP connection closed')
