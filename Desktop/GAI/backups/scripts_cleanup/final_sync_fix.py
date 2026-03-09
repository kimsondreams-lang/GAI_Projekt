import os
from ftplib import FTP_TLS
import ssl

def upload_file(ftps, local_path, remote_path):
    print(f'Uploading {local_path} to {remote_path}...')
    with open(local_path, 'rb') as f:
        ftps.storbinary(f'STOR {remote_path}', f)

def sync():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    print(f'Connecting to {host}...')
    # Create a context that ignores certificate validation if necessary, 
    # but first try standard TLS.
    ftps = FTP_TLS(timeout=60)
    # Hostinger often requires this for IP-based TLS
    ftps.ssl_version = ssl.PROTOCOL_TLS
    
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        print('Login successful.')

        # 1. Upload root articles.json
        if os.path.exists('temp_ftp_blog/articles.json'):
            upload_file(ftps, 'temp_ftp_blog/articles.json', '/public_html/articles.json')
        
        # 2. Ensure data/articles directory exists
        try:
            ftps.mkd('/public_html/data')
        except: pass
        try:
            ftps.mkd('/public_html/data/articles')
        except: pass

        # 3. Upload data/articles/index.json
        if os.path.exists('temp_ftp_blog/data/articles/index.json'):
            upload_file(ftps, 'temp_ftp_blog/data/articles/index.json', '/public_html/data/articles/index.json')
            
        print('Sync completed successfully.')
            
    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == '__main__':
    sync()
