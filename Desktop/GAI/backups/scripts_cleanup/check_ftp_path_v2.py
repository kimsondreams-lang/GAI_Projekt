from ftplib import FTP

def main():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    ftp = FTP(host)
    ftp.login(user, password)
    ftp.set_pasv(True)
    
    print(f'Current directory: {ftp.pwd()}')
    
    target = '/public_html/kimsondreams'
    try:
        print(f'\nTrying to CWD to {target}:')
        ftp.cwd(target)
        print(f'Current directory: {ftp.pwd()}')
        ftp.retrlines('LIST')
        
        # Check for articles and images
        for sub in ['articles', 'images', 'images/articles']:
            try:
                print(f'\nChecking {sub}:')
                ftp.cwd(f'{target}/{sub}')
                print(f'Success: {ftp.pwd()}')
                ftp.retrlines('LIST')
            except Exception as e:
                print(f'Error accessing {sub}: {e}')
    except Exception as e:
        print(f'Error CWD to {target}: {e}')

    ftp.quit()

if __name__ == "__main__":
    main()