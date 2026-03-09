import os
from ftplib import FTP_TLS

def debug_structure():
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

        print('Listing root directory:')
        ftps.retrlines('LIST')

        dirs_to_check = ['/public_html', '/public_html/kimsondreams']
        for d in dirs_to_check:
            try:
                print(f'\nListing {d}:')
                ftps.cwd(d)
                ftps.retrlines('LIST')
            except Exception as e:
                print(f'Could not list {d}: {e}')

    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == "__main__":
    debug_structure()