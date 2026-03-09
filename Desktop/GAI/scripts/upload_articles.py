import os
from ftplib import FTP_TLS

def upload():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    print(f'Connecting to {host}...')
    ftps = FTP_TLS(timeout=30)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        print('Login successful.')

        local_file = 'temp_ftp_blog/articles.json'
        remote_file = '/public_html/articles.json'
        
        if os.path.exists(local_file):
            print(f'Uploading {local_file} to {remote_file}...')
            with open(local_file, 'rb') as f:
                ftps.storbinary(f'STOR {remote_file}', f)
            print('Upload successful.')
        else:
            print(f'Error: Local file {local_file} not found.')
            
    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == '__main__':
    upload()
