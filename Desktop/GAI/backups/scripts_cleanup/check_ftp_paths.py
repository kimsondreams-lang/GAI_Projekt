import ftplib
from ftplib import FTP_TLS

h, u, p = '89.116.53.41', 'u866168581.coolkee.fun', 'cedIMA098!'

def check():
    try:
        ftps = FTP_TLS(timeout=60)
        ftps.connect(h, 21)
        ftps.login(u, p)
        ftps.prot_p()
        ftps.set_pasv(True)
        
        print('--- Root Contents ---')
        print(ftps.nlst())
        
        paths_to_check = ['/public_html', '/public_html/articles', '/public_html/kimsondreams']
        for path in paths_to_check:
            try:
                print(f'\n--- Contents of {path} ---')
                ftps.cwd(path)
                print(ftps.nlst())
            except Exception as e:
                print(f'Could not access {path}: {e}')
        
        ftps.quit()
    except Exception as e:
        print(f'FTP Error: {e}')

if __name__ == '__main__':
    check()
