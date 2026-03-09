import ftplib
from ftplib import FTP_TLS

def test_conn():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    print(f'Connecting to {host}...')
    try:
        ftps = FTP_TLS(timeout=30)
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        ftps.set_pasv(True)
        print('SUCCESS: Login and Prot P successful.')
        print('Remote directory content:', ftps.nlst())
        ftps.quit()
    except Exception as e:
        print(f'FAILED: {e}')

if __name__ == '__main__':
    test_conn()