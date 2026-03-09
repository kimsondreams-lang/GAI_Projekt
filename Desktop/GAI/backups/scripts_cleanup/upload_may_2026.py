import os
from ftplib import FTP
import sys

def upload_file(ftp, local_path, remote_path):
    print(f'Uploading {local_path} to {remote_path}...')
    with open(local_path, 'rb') as f:
        ftp.storbinary(f'STOR {remote_path}', f)

def main():
    host = '89.116.53.41'
    user = 'u866168581.coolkee.fun'
    password = 'cedIMA098!'
    
    ftp = FTP(host)
    ftp.login(user, password)
    ftp.set_pasv(True)
    
    # Upload article JSON
    ftp.cwd('/public_html/articles')
    upload_file(ftp, 'temp_blog_fix/articles/may-2026-tech-gift-guide.json', 'may-2026-tech-gift-guide.json')
    
    # Upload images
    ftp.cwd('/public_html/images/articles')
    images = [
        'may-2026-tech-lifestyle-main.jpg',
        'oura-ring-gen4-lifestyle.jpg',
        'macbook-neo-student.jpg',
        'pixel-10a-reveal.jpg'
    ]
    for img in images:
        local_img = os.path.join('temp_blog_fix/images/articles', img)
        if os.path.exists(local_img):
            upload_file(ftp, local_img, img)
        else:
            print(f'Missing local image: {local_img}')

    # Upload updated index
    ftp.cwd('/public_html')
    upload_file(ftp, 'temp_blog_fix/articles.json', 'articles.json')
    
    ftp.quit()
    print('Targeted upload complete.')

if __name__ == '__main__':
    main()