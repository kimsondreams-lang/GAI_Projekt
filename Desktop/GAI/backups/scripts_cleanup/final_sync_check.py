import os
from ftplib import FTP_TLS

def verify():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_base = '/public_html/kimsondreams/'

    print(f'Connecting to {host}...')
    ftps = FTP_TLS(timeout=30)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        print('Login successful.')

        def check_exists(path):
            try:
                return ftps.size(path) > 0
            except:
                return False

        files = [
            'articles.json',
            'data/articles/pixel-10a-vs-iphone-se-4-comparison.json',
            'images/articles/pixel-10a-vs-iphone-se-4-main.jpg',
            'images/articles/modern-smartphone-display.jpg',
            'images/articles/smartphone-ai-features.jpg'
        ]

        results = {}
        for f in files:
            full_path = remote_base + f
            exists = check_exists(full_path)
            results[f] = 'EXISTS' if exists else 'MISSING'
            print(f'{f}: {results[f]}')

        print('\nListing images/articles:')
        try:
            ftps.cwd(remote_base + 'images/articles')
            ftps.retrlines('LIST')
        except Exception as e: print(f'Error: {e}')

    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try: ftps.quit()
        except: pass

if __name__ == "__main__":
    verify()