import ftplib
import os
from dotenv import load_dotenv

load_dotenv()

FTP_HOST = os.getenv('FTP_HOST', 'ftp.hostinger.com')
FTP_USER = os.getenv('FTP_USER')
FTP_PASS = os.getenv('FTP_PASS')
REMOTE_PATH = '/public_html/kimsondreams/articles/'

try:
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    ftp.cwd(REMOTE_PATH)
    files = ftp.nlst()
    target = 'razer-v4-pro-vs-logitech-g915x-comparison.json'
    if target in files:
        print(f'SUCCESS: {target} found on remote.')
    else:
        print(f'FAILURE: {target} NOT found on remote.')
    ftp.quit()
except Exception as e:
    print(f'ERROR: {str(e)}')
