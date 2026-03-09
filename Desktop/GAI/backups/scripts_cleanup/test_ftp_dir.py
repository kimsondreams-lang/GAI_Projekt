import ftplib
from ftplib import FTP

def test():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    print(f'Connecting to {host}...')
    try:
        ftp = FTP(timeout=30)
        ftp.connect(host, 21)
        ftp.login(user, password)
        ftp.set_pasv(True)
        print(f'Login successful. Current directory: {ftp.pwd()}')
        print('Directory listing:')
        ftp.retrlines('LIST')
        ftp.quit()
    except Exception as e:
        print(f'FTP Error: {e}')

if __name__ == '__main__':
    test()