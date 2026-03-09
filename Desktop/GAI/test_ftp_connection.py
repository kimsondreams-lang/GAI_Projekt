import ftplib
from ftplib import FTP_TLS
import socket

host = '89.116.53.41'
user = 'u866168581.coolkee.fun'
password = 'cedIMA098!'

def test_tls():
    print('--- Testing FTP_TLS ---')
    try:
        ftps = FTP_TLS(timeout=10)
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        print('SUCCESS: FTP_TLS login and PROT P successful.')
        print('Welcome message:', ftps.getwelcome())
        print('Current directory:', ftps.pwd())
        ftps.quit()
        return True
    except Exception as e:
        print(f'FAILED: FTP_TLS error: {e}')
        return False

def test_plain():
    print('\n--- Testing Plain FTP ---')
    try:
        ftp = ftplib.FTP(timeout=10)
        ftp.connect(host, 21)
        ftp.login(user, password)
        print('SUCCESS: Plain FTP login successful.')
        print('Welcome message:', ftp.getwelcome())
        print('Current directory:', ftp.pwd())
        ftp.quit()
        return True
    except Exception as e:
        print(f'FAILED: Plain FTP error: {e}')
        return False

if __name__ == '__main__':
    tls_ok = test_tls()
    plain_ok = test_plain()
    
    if not tls_ok and not plain_ok:
        print('\nCRITICAL: Both connection methods failed.')
        # Try to resolve host to check DNS/Network
        try:
            ip = socket.gethostbyname(host)
            print(f'DNS Check: {host} resolved to {ip}')
        except Exception as dns_e:
            print(f'DNS Check: Failed to resolve {host}: {dns_e}')
