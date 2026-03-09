import ftplib
from ftplib import FTP
import os

def debug_step():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    print(f'Connecting to {host}...')
    try:
        ftp = FTP(timeout=30)
        ftp.set_debuglevel(2)
        ftp.connect(host, 21)
        ftp.login(user, password)
        ftp.set_pasv(True)
        
        print('\n--- Attempting to create "articles" directory ---')
        try:
            ftp.mkd('articles')
            print('Directory "articles" created.')
        except Exception as e:
            print(f'Note: mkd articles failed (maybe exists): {e}')

        print('\n--- Attempting to upload one test file ---')
        local_file = 'temp_blog_fix/articles.json'
        if os.path.exists(local_file):
            with open(local_file, 'rb') as f:
                ftp.storbinary('STOR articles.json.test', f)
            print('Upload of articles.json.test successful.')
        
        ftp.quit()
    except Exception as e:
        print(f'\nFATAL ERROR: {e}')

if __name__ == '__main__':
    debug_step()