from ftplib import FTP

def main():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    ftp = FTP(host)
    ftp.login(user, password)
    ftp.set_pasv(True)
    
    print(f'Current directory: {ftp.pwd()}')
    print('Listing contents of current directory:')
    ftp.retrlines('LIST')
    
    try:
        print('\nTrying to CWD to /public_html:')
        ftp.cwd('/public_html')
        print(f'Current directory: {ftp.pwd()}')
        ftp.retrlines('LIST')
    except Exception as e:
        print(f'Error CWD to /public_html: {e}')

    ftp.quit()

if __name__ == '__main__':
    main()