import ftplib
from ftplib import FTP_TLS
import os

def test():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    try:
        ftps = FTP_TLS(timeout=30)
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        ftps.set_pasv(True)
        
        print('Connected. Attempting to upload index.html as test...')
        with open('temp_blog_fix/index.html', 'rb') as f:
            ftps.storbinary('STOR index.html.test', f)
        print('SUCCESS: index.html.test uploaded.')
        ftps.quit()
    except Exception as e:
        print(f'FAILED: {e}')

if __name__ == '__main__':
    test()