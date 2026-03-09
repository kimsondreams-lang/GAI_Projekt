import os
from ftplib import FTP_TLS

def deploy():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    print(f'Connecting to {host}...')
    ftps = FTP_TLS(timeout=180)
    try:
        ftps.connect(host, 21)
        ftps.login(user, password)
        ftps.prot_p()
        print('Login successful.')

        # 1. Upload Articles
        local_articles = 'data/articles'
        remote_articles = '/public_html/articles'
        if os.path.exists(local_articles):
            for item in os.listdir(local_articles):
                if item.endswith('.json') and item != 'index.json':
                    local_path = os.path.join(local_articles, item)
                    print(f'Uploading article: {item}')
                    with open(local_path, 'rb') as f:
                        ftps.storbinary(f'STOR {remote_articles}/{item}', f)

        # 2. Upload WebP Images
        local_images = 'data/images/articles'
        remote_images = '/public_html/images/articles'
        if os.path.exists(local_images):
            for item in os.listdir(local_images):
                if item.endswith('.webp'):
                    local_path = os.path.join(local_images, item)
                    print(f'Uploading image: {item}')
                    with open(local_path, 'rb') as f:
                        ftps.storbinary(f'STOR {remote_images}/{item}', f)

        # 3. Upload Index
        local_index = 'data/articles/index.json'
        remote_index = '/public_html/articles.json'
        if os.path.exists(local_index):
            print('Uploading index.json...')
            with open(local_index, 'rb') as f:
                ftps.storbinary(f'STOR {remote_index}', f)

        print('Deployment completed successfully.')
    except Exception as e:
        print(f'FTP Error: {e}')
    finally:
        try:
            ftps.quit()
        except:
            pass

if __name__ == "__main__":
    deploy()