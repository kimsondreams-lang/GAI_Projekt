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

        paths_to_check = [
            'articles.json',
            'data/articles/pixel-10a-vs-iphone-se-4-comparison.json',
            'images/articles/pixel-10a-vs-iphone-se-4-main.jpg',
            'images/articles/modern-smartphone-display.jpg',
            'images/articles/smartphone-ai-features.jpg'
        ]

        for p in paths_to_check:
            full_path = remote_base + p
            try:
                size = ftps.size(full_path)
                print(f'VERIFIED: {p} ({size} bytes)')
            except:
                print(f'NOT FOUND: {p}')

        print('\nListing data/articles:')
        try:
            ftps.cwd(remote_base + 'data/articles')
            ftps.retrlines('LIST')
        except Exception as e: print(f'Error listing data/articles: {e}')

    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == "__main__":
    verify()