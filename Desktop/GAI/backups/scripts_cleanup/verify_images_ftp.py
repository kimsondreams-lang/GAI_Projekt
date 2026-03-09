import os
from ftplib import FTP_TLS

def verify_images():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    remote_dir = '/public_html/kimsondreams/images/articles/'

    print(f'Connecting to {host}...')
    ftps = FTP_TLS(timeout=30)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        
        print(f'Listing {remote_dir}...')
        files = ftps.nlst(remote_dir)
        
        target_images = [
            'pixel-10a-vs-iphone-se-4-main.jpg',
            'modern-smartphone-display.jpg',
            'smartphone-ai-features.jpg'
        ]

        for img in target_images:
            found = any(img in f for f in files)
            status = 'FOUND' if found else 'MISSING'
            print(f'{img}: {status}')

    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try: ftps.quit()
        except: pass

if __name__ == "__main__":
    verify_images()